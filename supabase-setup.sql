-- KRILIX TALK - PHASE 1 BACKEND
-- Futtasd le egyszer a Supabase SQL Editorban.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique not null,
  display_name text not null,
  avatar text not null default 'U',
  created_at timestamptz not null default now()
);

create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  title text,
  is_group boolean not null default false,
  created_by uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.conversation_members (
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (conversation_id, user_id)
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);

create index if not exists conversation_members_user_id_idx
  on public.conversation_members(user_id);

create index if not exists messages_conversation_created_idx
  on public.messages(conversation_id, created_at);

alter table public.profiles enable row level security;
alter table public.conversations enable row level security;
alter table public.conversation_members enable row level security;
alter table public.messages enable row level security;

create or replace function public.is_conversation_member(target_conversation uuid, target_user uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversation_members
    where conversation_id = target_conversation
      and user_id = target_user
  );
$$;

grant execute on function public.is_conversation_member(uuid, uuid) to authenticated;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated"
on public.profiles
for select
to authenticated
using (true);

drop policy if exists "profiles_insert_self" on public.profiles;
create policy "profiles_insert_self"
on public.profiles
for insert
to authenticated
with check (id = auth.uid());

drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

drop policy if exists "conversations_select_members" on public.conversations;
create policy "conversations_select_members"
on public.conversations
for select
to authenticated
using (public.is_conversation_member(id, auth.uid()));

drop policy if exists "conversations_insert_creator" on public.conversations;
create policy "conversations_insert_creator"
on public.conversations
for insert
to authenticated
with check (created_by = auth.uid());

drop policy if exists "conversation_members_select_members" on public.conversation_members;
create policy "conversation_members_select_members"
on public.conversation_members
for select
to authenticated
using (public.is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "conversation_members_insert_creator" on public.conversation_members;
create policy "conversation_members_insert_creator"
on public.conversation_members
for insert
to authenticated
with check (
  exists (
    select 1
    from public.conversations
    where id = conversation_id
      and created_by = auth.uid()
  )
);

drop policy if exists "messages_select_members" on public.messages;
create policy "messages_select_members"
on public.messages
for select
to authenticated
using (public.is_conversation_member(conversation_id, auth.uid()));

drop policy if exists "messages_insert_members" on public.messages;
create policy "messages_insert_members"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
);

alter publication supabase_realtime add table public.messages;
alter publication supabase_realtime add table public.conversations;
alter publication supabase_realtime add table public.conversation_members;


-- ---- PHASE 1 FIX: table grants + automatic profile creation ----

grant usage on schema public to anon, authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.conversations to authenticated;
grant select, insert, update, delete on public.conversation_members to authenticated;
grant select, insert, update, delete on public.messages to authenticated;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, avatar)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)), 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = excluded.display_name,
    avatar = excluded.avatar;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row execute procedure public.handle_new_user();
