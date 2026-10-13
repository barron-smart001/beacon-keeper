-- Enforces the paid-subscription rules in the database itself. These
-- definitions already exist in supabase/schema.sql but were never applied to
-- the live project, which left two gaps:
--   1. Any signed-in user could edit their own profile and grant themselves
--      Pro (subscription_status / plan / expiry).
--   2. The database accepted trades, money records, rules, goals and accounts
--      from users without an active subscription; only the UI blocked them.
-- Reads are unaffected. The user's first account and first rule are still
-- allowed during onboarding, before they have subscribed.
-- Idempotent: safe to run more than once.
begin;

-- Stops browsers changing subscription fields (only trusted server code can).

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

-- Subscription checks used by the policies below.
create or replace function public.has_active_meridian_pro(p_user_id uuid)
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

revoke all on function public.has_active_meridian_pro(uuid)
  from public, anon, authenticated;
grant execute on function public.has_active_meridian_pro(uuid)
  to authenticated;
revoke all on function public.can_create_initial_record(uuid, text)
  from public, anon, authenticated;
grant execute on function public.can_create_initial_record(uuid, text)
  to authenticated;

-- Pro-only write access for each record type.
drop policy if exists "Require Pro for account inserts" on public.accounts;
create policy "Require Pro for account inserts"
on public.accounts as restrictive
for insert to authenticated
with check (
  auth.uid() = user_id
  and (
    public.has_active_meridian_pro(auth.uid())
    or public.can_create_initial_record(auth.uid(), 'accounts')
  )
);
drop policy if exists "Require Pro for account updates" on public.accounts;
create policy "Require Pro for account updates"
on public.accounts as restrictive
for update to authenticated
using (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()))
with check (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()));
drop policy if exists "Require Pro for account deletes" on public.accounts;
create policy "Require Pro for account deletes"
on public.accounts as restrictive
for delete to authenticated
using (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()));

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
    public.has_active_meridian_pro(auth.uid())
    or public.can_create_initial_record(auth.uid(), 'trading_rules')
  )
);
drop policy if exists "Require Pro for trading rule updates" on public.trading_rules;
create policy "Require Pro for trading rule updates"
on public.trading_rules as restrictive
for update to authenticated
using (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()))
with check (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()));
drop policy if exists "Require Pro for trading rule deletes" on public.trading_rules;
create policy "Require Pro for trading rule deletes"
on public.trading_rules as restrictive
for delete to authenticated
using (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()));

drop policy if exists "Users can manage their trading rules" on public.trading_rules;
create policy "Users can manage their trading rules"
on public.trading_rules for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Require Pro for goal inserts" on public.goals;
create policy "Require Pro for goal inserts"
on public.goals as restrictive
for insert to authenticated
with check (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()));
drop policy if exists "Require Pro for goal updates" on public.goals;
create policy "Require Pro for goal updates"
on public.goals as restrictive
for update to authenticated
using (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()))
with check (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()));
drop policy if exists "Require Pro for goal deletes" on public.goals;
create policy "Require Pro for goal deletes"
on public.goals as restrictive
for delete to authenticated
using (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()));

drop policy if exists "Users can manage their goals" on public.goals;
create policy "Users can manage their goals"
on public.goals for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Require Pro for trade inserts" on public.trades;
create policy "Require Pro for trade inserts"
on public.trades as restrictive
for insert to authenticated
with check (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()));
drop policy if exists "Require Pro for trade updates" on public.trades;
create policy "Require Pro for trade updates"
on public.trades as restrictive
for update to authenticated
using (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()))
with check (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()));
drop policy if exists "Require Pro for trade deletes" on public.trades;
create policy "Require Pro for trade deletes"
on public.trades as restrictive
for delete to authenticated
using (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()));

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
with check (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()));
drop policy if exists "Require Pro for money transaction updates"
  on public.money_transactions;
create policy "Require Pro for money transaction updates"
on public.money_transactions as restrictive
for update to authenticated
using (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()))
with check (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()));
drop policy if exists "Require Pro for money transaction deletes"
  on public.money_transactions;
create policy "Require Pro for money transaction deletes"
on public.money_transactions as restrictive
for delete to authenticated
using (auth.uid() = user_id and public.has_active_meridian_pro(auth.uid()));


commit;
