begin;

do $migration$
begin
  if to_regprocedure('public.has_active_recordium_pro(uuid)') is not null
    and to_regprocedure('public.has_active_meridian_pro(uuid)') is null then
    alter function public.has_active_recordium_pro(uuid)
      rename to has_active_meridian_pro;
  end if;
end;
$migration$;

drop function if exists public.activate_recordium_subscription(
  uuid, text, integer, text, timestamptz, text
);

create or replace function public.activate_meridian_subscription(
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

revoke all on function public.activate_meridian_subscription(
  uuid, text, integer, text, timestamptz, text
) from public, anon, authenticated;
grant execute on function public.activate_meridian_subscription(
  uuid, text, integer, text, timestamptz, text
) to service_role;

notify pgrst, 'reload schema';

commit;
