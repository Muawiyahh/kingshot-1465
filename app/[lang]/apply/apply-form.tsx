"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { Badge, Card, Field, Notice, inputClass } from "@/components/ui";
import { SlotPicker } from "@/components/slot-picker";
import { SubmitButton } from "@/components/submit-button";
import { useI18n } from "@/components/i18n-provider";
import { fmt } from "@/lib/i18n/format";
import { formatDay, positionLabel, slotStartLabel } from "@/lib/kvk";
import type { Application, EventDay } from "@/lib/types";
import { saveApplication, withdrawApplication } from "./actions";

export function ApplyDayCard({ day, application }: { day: EventDay; application: Application | null }) {
  const { t, tag } = useI18n();
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveApplication, undefined);
  const [slots, setSlots] = useState(() => new Set(application?.preferred_slots ?? []));
  const [anytime, setAnytime] = useState(application?.anytime ?? false);
  const locked = application !== null && application.status !== "pending";
  const panelId = `apply-${day.id}`;

  const position = positionLabel(day.position, t);
  const firstSlot = slotStartLabel(application?.preferred_slots[0] ?? 0, day.slot_minutes);
  const summary = application
    ? application.anytime
      ? t.common.anyTime
      : application.preferred_slots.length === 1
        ? fmt(t.apply.slotsFromOne, { time: firstSlot })
        : fmt(t.apply.slotsFromMany, { count: application.preferred_slots.length, time: firstSlot })
    : t.apply.notApplied;

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full cursor-pointer items-center gap-4 p-5 text-left transition-colors hover:bg-card-hover"
      >
        <div className="flex size-11 shrink-0 flex-col items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(224,64,74,0.25)]">
          <span className="text-[10px] uppercase">{t.apply.dayShort}</span>
          <span className="-mt-1 font-display text-lg font-bold">{day.day_number}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{position}</p>
          <p className="text-sm text-muted">
            {formatDay(day.date, tag)} · {summary}
          </p>
        </div>
        {application?.status === "accepted" && <Badge tone="green">{t.status.application.accepted}</Badge>}
        {application?.status === "rejected" && <Badge tone="red">{t.status.application.rejected}</Badge>}
        {application?.status === "pending" && <Badge tone="amber">{t.status.application.pendingShort}</Badge>}
        <ChevronDown className={clsx("size-5 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div id={panelId} className="border-t border-border p-5">
          {locked ? (
            <Notice>{t.apply.reviewedLocked}</Notice>
          ) : (
            <form action={action} className="space-y-6">
              <input type="hidden" name="dayId" value={day.id} />
              <div>
                <p className="mb-1 text-sm font-medium">{t.apply.whenOnline}</p>
                <p className="mb-3 text-xs text-muted">{t.apply.whenOnlineHint}</p>
                <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-xl bg-bg-elevated px-4 py-3 text-sm shadow-[inset_0_0_0_1px_var(--border)]">
                  <input
                    type="checkbox"
                    name="anytime"
                    checked={anytime}
                    onChange={(e) => setAnytime(e.target.checked)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  {t.apply.anytimeLabel}
                </label>
                {!anytime && <SlotPicker slotMinutes={day.slot_minutes} selected={slots} onChange={setSlots} />}
              </div>
              <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
                <Field
                  label={t.apply.speedups}
                  htmlFor={`sp-${day.id}`}
                  hint={fmt(t.apply.speedupsHint, { position })}
                >
                  <input
                    id={`sp-${day.id}`}
                    name="speedupDays"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step={0.1}
                    defaultValue={application?.speedup_days ?? ""}
                    className={inputClass}
                  />
                </Field>
                <Field label={t.apply.note} htmlFor={`note-${day.id}`} hint={t.common.optional}>
                  <input
                    id={`note-${day.id}`}
                    name="note"
                    maxLength={500}
                    defaultValue={application?.note ?? ""}
                    className={inputClass}
                  />
                </Field>
              </div>
              {state?.error && <Notice tone="error">{state.error}</Notice>}
              {state?.ok && <Notice tone="success">{state.message}</Notice>}
              <div className="flex flex-wrap items-center gap-3">
                <SubmitButton pendingText={t.common.saving}>{application ? t.apply.update : t.apply.submit}</SubmitButton>
                {application && (
                  <button
                    type="submit"
                    formAction={withdrawApplication}
                    className="cursor-pointer rounded-full px-4 py-2 text-sm text-muted hover:text-danger"
                  >
                    {t.apply.withdraw}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      )}
    </Card>
  );
}
