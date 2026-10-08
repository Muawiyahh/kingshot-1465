"use client";

import { useState, useTransition } from "react";
import clsx from "clsx";
import { Loader2, Lock, LockOpen } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { PendingButton } from "@/components/pending-button";
import { fmt } from "@/lib/i18n/format";
import { slotLabel } from "@/lib/kvk";
import { assignSlot, toggleSlotLock } from "../../actions";

export type Candidate = {
  profileId: string;
  name: string;
  tag: string | null;
  speedupDays: number;
  preferred: number[];
  anytime: boolean;
};

export function SlotRow({
  slotId,
  slotIndex,
  slotMinutes,
  locked,
  assignedId,
  assignedName,
  candidates,
  assignedElsewhere,
}: {
  slotId: string;
  slotIndex: number;
  slotMinutes: number;
  locked: boolean;
  assignedId: string | null;
  assignedName: string | null;
  candidates: Candidate[];
  /** profileId → slot index they currently hold on this day */
  assignedElsewhere: Record<string, number>;
}) {
  const { t } = useI18n();
  const d = t.admin.day;
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // People who asked for this slot first, then everyone else; highest speedups first in each group.
  const wants = (c: Candidate) => c.anytime || c.preferred.includes(slotIndex);
  const sorted = [...candidates].sort(
    (a, b) => Number(wants(b)) - Number(wants(a)) || b.speedupDays - a.speedupDays,
  );
  const assignedIsCandidate = assignedId ? candidates.some((c) => c.profileId === assignedId) : true;

  return (
    <li
      className={clsx(
        "grid grid-cols-[5.75rem_1fr_auto] items-center gap-2 px-3 py-2.5 sm:grid-cols-[7rem_1fr_auto] sm:gap-3 sm:px-5",
        assignedId && "bg-white/[0.02]",
      )}
    >
      <span className="font-mono text-xs tabular-nums text-muted sm:text-sm">{slotLabel(slotIndex, slotMinutes)}</span>
      <div className="min-w-0">
        <label className="sr-only" htmlFor={`slot-${slotId}`}>
          {fmt(d.playerFor, { slot: slotLabel(slotIndex, slotMinutes) })}
        </label>
        <select
          id={`slot-${slotId}`}
          value={assignedId ?? ""}
          disabled={locked || pending}
          onChange={(e) => {
            const value = e.target.value || null;
            setError(null);
            start(async () => {
              const res = await assignSlot(slotId, value);
              if (res?.error) setError(res.error);
            });
          }}
          className={clsx(
            "h-10 w-full truncate rounded-xl bg-bg-elevated px-3 text-sm shadow-[inset_0_0_0_1px_var(--border-strong)] disabled:opacity-60",
            !assignedId && "text-muted",
          )}
        >
          <option value="">{d.notAssignedOption}</option>
          {!assignedIsCandidate && assignedId && <option value={assignedId}>{assignedName ?? d.unknownPlayer}</option>}
          {sorted.map((c) => {
            const elsewhere = assignedElsewhere[c.profileId];
            const moving = elsewhere !== undefined && c.profileId !== assignedId;
            return (
              <option key={c.profileId} value={c.profileId}>
                {wants(c) ? "★ " : ""}
                {c.tag ? `[${c.tag}] ` : ""}
                {c.name} · {c.speedupDays}d
                {moving ? ` · ${fmt(d.moveFrom, { time: slotLabel(elsewhere, slotMinutes).slice(0, 5) })}` : ""}
              </option>
            );
          })}
        </select>
        {error && (
          <p className="mt-1 text-xs text-danger" role="alert">
            {error}
          </p>
        )}
      </div>
      <form action={toggleSlotLock} className="flex items-center gap-1">
        {pending && <Loader2 className="size-4 animate-spin text-muted" aria-hidden />}
        <input type="hidden" name="slotId" value={slotId} />
        <PendingButton
          plain
          aria-label={locked ? d.unlock : d.lock}
          aria-pressed={locked}
          className={clsx(
            "flex size-10 cursor-pointer items-center justify-center rounded-xl transition-colors hover:bg-white/5 aria-busy:animate-pulse",
            locked ? "text-gold" : "text-muted/60 hover:text-fg",
          )}
        >
          {locked ? <Lock className="size-4" aria-hidden /> : <LockOpen className="size-4" aria-hidden />}
        </PendingButton>
      </form>
    </li>
  );
}
