-- Meridian's initial application schema.
-- Run this once in the Supabase SQL editor for a new project.

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  trading_style text,
  default_currency text not null default 'USD',
  onboarding_completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  currency text not null default 'USD',
  created_at timestamptz not null default now()
);

create table if not exists public.trading_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  description text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.trades (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  instrument text not null,
  direction text not null check (direction in ('long', 'short')),
  status text not null check (status in ('active', 'completed', 'cancelled')),
  entry numeric not null check (entry > 0),
  exit numeric check (exit is null or exit > 0),
  size numeric not null check (size > 0),
  pnl numeric,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists accounts_user_id_idx on public.accounts(user_id);
create index if not exists trading_rules_user_id_idx on public.trading_rules(user_id);
create index if not exists trades_user_created_idx on public.trades(user_id, created_at desc);

alter table public.profiles enable row level security;
alter table public.accounts enable row level security;
alter table public.trading_rules enable row level security;
alter table public.trades enable row level security;

create policy "Users can manage their profile" on public.profiles for all using (auth.uid() = id) with check (auth.uid() = id);
create policy "Users can manage their accounts" on public.accounts for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their rules" on public.trading_rules for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Users can manage their trades" on public.trades for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
