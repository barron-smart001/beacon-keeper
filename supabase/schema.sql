-- =========================================================
-- MERIDIAN MONEY TRANSACTIONS
-- =========================================================

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


-- Enable Row Level Security
alter table public.money_transactions enable row level security;


-- Recreate policy safely
drop policy if exists "Users can manage their money transactions"
on public.money_transactions;


create policy "Users can manage their money transactions"
on public.money_transactions
for all
using (auth.uid() = user_id)
with check (auth.uid() = user_id);