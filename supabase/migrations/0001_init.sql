-- Kingdom 1465 — initial schema
-- Run in the Supabase SQL editor (or `supabase db push`).

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
create type public.user_role as enum ('player', 'leader', 'admin');
create type public.account_status as enum ('pending', 'approved', 'rejected');
create type public.event_status as enum ('draft', 'open', 'closed', 'published');
create type public.application_status as enum ('pending', 'accepted', 'rejected');

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  game_id text not null unique check (game_id ~ '^[0-9]{6,12}$'),
  ingame_name text not null check (char_length(ingame_name) between 1 and 40),
  alliance_tag text check (char_length(alliance_tag) <= 8),
  avatar_url text,
  role public.user_role not null default 'player',
  status public.account_status not null default 'pending',
  created_at timestamptz not null default now()
);

create table public.kvk_events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  season int,
  starts_on date not null,
  status public.event_status not null default 'draft',
  published_at timestamptz,
  created_at timestamptz not null default now()
);

-- One row per position per prep day, e.g. "Day 1 · Construction".
create table public.event_days (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.kvk_events (id) on delete cascade,
  day_number int not null check (day_number between 1 and 7),
  date date not null,
  position text not null check (char_length(position) between 1 and 40),
  slot_minutes int not null default 30 check (slot_minutes in (15, 30, 60)),
  unique (event_id, day_number, position)
);

create table public.slots (
  id uuid primary key default gen_random_uuid(),
  day_id uuid not null references public.event_days (id) on delete cascade,
  slot_index int not null check (slot_index >= 0),
  profile_id uuid references public.profiles (id) on delete set null,
  locked boolean not null default false,
  updated_at timestamptz not null default now(),
  unique (day_id, slot_index)
);
-- A player holds at most one slot per day/position.
create unique index slots_one_per_player_per_day
  on public.slots (day_id, profile_id) where profile_id is not null;

create table public.applications (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid not null references public.profiles (id) on delete cascade,
  day_id uuid not null references public.event_days (id) on delete cascade,
  preferred_slots int[] not null default '{}',
  anytime boolean not null default false,
  speedup_days numeric(8, 1) not null default 0 check (speedup_days >= 0),
  note text check (char_length(note) <= 500),
  status public.application_status not null default 'pending',
  reviewed_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (profile_id, day_id)
);

create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id),
  action text not null,
  target text,
  payload jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Helpers (security definer so policies can check roles without recursion)
-- ---------------------------------------------------------------------------
create or replace function public.is_leader()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role in ('leader', 'admin') and status = 'approved'
  );
$$;

create or replace function public.is_approved()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and status = 'approved'
  );
$$;

create or replace function public.event_is_published(p_day_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.event_days d
    join public.kvk_events e on e.id = d.event_id
    where d.id = p_day_id and e.status = 'published'
  );
$$;

-- Players may not change their own role/status.
create or replace function public.guard_profile_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- SQL editor / service role (no end-user session) may change anything.
  if auth.uid() is null then
    return new;
  end if;
  if not public.is_leader() then
    new.role := old.role;
    new.status := old.status;
    new.game_id := old.game_id;
  end if;
  -- Only admins can grant leader/admin.
  if new.role <> old.role and not exists (
    select 1 from public.profiles where id = auth.uid() and role = 'admin'
  ) then
    new.role := old.role;
  end if;
  return new;
end;
$$;

create trigger profiles_guard before update on public.profiles
  for each row execute function public.guard_profile_update();

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end;
$$;

create trigger slots_touch before update on public.slots
  for each row execute function public.touch_updated_at();
create trigger applications_touch before update on public.applications
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.kvk_events enable row level security;
alter table public.event_days enable row level security;
alter table public.slots enable row level security;
alter table public.applications enable row level security;
alter table public.audit_log enable row level security;

-- profiles: own row or leaders. (Profiles are created server-side with the service role.)
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or public.is_leader());
create policy profiles_update on public.profiles for update
  using (id = auth.uid() or public.is_leader());

-- events/days: everyone can see open/closed/published; leaders see drafts and write.
create policy events_select on public.kvk_events for select
  using (status <> 'draft' or public.is_leader());
create policy events_write on public.kvk_events for all
  using (public.is_leader()) with check (public.is_leader());

create policy days_select on public.event_days for select
  using (
    public.is_leader() or exists (
      select 1 from public.kvk_events e where e.id = event_id and e.status <> 'draft'
    )
  );
create policy days_write on public.event_days for all
  using (public.is_leader()) with check (public.is_leader());

-- slots: public once published; leaders always.
create policy slots_select on public.slots for select
  using (public.is_leader() or public.event_is_published(day_id));
create policy slots_write on public.slots for all
  using (public.is_leader()) with check (public.is_leader());

-- applications: approved players manage their own while the event is open; leaders all.
create policy applications_select on public.applications for select
  using (profile_id = auth.uid() or public.is_leader());
create policy applications_insert on public.applications for insert
  with check (
    profile_id = auth.uid() and public.is_approved() and status = 'pending'
    and exists (
      select 1 from public.event_days d join public.kvk_events e on e.id = d.event_id
      where d.id = day_id and e.status = 'open'
    )
  );
create policy applications_update_own on public.applications for update
  using (profile_id = auth.uid() and status = 'pending')
  with check (
    profile_id = auth.uid() and status = 'pending' and reviewed_by is null
    and exists (
      select 1 from public.event_days d join public.kvk_events e on e.id = d.event_id
      where d.id = day_id and e.status = 'open'
    )
  );
create policy applications_delete_own on public.applications for delete
  using (profile_id = auth.uid() and status = 'pending');
create policy applications_leader on public.applications for all
  using (public.is_leader()) with check (public.is_leader());

create policy audit_select on public.audit_log for select using (public.is_leader());
create policy audit_insert on public.audit_log for insert
  with check (public.is_leader() and actor_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Public schedule view: names of assigned players on published events only.
-- Runs with the owner's rights so anonymous visitors can read names without
-- being able to read the profiles table.
-- ---------------------------------------------------------------------------
create or replace view public.public_schedule as
  select
    s.id as slot_id,
    s.day_id,
    s.slot_index,
    s.locked,
    d.event_id,
    d.day_number,
    d.date,
    d.position,
    d.slot_minutes,
    e.title as event_title,
    e.season,
    p.ingame_name,
    p.alliance_tag,
    p.avatar_url
  from public.slots s
  join public.event_days d on d.id = s.day_id
  join public.kvk_events e on e.id = d.event_id
  left join public.profiles p on p.id = s.profile_id
  where e.status = 'published';

-- ---------------------------------------------------------------------------
-- Table access for the API roles. Newer Supabase projects don't grant these
-- automatically; RLS above still decides which rows each user can touch.
-- ---------------------------------------------------------------------------
grant usage on schema public to anon, authenticated, service_role;
grant select on public.kvk_events, public.event_days, public.slots to anon;
grant select on public.public_schedule to anon, authenticated;
grant select, insert, update, delete on
  public.profiles, public.kvk_events, public.event_days, public.slots,
  public.applications, public.audit_log
  to authenticated;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;
grant execute on function public.is_leader(), public.is_approved(), public.event_is_published(uuid)
  to anon, authenticated;

-- ---------------------------------------------------------------------------
-- Realtime: push slot changes to open schedule pages.
-- ---------------------------------------------------------------------------
alter publication supabase_realtime add table public.slots;
alter publication supabase_realtime add table public.kvk_events;
