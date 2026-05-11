-- KRILIX TALK — FULL PACK 5 MIGRATION
-- Privát hang- és videóhívások WebRTC jelzéssel

create table if not exists public.calls (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  caller_id uuid not null references public.profiles(id) on delete cascade,
  callee_id uuid not null references public.profiles(id) on delete cascade,
  type text not null check (type in ('audio', 'video')),
  status text not null default 'ringing'
    check (status in ('ringing', 'answered', 'declined', 'cancelled', 'ended', 'missed')),
  created_at timestamptz not null default now(),
  answered_at timestamptz,
  ended_at timestamptz
);

create index if not exists calls_callee_created_idx
  on public.calls (callee_id, created_at desc);

create index if not exists calls_conversation_created_idx
  on public.calls (conversation_id, created_at desc);

alter table public.calls enable row level security;
grant select, insert, update on public.calls to authenticated;

drop policy if exists "calls_select_participants" on public.calls;
create policy "calls_select_participants"
on public.calls
for select
to authenticated
using (
  auth.uid() in (caller_id, callee_id)
  and public.is_conversation_member(conversation_id, auth.uid())
);

drop policy if exists "calls_insert_caller" on public.calls;
create policy "calls_insert_caller"
on public.calls
for insert
to authenticated
with check (
  caller_id = auth.uid()
  and callee_id <> auth.uid()
  and public.is_conversation_member(conversation_id, auth.uid())
  and public.is_conversation_member(conversation_id, callee_id)
);

drop policy if exists "calls_update_participants" on public.calls;
create policy "calls_update_participants"
on public.calls
for update
to authenticated
using (
  auth.uid() in (caller_id, callee_id)
  and public.is_conversation_member(conversation_id, auth.uid())
)
with check (
  auth.uid() in (caller_id, callee_id)
  and public.is_conversation_member(conversation_id, auth.uid())
);

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'calls'
  ) then
    alter publication supabase_realtime add table public.calls;
  end if;
end $$;
