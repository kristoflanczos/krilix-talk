-- KRILIX TALK — FULL PACK 3 MIGRATION
-- Hangüzenet, GIF, matrica, továbbítás, link preview meta

alter table public.messages
  add column if not exists metadata jsonb not null default '{}'::jsonb,
  add column if not exists forwarded_from uuid references public.messages(id) on delete set null;

alter table public.messages
  drop constraint if exists messages_message_type_check;

alter table public.messages
  add constraint messages_message_type_check
  check (message_type in ('text', 'image', 'file', 'audio', 'gif', 'sticker'));

alter table public.messages
  drop constraint if exists messages_body_check;

alter table public.messages
  add constraint messages_body_check
  check (
    char_length(body) <= 4000
    and (
      char_length(body) >= 1
      or message_type in ('image', 'file', 'audio', 'gif', 'sticker')
    )
  );
