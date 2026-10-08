-- Caches each message's translations so a message is only sent to Azure Translator once per
-- language, no matter how many times either side opens the chat.
-- Run once in the Supabase SQL Editor, after 0001–0004.

alter table public.messages
  add column translations jsonb not null default '{}'::jsonb;

-- Saves one language's translation for a message. Security-definer so a sender/recipient can add
-- to the shared cache without a broader UPDATE grant on the row (body, read_at, etc. stay as they
-- were — this only ever merges one key into the JSON object).
create or replace function public.save_message_translation(p_message_id uuid, p_lang text, p_text text)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not exists (
    select 1 from public.messages
    where id = p_message_id and auth.uid() in (sender_id, recipient_id)
  ) then
    raise exception 'not_found' using errcode = 'P0002';
  end if;
  update public.messages
    set translations = translations || jsonb_build_object(p_lang, p_text)
    where id = p_message_id;
end;
$$;

revoke execute on function public.save_message_translation(uuid, text, text) from public, anon;
grant execute on function public.save_message_translation(uuid, text, text) to authenticated;
