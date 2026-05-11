-- KRILIX TALK - PHASE 2 MIGRATION
-- Ezt futtasd le egyszer a már működő Phase 1 adatbázisodon.

-- 1) Existing policy fix: a létrehozó rögtön láthassa a frissen létrehozott beszélgetést
drop policy if exists "conversations_select_members" on public.conversations;
create policy "conversations_select_members"
on public.conversations
for select
to authenticated
using (
  created_by = auth.uid()
  or public.is_conversation_member(id, auth.uid())
);

-- 2) Profil extra mezők
alter table public.profiles
  add column if not exists status text not null default 'online'
    check (status in ('online', 'away', 'busy')),
  add column if not exists updated_at timestamptz not null default now();

-- 3) Üzenet extra mezők
alter table public.messages
  add column if not exists message_type text not null default 'text'
    check (message_type in ('text', 'image', 'file')),
  add column if not exists attachment_path text,
  add column if not exists attachment_name text,
  add column if not exists attachment_type text,
  add column if not exists attachment_size bigint,
  add column if not exists reply_to uuid references public.messages(id) on delete set null,
  add column if not exists edited_at timestamptz,
  add column if not exists pinned boolean not null default false;

-- 4) Olvasottság
create table if not exists public.conversation_reads (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

-- 5) Reakciók
create table if not exists public.message_reactions (
  message_id uuid not null references public.messages(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (char_length(reaction) between 1 and 16),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);

create index if not exists conversation_reads_user_idx
  on public.conversation_reads(user_id);

create index if not exists message_reactions_message_idx
  on public.message_reactions(message_id);

-- 6) Segédfüggvény reakció RLS-hez
create or replace function public.is_message_member(target_message uuid, target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.messages m
    where m.id = target_message
      and public.is_conversation_member(m.conversation_id, target_user)
  );
$$;

grant execute on function public.is_message_member(uuid, uuid) to authenticated;

-- 7) Jogosultságok
grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.conversation_members to authenticated;
grant select, insert, update, delete on public.messages to authenticated;
grant select, insert, update, delete on public.conversation_reads to authenticated;
grant select, insert, update, delete on public.message_reactions to authenticated;

-- 8) RLS az új táblákhoz
alter table public.conversation_reads enable row level security;
alter table public.message_reactions enable row level security;

drop policy if exists "conversation_reads_select_members" on public.conversation_reads;
create policy "conversation_reads_select_members"
on public.conversation_reads
for select
to authenticated
using (public.is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "conversation_reads_insert_self" on public.conversation_reads;
create policy "conversation_reads_insert_self"
on public.conversation_reads
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
);

drop policy if exists "conversation_reads_update_self" on public.conversation_reads;
create policy "conversation_reads_update_self"
on public.conversation_reads
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

drop policy if exists "message_reactions_select_members" on public.message_reactions;
create policy "message_reactions_select_members"
on public.message_reactions
for select
to authenticated
using (public.is_message_member(message_id, auth.uid()));

drop policy if exists "message_reactions_insert_self" on public.message_reactions;
create policy "message_reactions_insert_self"
on public.message_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
  and public.is_message_member(message_id, auth.uid())
);

drop policy if exists "message_reactions_delete_self" on public.message_reactions;
create policy "message_reactions_delete_self"
on public.message_reactions
for delete
to authenticated
using (
  user_id = auth.uid()
  and public.is_message_member(message_id, auth.uid())
);

-- 9) Üzenet frissítés: saját üzenet szerkesztése; kitűzés beszélgetés-tagoknak
drop policy if exists "messages_update_sender" on public.messages;
create policy "messages_update_sender"
on public.messages
for update
to authenticated
using (
  sender_id = auth.uid()
  or public.is_conversation_member(conversation_id, auth.uid())
)
with check (
  public.is_conversation_member(conversation_id, auth.uid())
);

-- 10) Storage bucket privát chat fájlokhoz
insert into storage.buckets (id, name, public)
values ('chat-files', 'chat-files', false)
on conflict (id) do nothing;

-- A fájlútvonal első mappája a conversation_id:
-- <conversation_id>/<user_id>/<uuid-filename>
drop policy if exists "chat_files_select_members" on storage.objects;
create policy "chat_files_select_members"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'chat-files'
  and public.is_conversation_member((storage.foldername(name))[1]::uuid, auth.uid())
);

drop policy if exists "chat_files_insert_members" on storage.objects;
create policy "chat_files_insert_members"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'chat-files'
  and public.is_conversation_member((storage.foldername(name))[1]::uuid, auth.uid())
);

drop policy if exists "chat_files_delete_owner" on storage.objects;
create policy "chat_files_delete_owner"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'chat-files'
  and owner_id = auth.uid()::text
);

-- 11) Realtime az új táblákhoz, hiba nélkül többszöri futtatás esetén is
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'conversation_reads'
  ) then
    alter publication supabase_realtime add table public.conversation_reads;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'message_reactions'
  ) then
    alter publication supabase_realtime add table public.message_reactions;
  end if;
end $$;


-- KRILIX TALK - PHASE 2 ATTACHMENT FIX
-- Ezt futtasd le, hogy kép/fájl küldhető legyen szöveg nélkül is.

alter table public.messages
  drop constraint if exists messages_body_check;

alter table public.messages
  add constraint messages_body_check
  check (
    char_length(body) <= 4000
    and (
      char_length(body) >= 1
      or message_type in ('image', 'file')
    )
  );
