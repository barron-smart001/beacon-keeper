-- Records that a user accepted the Terms once, so TermsGuard stops
-- redirecting them to /terms on every sign-in. Additive and idempotent.
alter table public.profiles
  add column if not exists terms_accepted boolean not null default false,
  add column if not exists terms_version text,
  add column if not exists terms_accepted_at timestamptz;
