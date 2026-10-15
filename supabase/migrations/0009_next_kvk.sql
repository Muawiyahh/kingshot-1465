-- Kingdom 1465 — the next KvK's start, set by leaders in Admin → KvK → Next KvK. The homepage's
-- Next KvK card counts down to it. Stored in UTC. Leaders can already edit kingdom_settings (0002).
-- Run once in the Supabase SQL Editor, after 0008. Safe to run twice.

alter table public.kingdom_settings add column if not exists next_kvk_at timestamptz;
