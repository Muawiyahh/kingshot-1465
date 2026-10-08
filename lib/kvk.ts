/** Slot/time helpers. All KvK times are UTC, matching in-game server time. */

import type { Messages } from "@/lib/i18n/messages/en";

/** Standard positions, stored in English and shown translated (see positionLabel). */
export const POSITION_PRESETS = [
  "Construction",
  "Research",
  "Training",
  "Chief Minister",
  "Noble Advisor",
] as const;

const POSITION_KEYS: Record<string, keyof Messages["positionNames"]> = {
  construction: "construction",
  research: "research",
  training: "training",
  "chief minister": "chiefMinister",
  "noble advisor": "nobleAdvisor",
};

/** Translates standard position names; custom names typed by leaders are shown as-is. */
export function positionLabel(position: string, t: Messages) {
  const key = POSITION_KEYS[position.trim().toLowerCase()];
  return key ? t.positionNames[key] : position;
}

export function slotCount(slotMinutes: number) {
  return Math.floor((24 * 60) / slotMinutes);
}

function hhmm(totalMinutes: number) {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}

export function slotStartLabel(index: number, slotMinutes: number) {
  return hhmm(index * slotMinutes);
}

export function slotLabel(index: number, slotMinutes: number) {
  return `${hhmm(index * slotMinutes)} – ${hhmm((index + 1) * slotMinutes)}`;
}

/** Start of a slot as a UTC Date. `date` is an ISO day like "2026-10-12". */
export function slotStart(date: string, index: number, slotMinutes: number) {
  return new Date(Date.parse(`${date}T00:00:00Z`) + index * slotMinutes * 60_000);
}

export function isSlotLive(date: string, index: number, slotMinutes: number, now = Date.now()) {
  const start = slotStart(date, index, slotMinutes).getTime();
  return now >= start && now < start + slotMinutes * 60_000;
}

/** "Mon 12 Oct" in the given BCP 47 locale (e.g. "de-DE"). */
export function formatDay(date: string, tag = "en-GB") {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString(tag, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  });
}

/** Adds `days` to an ISO date string and returns an ISO date string. */
export function addDays(date: string, days: number) {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Today's date in UTC as an ISO day ("2026-10-12"). */
export function todayUtc(now = Date.now()) {
  return new Date(now).toISOString().slice(0, 10);
}

/** Days in schedule order: by day number, then position name. */
export function sortDays<T extends { day_number: number; position: string }>(days: T[]) {
  return [...days].sort((a, b) => a.day_number - b.day_number || a.position.localeCompare(b.position));
}

/** "00:00–02:00, 14:30–15:00" from a list of slot indexes (contiguous runs merged). */
export function slotRanges(indexes: number[], slotMinutes: number) {
  const sorted = [...new Set(indexes)].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    out.push(`${hhmm(start * slotMinutes)}–${hhmm((sorted[i] + 1) * slotMinutes)}`);
  }
  return out.join(", ");
}

/** The four 6-hour blocks of a day as slot index ranges [from, to), covering every slot. */
export function quarterBlocks(slotMinutes: number) {
  const count = slotCount(slotMinutes);
  return [0, 1, 2, 3].map((q) => ({
    label: `${String(q * 6).padStart(2, "0")}–${String((q + 1) * 6).padStart(2, "0")}`,
    from: Math.ceil((q * 360) / slotMinutes),
    to: q === 3 ? count : Math.ceil(((q + 1) * 360) / slotMinutes),
  }));
}
