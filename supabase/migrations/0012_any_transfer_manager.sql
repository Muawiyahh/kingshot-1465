-- Kingdom 1465 — any member account can be a transfer manager, not only leaders and admins (admins
-- add them in Admin → Transfers). Transfer accounts can message every transfer manager, and a
-- manager who isn't a leader can answer them from their own Messages.
-- Run once in the Supabase SQL Editor, after 0011. Safe to run twice.

-- Is p a transfer manager? An approved member account (never a transfer account itself) on the
-- list. Callable by signed-in users: the list is public on the homepage anyway, and Admin →
-- Transfers uses it to tell whether this file has been run.
create or replace function public.is_transfer_manager(p uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.transfer_managers tm
    join public.profiles m on m.id = tm.profile_id
    where tm.profile_id = p and m.status = 'approved' and not m.transfer
  );
$$;

revoke execute on function public.is_transfer_manager(uuid) from public, anon;
grant execute on function public.is_transfer_manager(uuid) to authenticated;

-- Names for the homepage: every approved member on the list, whatever their role.
create or replace view public.public_transfer_managers as
  select tm.profile_id, p.ingame_name, p.alliance_tag, p.game_id, tm.note, tm.sort
  from public.transfer_managers tm
  join public.profiles p on p.id = tm.profile_id
  where p.status = 'approved' and not p.transfer;

grant select on public.public_transfer_managers to anon, authenticated;

-- May a transfer account contact person p? A transfer manager, or any approved admin while no
-- transfer managers have been picked.
create or replace function public.is_transfer_contact(p uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_transfer_manager(p)
    or (
      exists (select 1 from public.profiles r where r.id = p and r.role = 'admin' and r.status = 'approved')
      and not exists (
        select 1 from public.transfer_managers tm
        join public.profiles m on m.id = tm.profile_id
        where m.status = 'approved' and not m.transfer
      )
    );
$$;

revoke execute on function public.is_transfer_contact(uuid) from public, anon, authenticated;

-- May the signed-in user send a message to p_recipient?
--   Leaders and admins: anyone.
--   Transfer managers: also any transfer account (to answer them).
--   Transfer accounts: transfer managers, or anyone who has written to them first.
--   Other members: approved leaders and admins.
create or replace function public.can_message(p_recipient uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select auth.uid() is not null
    and p_recipient <> auth.uid()
    and exists (select 1 from public.profiles s where s.id = auth.uid() and s.status <> 'rejected')
    and (
      public.is_leader()
      or (
        public.is_transfer_manager(auth.uid())
        and exists (select 1 from public.profiles r where r.id = p_recipient and r.transfer)
      )
      or exists (
        select 1 from public.profiles r
        where r.id = p_recipient and r.status = 'approved'
          and case
            when exists (select 1 from public.profiles s where s.id = auth.uid() and s.transfer) then
              public.is_transfer_contact(r.id)
              or exists (select 1 from public.messages m where m.sender_id = r.id and m.recipient_id = auth.uid())
            else r.role in ('leader', 'admin')
          end
      )
    );
$$;

-- Everyone the signed-in user can talk to, newest conversation first. Same columns as 0008, so it is
-- replaced in place; transfer accounts now see every transfer manager.
create or replace function public.my_conversations()
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
        p.status = 'approved'
        and case when me.transfer then public.is_transfer_contact(p.id) else p.role in ('leader', 'admin') end
      )
    )
  order by l.created_at desc nulls last, p.ingame_name;
$$;

revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;
