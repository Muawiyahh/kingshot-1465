/** Alliance events shown on the homepage, and helpers for their times. Safe for client and server. */

/** In display order. The keys are stored in alliance_events.event and name the translations. */
export const ALLIANCE_EVENTS = ["bear1", "bear2", "swordland", "tri_alliance", "sanctuary", "vikings"] as const;
export type AllianceEventKey = (typeof ALLIANCE_EVENTS)[number];

export function isAllianceEvent(value: unknown): value is AllianceEventKey {
  return typeof value === "string" && (ALLIANCE_EVENTS as readonly string[]).includes(value);
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
