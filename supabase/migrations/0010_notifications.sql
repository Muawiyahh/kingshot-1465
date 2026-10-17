-- Kingdom 1465 — notifications: the bell in the top bar. The database writes them itself when
-- something changes, so every way of making a change (the site, the SQL Editor) notifies people.
-- Run once in the Supabase SQL Editor, after 0009. Safe to run twice.
--
-- Two kinds of row:
--   * personal (recipient_id set): your account was approved, your application was accepted, …;
--   * kingdom-wide (recipient_id null): applications are open, a new King, the Hall of Fame, …,
--     for an `audience` (every approved account, members only, or leaders) and optionally one alliance.
-- Each row has a `key`, so a later change to the same thing updates it instead of adding another
-- (re-saving without changes doesn't notify again). People don't see kingdom-wide notifications they
-- caused, or ones from before they signed up. Text is stored as a kind plus data and translated in
-- the browser, so everyone reads it in their own language.

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.profiles (id) on delete cascade,
  audience text not null check (audience in ('personal', 'all', 'members', 'leaders')),
  alliance text check (alliance ~ '^[A-Z0-9]{1,8}$'),
  kind text not null check (kind ~ '^[a-z_]{1,32}$'),
  data jsonb not null default '{}' check (jsonb_typeof(data) = 'object'),
  -- The KvK event or account it's about, so it goes when that is deleted.
  ref uuid,
  key text not null unique,
  actor_id uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  check ((recipient_id is null) = (audience <> 'personal'))
);

create index if not exists notifications_recipient_idx on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_created_idx on public.notifications (created_at desc);
create index if not exists notifications_ref_idx on public.notifications (ref) where ref is not null;

-- When each account last opened the bell; anything newer is unread.
alter table public.profiles add column if not exists notifications_seen_at timestamptz;

-- ---------------------------------------------------------------------------
-- Who sees what
-- ---------------------------------------------------------------------------

-- May the signed-in user see this kingdom-wide notification?
create or replace function public.can_see_broadcast(
  p_audience text, p_alliance text, p_actor uuid, p_created timestamptz
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles me
    where me.id = auth.uid()
      and me.status = 'approved'
      and p_created >= me.created_at
      and p_actor is distinct from me.id
      and (p_alliance is null or p_alliance = me.alliance_tag)
      and case p_audience
        when 'all' then true
        when 'members' then not me.transfer
        when 'leaders' then me.role in ('leader', 'admin')
        else false
      end
  );
$$;

alter table public.notifications enable row level security;

drop policy if exists notifications_select on public.notifications;
create policy notifications_select on public.notifications for select to authenticated
  using (
    recipient_id = auth.uid()
    or (recipient_id is null and public.can_see_broadcast(audience, alliance, actor_id, created_at))
  );

-- Nobody writes notifications directly: the triggers below do, with the owner's rights.
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant all on public.notifications to service_role;

-- The signed-in user's newest notifications, with which are unread. RLS picks the rows.
create or replace function public.my_notifications(p_limit int default 30)
returns table (id uuid, kind text, data jsonb, created_at timestamptz, unread boolean)
language sql stable security invoker set search_path = public
as $$
  select n.id, n.kind, n.data, n.created_at,
    n.created_at > coalesce(
      (select p.notifications_seen_at from public.profiles p where p.id = auth.uid()),
      '-infinity'::timestamptz
    )
  from public.notifications n
  order by n.created_at desc
  limit least(greatest(p_limit, 1), 50);
$$;

-- Opening the bell marks everything up to now as read.
create or replace function public.mark_notifications_seen()
returns void
language sql security invoker set search_path = public
as $$
  update public.profiles set notifications_seen_at = now() where id = auth.uid();
$$;

revoke execute on function public.can_see_broadcast(text, text, uuid, timestamptz) from public, anon;
grant execute on function public.can_see_broadcast(text, text, uuid, timestamptz) to authenticated;
revoke execute on function public.my_notifications(int), public.mark_notifications_seen() from public, anon;
grant execute on function public.my_notifications(int), public.mark_notifications_seen() to authenticated;

-- ---------------------------------------------------------------------------
-- Writing notifications
-- ---------------------------------------------------------------------------

-- Adds a notification, or updates the one with the same key, which then counts as new again. Nothing
-- happens when the kind and data are unchanged. Notifications older than six months are cleared out.
create or replace function public.notify(
  p_recipient uuid,
  p_audience text,
  p_kind text,
  p_key text,
  p_data jsonb default '{}',
  p_ref uuid default null,
  p_alliance text default null
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  insert into public.notifications as n (recipient_id, audience, alliance, kind, data, ref, key, actor_id)
  values (p_recipient, p_audience, p_alliance, p_kind, coalesce(p_data, '{}'), p_ref, p_key, auth.uid())
  on conflict (key) do update
    set recipient_id = excluded.recipient_id,
        audience = excluded.audience,
        alliance = excluded.alliance,
        kind = excluded.kind,
        data = excluded.data,
        ref = excluded.ref,
        actor_id = excluded.actor_id,
        created_at = now()
    where n.kind is distinct from excluded.kind or n.data is distinct from excluded.data;
  delete from public.notifications where created_at < now() - interval '6 months';
end;
$$;

revoke execute on function public.notify(uuid, text, text, text, jsonb, uuid, text) from public, anon, authenticated;

-- KvK event, day and position of an event day, for application and slot notifications.
create or replace function public.event_day_info(p_day uuid)
returns table (event_id uuid, status public.event_status, info jsonb, slot_minutes int)
language sql stable security definer set search_path = public
as $$
  select e.id, e.status,
    jsonb_build_object('event', e.title, 'day', d.day_number, 'position', d.position),
    d.slot_minutes
  from public.event_days d join public.kvk_events e on e.id = d.event_id
  where d.id = p_day;
$$;

revoke execute on function public.event_day_info(uuid) from public, anon, authenticated;

-- A slot's start as HH:MM (UTC).
create or replace function public.slot_time(p_index int, p_minutes int)
returns text
language sql immutable
as $$
  select to_char(make_interval(mins => p_index * p_minutes), 'HH24:MI');
$$;

-- ---------------------------------------------------------------------------
-- Accounts: approved or not, a new role, a transfer account joining 1465, new sign-ups for leaders
-- ---------------------------------------------------------------------------

create or replace function public.notify_profile_insert()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'pending' or new.transfer then
    perform public.notify(
      null, 'leaders', 'signup', 'signup:' || new.id,
      jsonb_build_object('name', new.ingame_name, 'alliance', new.alliance_tag, 'transfer', new.transfer,
        'from_kingdom', new.from_kingdom),
      new.id
    );
  end if;
  return null;
end;
$$;

create or replace function public.notify_profile_update()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status is distinct from old.status then
    if new.status in ('approved', 'rejected') then
      perform public.notify(new.id, 'personal', 'account_' || new.status, 'account:' || new.id);
    else
      delete from public.notifications where key = 'account:' || new.id;
    end if;
    -- A sign-up that has been dealt with leaves the leaders' inboxes.
    if old.status = 'pending' then
      delete from public.notifications where key = 'signup:' || new.id;
    end if;
  end if;
  if new.role is distinct from old.role then
    perform public.notify(new.id, 'personal', 'role', 'role:' || new.id, jsonb_build_object('role', new.role));
  end if;
  if old.transfer and not new.transfer then
    perform public.notify(new.id, 'personal', 'member', 'member:' || new.id);
  end if;
  return null;
end;
$$;

create or replace function public.forget_notification_ref()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  delete from public.notifications where ref = old.id;
  return null;
end;
$$;

drop trigger if exists profiles_notify_insert on public.profiles;
create trigger profiles_notify_insert after insert on public.profiles
  for each row execute function public.notify_profile_insert();
drop trigger if exists profiles_notify_update on public.profiles;
create trigger profiles_notify_update after update on public.profiles
  for each row
  when (old.status is distinct from new.status or old.role is distinct from new.role
    or old.transfer is distinct from new.transfer)
  execute function public.notify_profile_update();
drop trigger if exists profiles_notify_delete on public.profiles;
create trigger profiles_notify_delete after delete on public.profiles
  for each row execute function public.forget_notification_ref();

-- ---------------------------------------------------------------------------
-- KvK: applications reviewed, applications open, schedule published, slots after publishing
-- ---------------------------------------------------------------------------

create or replace function public.notify_application()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  if tg_op = 'DELETE' then
    delete from public.notifications where key = 'app:' || old.id;
    return null;
  end if;
  if new.status in ('accepted', 'rejected') then
    select * into d from public.event_day_info(new.day_id);
    perform public.notify(new.profile_id, 'personal', 'application_' || new.status, 'app:' || new.id, d.info, d.event_id);
  else
    -- Back to pending (an undo, or the player applying again): the earlier answer no longer stands.
    delete from public.notifications where key = 'app:' || new.id;
  end if;
  return null;
end;
$$;

drop trigger if exists applications_notify on public.applications;
create trigger applications_notify after update on public.applications
  for each row when (old.status is distinct from new.status)
  execute function public.notify_application();
drop trigger if exists applications_notify_delete on public.applications;
create trigger applications_notify_delete after delete on public.applications
  for each row execute function public.notify_application();

-- Slots are a work in progress until the schedule is published, so only changes after that notify.
-- A player has at most one slot per day and position, so one notification per day keeps their latest.
create or replace function public.notify_slot()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  d record;
begin
  select * into d from public.event_day_info(new.day_id);
  if d.status is distinct from 'published' then
    return null;
  end if;
  if old.profile_id is not null then
    perform public.notify(old.profile_id, 'personal', 'slot_removed', 'slot:' || new.day_id || ':' || old.profile_id,
      d.info, d.event_id);
  end if;
  if new.profile_id is not null then
    perform public.notify(new.profile_id, 'personal', 'slot_assigned', 'slot:' || new.day_id || ':' || new.profile_id,
      d.info || jsonb_build_object('time', public.slot_time(new.slot_index, d.slot_minutes), 'minutes', d.slot_minutes),
      d.event_id);
  end if;
  return null;
end;
$$;

drop trigger if exists slots_notify on public.slots;
create trigger slots_notify after update on public.slots
  for each row when (old.profile_id is distinct from new.profile_id)
  execute function public.notify_slot();

create or replace function public.notify_event_status()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.status = 'open' then
    perform public.notify(null, 'members', 'kvk_open', 'kvk_open:' || new.id, jsonb_build_object('event', new.title), new.id);
  elsif new.status = 'published' then
    perform public.notify(null, 'members', 'kvk_published', 'kvk_published:' || new.id,
      jsonb_build_object('event', new.title), new.id);
    -- Everyone on the schedule hears when and where they are.
    perform public.notify(
      s.profile_id, 'personal', 'slot_assigned', 'slot:' || d.id || ':' || s.profile_id,
      jsonb_build_object('event', new.title, 'day', d.day_number, 'position', d.position,
        'time', public.slot_time(s.slot_index, d.slot_minutes), 'minutes', d.slot_minutes),
      new.id
    )
    from public.slots s join public.event_days d on d.id = s.day_id
    where d.event_id = new.id and s.profile_id is not null;
  end if;
  return null;
end;
$$;

drop trigger if exists kvk_events_notify on public.kvk_events;
create trigger kvk_events_notify after update on public.kvk_events
  for each row when (old.status is distinct from new.status)
  execute function public.notify_event_status();
drop trigger if exists kvk_events_notify_delete on public.kvk_events;
create trigger kvk_events_notify_delete after delete on public.kvk_events
  for each row execute function public.forget_notification_ref();

-- ---------------------------------------------------------------------------
-- Homepage: the Hall of Fame, a new King, the next KvK date, an alliance's event times
-- ---------------------------------------------------------------------------

-- One notification per week listing its picks, and a personal one for each player picked whose
-- account has the same name and alliance.
create or replace function public.notify_hall_of_fame()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  w date := coalesce(new.week_of, old.week_of);
  names jsonb;
begin
  if tg_op = 'UPDATE' and new.player_name = old.player_name and new.alliance = old.alliance
    and new.week_of = old.week_of then
    return null;
  end if;

  if tg_op <> 'INSERT' then
    delete from public.notifications
    where key like 'hof_you:' || old.week_of || ':%' and data ->> 'alliance' = old.alliance;
  end if;

  select jsonb_agg(jsonb_build_object('name', h.player_name, 'alliance', h.alliance) order by h.alliance)
    into names
  from public.hall_of_fame h where h.week_of = w;
  if names is null then
    delete from public.notifications where key = 'hof:' || w;
  else
    perform public.notify(null, 'all', 'hall_of_fame', 'hof:' || w, jsonb_build_object('week', w, 'names', names));
  end if;

  if tg_op <> 'DELETE' then
    perform public.notify(p.id, 'personal', 'hall_of_fame_you', 'hof_you:' || new.week_of || ':' || p.id,
      jsonb_build_object('week', new.week_of, 'alliance', new.alliance))
    from public.profiles p
    where lower(btrim(p.ingame_name)) = lower(btrim(new.player_name))
      and p.alliance_tag = new.alliance and p.status = 'approved';
  end if;
  return null;
end;
$$;

drop trigger if exists hall_of_fame_notify on public.hall_of_fame;
create trigger hall_of_fame_notify after insert or update or delete on public.hall_of_fame
  for each row execute function public.notify_hall_of_fame();

create or replace function public.notify_kingdom_settings()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if new.king_name is not null
    and (new.king_name is distinct from old.king_name or new.king_alliance is distinct from old.king_alliance) then
    perform public.notify(null, 'all', 'king', 'king:' || lower(new.king_name),
      jsonb_build_object('name', new.king_name, 'alliance', new.king_alliance));
  end if;
  if new.next_kvk_at is distinct from old.next_kvk_at then
    if new.next_kvk_at is null then
      delete from public.notifications where key = 'next_kvk';
    else
      perform public.notify(null, 'members', 'next_kvk', 'next_kvk', jsonb_build_object('at', new.next_kvk_at));
    end if;
  end if;
  return null;
end;
$$;

drop trigger if exists kingdom_settings_notify on public.kingdom_settings;
create trigger kingdom_settings_notify after update on public.kingdom_settings
  for each row execute function public.notify_kingdom_settings();

-- An alliance's members hear when its event times change. One save touching several events makes
-- one notification, because they share the transaction's time.
create or replace function public.notify_alliance_events()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  a text := coalesce(new.alliance, old.alliance);
begin
  if tg_op = 'UPDATE' and new.time_utc is not distinct from old.time_utc and new.weekdays = old.weekdays
    and new.note is not distinct from old.note then
    return null;
  end if;
  perform public.notify(null, 'members', 'alliance_events', 'events:' || a,
    jsonb_build_object('alliance', a, 'at', now()), null, a);
  return null;
end;
$$;

drop trigger if exists alliance_events_notify on public.alliance_events;
create trigger alliance_events_notify after insert or update or delete on public.alliance_events
  for each row execute function public.notify_alliance_events();

revoke execute on function
  public.notify_profile_insert(), public.notify_profile_update(), public.forget_notification_ref(),
  public.notify_application(), public.notify_slot(), public.notify_event_status(),
  public.notify_hall_of_fame(), public.notify_kingdom_settings(), public.notify_alliance_events()
  from public, anon, authenticated;

-- Live updates: the bell updates without reloading (RLS still applies).
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
