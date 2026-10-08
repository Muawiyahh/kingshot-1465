-- Direct messages between players and the kingdom's leaders and admins.
-- Run once in the Supabase SQL Editor, after 0001–0003.
--
-- Rules (enforced here, not just in the UI):
--   * only the two people in a conversation can read it;
--   * players can write to approved leaders and admins; leaders and admins can write to anyone;
--   * rejected accounts can't send;
--   * at most 20 messages a minute per sender;
--   * the recipient can mark messages read, and nothing else can be changed.

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references public.profiles (id) on delete cascade,
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now(),
  read_at timestamptz,
  check (sender_id <> recipient_id)
);

create index messages_recipient_idx on public.messages (recipient_id, created_at desc);
create index messages_sender_idx on public.messages (sender_id, created_at desc);

-- May the signed-in user send a message to p_recipient?
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
      )
    );
$$;

-- Everyone the signed-in user can talk to, newest conversation first: every approved leader and
-- admin, plus anyone they already have messages with. Players can't read other profiles directly,
-- so this is how they see the leaders' names and banners.
create or replace function public.my_conversations()
returns table (
  partner_id uuid,
  ingame_name text,
  alliance_tag text,
  role public.user_role,
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
  )
  select p.id, p.ingame_name, p.alliance_tag, p.role, l.body, l.created_at, l.from_me, coalesce(u.n, 0)
  from public.profiles p
  left join latest l on l.partner = p.id
  left join unread u on u.partner = p.id
  where auth.uid() is not null
    and p.id <> auth.uid()
    and (l.partner is not null or (p.role in ('leader', 'admin') and p.status = 'approved'))
  order by l.created_at desc nulls last, p.ingame_name;
$$;

-- Simple flood protection.
create or replace function public.limit_message_rate()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  if (
    select count(*) from public.messages
    where sender_id = new.sender_id and created_at > now() - interval '1 minute'
  ) >= 20 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  return new;
end;
$$;

create trigger messages_rate before insert on public.messages
  for each row execute function public.limit_message_rate();

alter table public.messages enable row level security;

create policy messages_select on public.messages for select to authenticated
  using (auth.uid() in (sender_id, recipient_id));
create policy messages_insert on public.messages for insert to authenticated
  with check (sender_id = auth.uid() and public.can_message(recipient_id));
create policy messages_mark_read on public.messages for update to authenticated
  using (recipient_id = auth.uid()) with check (recipient_id = auth.uid());

-- Column grants: senders set only who and what (id, time and read state are the database's),
-- and recipients can change only read_at.
revoke all on public.messages from anon, authenticated;
grant select on public.messages to authenticated;
grant insert (sender_id, recipient_id, body) on public.messages to authenticated;
grant update (read_at) on public.messages to authenticated;
grant all on public.messages to service_role;

revoke execute on function public.can_message(uuid), public.my_conversations(), public.limit_message_rate()
  from public, anon;
grant execute on function public.can_message(uuid), public.my_conversations() to authenticated;

-- Live updates: new messages appear without reloading (RLS still applies).
alter publication supabase_realtime add table public.messages;
