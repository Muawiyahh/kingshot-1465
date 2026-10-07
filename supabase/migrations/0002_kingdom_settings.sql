-- Kingdom 1465 — kingdom settings (current King, server open date).
-- Run once in the Supabase SQL editor after 0001_init.sql.

create table public.kingdom_settings (
  id int primary key default 1 check (id = 1), -- single row
  king_name text check (char_length(king_name) <= 40),
  king_alliance text check (char_length(king_alliance) <= 8),
  server_opened_on date,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

insert into public.kingdom_settings (id) values (1);

create trigger kingdom_settings_touch before update on public.kingdom_settings
  for each row execute function public.touch_updated_at();

alter table public.kingdom_settings enable row level security;

-- Public information: anyone can read; only leaders can change it.
create policy kingdom_settings_select on public.kingdom_settings for select using (true);
create policy kingdom_settings_update on public.kingdom_settings for update
  using (public.is_leader()) with check (public.is_leader());

grant select on public.kingdom_settings to anon, authenticated;
grant update on public.kingdom_settings to authenticated;
grant all on public.kingdom_settings to service_role;
