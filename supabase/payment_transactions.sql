-- Recordium Paystack payment ledger
-- Safe, server-side-only transaction tracking for subscription payments.
-- Apply supabase/schema.sql first, then run this in the Supabase SQL editor.

alter table public.profiles
  add column if not exists subscription_status text not null default 'inactive',
  add column if not exists subscription_plan text,
  add column if not exists subscription_started_at timestamptz,
  add column if not exists subscription_expires_at timestamptz;

create or replace function public.prevent_client_subscription_changes()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if auth.role() in ('anon', 'authenticated') then
    if tg_op = 'INSERT' then
      if new.subscription_status <> 'inactive'
        or new.subscription_plan is not null
        or new.subscription_started_at is not null
        or new.subscription_expires_at is not null then
        raise exception 'Subscription fields can only be changed by trusted server-side payment processing.';
      end if;
    elsif (
      old.onboarding_completed
      and not new.onboarding_completed
    ) or new.subscription_status is distinct from old.subscription_status
      or new.subscription_plan is distinct from old.subscription_plan
      or new.subscription_started_at is distinct from old.subscription_started_at
      or new.subscription_expires_at is distinct from old.subscription_expires_at then
      raise exception 'Protected profile fields cannot be changed by the client.';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists prevent_client_subscription_changes
  on public.profiles;
create trigger prevent_client_subscription_changes
before insert or update on public.profiles
for each row execute function public.prevent_client_subscription_changes();

create table if not exists public.payment_transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  reference text not null,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'NGN' check (char_length(trim(currency)) > 0),
  status text not null check (status in ('pending', 'success', 'failed', 'abandoned', 'expired')),
  provider text not null default 'paystack' check (provider = 'paystack'),
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  constraint payment_transactions_reference_unique unique (reference)
);

create index if not exists payment_transactions_user_created_idx
on public.payment_transactions (user_id, created_at desc);

alter table public.payment_transactions enable row level security;
revoke all on table public.payment_transactions from anon;
revoke insert, update, delete, truncate, references, trigger
  on table public.payment_transactions from authenticated;
grant select on table public.payment_transactions to authenticated;
grant all on table public.payment_transactions to service_role;

-- No browser write access. Only trusted server-side code may create or mutate records.
drop policy if exists "Users can view their own payment records" on public.payment_transactions;
create policy "Users can view their own payment records"
on public.payment_transactions
for select
using (auth.uid() = user_id);

-- No insert policy: browser cannot create a successful payment record.
-- No update policy: browser cannot modify status, amount, reference, provider, or paid_at.
-- No delete policy: payment history remains immutable from the client.

comment on table public.payment_transactions is 'Server-controlled Paystack payment ledger for Recordium subscription tracking.';
comment on column public.payment_transactions.user_id is 'Authenticated Recordium user owning the payment record.';
comment on column public.payment_transactions.reference is 'Unique Paystack transaction reference used to prevent duplicate processing.';
comment on column public.payment_transactions.amount is 'Monetary amount captured for the payment in the transaction currency.';
comment on column public.payment_transactions.currency is 'ISO currency code for the payment, typically NGN.';
comment on column public.payment_transactions.status is 'Lifecycle status of the Paystack transaction.';
comment on column public.payment_transactions.provider is 'Provider name for the payment record; must be paystack.';
comment on column public.payment_transactions.paid_at is 'Timestamp when the payment was confirmed by the provider.';
comment on column public.payment_transactions.created_at is 'Server-side timestamp when the payment record was inserted.';

create or replace function public.activate_recordium_subscription(
  p_user_id uuid,
  p_reference text,
  p_amount_kobo integer,
  p_currency text,
  p_paid_at timestamptz,
  p_plan_id text
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  expected_amount integer;
  duration_months integer;
  payment_id uuid;
  existing_payment public.payment_transactions%rowtype;
  current_profile public.profiles%rowtype;
  start_at timestamptz;
  base_at timestamptz;
  expires_at timestamptz;
  is_duplicate boolean := false;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using
      errcode = '42501',
      message = 'Only trusted server-side payment processing may activate subscriptions.';
  end if;

  case p_plan_id
    when 'monthly' then
      expected_amount := 500000;
      duration_months := 1;
    when 'quarterly' then
      expected_amount := 1200000;
      duration_months := 3;
    when 'yearly' then
      expected_amount := 3600000;
      duration_months := 12;
    else
      raise exception 'Invalid subscription plan.';
  end case;

  if p_user_id is null
    or nullif(trim(p_reference), '') is null
    or p_currency is distinct from 'NGN'
    or p_amount_kobo is distinct from expected_amount
    or p_paid_at is null then
    raise exception 'Payment details do not match the selected subscription plan.';
  end if;

  insert into public.payment_transactions (
    user_id, reference, amount, currency, status, provider, paid_at
  )
  values (
    p_user_id, p_reference, p_amount_kobo::numeric / 100,
    p_currency, 'success', 'paystack', p_paid_at
  )
  on conflict (reference) do nothing
  returning id into payment_id;

  if payment_id is null then
    select *
      into existing_payment
      from public.payment_transactions
     where reference = p_reference
     for update;

    if not found then
      raise exception 'Unable to lock the existing payment record.';
    end if;

    if existing_payment.user_id <> p_user_id then
      raise exception using
        errcode = '23505',
        message = 'Payment reference belongs to another user.';
    end if;

    if existing_payment.provider <> 'paystack'
      or existing_payment.currency <> p_currency
      or existing_payment.amount <> p_amount_kobo::numeric / 100 then
      raise exception using
        errcode = '23505',
        message = 'Payment reference conflicts with different payment details.';
    end if;

    if existing_payment.status = 'success' then
      is_duplicate := true;
      payment_id := existing_payment.id;
    else
      update public.payment_transactions
         set status = 'success',
             paid_at = p_paid_at
       where id = existing_payment.id;

      payment_id := existing_payment.id;
    end if;
  end if;

  select *
    into current_profile
    from public.profiles
   where id = p_user_id
   for update;

  if not found then
    insert into public.profiles (id)
    values (p_user_id)
    on conflict (id) do nothing;

    select *
      into current_profile
      from public.profiles
     where id = p_user_id
     for update;
  end if;

  if is_duplicate then
    return jsonb_build_object(
      'duplicate', true,
      'payment_id', payment_id,
      'subscription_status', current_profile.subscription_status,
      'subscription_plan', current_profile.subscription_plan,
      'subscription_started_at', current_profile.subscription_started_at,
      'subscription_expires_at', current_profile.subscription_expires_at
    );
  end if;

  if current_profile.subscription_status = 'active'
    and current_profile.subscription_plan = 'pro'
    and current_profile.subscription_expires_at > p_paid_at then
    start_at := coalesce(current_profile.subscription_started_at, p_paid_at);
    base_at := current_profile.subscription_expires_at;
  else
    start_at := p_paid_at;
    base_at := p_paid_at;
  end if;

  expires_at := base_at + make_interval(months => duration_months);

  update public.profiles
     set subscription_status = 'active',
         subscription_plan = 'pro',
         subscription_started_at = start_at,
         subscription_expires_at = expires_at
   where id = p_user_id
  returning * into current_profile;

  return jsonb_build_object(
    'duplicate', false,
    'payment_id', payment_id,
    'subscription_status', current_profile.subscription_status,
    'subscription_plan', current_profile.subscription_plan,
    'subscription_started_at', current_profile.subscription_started_at,
    'subscription_expires_at', current_profile.subscription_expires_at
  );
end;
$$;

revoke all on function public.activate_recordium_subscription(
  uuid, text, integer, text, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.activate_recordium_subscription(
  uuid, text, integer, text, timestamptz, text
) to service_role;
