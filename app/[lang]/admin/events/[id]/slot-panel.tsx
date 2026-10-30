"use client";

import clsx from "clsx";
import { Lock, LockOpen, Star } from "lucide-react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { RunButton, RunResult, useRun } from "@/components/admin/kvk-buttons";
import { useI18n } from "@/components/i18n-provider";
import { SpeedupSummary } from "@/components/kvk/speedup-summary";
import { Badge } from "@/components/ui";
import { fmt } from "@/lib/i18n/format";
import { positionLabel, slotRanges, slotStartLabel } from "@/lib/kvk";
import type { WorkspaceDay } from "@/lib/types";
import { acceptApplication, assignSlot, toggleSlotLock } from "../../actions";
import { clashWith, SameDay, sameDayEntries } from "./same-day";

/**
 * One time slot: who holds it, lock/unlock, remove, and the players to put there: everyone who
 * applied for the day and isn't rejected, with all the times they asked for and their other
 * positions on the same date. Players who asked for this time come first (★), then those free at
 * this time, then by speedups. Picking a waiting applicant accepts them into this time; picking
 * someone who holds another slot that day moves them.
 */
export function SlotPanel({
  day,
  slotIndex,
  siblings,
  onOpenDay,
  onOpen,
}: {
  day: WorkspaceDay;
  slotIndex: number;
  siblings: WorkspaceDay[];
  onOpenDay: () => void;
  onOpen: (dayId: string, slot: number) => void;
}) {
  const { t } = useI18n();
  const d = t.admin.day;
  const l = t.kvk.leader;
  const { busy, result, run } = useRun();
  const slot = day.slots.find((s) => s.slot_index === slotIndex);
  if (!slot) return null;

  const held = new Map(day.slots.flatMap((s) => (s.profile_id ? [[s.profile_id, s] as const] : [])));
  const candidates = day.applications
    .filter((a) => a.status !== "rejected")
    .map((a) => {
      const others = sameDayEntries(a.profile_id, siblings);
      return { ...a, wants: a.anytime || a.preferred_slots.includes(slotIndex), others, clash: clashWith(others, day, slotIndex) };
    })
    .sort(
      (a, b) =>
        Number(b.wants) - Number(a.wants) || Number(!!a.clash) - Number(!!b.clash) || Number(b.speedup_days) - Number(a.speedup_days),
    );
  const holder = slot.profile_id ? (slot.profile ?? null) : null;

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3 rounded-2xl bg-bg-elevated p-3 shadow-[inset_0_0_0_1px_var(--border)]">
        {holder ? (
          <>
            <AllianceAvatar tag={holder.alliance_tag} size={40} />
            <p className="min-w-0 flex-1 truncate font-medium">
              {holder.alliance_tag && <span className="mr-1 font-mono text-xs text-gold">[{holder.alliance_tag}]</span>}
              {holder.ingame_name}
            </p>
          </>
        ) : (
          <p className="flex-1 text-sm text-muted">{slot.profile_id ? d.unknownPlayer : l.empty}</p>
        )}
        <RunButton
          busy={busy === "lock"}
          onClick={() => run("lock", () => toggleSlotLock(slot.id))}
          title={slot.locked ? d.unlock : d.lock}
          className={clsx("size-9 px-0", slot.locked && "text-gold")}
        >
          {slot.locked ? <Lock className="size-4" aria-hidden /> : <LockOpen className="size-4" aria-hidden />}
          <span className="sr-only">{slot.locked ? d.unlock : d.lock}</span>
        </RunButton>
      </div>
      {slot.profile_id && !slot.locked && (
        <RunButton tone="danger" busy={busy === "remove"} onClick={() => run("remove", () => assignSlot(slot.id, null))}>
          {l.remove}
        </RunButton>
      )}
      <p className="text-xs text-muted">{l.lockHint}</p>
      <RunResult result={result} />

      <section aria-labelledby={`cands-${slot.id}`}>
        <h3 id={`cands-${slot.id}`} className="mb-2 font-display text-base font-semibold">
          {l.candidates}
        </h3>
        {candidates.length === 0 ? (
          <div className="space-y-3">
            <p className="text-sm text-muted">{l.noCandidates}</p>
            <RunButton busy={false} onClick={onOpenDay}>
              {l.reviewApplications} →
            </RunButton>
          </div>
        ) : (
          <ul className="space-y-1.5">
            {candidates.map((c) => {
              const current = held.get(c.profile_id);
              const here = current?.id === slot.id;
              const name = c.profile?.ingame_name ?? d.unknownPlayer;
              const ranges = slotRanges(c.preferred_slots, day.slot_minutes);
              return (
                <li
                  key={c.id}
                  className={clsx(
                    "rounded-2xl transition-colors",
                    here ? "bg-gold/10 shadow-[inset_0_0_0_1.5px_var(--gold)]" : "bg-bg-elevated",
                    busy === c.profile_id && "animate-pulse",
                  )}
                >
                  <button
                    type="button"
                    disabled={here || slot.locked || busy !== null}
                    aria-busy={busy === c.profile_id || undefined}
                    onClick={() =>
                      run(c.profile_id, () =>
                        c.status === "pending" ? acceptApplication(c.id, slotIndex) : assignSlot(slot.id, c.profile_id),
                      )
                    }
                    className={clsx(
                      "flex w-full cursor-pointer items-center gap-3 rounded-2xl p-2.5 text-left transition-colors disabled:cursor-default",
                      !here && "hover:bg-card-hover disabled:opacity-60 disabled:hover:bg-transparent",
                    )}
                  >
                    <AllianceAvatar tag={c.profile?.alliance_tag} size={32} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        {c.wants && <Star className="size-3.5 shrink-0 fill-gold text-gold" aria-label={l.wantsThis} />}
                        <span className="truncate text-sm font-medium">
                          {c.profile?.alliance_tag && <span className="mr-1 font-mono text-xs text-gold">[{c.profile.alliance_tag}]</span>}
                          {name}
                        </span>
                      </span>
                      <span className="block text-xs text-muted">
                        <SpeedupSummary app={c} position={day.position} />
                        {ranges && (
                          <>
                            {" · "}
                            <span className="font-mono">{ranges}</span>
                          </>
                        )}
                        {c.anytime && <> · {t.common.anyTime}</>}
                        {current && !here && (
                          <>
                            {" · "}
                            {current.locked && <Lock className="inline size-3 align-[-2px]" aria-hidden />}{" "}
                            {fmt(d.moveFrom, { time: slotStartLabel(current.slot_index, day.slot_minutes) })}
                          </>
                        )}
                      </span>
                      {c.clash && !here && (
                        <span className="mt-0.5 block text-xs text-danger">
                          {fmt(l.clash, { position: positionLabel(c.clash.day.position, t) })}
                        </span>
                      )}
                    </span>
                    {c.status === "pending" && <Badge tone="amber">{l.acceptHere}</Badge>}
                  </button>
                  {c.others.length > 0 && (
                    <div className="-mt-1 pr-2.5 pb-2.5 pl-[3.375rem]">
                      <SameDay entries={c.others} onOpen={onOpen} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
