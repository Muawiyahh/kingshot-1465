"use client";

import clsx from "clsx";
import { Clock } from "lucide-react";

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0"));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, "0"));

// One digit group inside the field: no arrow, a soft highlight on hover and focus.
const segment =
  "h-8 cursor-pointer appearance-none self-center rounded-lg bg-transparent px-1.5 text-center font-mono text-lg font-semibold text-fg tabular-nums transition-colors hover:bg-white/[0.06] focus:bg-white/[0.08] focus:outline-none disabled:cursor-not-allowed disabled:text-muted/50 disabled:hover:bg-transparent";

/**
 * A 24-hour UTC time: hour and minute pickers inside one field. The browser's own time field follows
 * the device's AM/PM setting, which doesn't fit UTC. Submits "HH:MM", or "" when no hour is picked.
 * `compact` makes it smaller from the lg breakpoint, for forms laid out in rows.
 */
export function UtcTimeField({
  name,
  legend,
  legendClassName = "mb-1.5 block text-xs text-muted",
  value,
  onChange,
  labels,
  compact = false,
}: {
  name: string;
  legend: string;
  legendClassName?: string;
  value: string;
  onChange: (time: string) => void;
  labels: { hour: string; minute: string };
  compact?: boolean;
}) {
  const [hour = "", minute = ""] = value ? value.split(":") : [];
  const digits = clsx(segment, compact && "lg:h-7 lg:text-base");
  return (
    <fieldset>
      <legend className={legendClassName}>{legend}</legend>
      <input type="hidden" name={name} value={value} />
      <div
        className={clsx(
          "inline-flex h-11 items-stretch gap-0.5 rounded-xl bg-bg-elevated pr-2 pl-3 shadow-[inset_0_0_0_1px_var(--border-strong)] transition-shadow focus-within:shadow-[inset_0_0_0_1.5px_var(--gold)]",
          compact && "lg:h-9 lg:pl-1.5",
        )}
      >
        <Clock className={clsx("mr-1 size-4 self-center text-muted", compact && "lg:hidden")} aria-hidden />
        <select
          aria-label={labels.hour}
          value={hour}
          onChange={(ev) => onChange(ev.target.value ? `${ev.target.value}:${minute || "00"}` : "")}
          className={digits}
        >
          <option value="">--</option>
          {HOURS.map((h) => (
            <option key={h} value={h}>
              {h}
            </option>
          ))}
        </select>
        <span aria-hidden className={clsx("self-center font-mono text-lg text-muted", compact && "lg:text-base")}>
          :
        </span>
        <select
          aria-label={labels.minute}
          value={hour ? minute : ""}
          disabled={!hour}
          onChange={(ev) => onChange(`${hour}:${ev.target.value}`)}
          className={digits}
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
