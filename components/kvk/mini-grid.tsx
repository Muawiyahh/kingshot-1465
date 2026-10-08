import type { CSSProperties } from "react";
import clsx from "clsx";
import { AllianceDot } from "@/components/alliance-banner";
import { fmt } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { formatDay, positionLabel, slotStartLabel } from "@/lib/kvk";

export type MiniHolder = { name: string; tag: string | null };

export type MiniColumn = {
  id: string;
  dayNumber: number;
  /** Null for the sample, which has no real dates. */
  date: string | null;
  position: string;
  today?: boolean;
  /** One entry per row shown, starting at `from`. */
  cells: (MiniHolder | null)[];
};

/**
 * A small read-only slice of the KvK grid (a few days × a few slots), styled like the real one.
 * Rendered on the server with no client code. Phones show two columns, from `phoneStart`.
 */
export function MiniGrid({
  columns,
  slotMinutes,
  from,
  liveSlot = null,
  phoneStart = 0,
  t,
  tag,
}: {
  columns: MiniColumn[];
  slotMinutes: number;
  from: number;
  liveSlot?: number | null;
  phoneStart?: number;
  t: Messages;
  tag: string;
}) {
  const rows = columns[0]?.cells.length ?? 0;
  const onPhone = (i: number) => i >= phoneStart && i < phoneStart + 2;
  const vars = { "--cols": columns.length, "--cols-phone": Math.min(columns.length, 2) } as CSSProperties;

  return (
    <div
      role="table"
      aria-label={t.kvk.grid.label}
      style={vars}
      className="grid grid-cols-[3rem_repeat(var(--cols-phone),minmax(0,1fr))] overflow-hidden rounded-xl bg-card shadow-[inset_0_0_0_1px_var(--border)] sm:grid-cols-[3rem_repeat(var(--cols),minmax(0,1fr))]"
    >
      <div role="row" className="contents">
        <div role="columnheader" className="flex items-end border-r border-b border-border px-2 pb-2 font-mono text-[10px] text-muted">
          {t.kvk.grid.utc}
        </div>
        {columns.map((c, i) => (
          <div
            key={c.id}
            role="columnheader"
            className={clsx(
              "min-w-0 border-r border-b border-border p-2.5",
              !onPhone(i) && "max-sm:hidden",
              c.today && "shadow-[inset_0_-2px_0_var(--primary)]",
            )}
          >
            <span
              className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted"
              title={c.date ? formatDay(c.date, tag) : undefined}
            >
              {fmt(t.common.day, { n: c.dayNumber })}
              {c.today && (
                <span className="truncate rounded-full bg-primary px-1.5 font-sans leading-4 tracking-normal text-on-primary normal-case">
                  {t.kvk.grid.today}
                </span>
              )}
            </span>
            <span className="mt-0.5 block truncate text-sm font-semibold" title={positionLabel(c.position, t)}>
              {positionLabel(c.position, t)}
            </span>
          </div>
        ))}
      </div>

      {Array.from({ length: rows }, (_, r) => {
        const slot = from + r;
        const live = slot === liveSlot;
        const line = ((slot + 1) * slotMinutes) % 60 === 0 ? "border-b-border-strong" : "border-b-border/50";
        return (
          <div key={slot} role="row" className="contents">
            <div
              role="rowheader"
              className={clsx(
                "flex h-10 items-center border-r border-b border-border px-2 font-mono text-xs text-muted tabular-nums",
                line,
                live && "bg-primary/15 text-fg shadow-[inset_3px_0_0_var(--primary)]",
              )}
            >
              {slotStartLabel(slot, slotMinutes)}
            </div>
            {columns.map((c, i) => {
              const cell = c.cells[r];
              return (
                <div
                  key={c.id}
                  role="cell"
                  className={clsx(
                    "flex h-10 min-w-0 items-center gap-1.5 border-r border-b border-border/60 px-2 text-xs",
                    line,
                    live && c.today ? "bg-primary/10" : cell && "bg-white/[0.035]",
                    !onPhone(i) && "max-sm:hidden",
                  )}
                >
                  {cell ? (
                    <>
                      <AllianceDot tag={cell.tag} />
                      <span className="truncate" title={cell.tag ? `[${cell.tag}] ${cell.name}` : cell.name}>
                        {cell.name}
                      </span>
                    </>
                  ) : (
                    <span className="sr-only">{t.kvk.grid.legendOpen}</span>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}
