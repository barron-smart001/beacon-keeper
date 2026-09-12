-- =========================================================
-- MERIDIAN CORE DATA MODEL
-- Apply this file in the Supabase SQL editor before using the app.
-- =========================================================

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
create policy "Users can manage their profile"
on public.profiles for all
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can manage their accounts" on public.accounts;
create policy "Users can manage their accounts"
on public.accounts for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their trading rules" on public.trading_rules;
create policy "Users can manage their trading rules"
on public.trading_rules for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their goals" on public.goals;
create policy "Users can manage their goals"
on public.goals for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can manage their trades" on public.trades;
create policy "Users can manage their trades"
on public.trades for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);
