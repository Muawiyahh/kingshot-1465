"use client";

import { useActionState, useState } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { UtcTimeField } from "@/components/utc-time-field";
import { ALLIANCE_EVENTS, WEEKDAYS_MON_FIRST, eventLabel, eventsFor, type AllianceEventKey } from "@/lib/alliance-events";
import { fmt } from "@/lib/i18n/format";
import type { AllianceEventRow } from "@/lib/types";
import { saveAllianceEvents } from "../actions";

type Entry = { time: string; days: number[]; note: string };

// Wide screens: one line per event, with column labels once at the top. These widths are shared by the
// label row and every event row so the columns line up. Below that each event stacks; fields are
// compact from lg so time, days and note still share a line there.
const columns = "xl:grid-cols-[7.5rem_8.5rem_17.5rem_minmax(0,1fr)_2.25rem] xl:gap-x-3";
// Field labels: shown above each field when stacked, read out only on wide screens (the top row shows them).
const fieldLabel = "mb-1.5 block text-xs text-muted xl:sr-only";

/**
 * One alliance's event times. Fields are controlled so they keep what was saved (React resets
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
    <form action={action} className="space-y-5">
      <input type="hidden" name="alliance" value={alliance} />

      {/* Column labels, wide screens only (each field keeps its own label for screen readers) */}
      <div aria-hidden className={clsx("hidden border-b border-border pb-2 text-xs text-muted xl:grid", columns)}>
        <span />
        <span>{s.time}</span>
        <span>{s.days}</span>
        <span>{s.note}</span>
      </div>

      <ul className="-mt-2 divide-y divide-border">
        {eventsFor(alliance).map((e) => {
          const entry = entries[e];
          const { name: title, part, full: name } = eventLabel(e, t);
          const filled = entry.time || entry.note || entry.days.length > 0;
          return (
            <li key={e} className={clsx("py-4 xl:grid xl:items-center xl:py-2", columns)}>
              <div className="flex min-h-9 items-center gap-3 xl:contents">
                <h3 className="flex-1 font-display text-base font-semibold xl:text-sm">
                  {title}
                  {part && <> <span className="block font-sans text-xs font-normal text-muted max-xl:inline">{part}</span></>}
                </h3>
                {filled ? (
                  <button
                    type="button"
                    onClick={() => update(e, { time: "", days: [], note: "" })}
                    aria-label={`${t.slotPicker.clear}: ${name}`}
                    title={t.slotPicker.clear}
                    className="inline-flex h-9 cursor-pointer items-center justify-center gap-1 rounded-full px-3 text-sm text-muted hover:bg-white/5 hover:text-fg xl:order-last xl:size-9 xl:px-0"
                  >
                    <X className="size-3.5 xl:size-4" aria-hidden />
                    <span className="xl:hidden">{t.slotPicker.clear}</span>
                  </button>
                ) : (
                  <span className="hidden xl:order-last xl:block" />
                )}
              </div>
              <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-3 lg:gap-x-4 xl:contents">
                <UtcTimeField
                  name={`${e}.time`}
                  legend={s.time}
                  legendClassName={fieldLabel}
                  value={entry.time}
                  onChange={(time) => update(e, { time })}
                  labels={{ hour: s.hour, minute: s.minute }}
                  compact
                />
                <fieldset>
                  <legend className={fieldLabel}>{s.days}</legend>
                  <div className="flex flex-wrap gap-1.5 lg:gap-1">
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
                          className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-bg-elevated px-2 text-sm text-muted shadow-[inset_0_0_0_1px_var(--border-strong)] transition-colors peer-checked:bg-primary peer-checked:text-on-primary peer-checked:shadow-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold lg:h-9 lg:w-9 lg:min-w-0 lg:rounded-lg lg:px-0 lg:text-xs"
                        >
                          {short[d]}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block min-w-[10rem] flex-1 xl:min-w-0">
                  <span className={fieldLabel}>{s.note}</span>
                  <input
                    name={`${e}.note`}
                    value={entry.note}
                    maxLength={24}
                    placeholder={s.notePlaceholder}
                    onChange={(ev) => update(e, { note: ev.target.value })}
                    className={clsx(inputClass, "lg:h-9 lg:px-3 lg:text-sm")}
                  />
                </label>
              </div>
            </li>
          );
        })}
      </ul>

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.message}</Notice>}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-border pt-5">
        <SubmitButton pendingText={t.common.saving}>{fmt(s.save, { alliance })}</SubmitButton>
        <p className="text-xs text-muted">{s.daysHint}</p>
      </div>
    </form>
  );
}
