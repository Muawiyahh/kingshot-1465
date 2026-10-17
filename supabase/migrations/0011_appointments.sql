-- Kingdom 1465 — castle appointments: speedups by type, the schedule for members only, and a slot as
-- soon as an application is accepted.
-- Run once in the Supabase SQL Editor, after 0010. Safe to run twice.
--
--   * Applications keep each kind of speedup separately: construction and research for Chief
--     Minister, troop training and general for Noble Advisor (`speedups`, in days). `speedup_days`
--     stays the total, which sorting and auto-fill use.
--   * The schedule (who holds which slot) is for signed-in members (approved, or still waiting for
--     approval) and leaders, from the moment applications open. Visitors who aren't signed in, transfer
--     accounts and rejected accounts can't see it.
--   * Accepting an application places the player in a slot, and they're told the time straight away.

alter table public.applications
  add column if not exists speedups jsonb not null default '{}' check (jsonb_typeof(speedups) = 'object');

-- ---------------------------------------------------------------------------
-- Who can see the schedule
-- ---------------------------------------------------------------------------

-- May the signed-in user see the schedule? Leaders, and member accounts that are approved or still
-- waiting for approval (not transfer accounts or rejected ones).
create or replace function public.can_see_schedule()
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_leader() or exists (
    select 1 from public.profiles
    where id = auth.uid() and status in ('approved', 'pending') and not transfer
  );
$$;

revoke execute on function public.can_see_schedule() from public, anon;
grant execute on function public.can_see_schedule() to authenticated;

-- Is this day's event past the draft stage?
create or replace function public.event_is_visible(p_day_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.event_days d
    join public.kvk_events e on e.id = d.event_id
    where d.id = p_day_id and e.status <> 'draft'
  );
$$;

revoke execute on function public.event_is_visible(uuid) from public, anon;
grant execute on function public.event_is_visible(uuid) to authenticated;

-- Slots: leaders always; players their own; members everything once applications open.
drop policy if exists slots_select on public.slots;
create policy slots_select on public.slots for select
  using (
    public.is_leader()
    or profile_id = auth.uid()
    or (public.can_see_schedule() and public.event_is_visible(day_id))
  );
revoke select on public.slots from anon;

-- Names in the schedule. Same columns as before (0001), so the site reads it the same way, but now
-- for every event past the draft stage, and only for members and leaders. It runs with the owner's
-- rights, so players see names without being able to read the profiles table.
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
  where e.status <> 'draft'
    and public.can_see_schedule();

revoke select on public.public_schedule from anon;
grant select on public.public_schedule to authenticated;

-- ---------------------------------------------------------------------------
-- Notifications (0010): a slot is news as soon as it's given
-- ---------------------------------------------------------------------------

-- Now also says which day it is, so a notification can open the schedule there.
create or replace function public.event_day_info(p_day uuid)
returns table (event_id uuid, status public.event_status, info jsonb, slot_minutes int)
language sql stable security definer set search_path = public
as $$
  select e.id, e.status,
    jsonb_build_object('event', e.title, 'day', d.day_number, 'position', d.position, 'day_id', d.id),
    d.slot_minutes
  from public.event_days d join public.kvk_events e on e.id = d.event_id
  where d.id = p_day;
$$;

revoke execute on function public.event_day_info(uuid) from public, anon, authenticated;

-- A player's slot is news once applications are open (not just after publishing). It goes into the
-- notification about their application, so accepting someone into a slot is one notification with
-- the time. A rejected or undone application already has its own, so freeing its slot adds nothing.
create or replace function public.notify_slot()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  d record;
  app_id uuid;
  app_status public.application_status;
begin
  select * into d from public.event_day_info(new.day_id);
  if d.status is null or d.status = 'draft' then
    return null;
  end if;

  if old.profile_id is not null then
    select a.id, a.status into app_id, app_status
    from public.applications a where a.profile_id = old.profile_id and a.day_id = new.day_id;
    if app_id is null then
      perform public.notify(old.profile_id, 'personal', 'slot_removed', 'slot:' || new.day_id || ':' || old.profile_id,
        d.info, d.event_id);
    elsif app_status = 'accepted' then
      perform public.notify(old.profile_id, 'personal', 'slot_removed', 'app:' || app_id, d.info, d.event_id);
    end if;
  end if;

  if new.profile_id is not null then
    app_id := null;
    app_status := null;
    select a.id, a.status into app_id, app_status
    from public.applications a where a.profile_id = new.profile_id and a.day_id = new.day_id;
    perform public.notify(
      new.profile_id, 'personal',
      case when app_status = 'accepted' then 'application_accepted' else 'slot_assigned' end,
      case when app_id is null then 'slot:' || new.day_id || ':' || new.profile_id else 'app:' || app_id end,
      d.info || jsonb_build_object('time', public.slot_time(new.slot_index, d.slot_minutes), 'minutes', d.slot_minutes,
        'slot', new.slot_index),
      d.event_id
    );
  end if;
  return null;
end;
$$;

-- Applications open: members hear it. Publishing no longer sends everyone their slot, because they
-- already heard when they got it.
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
  end if;
  return null;
end;
$$;

revoke execute on function public.notify_slot(), public.notify_event_status() from public, anon, authenticated;
