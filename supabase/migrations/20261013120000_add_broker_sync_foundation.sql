-- Broker (MetaApi / MT5) sync foundation. Additive only: no existing table is
-- dropped or rewritten, and existing manual trades keep source = 'manual'.
--
-- P&L convention for broker trades (see trades.pnl below):
--   MT5 reports profit, commission and swap as separate deal fields.
--   gross_profit = sum(profit); commission and swap are stored as reported
--   (negative = cost); pnl (net) = gross_profit + commission + swap.
--   Each component is counted exactly once, in the trade normalizer.

begin;

-- ---------------------------------------------------------------------------
-- Ownership proof: lets other tables reference (account, owner) together so a
-- foreign key alone proves the account belongs to the same user.
-- ---------------------------------------------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
     where conname = 'accounts_id_user_id_key'
       and conrelid = 'public.accounts'::regclass
  ) then
    alter table public.accounts
      add constraint accounts_id_user_id_key unique (id, user_id);
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- broker_connections
-- Holds only the provider's account id. Broker passwords are never stored.
-- ---------------------------------------------------------------------------
create table public.broker_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null,
  provider text not null default 'metaapi' check (provider = 'metaapi'),
  platform text not null default 'mt5' check (platform = 'mt5'),
  broker text not null default 'exness',
  provider_account_id text not null check (char_length(trim(provider_account_id)) > 0),
  login text not null check (login ~ '^[0-9]{1,20}$'),
  server text not null check (char_length(trim(server)) > 0),
  status text not null default 'pending'
    check (status in ('pending', 'connected', 'error', 'disconnected')),
  last_error_code text,
  last_error_message text check (char_length(last_error_message) <= 300),
  last_synced_at timestamptz,
  last_sync_status text check (last_sync_status in ('success', 'partial', 'failed')),
  -- Deals up to this time are safely imported; the next sync re-reads a
  -- small overlap before it to catch late or corrected records.
  sync_checkpoint timestamptz,
  sync_locked_until timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint broker_connections_account_owner_fkey
    foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete restrict,
  constraint broker_connections_id_user_id_key unique (id, user_id),
  constraint broker_connections_provider_account_key
    unique (provider, provider_account_id)
);

-- One live connection per MT5 login/server per user; disconnected rows are kept
-- for history without blocking a reconnect.
create unique index broker_connections_active_login_idx
  on public.broker_connections (user_id, server, login)
  where status <> 'disconnected';

create index broker_connections_user_idx
  on public.broker_connections (user_id, created_at desc);

create trigger broker_connections_updated_at
before update on public.broker_connections
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- broker_deals: raw provider deals, one row per MT5 deal. Idempotent import
-- key is (connection_id, provider_deal_id).
-- ---------------------------------------------------------------------------
create table public.broker_deals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  connection_id uuid not null,
  provider_deal_id text not null check (char_length(trim(provider_deal_id)) > 0),
  provider_order_id text,
  provider_position_id text,
  symbol text,
  deal_type text not null,
  entry_type text,
  volume numeric check (volume is null or volume >= 0),
  price numeric,
  profit numeric not null default 0,
  commission numeric not null default 0,
  swap numeric not null default 0,
  deal_time timestamptz not null,
  imported_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint broker_deals_connection_owner_fkey
    foreign key (connection_id, user_id)
    references public.broker_connections (id, user_id) on delete cascade,
  constraint broker_deals_unique_deal unique (connection_id, provider_deal_id)
);

create index broker_deals_position_idx
  on public.broker_deals (connection_id, provider_position_id);
create index broker_deals_time_idx
  on public.broker_deals (connection_id, deal_time desc);
create index broker_deals_user_idx
  on public.broker_deals (user_id);

create trigger broker_deals_updated_at
before update on public.broker_deals
for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- broker_sync_runs: sanitized history of every sync attempt.
-- ---------------------------------------------------------------------------
create table public.broker_sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  connection_id uuid not null,
  trigger text not null check (trigger in ('scheduled', 'manual', 'initial')),
  status text not null default 'running'
    check (status in ('running', 'success', 'partial', 'failed')),
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  deals_fetched integer not null default 0 check (deals_fetched >= 0),
  deals_imported integer not null default 0 check (deals_imported >= 0),
  trades_upserted integer not null default 0 check (trades_upserted >= 0),
  error_code text,
  error_message text check (char_length(error_message) <= 300),
  constraint broker_sync_runs_connection_owner_fkey
    foreign key (connection_id, user_id)
    references public.broker_connections (id, user_id) on delete cascade
);

create index broker_sync_runs_connection_idx
  on public.broker_sync_runs (connection_id, started_at desc);

-- ---------------------------------------------------------------------------
-- trades: additive columns for broker-originated rows
-- ---------------------------------------------------------------------------
alter table public.trades
  add column source text not null default 'manual'
    check (source in ('manual', 'broker')),
  add column account_id uuid,
  add column broker_connection_id uuid,
  add column broker_position_id text,
  add column opened_at timestamptz,
  add column closed_at timestamptz,
  add column gross_profit numeric,
  add column commission numeric,
  add column swap numeric;

alter table public.trades
  add constraint trades_account_owner_fkey
    foreign key (account_id, user_id)
    references public.accounts (id, user_id) on delete set null (account_id),
  add constraint trades_broker_connection_owner_fkey
    foreign key (broker_connection_id, user_id)
    references public.broker_connections (id, user_id) on delete cascade,
  add constraint trades_broker_fields_check check (
    (source = 'manual'
       and broker_connection_id is null and broker_position_id is null)
    or (source = 'broker'
       and broker_connection_id is not null and broker_position_id is not null)
  );

-- One Meridian trade per broker position; makes position upserts idempotent.
create unique index trades_broker_position_key
  on public.trades (broker_connection_id, broker_position_id)
  where source = 'broker';

create index trades_user_closed_idx
  on public.trades (user_id, closed_at desc);

-- ---------------------------------------------------------------------------
-- Row Level Security
-- Clients may read their own broker data and nothing else. There are no
-- insert/update/delete policies, and table privileges are revoked as well, so
-- only the trusted backend (service role) can write.
-- ---------------------------------------------------------------------------
alter table public.broker_connections enable row level security;
alter table public.broker_deals enable row level security;
alter table public.broker_sync_runs enable row level security;

create policy "Users can view their broker connections"
on public.broker_connections for select to authenticated
using (auth.uid() = user_id);

create policy "Users can view their broker deals"
on public.broker_deals for select to authenticated
using (auth.uid() = user_id);

create policy "Users can view their broker sync runs"
on public.broker_sync_runs for select to authenticated
using (auth.uid() = user_id);

revoke all on public.broker_connections from anon, authenticated;
revoke all on public.broker_deals from anon, authenticated;
revoke all on public.broker_sync_runs from anon, authenticated;
grant select on public.broker_connections to authenticated;
grant select on public.broker_deals to authenticated;
grant select on public.broker_sync_runs to authenticated;
-- Hide provider internals and lock state from the browser.
revoke select on public.broker_connections from authenticated;
grant select (
  id, user_id, account_id, provider, platform, broker, login, server, status,
  last_error_code, last_error_message, last_synced_at, last_sync_status,
  created_at, updated_at
) on public.broker_connections to authenticated;

-- Existing "for all" trade policies stay in place. These restrictive policies
-- stop browsers from creating, editing or deleting broker-originated rows, or
-- from marking a manual row as broker data.
create policy "Clients may only insert manual trades"
on public.trades as restrictive
for insert to authenticated
with check (
  source = 'manual'
  and broker_connection_id is null
  and broker_position_id is null
);

create policy "Clients may only update manual trades"
on public.trades as restrictive
for update to authenticated
using (source = 'manual')
with check (
  source = 'manual'
  and broker_connection_id is null
  and broker_position_id is null
);

create policy "Clients may only delete manual trades"
on public.trades as restrictive
for delete to authenticated
using (source = 'manual');

-- ---------------------------------------------------------------------------
-- Sync lock: atomically claims a connection so concurrent syncs (cron, Sync
-- Now, double clicks) cannot overlap. A crashed run frees itself when the
-- lease expires.
-- ---------------------------------------------------------------------------
create or replace function public.claim_broker_sync(
  p_connection_id uuid,
  p_lease_seconds integer default 120
)
returns boolean
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  claimed integer;
begin
  if auth.role() is distinct from 'service_role' then
    raise exception using
      errcode = '42501',
      message = 'Only trusted server-side sync may claim a broker connection.';
  end if;

  update public.broker_connections
     set sync_locked_until = now() + make_interval(secs => greatest(p_lease_seconds, 10))
   where id = p_connection_id
     and status in ('pending', 'connected', 'error')
     and (sync_locked_until is null or sync_locked_until < now());

  get diagnostics claimed = row_count;
  return claimed = 1;
end;
$$;

revoke all on function public.claim_broker_sync(uuid, integer)
  from public, anon, authenticated;
grant execute on function public.claim_broker_sync(uuid, integer)
  to service_role;

-- ---------------------------------------------------------------------------
-- Account data deletion must also clear broker data, because connections
-- restrict deletion of the account they point at.
-- ---------------------------------------------------------------------------
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
  delete from public.broker_connections where user_id = requesting_user_id;
  delete from public.money_transactions where user_id = requesting_user_id;
  delete from public.goals where user_id = requesting_user_id;
  delete from public.trading_rules where user_id = requesting_user_id;
  delete from public.accounts where user_id = requesting_user_id;
  delete from public.profiles where id = requesting_user_id;
end;
$$;

commit;
