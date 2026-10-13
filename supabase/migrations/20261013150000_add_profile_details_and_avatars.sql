-- Professional profile details and profile photos. Additive and idempotent.
begin;

alter table public.profiles
  add column if not exists full_name text
    check (full_name is null or char_length(full_name) <= 80),
  add column if not exists headline text
    check (headline is null or char_length(headline) <= 120),
  add column if not exists country text
    check (country is null or char_length(country) <= 80),
  add column if not exists timezone text
    check (timezone is null or char_length(timezone) <= 64),
  add column if not exists experience_level text
    check (experience_level is null
      or experience_level in ('beginner', 'intermediate', 'advanced', 'professional')),
  add column if not exists avatar_path text
    check (avatar_path is null or char_length(avatar_path) <= 200);

-- Private bucket: photos are only readable by their owner, through short-lived
-- signed URLs. Limited to small images; every policy is scoped to the user's
-- own folder.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars', 'avatars', false, 2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "Users can view their own avatar" on storage.objects;
create policy "Users can view their own avatar"
on storage.objects for select to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can upload their own avatar" on storage.objects;
create policy "Users can upload their own avatar"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can replace their own avatar" on storage.objects;
create policy "Users can replace their own avatar"
on storage.objects for update to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "Users can delete their own avatar" on storage.objects;
create policy "Users can delete their own avatar"
on storage.objects for delete to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

commit;
