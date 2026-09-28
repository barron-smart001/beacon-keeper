-- Meridian Paystack payment ledger
-- Safe, server-side-only transaction tracking for subscription payments.
-- Run this in the Supabase SQL editor.

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

-- No browser write access. Only trusted server-side code may create or mutate records.
drop policy if exists "Users can view their own payment records" on public.payment_transactions;
create policy "Users can view their own payment records"
on public.payment_transactions
for select
using (auth.uid() = user_id);

-- No insert policy: browser cannot create a successful payment record.
-- No update policy: browser cannot modify status, amount, reference, provider, or paid_at.
-- No delete policy: payment history remains immutable from the client.

comment on table public.payment_transactions is 'Server-controlled Paystack payment ledger for Meridian subscription tracking.';
comment on column public.payment_transactions.user_id is 'Authenticated Meridian user owning the payment record.';
comment on column public.payment_transactions.reference is 'Unique Paystack transaction reference used to prevent duplicate processing.';
comment on column public.payment_transactions.amount is 'Monetary amount captured for the payment in the transaction currency.';
comment on column public.payment_transactions.currency is 'ISO currency code for the payment, typically NGN.';
comment on column public.payment_transactions.status is 'Lifecycle status of the Paystack transaction.';
comment on column public.payment_transactions.provider is 'Provider name for the payment record; must be paystack.';
comment on column public.payment_transactions.paid_at is 'Timestamp when the payment was confirmed by the provider.';
comment on column public.payment_transactions.created_at is 'Server-side timestamp when the payment record was inserted.';
