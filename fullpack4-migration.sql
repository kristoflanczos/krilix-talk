-- KRILIX TALK — FULL PACK 4 MIGRATION
-- Fiók, rendszer, utoljára aktív, tiltás és web push

alter table public.profiles
  add column if not exists last_seen_at timestamptz;

create table if not exists public.user_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);

alter table public.user_blocks enable row level security;
grant select, insert, delete on public.user_blocks to authenticated;

drop policy if exists "user_blocks_select_self" on public.user_blocks;
create policy "user_blocks_select_self"
on public.user_blocks
for select
to authenticated
using (blocker_id = auth.uid());

drop policy if exists "user_blocks_insert_self" on public.user_blocks;
create policy "user_blocks_insert_self"
on public.user_blocks
for insert
to authenticated
with check (blocker_id = auth.uid());

drop policy if exists "user_blocks_delete_self" on public.user_blocks;
create policy "user_blocks_delete_self"
on public.user_blocks
for delete
to authenticated
using (blocker_id = auth.uid());

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  subscription jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.push_subscriptions enable row level security;
grant select, insert, update, delete on public.push_subscriptions to authenticated;

drop policy if exists "push_subscriptions_select_self" on public.push_subscriptions;
create policy "push_subscriptions_select_self"
on public.push_subscriptions
for select
to authenticated
using (user_id = auth.uid());

drop policy if exists "push_subscriptions_insert_self" on public.push_subscriptions;
create policy "push_subscriptions_insert_self"
on public.push_subscriptions
for insert
to authenticated
with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_update_self" on public.push_subscriptions;
create policy "push_subscriptions_update_self"
on public.push_subscriptions
for update
to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

drop policy if exists "push_subscriptions_delete_self" on public.push_subscriptions;
create policy "push_subscriptions_delete_self"
on public.push_subscriptions
for delete
to authenticated
using (user_id = auth.uid());

create or replace function public.is_direct_conversation_blocked(target_conversation uuid, target_sender uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.conversations c
    join public.conversation_members cm
      on cm.conversation_id = c.id
     and cm.user_id <> target_sender
    join public.user_blocks b
      on (
        (b.blocker_id = target_sender and b.blocked_id = cm.user_id)
        or
        (b.blocker_id = cm.user_id and b.blocked_id = target_sender)
      )
    where c.id = target_conversation
      and c.is_group = false
  );
$$;

grant execute on function public.is_direct_conversation_blocked(uuid, uuid) to authenticated;

drop policy if exists "messages_insert_members" on public.messages;
create policy "messages_insert_members"
on public.messages
for insert
to authenticated
with check (
  sender_id = auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
  and not public.is_direct_conversation_blocked(conversation_id, sender_id)
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'user_blocks'
  ) then
    alter publication supabase_realtime add table public.user_blocks;
  end if;
end $$;
