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
