-- Lets players re-apply after a rejection, and streams applications to leaders live.
-- Run once in the Supabase SQL Editor, after 0001–0005. Safe to run twice.
--
-- Before: a player could only edit or withdraw a *pending* application, so a rejection was a
-- dead end. Now a player can turn their own rejected application back into a pending one (only
-- while the event is open, and only as pending with no reviewer — they can never accept themselves),
-- and can withdraw a pending or rejected application. Accepted applications stay frozen.

drop policy if exists applications_update_own on public.applications;
create policy applications_update_own on public.applications for update
  using (profile_id = auth.uid() and status in ('pending', 'rejected'))
  with check (
    profile_id = auth.uid() and status = 'pending' and reviewed_by is null and public.is_approved()
    and exists (
      select 1 from public.event_days d join public.kvk_events e on e.id = d.event_id
      where d.id = day_id and e.status = 'open'
    )
  );

drop policy if exists applications_delete_own on public.applications;
create policy applications_delete_own on public.applications for delete
  using (profile_id = auth.uid() and status in ('pending', 'rejected'));

-- Live updates for the leaders' workspace (RLS still applies: players only receive their own).
do $$
begin
  alter publication supabase_realtime add table public.applications;
exception when duplicate_object then null;
end $$;
