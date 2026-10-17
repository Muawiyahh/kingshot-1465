import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { EventStatus, PublicScheduleRow } from "@/lib/types";

/** Events players see: applications open or closed, and (from before 0011) published ones. */
export const VISIBLE_STATUSES: EventStatus[] = ["open", "closed", "published"];

const ORDER: Record<EventStatus, number> = { open: 0, closed: 1, published: 2, draft: 3 };

/**
 * The events to show players: every open and closed one, plus the latest published one; open first,
 * then by date.
 */
export function pickEvents<T extends { status: EventStatus; starts_on: string }>(events: T[]): T[] {
  const latestPublished = events
    .filter((e) => e.status === "published")
    .sort((a, b) => b.starts_on.localeCompare(a.starts_on))[0];
  return events
    .filter((e) => (e.status === "open" || e.status === "closed" || e === latestPublished))
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.starts_on.localeCompare(b.starts_on));
}

/**
 * Every slot of these events with its holder's name. Read as the signed-in user: the database shows
 * it to approved members and leaders only (0011_appointments.sql; before that, published events only).
 */
export async function getSchedule(eventIds: string[]): Promise<PublicScheduleRow[]> {
  if (!eventIds.length) return [];
  const supabase = await createClient();
  // Supabase returns at most 1000 rows per request, and an event with several days has more.
  const PAGE = 1000;
  const rows: PublicScheduleRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from("public_schedule")
      .select("*")
      .in("event_id", eventIds)
      .order("event_id")
      .order("day_number")
      .order("position")
      .order("slot_index")
      .range(from, from + PAGE - 1);
    const page = (data as PublicScheduleRow[] | null) ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}
