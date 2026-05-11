-- KRILIX TALK — FULL PACK 1 MIGRATION
-- Ezt futtasd le egyszer a jelenlegi adatbázisodon.

alter table public.profiles
  add column if not exists avatar_path text;

alter table public.messages
  add column if not exists deleted_at timestamptz;

create table if not exists public.conversation_user_settings (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  favorite boolean not null default false,
  archived boolean not null default false,
  muted boolean not null default false,
  deleted_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

alter table public.conversation_user_settings enable row level security;

grant select, insert, update, delete on public.conversation_user_settings to authenticated;

drop policy if exists "conversation_user_settings_select_self" on public.conversation_user_settings;
create policy "conversation_user_settings_select_self"
on public.conversation_user_settings
for select
to authenticated
using (
  user_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
);

drop policy if exists "conversation_user_settings_insert_self" on public.conversation_user_settings;
create policy "conversation_user_settings_insert_self"
on public.conversation_user_settings
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
);

drop policy if exists "conversation_user_settings_update_self" on public.conversation_user_settings;
create policy "conversation_user_settings_update_self"
on public.conversation_user_settings
for update
to authenticated
using (
  user_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
)
with check (
  user_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
);

drop policy if exists "conversation_user_settings_delete_self" on public.conversation_user_settings;
create policy "conversation_user_settings_delete_self"
on public.conversation_user_settings
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
);

insert into storage.buckets (id, name, public)
values ('avatars', 'avatars', true)
on conflict (id) do nothing;

drop policy if exists "avatars_select_public" on storage.objects;
create policy "avatars_select_public"
on storage.objects
for select
to public
using (bucket_id = 'avatars');

drop policy if exists "avatars_insert_own_folder" on storage.objects;
create policy "avatars_insert_own_folder"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_update_own_folder" on storage.objects;
create policy "avatars_update_own_folder"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "avatars_delete_own_folder" on storage.objects;
create policy "avatars_delete_own_folder"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'avatars'
  and (storage.foldername(name))[1] = auth.uid()::text
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_user_settings'
  ) then
    alter publication supabase_realtime add table public.conversation_user_settings;
  end if;
end $$;
