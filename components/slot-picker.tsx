"use client";

import clsx from "clsx";
import { useI18n } from "@/components/i18n-provider";
import { slotCount, slotStartLabel } from "@/lib/kvk";

/** Grid of UTC time slots rendered as checkboxes named "slot" so it posts with a plain form. */
export function SlotPicker({
  slotMinutes,
  selected,
  onChange,
  disabled,
}: {
  slotMinutes: number;
  selected: Set<number>;
  onChange: (next: Set<number>) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const count = slotCount(slotMinutes);

  function toggle(i: number) {
    const next = new Set(selected);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    onChange(next);
  }

  function setRange(from: number, to: number) {
    const next = new Set(selected);
    for (let i = from; i < to; i++) next.add(i);
    onChange(next);
  }

  const perBlock = Math.floor(count / 4);
  const blocks = [
    { label: "00–06", from: 0 },
    { label: "06–12", from: perBlock },
    { label: "12–18", from: perBlock * 2 },
    { label: "18–24", from: perBlock * 3 },
  ];

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="sr-only">{t.slotPicker.legend}</legend>
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="text-muted">{t.slotPicker.quickAdd}</span>
        {blocks.map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={() => setRange(b.from, b.from + perBlock)}
            className="cursor-pointer rounded-full bg-white/5 px-3 py-1.5 font-mono text-muted transition-colors hover:bg-white/10 hover:text-fg"
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(new Set())}
          className="ml-auto cursor-pointer rounded-full px-3 py-1.5 text-muted hover:text-fg"
        >
          {t.slotPicker.clear}
        </button>
      </div>
      <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-6 lg:grid-cols-8">
        {Array.from({ length: count }, (_, i) => {
          const on = selected.has(i);
          return (
            <label
              key={i}
              className={clsx(
                "relative flex h-11 cursor-pointer items-center justify-center rounded-xl font-mono text-xs tabular-nums transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold",
                on
                  ? "bg-primary text-on-primary shadow-[0_0_20px_-8px_var(--glow)]"
                  : "bg-bg-elevated text-muted shadow-[inset_0_0_0_1px_var(--border)] hover:text-fg",
              )}
            >
              <input
                type="checkbox"
                name="slot"
                value={i}
                checked={on}
                onChange={() => toggle(i)}
                className="sr-only"
              />
              {slotStartLabel(i, slotMinutes)}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
