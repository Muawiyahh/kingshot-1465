"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from "react";
import clsx from "clsx";
import { Crosshair, Lock } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { useNow } from "@/components/use-now";
import { fmt } from "@/lib/i18n/format";
import { formatDay, positionLabel, slotCount, slotStartLabel, todayUtc } from "@/lib/kvk";

/** One day/position of an event: a column of the grid. */
export type GridColumn = { id: string; dayNumber: number; date: string; position: string };

export type CellTone = "empty" | "taken" | "pending" | "accepted" | "rejected" | "heat1" | "heat2" | "heat3";

export type GridCell = {
  tone: CellTone;
  /** Shown inside the cell, e.g. an alliance dot and a name. */
  content?: ReactNode;
  /** What the cell holds, for screen readers ("Caketie", "Open", "Pending"). */
  label: string;
  /** The viewer's own slot: gold ring. */
  own?: boolean;
  locked?: boolean;
  /** Search: fade non-matches, ring matches. */
  dim?: boolean;
  match?: boolean;
};

/** Row heights in px [phone, desktop] by slot length; shorter slots get denser rows. */
const ROW_HEIGHT: Record<number, [number, number]> = { 60: [52, 44], 30: [44, 36], 15: [44, 28] };

const TONE: Record<CellTone, string> = {
  empty: "",
  taken: "bg-white/[0.035] text-fg",
  pending: "bg-warning/15 text-warning shadow-[inset_3px_0_0_var(--warning)]",
  accepted: "bg-success/15 text-success shadow-[inset_3px_0_0_var(--success)]",
  rejected: "bg-danger/10 text-danger",
  heat1: "bg-primary/10 text-fg",
  heat2: "bg-primary/20 text-fg",
  heat3: "bg-primary/35 text-fg",
};

type Props = {
  columns: GridColumn[];
  slotMinutes: number;
  getCell: (col: GridColumn, slot: number) => GridCell;
  /** Extra content under a column title (counts, status). `chip` is the compact phone version. */
  renderHeader?: (col: GridColumn, variant: "header" | "chip") => ReactNode;
  onCellClick?: (col: GridColumn, slot: number) => void;
  onHeaderClick?: (col: GridColumn) => void;
  /** Highlighted cell or column (the one open in the drawer). */
  selected?: { dayId: string | null; slot: number | null };
  /** Where to scroll when the event isn't running today, e.g. the viewer's own slot. */
  focus?: { dayId: string; slot: number } | null;
  ariaLabel: string;
};

/**
 * The KvK day-by-day grid: one column per day/position, one row per UTC slot. On tablets and up
 * every column scrolls together inside the card; on phones a strip of chips picks one column.
 * Used read-only (public schedule) and interactive (players apply, leaders assign).
 */
export function KvkGrid({ columns, slotMinutes, getCell, renderHeader, onCellClick, onHeaderClick, selected, focus, ariaLabel }: Props) {
  const { t, tag } = useI18n();
  const g = t.kvk.grid;
  const count = slotCount(slotMinutes);
  const [phoneH, deskH] = ROW_HEIGHT[slotMinutes] ?? ROW_HEIGHT[30];
  const scroller = useRef<HTMLDivElement>(null);
  const grid = useRef<HTMLDivElement>(null);

  // Which column phones show: the one picked, else the selected one, else the focus, else the first.
  const [picked, setPicked] = useState<string | null>(null);
  const phoneCol = picked ?? selected?.dayId ?? focus?.dayId ?? columns[0]?.id;

  // Roving focus: one tabbable cell at a time.
  const [active, setActive] = useState<{ col: number; slot: number }>({ col: 0, slot: focus?.slot ?? 0 });

  const now = useNow(30_000);
  const today = now === null ? null : todayUtc(now);
  const liveSlot = now === null ? null : Math.floor(((now % 86_400_000) / 60_000) / slotMinutes);
  const liveCol = today ? columns.find((c) => c.date === today) : undefined;
  const target = liveCol && liveSlot !== null ? { dayId: liveCol.id, slot: liveSlot } : focus ?? null;

  function rowEl(slot: number) {
    return grid.current?.querySelector<HTMLElement>(`[data-row="${slot}"]`) ?? null;
  }

  // Tablets and up: bring "now" (or the focus) into view inside the card once, without moving the page.
  const scrolled = useRef(false);
  // Wait for the clock, so a live event scrolls to "now" rather than to the focus first.
  const targetSlot = now === null ? null : (target?.slot ?? null);
  useEffect(() => {
    const box = scroller.current;
    if (scrolled.current || targetSlot === null || !box) return;
    const el = grid.current?.querySelector<HTMLElement>(`[data-row="${targetSlot}"]`);
    if (!el || box.scrollHeight <= box.clientHeight) return;
    scrolled.current = true;
    // Leave two rows of context above the target, below the sticky day headers.
    const header = grid.current?.querySelector<HTMLElement>("[role=columnheader]")?.offsetHeight ?? 0;
    box.scrollTop = Math.max(0, el.offsetTop - header - 2 * deskH);
  }, [targetSlot, deskH]);

  function jump() {
    if (!target) return;
    setPicked(target.dayId);
    requestAnimationFrame(() => rowEl(target.slot)?.scrollIntoView({ block: "center", behavior: "smooth" }));
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const el = (e.target as HTMLElement).closest<HTMLElement>("[data-cell]");
    if (!el) return;
    let col = Number(el.dataset.col);
    let slot = Number(el.dataset.slot);
    const moves: Record<string, () => void> = {
      ArrowDown: () => (slot += 1),
      ArrowUp: () => (slot -= 1),
      ArrowRight: () => (col += 1),
      ArrowLeft: () => (col -= 1),
      PageDown: () => (slot += 8),
      PageUp: () => (slot -= 8),
      Home: () => (slot = 0),
      End: () => (slot = count - 1),
    };
    if (!moves[e.key]) return;
    e.preventDefault();
    moves[e.key]();
    col = Math.max(0, Math.min(columns.length - 1, col));
    slot = Math.max(0, Math.min(count - 1, slot));
    setActive({ col, slot });
    setPicked(columns[col].id);
    requestAnimationFrame(() =>
      grid.current?.querySelector<HTMLElement>(`[data-cell][data-col="${col}"][data-slot="${slot}"]`)?.focus(),
    );
  }

  const place = (row: number, col: number | null): CSSProperties =>
    ({ "--gr": row, ...(col !== null ? { "--gc": col } : {}) }) as CSSProperties;
  const colClass = (id: string) => clsx("max-md:[grid-column:2] md:[grid-column:var(--gc)]", id !== phoneCol && "max-md:hidden");

  return (
    <div>
      {/* Phones: pick a day/position. Sticks under the site header while scrolling. */}
      <div
        role="tablist"
        aria-label={g.chipsLabel}
        className="sticky top-[var(--site-header-h)] z-30 -mx-4 mb-3 flex gap-2 overflow-x-auto bg-bg/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 md:hidden"
      >
        {columns.map((c) => {
          const on = c.id === phoneCol;
          return (
            <button
              key={c.id}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setPicked(c.id)}
              className={clsx(
                "shrink-0 cursor-pointer rounded-2xl px-3 py-2 text-left transition-colors",
                on ? "bg-primary text-on-primary" : "bg-card text-muted shadow-[inset_0_0_0_1px_var(--border)]",
              )}
            >
              <span className="block font-mono text-[10px] uppercase opacity-80">{fmt(t.common.day, { n: c.dayNumber })}</span>
              <span className="block max-w-[9rem] truncate text-sm font-semibold">{positionLabel(c.position, t)}</span>
              {renderHeader?.(c, "chip")}
            </button>
          );
        })}
      </div>

      {target && (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={jump}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-muted transition-colors hover:bg-white/10 hover:text-fg"
          >
            <Crosshair className="size-3.5" aria-hidden />
            {liveCol ? g.jumpNow : g.jumpMine}
          </button>
        </div>
      )}

      <div
        ref={scroller}
        className="relative rounded-3xl bg-card shadow-[inset_0_0_0_1px_var(--border)] max-md:overflow-hidden md:max-h-[calc(100dvh-13rem)] md:overflow-auto md:overscroll-contain"
      >
        <div
          ref={grid}
          role="grid"
          aria-label={ariaLabel}
          aria-rowcount={count + 1}
          aria-colcount={columns.length + 1}
          onKeyDown={onKeyDown}
          style={{ "--cols": columns.length, "--rh": `${phoneH}px`, "--rh-md": `${deskH}px` } as CSSProperties}
          className="grid grid-cols-[4rem_minmax(0,1fr)] [grid-auto-rows:var(--rh)] [grid-template-rows:auto] md:[grid-auto-rows:var(--rh-md)] md:[grid-template-columns:3.5rem_repeat(var(--cols),minmax(6.75rem,1fr))]"
        >
          {/* Header row */}
          <div role="row" className="contents">
            <div
              role="columnheader"
              className="z-30 flex items-end border-r border-b border-border bg-card px-2 pb-2 font-mono text-[10px] text-muted [grid-column:1] [grid-row:1] md:sticky md:top-0 md:left-0"
            >
              {g.utc}
            </div>
            {columns.map((c, i) => {
              const isSelected = selected?.dayId === c.id && selected.slot === null;
              const inner = (
                <>
                  <span className="flex flex-wrap items-center gap-x-1.5 font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                    {fmt(t.common.day, { n: c.dayNumber })} · {formatDay(c.date, tag)}
                    {c.date === today && (
                      <span className="rounded-full bg-primary px-1.5 font-sans text-[10px] leading-4 tracking-normal text-on-primary normal-case">
                        {g.today}
                      </span>
                    )}
                  </span>
                  <span className="mt-0.5 line-clamp-2 text-sm font-semibold text-fg" title={positionLabel(c.position, t)}>
                    {positionLabel(c.position, t)}
                  </span>
                  {renderHeader?.(c, "header")}
                </>
              );
              return (
                <div
                  key={c.id}
                  role="columnheader"
                  style={place(1, i + 2)}
                  className={clsx(
                    "relative z-20 border-r border-b border-border bg-card [grid-row:1] md:sticky md:top-0",
                    colClass(c.id),
                    c.date === today && "shadow-[inset_0_-2px_0_var(--primary)]",
                  )}
                >
                  {onHeaderClick ? (
                    <button
                      type="button"
                      onClick={() => onHeaderClick(c)}
                      aria-pressed={isSelected}
                      className={clsx(
                        "size-full cursor-pointer p-2.5 text-left transition-colors hover:bg-white/5",
                        isSelected && "bg-primary/10",
                      )}
                    >
                      {inner}
                    </button>
                  ) : (
                    <div className="p-2.5">{inner}</div>
                  )}
                </div>
              );
            })}
          </div>

          {Array.from({ length: count }, (_, slot) => {
            const hourEnd = ((slot + 1) * slotMinutes) % 60 === 0;
            const onHour = (slot * slotMinutes) % 60 === 0;
            const time = slotStartLabel(slot, slotMinutes);
            const live = liveCol !== undefined && slot === liveSlot;
            return (
              <div key={slot} role="row" className="contents">
                <div
                  role="rowheader"
                  data-row={slot}
                  style={place(slot + 2, null)}
                  className={clsx(
                    "z-10 flex items-center border-r border-border bg-card px-2 font-mono tabular-nums [grid-column:1] [grid-row:var(--gr)] md:sticky md:left-0",
                    hourEnd ? "border-b border-b-border-strong" : "border-b border-b-border/50",
                    onHour || slotMinutes >= 30 ? "text-xs text-muted" : "text-[10px] text-muted/60",
                    live && "bg-primary/15 text-fg shadow-[inset_3px_0_0_var(--primary)]",
                  )}
                >
                  {time}
                </div>
                {columns.map((c, i) => {
                  const cell = getCell(c, slot);
                  const isSelected = selected?.dayId === c.id && selected.slot === slot;
                  const isLive = live && c.date === today;
                  const label = `${fmt(t.common.day, { n: c.dayNumber })} · ${positionLabel(c.position, t)}, ${time} UTC: ${cell.label}`;
                  const body = (
                    <>
                      {cell.content}
                      {cell.locked && <Lock className="absolute top-1 right-1 size-3 text-muted" aria-hidden />}
                    </>
                  );
                  return (
                    <div
                      key={c.id}
                      role="gridcell"
                      aria-selected={isSelected || undefined}
                      style={place(slot + 2, i + 2)}
                      className={clsx(
                        "relative min-w-0 border-r border-border/60 text-xs [grid-row:var(--gr)]",
                        hourEnd ? "border-b border-b-border-strong" : "border-b border-b-border/50",
                        colClass(c.id),
                        TONE[cell.tone],
                        cell.own && "bg-gold/10 shadow-[inset_0_0_0_2px_var(--gold)]",
                        cell.match && "shadow-[inset_0_0_0_2px_var(--primary)]",
                        cell.dim && "opacity-35",
                        isLive && "bg-primary/10",
                        isSelected && "z-[5] outline-2 -outline-offset-2 outline-gold",
                      )}
                    >
                      {isLive && <span aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-primary" />}
                      {onCellClick ? (
                        <button
                          type="button"
                          data-cell
                          data-col={i}
                          data-slot={slot}
                          tabIndex={active.col === i && active.slot === slot ? 0 : -1}
                          aria-label={label}
                          onFocus={() => setActive({ col: i, slot })}
                          onClick={() => onCellClick(c, slot)}
                          className="flex size-full cursor-pointer items-center gap-1.5 px-2 text-left transition-colors hover:bg-white/[0.06] focus-visible:outline-offset-[-3px]"
                        >
                          {body}
                        </button>
                      ) : (
                        <span aria-label={label} className="flex size-full items-center gap-1.5 px-2">
                          {body}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
