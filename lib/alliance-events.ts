/** Alliance events shown on the homepage, and helpers for their times. Safe for client and server. */

import { fmt } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages/en";

/**
 * In display order, with Sanctuary 1, Sanctuary 2 and Fortress last. The keys are stored in
 * alliance_events.event. Swordland and Tri-Alliance run twice per alliance (Legion 1 and 2), and
 * Vikings on two days: the original key is the first run, so times saved before the split stay put.
 */
export const ALLIANCE_EVENTS = [
  "bear1",
  "bear2",
  "swordland",
  "swordland2",
  "tri_alliance",
  "tri_alliance2",
  "vikings",
  "vikings2",
  "sanctuary1",
  "sanctuary2",
  "fortress",
] as const;
export type AllianceEventKey = (typeof ALLIANCE_EVENTS)[number];

/** The events that have a name of their own in t.home.events.names. */
type EventNameKey = Exclude<AllianceEventKey, "swordland2" | "tri_alliance2" | "vikings2">;

/** The two runs of a split event: which event they belong to, and Legion 1/2 or Day 1/2. */
const PARTS: Partial<Record<AllianceEventKey, { group: EventNameKey; kind: "legion" | "day"; n: 1 | 2 }>> = {
  swordland: { group: "swordland", kind: "legion", n: 1 },
  swordland2: { group: "swordland", kind: "legion", n: 2 },
  tri_alliance: { group: "tri_alliance", kind: "legion", n: 1 },
  tri_alliance2: { group: "tri_alliance", kind: "legion", n: 2 },
  vikings: { group: "vikings", kind: "day", n: 1 },
  vikings2: { group: "vikings", kind: "day", n: 2 },
};

/** An event's translated name, and for a split event which run it is ("Swordland", "Legion 2"). */
export function eventLabel(event: AllianceEventKey, t: Messages): { name: string; part: string | null; full: string } {
  const p = PARTS[event];
  if (!p) {
    const name = t.home.events.names[event as EventNameKey];
    return { name, part: null, full: name };
  }
  const name = t.home.events.names[p.group];
  const part = fmt(p.kind === "legion" ? t.home.events.legion : t.common.day, { n: p.n });
  return { name, part, full: `${name} · ${part}` };
}

/** Consecutive events under one heading: both runs of a split event, or a single event. */
export function eventGroups(events: readonly AllianceEventKey[] = ALLIANCE_EVENTS) {
  const groups: { group: string; events: AllianceEventKey[] }[] = [];
  for (const e of events) {
    const group = PARTS[e]?.group ?? e;
    const last = groups.at(-1);
    if (last?.group === group) last.events.push(e);
    else groups.push({ group, events: [e] });
  }
  return groups;
}

export function isAllianceEvent(value: unknown): value is AllianceEventKey {
  return typeof value === "string" && (ALLIANCE_EVENTS as readonly string[]).includes(value);
}

/** Events only some alliances take part in. Every other event is for every alliance. */
const ONLY_FOR: Partial<Record<AllianceEventKey, readonly string[]>> = {
  fortress: ["GGG", "KNG", "ERA", "ALT"],
};

/** Does this alliance take part in this event? */
export function allianceHasEvent(alliance: string, event: AllianceEventKey) {
  return ONLY_FOR[event]?.includes(alliance) ?? true;
}

/** The events one alliance takes part in, in display order. */
export function eventsFor(alliance: string): AllianceEventKey[] {
  return ALLIANCE_EVENTS.filter((e) => allianceHasEvent(alliance, e));
}

export const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

/** Days of the week, Monday first (0 = Sunday … 6 = Saturday, as in Date.getUTCDay). */
export const WEEKDAYS_MON_FIRST = [1, 2, 3, 4, 5, 6, 0] as const;

const sortMonFirst = (days: number[]) => [...days].sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));

/** Short weekday names in a language: weekdayNames("de-DE")[6] → "Sa". 1 Jan 2023 was a Sunday. */
export function weekdayNames(tag: string, width: "short" | "long" = "short") {
  const f = new Intl.DateTimeFormat(tag, { weekday: width, timeZone: "UTC" });
  return Array.from({ length: 7 }, (_, d) => f.format(Date.UTC(2023, 0, 1 + d)));
}

/** "Sat, Sun" for [6, 0], Monday first. */
export function formatWeekdays(days: number[], names: string[]) {
  return sortMonFirst(days)
    .map((d) => names[d])
    .join(", ");
}

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * A UTC time (and its weekdays) in the viewer's time zone, using today's date so daylight saving is
 * right for this week. Weekdays move with the time when it crosses midnight.
 */
export function toLocal(timeUtc: string, weekdays: number[], now: number) {
  const [h, m] = timeUtc.split(":").map(Number);
  const today = new Date(now);
  const d = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate(), h, m));
  const shift = Math.round(
    (Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()) - Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate())) /
      86_400_000,
  );
  return {
    time: `${pad(d.getHours())}:${pad(d.getMinutes())}`,
    weekdays: weekdays.map((w) => (w + shift + 7) % 7),
    /** -1, 0 or +1: the local day compared with the UTC day. */
    shift,
  };
}

/** The Monday (UTC) of the week containing a date, as YYYY-MM-DD. */
export function weekStart(date: string | number | Date) {
  const d = new Date(typeof date === "string" ? `${date.slice(0, 10)}T00:00:00Z` : date);
  const back = (d.getUTCDay() + 6) % 7;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - back)).toISOString().slice(0, 10);
}

/** The Monday of the current UTC week. Call only after the page has read request data. */
export function currentWeek() {
  return weekStart(Date.now());
}

export function isMonday(date: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(date) && new Date(`${date}T00:00:00Z`).getUTCDay() === 1;
}
