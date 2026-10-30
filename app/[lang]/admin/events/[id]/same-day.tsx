"use client";

import { CalendarClock } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { fmt } from "@/lib/i18n/format";
import { clashingSlots, positionLabel, slotRanges, slotStartLabel } from "@/lib/kvk";
import type { WorkspaceDay } from "@/lib/types";

/** A player's place in another position on the same date: the time they hold, or their application. */
export type SameDayEntry = {
  day: WorkspaceDay;
  slot: number | null;
  app: WorkspaceDay["applications"][number] | null;
};

/** What this player has in the other positions on the same date (rejected applications left out). */
export function sameDayEntries(profileId: string, siblings: WorkspaceDay[]): SameDayEntry[] {
  return siblings.flatMap((day) => {
    const slot = day.slots.find((s) => s.profile_id === profileId)?.slot_index ?? null;
    const app = day.applications.find((a) => a.profile_id === profileId && a.status !== "rejected") ?? null;
    return slot !== null || app ? [{ day, slot, app }] : [];
  });
}

/** The times of `day` that overlap a time this player holds in another position that date. */
export function sameDayClashes(entries: SameDayEntry[], day: WorkspaceDay) {
  return clashingSlots(
    entries.flatMap((e) => (e.slot !== null ? [{ slot_index: e.slot, slot_minutes: e.day.slot_minutes }] : [])),
    day.slot_minutes,
  );
}

/** The other position whose time overlaps `slot` of `day` for this player, if any. */
export function clashWith(entries: SameDayEntry[], day: WorkspaceDay, slot: number) {
  return entries.find((e) => e.slot !== null && sameDayClashes([e], day).has(slot));
}

/**
 * "Also Chief Minister at 10:00" (a button to that slot) or "Also applied for Chief Minister:
 * 10:00–12:00", so leaders can see a player's other positions that day before placing them.
 */
export function SameDay({ entries, onOpen }: { entries: SameDayEntry[]; onOpen: (dayId: string, slot: number) => void }) {
  const { t } = useI18n();
  const l = t.kvk.leader;
  if (!entries.length) return null;
  return (
    <ul className="mt-1.5 space-y-0.5">
      {entries.map(({ day, slot, app }) => {
        const position = positionLabel(day.position, t);
        const ranges = app ? slotRanges(app.preferred_slots, day.slot_minutes) : "";
        const times = app?.anytime ? (ranges ? `${ranges} · ${t.common.anyTime}` : t.common.anyTime) : ranges;
        return (
          <li key={day.id} className="flex items-start gap-1.5 text-xs">
            <CalendarClock className="mt-px size-3.5 shrink-0 text-muted" aria-hidden />
            {slot !== null ? (
              <button type="button" onClick={() => onOpen(day.id, slot)} className="cursor-pointer text-left text-gold-soft hover:underline">
                {fmt(l.sameDayHolds, { position, time: slotStartLabel(slot, day.slot_minutes) })}
              </button>
            ) : app?.status === "accepted" ? (
              <span className="text-muted">{fmt(l.sameDayAccepted, { position })}</span>
            ) : (
              app && <span className="text-muted">{fmt(l.sameDayApplied, { position, times })}</span>
            )}
          </li>
        );
      })}
    </ul>
  );
}
