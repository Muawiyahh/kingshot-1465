-- Kingdom 1465 — homepage content that leaders edit in Admin → Homepage (each alliance's event
-- times, the weekly Hall of Fame, the Transfer to 1465 section), and transfer accounts: players from
-- other kingdoms who sign up to message the transfer managers.
-- Run once in the Supabase SQL Editor, after 0001–0006. Safe to run twice.

-- Alliance event times: one row per alliance and event (Bear Trap 1, Swordland, …).
create table if not exists public.alliance_events (
  alliance text not null check (alliance ~ '^[A-Z0-9]{1,8}$'),
  event text not null check (event ~ '^[a-z0-9_]{1,24}$'),
  -- UTC time of day as HH:MM; null while the alliance hasn't set it.
  time_utc text check (time_utc ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'),
  -- Days of the week it runs on (0 = Sunday … 6 = Saturday); empty when it has no fixed day.
  weekdays smallint[] not null default '{}' check (weekdays <@ '{0,1,2,3,4,5,6}'::smallint[]),
  note text check (char_length(note) <= 24),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  primary key (alliance, event)
);

-- Hall of Fame: one player per alliance per week, with a quote. Weeks start on Monday (UTC).
create table if not exists public.hall_of_fame (
  week_of date not null check (extract(isodow from week_of) = 1),
  alliance text not null check (alliance ~ '^[A-Z0-9]{1,8}$'),
  player_name text not null check (char_length(player_name) between 1 and 40),
  quote text check (char_length(quote) <= 160),
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null,
  primary key (week_of, alliance)
);

create or replace trigger alliance_events_touch before update on public.alliance_events
  for each row execute function public.touch_updated_at();
create or replace trigger hall_of_fame_touch before update on public.hall_of_fame
  for each row execute function public.touch_updated_at();

alter table public.alliance_events enable row level security;
alter table public.hall_of_fame enable row level security;

-- Public information: anyone can read; only leaders can change it.
drop policy if exists alliance_events_select on public.alliance_events;
create policy alliance_events_select on public.alliance_events for select using (true);
drop policy if exists alliance_events_write on public.alliance_events;
create policy alliance_events_write on public.alliance_events for all
  using (public.is_leader()) with check (public.is_leader());

drop policy if exists hall_of_fame_select on public.hall_of_fame;
create policy hall_of_fame_select on public.hall_of_fame for select using (true);
drop policy if exists hall_of_fame_write on public.hall_of_fame;
create policy hall_of_fame_write on public.hall_of_fame for all
  using (public.is_leader()) with check (public.is_leader());

grant select on public.alliance_events, public.hall_of_fame to anon, authenticated;
grant insert, update, delete on public.alliance_events, public.hall_of_fame to authenticated;
grant all on public.alliance_events, public.hall_of_fame to service_role;

-- Transfer to 1465: the leaders' own pitch (empty = the site's translated default) and kingdom
-- facts ([{label, value}]). The existing kingdom_settings policies apply: anyone reads, leaders update.
alter table public.kingdom_settings
  add column if not exists transfer_pitch text check (char_length(transfer_pitch) <= 400),
  add column if not exists transfer_facts jsonb not null default '[]' check (jsonb_typeof(transfer_facts) = 'array');

-- ---------------------------------------------------------------------------
-- Transfer accounts
-- ---------------------------------------------------------------------------
-- Players from other kingdoms sign up with a transfer account. It's approved straight away, but it
-- can only message the transfer managers (or a leader who wrote to them first) and can't apply for
-- KvK positions. When they move to 1465, a leader turns it into a normal account.
alter table public.profiles
  add column if not exists transfer boolean not null default false,
  add column if not exists from_kingdom int check (from_kingdom between 1 and 99999);

-- Players may not change their own role, status, game ID or account type.
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
    new.transfer := old.transfer;
    new.from_kingdom := old.from_kingdom;
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

-- "Approved" now means an approved member: transfer accounts can't apply for KvK positions.
create or replace function public.is_approved()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles where id = auth.uid() and status = 'approved' and not transfer
  );
$$;

-- The leaders and admins who answer transfer accounts, in display order.
create table if not exists public.transfer_managers (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  note text check (char_length(note) <= 40),
  sort int not null default 0,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

create or replace trigger transfer_managers_touch before update on public.transfer_managers
  for each row execute function public.touch_updated_at();

alter table public.transfer_managers enable row level security;
drop policy if exists transfer_managers_select on public.transfer_managers;
create policy transfer_managers_select on public.transfer_managers for select using (true);
drop policy if exists transfer_managers_write on public.transfer_managers;
create policy transfer_managers_write on public.transfer_managers for all
  using (public.is_leader()) with check (public.is_leader());

grant select on public.transfer_managers to anon, authenticated;
grant insert, update, delete on public.transfer_managers to authenticated;
grant all on public.transfer_managers to service_role;

-- Names for the homepage. Runs with the owner's rights (like public_schedule), so visitors can see
-- the managers without being able to read the profiles table. Only approved leaders and admins count.
create or replace view public.public_transfer_managers as
  select tm.profile_id, p.ingame_name, p.alliance_tag, p.game_id, tm.note, tm.sort
  from public.transfer_managers tm
  join public.profiles p on p.id = tm.profile_id
  where p.role in ('leader', 'admin') and p.status = 'approved';

grant select on public.public_transfer_managers to anon, authenticated;

-- May the signed-in user send a message to p_recipient? As before, plus: transfer accounts may
-- write only to transfer managers, or to a leader who has already written to them.
create or replace function public.can_message(p_recipient uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
    and p_recipient <> auth.uid()
    and exists (select 1 from public.profiles s where s.id = auth.uid() and s.status <> 'rejected')
    and (
      public.is_leader()
      or exists (
        select 1 from public.profiles r
        where r.id = p_recipient and r.role in ('leader', 'admin') and r.status = 'approved'
          and (
            not exists (select 1 from public.profiles s where s.id = auth.uid() and s.transfer)
            or exists (select 1 from public.transfer_managers tm where tm.profile_id = r.id)
            or exists (select 1 from public.messages m where m.sender_id = r.id and m.recipient_id = auth.uid())
          )
      )
    );
$$;

-- Everyone the signed-in user can talk to, newest conversation first. Now also says whether each
-- person is a transfer account (and from which kingdom), and transfer accounts see only the
-- transfer managers plus anyone they already have messages with. The columns changed, so the
-- function is replaced rather than altered.
drop function if exists public.my_conversations();
create function public.my_conversations()
returns table (
  partner_id uuid,
  ingame_name text,
  alliance_tag text,
  role public.user_role,
  transfer boolean,
  from_kingdom int,
  last_body text,
  last_at timestamptz,
  last_from_me boolean,
  unread bigint
)
language sql stable security definer set search_path = public
as $$
  with mine as (
    select
      case when m.sender_id = auth.uid() then m.recipient_id else m.sender_id end as partner,
      m.body, m.created_at, m.sender_id, m.recipient_id, m.read_at
    from public.messages m
    where auth.uid() in (m.sender_id, m.recipient_id)
  ),
  latest as (
    select distinct on (partner) partner, body, created_at, sender_id = auth.uid() as from_me
    from mine
    order by partner, created_at desc
  ),
  unread as (
    select partner, count(*) as n
    from mine
    where recipient_id = auth.uid() and read_at is null
    group by partner
  ),
  me as (
    select coalesce((select transfer from public.profiles where id = auth.uid()), false) as transfer
  )
  select p.id, p.ingame_name, p.alliance_tag, p.role, p.transfer, p.from_kingdom,
    l.body, l.created_at, l.from_me, coalesce(u.n, 0)
  from public.profiles p
  cross join me
  left join latest l on l.partner = p.id
  left join unread u on u.partner = p.id
  where auth.uid() is not null
    and p.id <> auth.uid()
    and (
      l.partner is not null
      or (
        p.role in ('leader', 'admin') and p.status = 'approved'
        and (not me.transfer or exists (select 1 from public.transfer_managers tm where tm.profile_id = p.id))
      )
    )
  order by l.created_at desc nulls last, p.ingame_name;
$$;

revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;
