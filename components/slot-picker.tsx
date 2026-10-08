"use client";

import { useRef, type PointerEvent } from "react";
import clsx from "clsx";
import { useI18n } from "@/components/i18n-provider";
import { fmt } from "@/lib/i18n/format";
import { quarterBlocks, slotCount, slotStartLabel } from "@/lib/kvk";

/**
 * UTC time slots in two-hour rows. Tap a time to add or remove it; with a mouse, drag across
 * several. Selected slots post as hidden inputs named "slot", so this works inside a plain form.
 */
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
  const perRow = Math.max(1, Math.round(120 / slotMinutes)); // slots in two hours: 2, 4 or 8
  const rows = Math.ceil(count / perRow);
  // Mouse drag: "add" or "remove", decided by the first slot pressed.
  const paint = useRef<"add" | "remove" | null>(null);
  // Set when a mouse press already toggled the slot, so the click that follows doesn't toggle it back.
  const handled = useRef(false);

  function apply(i: number, mode: "add" | "remove") {
    if (mode === "add" ? selected.has(i) : !selected.has(i)) return;
    const next = new Set(selected);
    if (mode === "add") next.add(i);
    else next.delete(i);
    onChange(next);
  }

  function setRange(from: number, to: number) {
    const next = new Set(selected);
    for (let i = from; i < to; i++) next.add(i);
    onChange(next);
  }

  function onPointerDown(e: PointerEvent<HTMLButtonElement>, i: number) {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    paint.current = selected.has(i) ? "remove" : "add";
    handled.current = true;
    apply(i, paint.current);
  }

  return (
    <fieldset disabled={disabled} className="space-y-3">
      <legend className="sr-only">{t.slotPicker.legend}</legend>
      {[...selected].sort((a, b) => a - b).map((i) => (
        <input key={i} type="hidden" name="slot" value={i} />
      ))}
      <div className="flex flex-wrap items-center gap-1.5 text-xs">
        <span className="mr-1 text-muted">{t.slotPicker.quickAdd}</span>
        {quarterBlocks(slotMinutes).map((b) => (
          <button
            key={b.label}
            type="button"
            onClick={() => setRange(b.from, b.to)}
            className="cursor-pointer rounded-full bg-white/5 px-2.5 py-1.5 font-mono text-muted transition-colors hover:bg-white/10 hover:text-fg"
          >
            {b.label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => onChange(new Set())}
          className="ml-auto cursor-pointer rounded-full px-2.5 py-1.5 text-muted hover:text-fg"
        >
          {t.slotPicker.clear}
        </button>
      </div>
      <div
        className="space-y-1 select-none"
        onPointerUp={() => {
          paint.current = null;
          // The click (if any) fires right after this; clear the flag once it has been seen.
          setTimeout(() => (handled.current = false), 0);
        }}
        onPointerLeave={() => (paint.current = null)}
      >
        {Array.from({ length: rows }, (_, r) => (
          <div
            key={r}
            className="grid items-center gap-1"
            style={{ gridTemplateColumns: `${perRow > 4 ? "2.75rem " : ""}repeat(${perRow}, minmax(0, 1fr))` }}
          >
            {perRow > 4 && <span className="font-mono text-[10px] text-muted tabular-nums">{slotStartLabel(r * perRow, slotMinutes)}</span>}
            {Array.from({ length: perRow }, (_, c) => {
              const i = r * perRow + c;
              if (i >= count) return <span key={c} />;
              const on = selected.has(i);
              const label = slotStartLabel(i, slotMinutes);
              return (
                <button
                  key={c}
                  type="button"
                  aria-pressed={on}
                  aria-label={`${label} UTC`}
                  onPointerDown={(e) => onPointerDown(e, i)}
                  onPointerEnter={() => paint.current && apply(i, paint.current)}
                  onClick={() => {
                    // Mouse presses toggle on pointer down (so dragging works); keyboard and touch here.
                    if (handled.current) {
                      handled.current = false;
                      return;
                    }
                    const next = new Set(selected);
                    if (on) next.delete(i);
                    else next.add(i);
                    onChange(next);
                  }}
                  className={clsx(
                    "h-9 cursor-pointer rounded-lg font-mono text-[11px] tabular-nums transition-colors",
                    on
                      ? "bg-primary text-on-primary shadow-[0_0_16px_-8px_var(--glow)]"
                      : "bg-bg-elevated text-muted shadow-[inset_0_0_0_1px_var(--border)] hover:text-fg",
                  )}
                >
                  {perRow > 4 ? (i % perRow === 0 ? label.slice(0, 2) : label.slice(2)) : label}
                </button>
              );
            })}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted">
        {fmt(t.kvk.player.picked, { n: selected.size })} · {t.kvk.player.pickHint}
      </p>
    </fieldset>
  );
}
