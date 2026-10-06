-- =========================================================
-- RECORDIUM CORE DATA MODEL
-- Apply this file in the Supabase SQL editor before using the app.
-- =========================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  trading_style text,
  default_currency text not null default 'USD',
  onboarding_completed boolean not null default false,
  subscription_status text not null default 'inactive',
  subscription_plan text,
  subscription_started_at timestamptz,
  subscription_expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

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

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) > 0),
  currency text not null default 'USD',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trading_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null check (char_length(trim(description)) > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(trim(title)) > 0),
  type text not null check (type in ('daily', 'weekly', 'monthly', 'trading', 'financial', 'habit')),
  status text not null default 'active' check (status in ('active', 'completed', 'archived')),
  target_date date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instrument text not null check (char_length(trim(instrument)) > 0),
  direction text not null check (direction in ('long', 'short')),
  status text not null check (status in ('active', 'completed')),
  entry numeric not null check (entry > 0),
  exit numeric check (exit > 0),
  size numeric not null check (size > 0),
  pnl numeric,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((status = 'active' and exit is null) or (status = 'completed' and exit is not null))
);

create table if not exists public.money_transactions (
  id uuid primary key default gen_random_uuid(),

  user_id uuid not null
    references auth.users(id)
    on delete cascade,

  type text not null
    check (type in ('income', 'expense')),

  amount numeric not null
    check (amount > 0),

  category text,

  description text,

  transaction_date date not null default current_date,

  created_at timestamptz not null default now(),

  updated_at timestamptz not null default now()
);

create or replace function public.has_active_recordium_pro(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select p_user_id = auth.uid()
    and exists (
      select 1
        from public.profiles
       where id = p_user_id
         and subscription_status = 'active'
         and subscription_plan = 'pro'
         and (
           subscription_expires_at is null
           or subscription_expires_at > now()
         )
    );
$$;

create or replace function public.can_create_initial_record(
  p_user_id uuid,
  p_table_name text
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  is_onboarding boolean;
  has_existing_record boolean;
begin
  if p_user_id is distinct from auth.uid()
    or p_table_name is null
    or p_table_name not in ('accounts', 'trading_rules') then
    return false;
  end if;

  select onboarding_completed = false
    into is_onboarding
    from public.profiles
   where id = p_user_id
   for update;

  if is_onboarding is distinct from true then
    return false;
  end if;

  if p_table_name = 'accounts' then
    select exists (
      select 1 from public.accounts where user_id = p_user_id
    ) into has_existing_record;
  else
    select exists (
      select 1 from public.trading_rules where user_id = p_user_id
    ) into has_existing_record;
  end if;

  return not has_existing_record;
end;
$$;

revoke all on function public.has_active_recordium_pro(uuid)
  from public, anon, authenticated;
grant execute on function public.has_active_recordium_pro(uuid)
  to authenticated;
revoke all on function public.can_create_initial_record(uuid, text)
  from public, anon, authenticated;
grant execute on function public.can_create_initial_record(uuid, text)
  to authenticated;

create or replace function public.delete_recordium_user_data()
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  requesting_user_id uuid := auth.uid();
begin
  if requesting_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Sign in before deleting account data.';
  end if;

  delete from public.trades where user_id = requesting_user_id;
  delete from public.money_transactions where user_id = requesting_user_id;
  delete from public.goals where user_id = requesting_user_id;
  delete from public.trading_rules where user_id = requesting_user_id;
  delete from public.accounts where user_id = requesting_user_id;
  delete from public.profiles where id = requesting_user_id;
end;
$$;

revoke all on function public.delete_recordium_user_data()
  from public, anon, authenticated;
grant execute on function public.delete_recordium_user_data()
  to authenticated;


-- Index for faster user transaction queries
create index if not exists money_transactions_user_date_idx
on public.money_transactions(user_id, transaction_date desc);

create index if not exists accounts_user_created_idx
on public.accounts(user_id, created_at desc);

create index if not exists trading_rules_user_created_idx
on public.trading_rules(user_id, created_at desc);

create index if not exists goals_user_status_idx
on public.goals(user_id, status, target_date);

create index if not exists trades_user_created_idx
on public.trades(user_id, created_at desc);


-- Enable Row Level Security
alter table public.money_transactions enable row level security;
alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.trading_rules enable row level security;
alter table public.goals enable row level security;
alter table public.trades enable row level security;


-- Recreate policy safely
drop policy if exists "Users can manage their money transactions"
on public.money_transactions;


create policy "Users can manage their money transactions"
on public.money_transactions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their profile" on public.profiles;
drop policy if exists "Users can view their own profile" on public.profiles;
create policy "Users can view their own profile"
on public.profiles for select
using (auth.uid() = id);
drop policy if exists "Users can create their own profile" on public.profiles;
create policy "Users can create their own profile"
on public.profiles for insert
with check (auth.uid() = id);
drop policy if exists "Users can update their own profile" on public.profiles;
create policy "Users can update their own profile"
on public.profiles for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Require Pro for account inserts" on public.accounts;
create policy "Require Pro for account inserts"
on public.accounts as restrictive
for insert to authenticated
with check (
  auth.uid() = user_id
  and (
    public.has_active_recordium_pro(auth.uid())
    or public.can_create_initial_record(auth.uid(), 'accounts')
  )
);
drop policy if exists "Require Pro for account updates" on public.accounts;
create policy "Require Pro for account updates"
on public.accounts as restrictive
for update to authenticated
using (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()))
with check (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()));
drop policy if exists "Require Pro for account deletes" on public.accounts;
create policy "Require Pro for account deletes"
on public.accounts as restrictive
for delete to authenticated
using (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()));

drop policy if exists "Users can manage their accounts" on public.accounts;
create policy "Users can manage their accounts"
on public.accounts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Require Pro for trading rule inserts" on public.trading_rules;
create policy "Require Pro for trading rule inserts"
on public.trading_rules as restrictive
for insert to authenticated
with check (
  auth.uid() = user_id
  and (
    public.has_active_recordium_pro(auth.uid())
    or public.can_create_initial_record(auth.uid(), 'trading_rules')
  )
);
drop policy if exists "Require Pro for trading rule updates" on public.trading_rules;
create policy "Require Pro for trading rule updates"
on public.trading_rules as restrictive
for update to authenticated
using (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()))
with check (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()));
drop policy if exists "Require Pro for trading rule deletes" on public.trading_rules;
create policy "Require Pro for trading rule deletes"
on public.trading_rules as restrictive
for delete to authenticated
using (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()));

drop policy if exists "Users can manage their trading rules" on public.trading_rules;
create policy "Users can manage their trading rules"
on public.trading_rules for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Require Pro for goal inserts" on public.goals;
create policy "Require Pro for goal inserts"
on public.goals as restrictive
for insert to authenticated
with check (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()));
drop policy if exists "Require Pro for goal updates" on public.goals;
create policy "Require Pro for goal updates"
on public.goals as restrictive
for update to authenticated
using (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()))
with check (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()));
drop policy if exists "Require Pro for goal deletes" on public.goals;
create policy "Require Pro for goal deletes"
on public.goals as restrictive
for delete to authenticated
using (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()));

drop policy if exists "Users can manage their goals" on public.goals;
create policy "Users can manage their goals"
on public.goals for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Require Pro for trade inserts" on public.trades;
create policy "Require Pro for trade inserts"
on public.trades as restrictive
for insert to authenticated
with check (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()));
drop policy if exists "Require Pro for trade updates" on public.trades;
create policy "Require Pro for trade updates"
on public.trades as restrictive
for update to authenticated
using (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()))
with check (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()));
drop policy if exists "Require Pro for trade deletes" on public.trades;
create policy "Require Pro for trade deletes"
on public.trades as restrictive
for delete to authenticated
using (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()));

drop policy if exists "Users can manage their trades" on public.trades;
create policy "Users can manage their trades"
on public.trades for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Require Pro for money transaction inserts"
  on public.money_transactions;
create policy "Require Pro for money transaction inserts"
on public.money_transactions as restrictive
for insert to authenticated
with check (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()));
drop policy if exists "Require Pro for money transaction updates"
  on public.money_transactions;
create policy "Require Pro for money transaction updates"
on public.money_transactions as restrictive
for update to authenticated
using (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()))
with check (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()));
drop policy if exists "Require Pro for money transaction deletes"
  on public.money_transactions;
create policy "Require Pro for money transaction deletes"
on public.money_transactions as restrictive
for delete to authenticated
using (auth.uid() = user_id and public.has_active_recordium_pro(auth.uid()));
