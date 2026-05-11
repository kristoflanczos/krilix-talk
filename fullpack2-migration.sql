-- KRILIX TALK — FULL PACK 2 MIGRATION
-- Csoportos chat, admin jogok, csoportkép

alter table public.conversations
  add column if not exists avatar_path text;

alter table public.conversation_members
  add column if not exists role text not null default 'member'
    check (role in ('owner', 'admin', 'member'));

update public.conversation_members cm
set role = 'owner'
from public.conversations c
where cm.conversation_id = c.id
  and cm.user_id = c.created_by
  and cm.role = 'member';

create or replace function public.is_conversation_admin(target_conversation uuid, target_user uuid)
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
      and role in ('owner', 'admin')
  );
$$;

create or replace function public.is_conversation_owner(target_conversation uuid, target_user uuid)
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
      and role = 'owner'
  );
$$;

grant execute on function public.is_conversation_admin(uuid, uuid) to authenticated;
grant execute on function public.is_conversation_owner(uuid, uuid) to authenticated;

create or replace function public.create_group(group_title text, member_emails text[] default array[]::text[])
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_conversation_id uuid;
begin
  if nullif(btrim(group_title), '') is null then
    raise exception 'A csoport neve kötelező.';
  end if;

  insert into public.conversations (title, is_group, created_by)
  values (btrim(group_title), true, auth.uid())
  returning id into new_conversation_id;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (new_conversation_id, auth.uid(), 'owner');

  insert into public.conversation_members (conversation_id, user_id, role)
  select new_conversation_id, p.id, 'member'
  from public.profiles p
  where lower(p.email) = any (
    select lower(unnest(coalesce(member_emails, array[]::text[])))
  )
    and p.id <> auth.uid()
  on conflict do nothing;

  return new_conversation_id;
end;
$$;

grant execute on function public.create_group(text, text[]) to authenticated;

create or replace function public.add_group_member(target_conversation uuid, target_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_user uuid;
begin
  if not public.is_conversation_admin(target_conversation, auth.uid()) then
    raise exception 'Nincs jogosultságod tagot hozzáadni.';
  end if;

  if not exists (
    select 1 from public.conversations
    where id = target_conversation and is_group = true
  ) then
    raise exception 'Ez nem csoportos beszélgetés.';
  end if;

  select id into target_user
  from public.profiles
  where lower(email) = lower(target_email);

  if target_user is null then
    raise exception 'Nincs ilyen regisztrált felhasználó.';
  end if;

  insert into public.conversation_members (conversation_id, user_id, role)
  values (target_conversation, target_user, 'member')
  on conflict do nothing;
end;
$$;

grant execute on function public.add_group_member(uuid, text) to authenticated;

create or replace function public.remove_group_member(target_conversation uuid, target_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target_role text;
begin
  if not public.is_conversation_admin(target_conversation, auth.uid()) then
    raise exception 'Nincs jogosultságod tagot eltávolítani.';
  end if;

  select role into target_role
  from public.conversation_members
  where conversation_id = target_conversation
    and user_id = target_user;

  if target_role is null then
    return;
  end if;

  if target_role = 'owner' then
    raise exception 'A tulajdonos nem távolítható el.';
  end if;

  delete from public.conversation_members
  where conversation_id = target_conversation
    and user_id = target_user;
end;
$$;

grant execute on function public.remove_group_member(uuid, uuid) to authenticated;

create or replace function public.set_group_member_role(target_conversation uuid, target_user uuid, new_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if new_role not in ('admin', 'member') then
    raise exception 'Csak admin vagy tag szerep adható.';
  end if;

  if not public.is_conversation_owner(target_conversation, auth.uid()) then
    raise exception 'Csak a tulajdonos módosíthat jogot.';
  end if;

  if public.is_conversation_owner(target_conversation, target_user) then
    raise exception 'A tulajdonos szerepe nem módosítható.';
  end if;

  update public.conversation_members
  set role = new_role
  where conversation_id = target_conversation
    and user_id = target_user;
end;
$$;

grant execute on function public.set_group_member_role(uuid, uuid, text) to authenticated;

create or replace function public.update_group_details(target_conversation uuid, new_title text, new_avatar_path text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_conversation_admin(target_conversation, auth.uid()) then
    raise exception 'Nincs jogosultságod a csoport szerkesztéséhez.';
  end if;

  update public.conversations
  set
    title = coalesce(nullif(btrim(new_title), ''), title),
    avatar_path = coalesce(new_avatar_path, avatar_path)
  where id = target_conversation
    and is_group = true;
end;
$$;

grant execute on function public.update_group_details(uuid, text, text) to authenticated;

insert into storage.buckets (id, name, public)
values ('group-avatars', 'group-avatars', true)
on conflict (id) do nothing;

drop policy if exists "group_avatars_select_public" on storage.objects;
create policy "group_avatars_select_public"
on storage.objects
for select
to public
using (bucket_id = 'group-avatars');

drop policy if exists "group_avatars_insert_admin" on storage.objects;
create policy "group_avatars_insert_admin"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'group-avatars'
  and public.is_conversation_admin((storage.foldername(name))[1]::uuid, auth.uid())
);

drop policy if exists "group_avatars_update_admin" on storage.objects;
create policy "group_avatars_update_admin"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'group-avatars'
  and public.is_conversation_admin((storage.foldername(name))[1]::uuid, auth.uid())
)
with check (
  bucket_id = 'group-avatars'
  and public.is_conversation_admin((storage.foldername(name))[1]::uuid, auth.uid())
);

drop policy if exists "group_avatars_delete_admin" on storage.objects;
create policy "group_avatars_delete_admin"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'group-avatars'
  and public.is_conversation_admin((storage.foldername(name))[1]::uuid, auth.uid())
);
