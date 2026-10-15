"use client";

import { useActionState, useState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { PendingButton } from "@/components/pending-button";
import { SubmitButton } from "@/components/submit-button";
import { Field, Notice, inputClass } from "@/components/ui";
import { UtcTimeField } from "@/components/utc-time-field";
import { saveNextKvk } from "../actions";

/** "2026-10-20T00:00:00+00:00" → the UTC date and time the fields edit. */
function splitUtc(at: string | null) {
  if (!at) return { date: "", time: "00:00" };
  const iso = new Date(at).toISOString();
  return { date: iso.slice(0, 10), time: iso.slice(11, 16) };
}

/**
 * Date and 24-hour UTC time of the next KvK. Clearing it hands the card back to the KvK events.
 * `summary` (what's set now) is written on the server, so both renders match.
 */
export function NextKvkForm({ at, summary }: { at: string | null; summary: string }) {
  const { t } = useI18n();
  const s = t.admin.nextKvk;
  const [state, action] = useActionState(saveNextKvk, undefined);
  const [initial] = useState(() => splitUtc(at));
  // Controlled, so a failed save keeps what was typed (React resets uncontrolled fields).
  const [date, setDate] = useState(initial.date);
  const [time, setTime] = useState(initial.time);

  return (
    <form action={action} className="space-y-6">
      <p className="text-sm text-muted">{summary}</p>
      <div className="flex flex-wrap items-end gap-x-6 gap-y-5">
        <Field label={s.date} htmlFor="date">
          <input
            id="date"
            name="date"
            type="date"
            required
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputClass} sm:w-56`}
          />
        </Field>
        <UtcTimeField
          name="time"
          legend={s.time}
          legendClassName="mb-2 block text-sm font-medium"
          value={time}
          onChange={(v) => setTime(v || "00:00")}
          labels={{ hour: t.admin.home.events.hour, minute: t.admin.home.events.minute }}
        />
      </div>
      <p className="text-xs text-muted">{s.hint}</p>

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.message}</Notice>}
      <div className="flex flex-wrap items-center gap-3">
        <SubmitButton pendingText={t.common.saving}>{s.save}</SubmitButton>
        {at && (
          // formNoValidate: clearing doesn't need a date
          <PendingButton
            name="clear"
            value="1"
            formNoValidate
            className="h-11 cursor-pointer rounded-full px-4 text-sm text-muted hover:bg-white/5 hover:text-fg"
          >
            {s.clear}
          </PendingButton>
        )}
      </div>
    </form>
  );
}
