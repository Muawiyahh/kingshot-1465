/**
 * Auto-fill planning for one KvK day/position. Pure (no I/O), so it's easy to test and to run
 * for a single day or a whole event.
 */

export type FillSlot = { id: string; slot_index: number; profile_id: string | null; locked: boolean };

export type FillApplicant = {
  profile_id: string;
  name: string;
  preferred_slots: number[];
  anytime: boolean;
  speedup_days: number;
  created_at: string;
};

export type FillPlan = {
  updates: { slotId: string; slotIndex: number; profileId: string; name: string }[];
  /** Accepted applicants without a slot who couldn't be placed (all their times were taken). */
  skipped: string[];
};

/**
 * Fills empty, unlocked slots with accepted applicants who don't hold a slot yet.
 * - Highest speedups go first; ties go to whoever applied first.
 * - Specific-time applicants get their earliest preferred free slot.
 * - "Any time" applicants try their preferred slots first, then take the free slot that the
 *   specific-time applicants still waiting want least (earliest on a tie), so they don't block them.
 * Locked slots and slots that already have someone are never touched.
 */
export function planAutofill(slots: FillSlot[], applicants: FillApplicant[]): FillPlan {
  const assigned = new Set(slots.flatMap((s) => (s.profile_id ? [s.profile_id] : [])));
  const free = new Map(slots.filter((s) => !s.profile_id && !s.locked).map((s) => [s.slot_index, s.id]));

  const queue = applicants
    .filter((a) => !assigned.has(a.profile_id))
    .sort((a, b) => Number(b.speedup_days) - Number(a.speedup_days) || a.created_at.localeCompare(b.created_at))
    .map((a) => ({ ...a, preferred: [...new Set(a.preferred_slots)].sort((x, y) => x - y) }));

  const updates: FillPlan["updates"] = [];
  const skipped: string[] = [];

  queue.forEach((a, position) => {
    let pick = a.preferred.find((i) => free.has(i));
    if (pick === undefined && a.anytime && free.size > 0) {
      // How many specific-time applicants still waiting want each free slot.
      const demand = new Map<number, number>();
      for (const later of queue.slice(position + 1)) {
        if (later.anytime) continue;
        for (const i of later.preferred) if (free.has(i)) demand.set(i, (demand.get(i) ?? 0) + 1);
      }
      pick = [...free.keys()].sort((x, y) => (demand.get(x) ?? 0) - (demand.get(y) ?? 0) || x - y)[0];
    }
    if (pick === undefined) {
      skipped.push(a.name);
      return;
    }
    updates.push({ slotId: free.get(pick)!, slotIndex: pick, profileId: a.profile_id, name: a.name });
    free.delete(pick);
  });

  return { updates, skipped };
}
