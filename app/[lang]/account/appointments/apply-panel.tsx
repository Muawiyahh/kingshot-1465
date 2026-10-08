"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { SlotPicker } from "@/components/slot-picker";
import { SubmitButton } from "@/components/submit-button";
import { PendingButton } from "@/components/pending-button";
import { Badge, Field, Notice, inputClass } from "@/components/ui";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { positionLabel, slotLabel, slotRanges } from "@/lib/kvk";
import type { Application, ApplicationStatus, EventStatus, PlayerDay } from "@/lib/types";
import { saveApplication, withdrawApplication } from "./actions";

export function StatusBadge({ status }: { status: ApplicationStatus }) {
  const { t } = useI18n();
  if (status === "accepted") return <Badge tone="green">{t.status.application.accepted}</Badge>;
  if (status === "rejected") return <Badge tone="red">{t.status.application.rejected}</Badge>;
  return <Badge tone="amber">{t.status.application.pendingShort}</Badge>;
}

/**
 * What a player sees in the drawer for one day/position: the application form while applications
 * are open (apply, update, re-apply after a rejection, withdraw), otherwise a read-only summary.
 */
export function ApplyPanel({
  day,
  eventStatus,
  canApply,
  accountNotice,
  tappedSlot,
  onDone,
}: {
  day: PlayerDay;
  eventStatus: EventStatus;
  canApply: boolean;
  /** Why the player can't apply (account pending or rejected), if that's the case. */
  accountNotice: string | null;
  tappedSlot: number | null;
  /** Called after a successful save or withdraw, with the message to show. */
  onDone: (message: string) => void;
}) {
  const { locale, t } = useI18n();
  const p = t.kvk.player;
  const app: Application | undefined = day.applications[0];
  const ownSlot = day.slots[0];
  const editable = eventStatus === "open" && canApply && app?.status !== "accepted";

  return (
    <div className="space-y-5">
      {accountNotice && <Notice tone="warning">{accountNotice}</Notice>}

      {eventStatus === "published" && (
        <Notice tone={ownSlot ? "success" : "neutral"}>
          {ownSlot ? fmt(p.yourSlot, { slot: slotLabel(ownSlot.slot_index, day.slot_minutes) }) : p.noSlot}
        </Notice>
      )}

      {editable ? (
        // Not keyed on the application: saving creates or changes it, and a remount would lose the
        // result before it could close the drawer. (The panel itself is keyed by day.)
        <ApplyForm day={day} app={app} tappedSlot={tappedSlot} onDone={onDone} />
      ) : (
        <>
          {app?.status === "accepted" && eventStatus !== "published" && <Notice tone="success">{p.acceptedNote}</Notice>}
          {app?.status === "rejected" && eventStatus === "open" && canApply === false && <Notice tone="neutral">{p.rejectedNote}</Notice>}
          {eventStatus === "closed" && app?.status !== "accepted" && <Notice>{p.closedNote}</Notice>}
          {app ? <Summary app={app} slotMinutes={day.slot_minutes} /> : <p className="text-sm text-muted">{p.notApplied}</p>}
          {app?.status === "accepted" && (
            <Link href={localePath(locale, "/account/messages")} className="inline-block text-sm text-gold-soft hover:underline">
              {p.askLeader} →
            </Link>
          )}
        </>
      )}
      <p className="text-xs text-muted">
        {positionLabel(day.position, t)} · {t.admin.day.allTimesUtc}
      </p>
    </div>
  );
}

/** The player's submitted answer, shown when it can't be edited. */
function Summary({ app, slotMinutes }: { app: Application; slotMinutes: number }) {
  const { t, tag } = useI18n();
  return (
    <dl className="space-y-3 rounded-2xl bg-bg-elevated p-4 text-sm shadow-[inset_0_0_0_1px_var(--border)]">
      <div className="flex items-center justify-between gap-3">
        <dt className="text-muted">{t.kvk.player.yourApplicationLabel}</dt>
        <dd>
          <StatusBadge status={app.status} />
        </dd>
      </div>
      <div>
        <dt className="text-muted">{t.apply.whenOnline}</dt>
        <dd className="mt-0.5 font-mono text-xs">
          {app.anytime ? t.common.anyTime : slotRanges(app.preferred_slots, slotMinutes) || "—"}
        </dd>
      </div>
      <div className="flex justify-between gap-3">
        <dt className="text-muted">{t.apply.speedups}</dt>
        <dd className="font-mono">{Number(app.speedup_days).toLocaleString(tag)}</dd>
      </div>
      {app.note && (
        <div>
          <dt className="text-muted">{t.apply.note}</dt>
          <dd className="mt-0.5 italic">“{app.note}”</dd>
        </div>
      )}
    </dl>
  );
}

function ApplyForm({
  day,
  app,
  tappedSlot,
  onDone,
}: {
  day: PlayerDay;
  app: Application | undefined;
  tappedSlot: number | null;
  onDone: (message: string) => void;
}) {
  const { t } = useI18n();
  const [state, action] = useActionState(saveApplication, undefined);
  const [withdrawState, withdraw] = useActionState(withdrawApplication, undefined);
  // Start from what was saved, plus the time the player tapped in the grid.
  const [slots, setSlots] = useState(() => {
    const start = new Set(app?.preferred_slots ?? []);
    if (tappedSlot !== null) start.add(tappedSlot);
    return start;
  });
  const [anytime, setAnytime] = useState(app?.anytime ?? false);

  // Report each successful result once (onDone closes the drawer and shows the message).
  const reported = useRef<unknown>(null);
  useEffect(() => {
    for (const result of [state, withdrawState]) {
      if (result?.ok && result.message && reported.current !== result) {
        reported.current = result;
        onDone(result.message);
      }
    }
  }, [state, withdrawState, onDone]);

  const submitLabel = !app ? t.apply.submit : app.status === "rejected" ? t.kvk.player.reapply : t.apply.update;

  return (
    <form action={action} className="space-y-5">
      {app?.status === "rejected" && <Notice tone="warning">{t.kvk.player.rejectedNote}</Notice>}
      {app && app.status !== "rejected" && (
        <div className="flex items-center gap-2 text-sm text-muted">
          {t.kvk.player.yourApplicationLabel} <StatusBadge status={app.status} />
        </div>
      )}
      <input type="hidden" name="dayId" value={day.id} />

      <div>
        <p className="font-medium">{t.apply.whenOnline}</p>
        <p className="mt-1 text-xs text-muted">{t.apply.whenOnlineHint}</p>
        <label className="mt-3 flex cursor-pointer items-start gap-3 rounded-2xl bg-bg-elevated p-3 text-sm shadow-[inset_0_0_0_1px_var(--border)] has-[:checked]:shadow-[inset_0_0_0_1.5px_var(--gold)]">
          <input
            type="checkbox"
            name="anytime"
            checked={anytime}
            onChange={(e) => setAnytime(e.target.checked)}
            className="mt-0.5 size-4 accent-[var(--gold)]"
          />
          <span>{t.apply.anytimeLabel}</span>
        </label>
      </div>

      <div className={anytime ? "opacity-60" : undefined}>
        <SlotPicker slotMinutes={day.slot_minutes} selected={slots} onChange={setSlots} />
      </div>

      <div className="grid gap-4 sm:grid-cols-[10rem_1fr]">
        <Field label={t.apply.speedups} htmlFor={`sp-${day.id}`} hint={fmt(t.apply.speedupsHint, { position: positionLabel(day.position, t) })}>
          <input
            id={`sp-${day.id}`}
            name="speedupDays"
            type="number"
            inputMode="decimal"
            min={0}
            step={0.1}
            defaultValue={app?.speedup_days ?? ""}
            className={inputClass}
          />
        </Field>
        <Field label={`${t.apply.note} (${t.common.optional})`} htmlFor={`note-${day.id}`}>
          <input id={`note-${day.id}`} name="note" maxLength={500} defaultValue={app?.note ?? ""} className={inputClass} />
        </Field>
      </div>

      {(state?.error || withdrawState?.error) && <Notice tone="error">{state?.error ?? withdrawState?.error}</Notice>}

      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText={t.common.saving}>{submitLabel}</SubmitButton>
        {app && (
          <PendingButton
            formAction={withdraw}
            formNoValidate
            className="h-11 cursor-pointer rounded-full px-4 text-sm text-muted hover:text-danger"
          >
            {t.apply.withdraw}
          </PendingButton>
        )}
      </div>
    </form>
  );
}
