"use client";

import { useActionState, useState } from "react";
import { Plus, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { fmt } from "@/lib/i18n/format";
import { POSITION_PRESETS, positionLabel } from "@/lib/kvk";
import { createEvent } from "../actions";

type Row = { key: number; day: number; position: string };

// Starting point leaders can edit; the real KvK prep-day schedule varies by season.
// Standard names stay in English so every language can translate them on display.
const DEFAULT_ROWS: Row[] = [
  { key: 1, day: 1, position: "Construction" },
  { key: 2, day: 2, position: "Research" },
  { key: 3, day: 3, position: "Training" },
  { key: 4, day: 4, position: "Chief Minister" },
  { key: 5, day: 4, position: "Noble Advisor" },
];

export function CreateEventForm() {
  const { t } = useI18n();
  const f = t.admin.events.form;
  const [state, action] = useActionState(createEvent, undefined);
  const [rows, setRows] = useState<Row[]>(DEFAULT_ROWS);
  const [nextKey, setNextKey] = useState(DEFAULT_ROWS.length + 1);

  function update(key: number, patch: Partial<Row>) {
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  }

  return (
    <form action={action} className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-[1fr_7rem_11rem_8rem]">
        <Field label={f.title} htmlFor="title">
          <input id="title" name="title" required maxLength={60} placeholder={f.titlePlaceholder} className={inputClass} />
        </Field>
        <Field label={f.season} htmlFor="season" hint={t.common.optional}>
          <input id="season" name="season" type="number" min={0} className={inputClass} />
        </Field>
        <Field label={f.day1Date} htmlFor="startsOn">
          <input id="startsOn" name="startsOn" type="date" required className={inputClass} />
        </Field>
        <Field label={f.slotLength} htmlFor="slotMinutes">
          <select id="slotMinutes" name="slotMinutes" defaultValue="30" className={inputClass}>
            {[15, 30, 60].map((n) => (
              <option key={n} value={n}>
                {fmt(f.minutes, { n })}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <fieldset>
        <legend className="mb-1 text-sm font-medium">{f.daysLegend}</legend>
        <p className="mb-3 text-xs text-muted">{f.daysHint}</p>
        <datalist id="position-presets">
          {POSITION_PRESETS.map((p) => (
            <option key={p} value={p} label={positionLabel(p, t)} />
          ))}
        </datalist>
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.key} className="flex items-center gap-2">
              <label className="sr-only" htmlFor={`day-${r.key}`}>
                {f.dayNumber}
              </label>
              <select
                id={`day-${r.key}`}
                name="dayNumber"
                value={r.day}
                onChange={(e) => update(r.key, { day: Number(e.target.value) })}
                className={`${inputClass} w-28`}
              >
                {[1, 2, 3, 4, 5, 6, 7].map((d) => (
                  <option key={d} value={d}>
                    {fmt(t.common.day, { n: d })}
                  </option>
                ))}
              </select>
              <label className="sr-only" htmlFor={`pos-${r.key}`}>
                {f.position}
              </label>
              <input
                id={`pos-${r.key}`}
                name="position"
                list="position-presets"
                value={r.position}
                onChange={(e) => update(r.key, { position: e.target.value })}
                maxLength={40}
                className={inputClass}
                placeholder={f.position}
              />
              <button
                type="button"
                onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                aria-label={fmt(f.remove, { day: r.day, position: r.position })}
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted hover:bg-white/5 hover:text-danger"
              >
                <X className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => {
            setRows((rs) => [...rs, { key: nextKey, day: Math.min(7, (rs.at(-1)?.day ?? 0) + 1), position: "" }]);
            setNextKey((k) => k + 1);
          }}
          className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-full px-3 py-2 text-sm text-gold-soft hover:bg-white/5"
        >
          <Plus className="size-4" aria-hidden /> {f.addRow}
        </button>
      </fieldset>

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton pendingText={f.creating}>{f.create}</SubmitButton>
    </form>
  );
}
