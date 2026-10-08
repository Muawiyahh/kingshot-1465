"use client";

import clsx from "clsx";
import { Sparkles } from "lucide-react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { RunButton, RunResult, useRun } from "@/components/admin/kvk-buttons";
import { useI18n } from "@/components/i18n-provider";
import { Badge, Notice } from "@/components/ui";
import { fmt } from "@/lib/i18n/format";
import { slotCount, slotRanges, slotStartLabel } from "@/lib/kvk";
import type { ApplicationStatus, WorkspaceDay } from "@/lib/types";
import { autoFillDay, clearDay, reviewApplication } from "../../actions";

const ORDER: Record<ApplicationStatus, number> = { pending: 0, accepted: 1, rejected: 2 };

/** One day's applications: review them, and auto-fill or clear the day. */
export function DayPanel({ day, onOpenSlot }: { day: WorkspaceDay; onOpenSlot: (slot: number) => void }) {
  const { t } = useI18n();
  const d = t.admin.day;
  const l = t.kvk.leader;
  const { busy, result, run } = useRun();

  const apps = [...day.applications].sort(
    (a, b) => ORDER[a.status] - ORDER[b.status] || Number(b.speedup_days) - Number(a.speedup_days),
  );
  const pending = apps.filter((a) => a.status === "pending").length;
  const accepted = apps.filter((a) => a.status === "accepted").length;
  const filled = day.slots.filter((s) => s.profile_id).length;
  const held = new Map(day.slots.flatMap((s) => (s.profile_id ? [[s.profile_id, s.slot_index] as const] : [])));

  return (
    <div className="space-y-5">
      <dl className="grid grid-cols-3 gap-2 text-center">
        {[
          [t.admin.event.toReview, pending, pending > 0],
          [t.admin.event.accepted, accepted, false],
          [t.admin.event.slotsFilled, `${filled}/${slotCount(day.slot_minutes)}`, false],
        ].map(([label, value, warn]) => (
          <div key={String(label)} className="rounded-2xl bg-bg-elevated px-2 py-3 shadow-[inset_0_0_0_1px_var(--border)]">
            <dt className="text-[11px] text-muted">{label}</dt>
            <dd className={clsx("mt-0.5 font-mono text-lg", warn && "text-warning")}>{value}</dd>
          </div>
        ))}
      </dl>

      <div className="flex flex-wrap items-center gap-2">
        <RunButton tone="primary" busy={busy === "fill"} disabled={accepted === 0} onClick={() => run("fill", () => autoFillDay(day.id))}>
          <Sparkles className="size-4" aria-hidden /> {d.autofill}
        </RunButton>
        <RunButton
          tone="danger"
          busy={busy === "clear"}
          disabled={filled === 0}
          onClick={() => window.confirm(d.clearConfirm) && run("clear", () => clearDay(day.id))}
        >
          {d.clear}
        </RunButton>
      </div>
      {pending > 0 && <Notice tone="warning">{fmt(l.pendingWarning, { n: pending })}</Notice>}
      <RunResult result={result} />

      <section aria-labelledby={`apps-${day.id}`}>
        <h3 id={`apps-${day.id}`} className="mb-2 font-display text-base font-semibold">
          {fmt(l.applicationsCount, { n: apps.length })}
        </h3>
        {apps.length === 0 ? (
          <p className="text-sm text-muted">{d.noApplications}</p>
        ) : (
          <ul className="divide-y divide-border">
            {apps.map((a) => {
              const slot = held.get(a.profile_id);
              const name = a.profile?.ingame_name ?? d.unknownPlayer;
              return (
                <li key={a.id} className={clsx("py-3 transition-opacity", a.status === "rejected" && "opacity-60", busy === a.id && "opacity-60")}>
                  <div className="flex items-start gap-3">
                    <AllianceAvatar tag={a.profile?.alliance_tag} size={36} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        {a.profile?.alliance_tag && <span className="mr-1 font-mono text-xs text-gold">[{a.profile.alliance_tag}]</span>}
                        {name}
                      </p>
                      <p className="text-xs text-muted">
                        <span className="font-mono text-fg">{fmt(d.speedups, { n: Number(a.speedup_days) })}</span> ·{" "}
                        <span className="font-mono">{a.anytime ? t.common.anyTime : slotRanges(a.preferred_slots, day.slot_minutes)}</span>
                      </p>
                      {a.note && <p className="mt-1 text-xs text-muted italic">“{a.note}”</p>}
                      {slot !== undefined && (
                        <button
                          type="button"
                          onClick={() => onOpenSlot(slot)}
                          className="mt-1 cursor-pointer text-xs text-success hover:underline"
                        >
                          {fmt(d.assigned, { slot: slotStartLabel(slot, day.slot_minutes) })} →
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center justify-end gap-1.5">
                    {a.status === "pending" ? (
                      <>
                        <RunButton tone="primary" busy={busy === a.id + ":a"} onClick={() => run(a.id + ":a", () => reviewApplication(a.id, "accepted"))}>
                          {d.accept}
                        </RunButton>
                        <RunButton busy={busy === a.id + ":r"} onClick={() => run(a.id + ":r", () => reviewApplication(a.id, "rejected"))}>
                          {d.reject}
                        </RunButton>
                      </>
                    ) : (
                      <>
                        <Badge tone={a.status === "accepted" ? "green" : "red"}>{t.status.application[a.status]}</Badge>
                        <RunButton busy={busy === a.id + ":u"} onClick={() => run(a.id + ":u", () => reviewApplication(a.id, "pending"))}>
                          {d.undo}
                        </RunButton>
                      </>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
