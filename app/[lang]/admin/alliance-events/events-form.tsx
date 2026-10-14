"use client";

import { useActionState, useState } from "react";
import { Clock, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ALLIANCE_EVENTS, WEEKDAYS_MON_FIRST, type AllianceEventKey } from "@/lib/alliance-events";
import { fmt } from "@/lib/i18n/format";
import type { AllianceEventRow } from "@/lib/types";
import { saveAllianceEvents } from "../actions";

type Entry = { time: string; days: number[]; note: string };

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));
// One digit group inside the time field: no arrow, a soft highlight on hover and focus.
const segment =
  "h-8 cursor-pointer appearance-none self-center rounded-lg bg-transparent px-1.5 text-center font-mono text-lg font-semibold text-fg tabular-nums transition-colors hover:bg-white/[0.06] focus:bg-white/[0.08] focus:outline-none disabled:cursor-not-allowed disabled:text-muted/50 disabled:hover:bg-transparent";

/**
 * A 24-hour UTC time: hour and minute pickers inside one field. The browser's own time field follows
 * the device's AM/PM setting, which doesn't fit UTC. Submits "HH:MM", or "" when no hour is picked.
 */
function UtcTime({
  name,
  legend,
  value,
  onChange,
  labels,
}: {
  name: string;
  legend: string;
  value: string;
  onChange: (time: string) => void;
  labels: { hour: string; minute: string };
}) {
  const [hour = "", minute = ""] = value ? value.split(":") : [];
  return (
    <fieldset>
      <legend className="mb-1.5 block text-xs text-muted">{legend}</legend>
      <input type="hidden" name={name} value={value} />
      <div className="inline-flex h-11 items-stretch gap-0.5 rounded-xl bg-bg-elevated pr-2 pl-3 shadow-[inset_0_0_0_1px_var(--border-strong)] transition-shadow focus-within:shadow-[inset_0_0_0_1.5px_var(--gold)]">
        <Clock className="mr-1 size-4 self-center text-muted" aria-hidden />
        <select
          aria-label={labels.hour}
          value={hour}
          onChange={(ev) => onChange(ev.target.value ? `${ev.target.value}:${minute || "00"}` : "")}
          className={segment}
        >
          <option value="">--</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span aria-hidden className="self-center font-mono text-lg text-muted">
          :
        </span>
        <select
          aria-label={labels.minute}
          value={hour ? minute : ""}
          disabled={!hour}
          onChange={(ev) => onChange(`${hour}:${ev.target.value}`)}
          className={segment}
        >
          {!hour && <option value="">--</option>}
          {MINUTES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
        <span className="ml-1 self-center rounded-md bg-gold/10 px-1.5 py-0.5 font-mono text-[0.6875rem] tracking-wider text-gold-soft">
          UTC
        </span>
      </div>
    </fieldset>
  );
}

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
        return [
          e,
          {
            time: r?.time_utc ?? "",
            days: r?.weekdays ?? [],
            note: r?.note ?? "",
          },
        ];
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
              <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-4">
                <UtcTime
                  name={`${e}.time`}
                  legend={s.time}
                  value={entry.time}
                  onChange={(time) => update(e, { time })}
                  labels={{ hour: s.hour, minute: s.minute }}
                />
                <fieldset>
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
                          className="flex h-11 min-w-11 items-center justify-center rounded-xl bg-bg-elevated px-2 text-sm text-muted shadow-[inset_0_0_0_1px_var(--border-strong)] transition-colors peer-checked:bg-primary peer-checked:text-on-primary peer-checked:shadow-none peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-gold"
                        >
                          {short[d]}
                        </span>
                      </label>
                    ))}
                  </div>
                </fieldset>
                <label className="block min-w-[12rem] flex-1 space-y-1.5">
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
