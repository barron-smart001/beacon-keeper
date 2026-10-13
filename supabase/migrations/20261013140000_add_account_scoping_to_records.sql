-- Lets every trade and money record belong to one of the user's accounts.
-- Additive and idempotent. Existing records keep account_id = null and show
-- as "Unassigned" until the user moves them. Safe to run before or after the
-- broker sync migration, which adds the same trades.account_id link.
begin;

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

alter table public.trades add column if not exists account_id uuid;
alter table public.money_transactions add column if not exists account_id uuid;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'trades_account_owner_fkey') then
    alter table public.trades
      add constraint trades_account_owner_fkey
      foreign key (account_id, user_id)
      references public.accounts (id, user_id) on delete set null (account_id);
  end if;

  if not exists (select 1 from pg_constraint where conname = 'money_transactions_account_owner_fkey') then
    alter table public.money_transactions
      add constraint money_transactions_account_owner_fkey
      foreign key (account_id, user_id)
      references public.accounts (id, user_id) on delete set null (account_id);
  end if;
end;
$$;

create index if not exists trades_user_account_idx
  on public.trades (user_id, account_id);
create index if not exists money_transactions_user_account_idx
  on public.money_transactions (user_id, account_id);

commit;
