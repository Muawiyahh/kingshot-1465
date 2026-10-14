"use client";

import { useActionState, useState } from "react";
import { X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ALLIANCE_EVENTS, WEEKDAYS_MON_FIRST, type AllianceEventKey } from "@/lib/alliance-events";
import { fmt } from "@/lib/i18n/format";
import type { AllianceEventRow } from "@/lib/types";
import { saveAllianceEvents } from "../actions";

type Entry = { time: string; days: number[]; note: string };

/**
 * One alliance's six event times. Fields are controlled so they keep what was saved (React resets
 * uncontrolled fields after a form action).
 */
export function AllianceEventsForm({
  alliance,
  rows,
  dayNames: { short, long },
}: {
  alliance: string;
  rows: AllianceEventRow[];
  /** Weekday names from the server, so server and browser render the same text. */
  dayNames: { short: string[]; long: string[] };
}) {
  const { t } = useI18n();
  const s = t.admin.home.events;
  const [state, action] = useActionState(saveAllianceEvents, undefined);

  const [entries, setEntries] = useState<Record<AllianceEventKey, Entry>>(() => {
    const saved = new Map(rows.map((r) => [r.event, r]));
    return Object.fromEntries(
      ALLIANCE_EVENTS.map((e) => {
        const r = saved.get(e);
        return [e, { time: r?.time_utc ?? "", days: r?.weekdays ?? [], note: r?.note ?? "" }];
      }),
    ) as Record<AllianceEventKey, Entry>;
  });

  const update = (e: AllianceEventKey, patch: Partial<Entry>) =>
    setEntries((all) => ({ ...all, [e]: { ...all[e], ...patch } }));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="alliance" value={alliance} />
      <p className="text-sm text-muted">{s.daysHint}</p>
      <ul className="divide-y divide-border">
        {ALLIANCE_EVENTS.map((e) => {
          const entry = entries[e];
          const filled = entry.time || entry.note || entry.days.length > 0;
          return (
            <li key={e} className="py-5 first:pt-0 last:pb-0">
              <div className="flex items-center gap-3">
                <h3 className="flex-1 font-display text-base font-semibold">{t.home.events.names[e]}</h3>
                {filled && (
                  <button
                    type="button"
                    onClick={() => update(e, { time: "", days: [], note: "" })}
                    className="inline-flex h-9 cursor-pointer items-center gap-1 rounded-full px-3 text-sm text-muted hover:bg-white/5 hover:text-fg"
                  >
                    <X className="size-3.5" aria-hidden />
                    {t.slotPicker.clear}
                  </button>
                )}
              </div>
              <div className="mt-3 grid gap-3 sm:grid-cols-[9rem_minmax(0,1fr)]">
                <label className="block space-y-1.5">
                  <span className="block text-xs text-muted">{s.time}</span>
                  <input
                    type="time"
                    name={`${e}.time`}
                    value={entry.time}
                    onChange={(ev) => update(e, { time: ev.target.value })}
                    className={`${inputClass} font-mono tabular-nums`}
                  />
                </label>
                <label className="block space-y-1.5">
                  <span className="block text-xs text-muted">{s.note}</span>
                  <input
                    name={`${e}.note`}
                    value={entry.note}
                    maxLength={24}
                    placeholder={s.notePlaceholder}
                    onChange={(ev) => update(e, { note: ev.target.value })}
                    className={inputClass}
                  />
                </label>
              </div>
              <fieldset className="mt-3">
                <legend className="mb-1.5 text-xs text-muted">{s.days}</legend>
                <div className="flex flex-wrap gap-1.5">
                  {WEEKDAYS_MON_FIRST.map((d) => (
                    <label key={d} title={long[d]} className="cursor-pointer">
                      <input
                        type="checkbox"
                        name={`${e}.days`}
                        value={d}
                        checked={entry.days.includes(d)}
                        onChange={(ev) =>
                          update(e, {
                            days: ev.target.checked ? [...entry.days, d] : entry.days.filter((x) => x !== d),
                          })
                        }
                        aria-label={long[d]}
                        className="peer sr-only"
                      />
                      <span
                        aria-hidden
                        className="flex h-10 min-w-11 items-center justify-center rounded-xl bg-bg-elevated px-2 text-sm text-muted shadow-[inset_0_0_0_1px_var(--border-strong)] transition-colors peer-checked:bg-primary peer-checked:text-on-primary peer-checked:shadow-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold"
                      >
                        {short[d]}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
            </li>
          );
        })}
      </ul>

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.message}</Notice>}
      <SubmitButton pendingText={t.common.saving}>{fmt(s.save, { alliance })}</SubmitButton>
    </form>
  );
}
