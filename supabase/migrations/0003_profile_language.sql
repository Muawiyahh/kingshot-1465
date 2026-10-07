-- Kingdom 1465 — each player's preferred site language.
-- Run once in the Supabase SQL editor after 0002_kingdom_settings.sql.

alter table public.profiles
  add column language text not null default 'en'
  check (language in ('en', 'de', 'zh-cn', 'zh-tw', 'fr', 'es', 'id', 'tl', 'pt-br', 'ko'));

-- Players already update their own row through the profiles_update policy;
-- the guard trigger only protects role, status and game_id, so no policy changes are needed.
