-- Kingdom 1465 — transfer accounts can always reach someone. Until leaders pick transfer managers in
-- Admin → Transfers, transfer accounts may message every admin. Once managers are picked, they may
-- message only those managers (plus any leader who wrote to them first), as before.
-- Run once in the Supabase SQL Editor, after 0007. Safe to run twice.

-- May a transfer account contact person p? An approved leader or admin who is a transfer manager,
-- or any approved admin while no (approved) transfer managers have been picked.
create or replace function public.is_transfer_contact(p uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.profiles r
    where r.id = p and r.status = 'approved' and r.role in ('leader', 'admin')
      and (
        exists (select 1 from public.transfer_managers tm where tm.profile_id = r.id)
        or (
          r.role = 'admin'
          and not exists (
            select 1 from public.transfer_managers tm
            join public.profiles m on m.id = tm.profile_id
            where m.status = 'approved' and m.role in ('leader', 'admin')
          )
        )
      )
  );
$$;

-- Only the messaging functions below use it (they run with the owner's rights).
revoke execute on function public.is_transfer_contact(uuid) from public, anon, authenticated;

-- May the signed-in user send a message to p_recipient? Unchanged from 0007 except that transfer
-- accounts reach admins while no transfer managers are picked.
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
            or public.is_transfer_contact(r.id)
            or exists (select 1 from public.messages m where m.sender_id = r.id and m.recipient_id = auth.uid())
          )
      )
    );
$$;

-- Everyone the signed-in user can talk to, newest conversation first. Same columns as 0007, so it is
-- replaced in place; transfer accounts now see the admins while no transfer managers are picked.
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
        p.role in ('leader', 'admin') and p.status = 'approved'
        and (not me.transfer or public.is_transfer_contact(p.id))
      )
    )
  order by l.created_at desc nulls last, p.ingame_name;
$$;

revoke execute on function public.my_conversations() from public, anon;
grant execute on function public.my_conversations() to authenticated;
