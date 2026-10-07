"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { Badge, Card, Field, Notice, inputClass } from "@/components/ui";
import { SlotPicker } from "@/components/slot-picker";
import { SubmitButton } from "@/components/submit-button";
import { formatDay, slotStartLabel } from "@/lib/kvk";
import type { Application, EventDay } from "@/lib/types";
import { saveApplication, withdrawApplication } from "./actions";

export function ApplyDayCard({ day, application }: { day: EventDay; application: Application | null }) {
  const [open, setOpen] = useState(false);
  const [state, action] = useActionState(saveApplication, undefined);
  const [slots, setSlots] = useState(() => new Set(application?.preferred_slots ?? []));
  const [anytime, setAnytime] = useState(application?.anytime ?? false);
  const locked = application !== null && application.status !== "pending";
  const panelId = `apply-${day.id}`;

  const summary = application
    ? application.anytime
      ? "Any time"
      : `${application.preferred_slots.length} slot${application.preferred_slots.length === 1 ? "" : "s"} from ${slotStartLabel(
          application.preferred_slots[0] ?? 0,
          day.slot_minutes,
        )}`
    : "Not applied";

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
          <span className="text-[10px] uppercase">Day</span>
          <span className="-mt-1 font-display text-lg font-bold">{day.day_number}</span>
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{day.position}</p>
          <p className="text-sm text-muted">
            {formatDay(day.date)} · {summary}
          </p>
        </div>
        {application?.status === "accepted" && <Badge tone="green">Accepted</Badge>}
        {application?.status === "rejected" && <Badge tone="red">Rejected</Badge>}
        {application?.status === "pending" && <Badge tone="amber">Pending</Badge>}
        <ChevronDown className={clsx("size-5 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      {open && (
        <div id={panelId} className="border-t border-border p-5">
          {locked ? (
            <Notice>Leaders have reviewed this application, so it can no longer be changed.</Notice>
          ) : (
            <form action={action} className="space-y-6">
              <input type="hidden" name="dayId" value={day.id} />
              <div>
                <p className="mb-1 text-sm font-medium">When can you be online? (UTC)</p>
                <p className="mb-3 text-xs text-muted">Select every slot that works. More options means a better chance of a slot.</p>
                <label className="mb-4 flex cursor-pointer items-center gap-3 rounded-xl bg-bg-elevated px-4 py-3 text-sm shadow-[inset_0_0_0_1px_var(--border)]">
                  <input
                    type="checkbox"
                    name="anytime"
                    checked={anytime}
                    onChange={(e) => setAnytime(e.target.checked)}
                    className="size-4 accent-[var(--primary)]"
                  />
                  Any time — I can be online for whichever slot leaders give me
                </label>
                {!anytime && <SlotPicker slotMinutes={day.slot_minutes} selected={slots} onChange={setSlots} />}
              </div>
              <div className="grid gap-5 sm:grid-cols-[12rem_1fr]">
                <Field label="Speedups (days)" htmlFor={`sp-${day.id}`} hint={`Total ${day.position.toLowerCase()} speedups you'll use.`}>
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
                <Field label="Note for leaders" htmlFor={`note-${day.id}`} hint="Optional">
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
                <SubmitButton pendingText="Saving…">{application ? "Update application" : "Submit application"}</SubmitButton>
                {application && (
                  <button
                    type="submit"
                    formAction={withdrawApplication}
                    className="cursor-pointer rounded-full px-4 py-2 text-sm text-muted hover:text-danger"
                  >
                    Withdraw
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
