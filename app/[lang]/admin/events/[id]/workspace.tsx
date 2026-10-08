"use client";

import { useMemo } from "react";
import clsx from "clsx";
import { Sparkles } from "lucide-react";
import { AllianceDot } from "@/components/alliance-banner";
import { RunButton, RunResult, useRun } from "@/components/admin/kvk-buttons";
import { useI18n } from "@/components/i18n-provider";
import { eventSlotMinutes, toColumns } from "@/components/kvk/columns";
import { Drawer } from "@/components/kvk/drawer";
import { KvkGrid, type CellTone, type GridCell, type GridColumn } from "@/components/kvk/kvk-grid";
import { useGridSelection } from "@/components/kvk/use-grid-selection";
import { Notice } from "@/components/ui";
import { useRealtimeRefresh } from "@/components/use-realtime-refresh";
import { fmt } from "@/lib/i18n/format";
import { formatDay, positionLabel, slotCount, slotLabel } from "@/lib/kvk";
import type { WorkspaceEvent } from "@/lib/types";
import { autoFillEvent } from "../../actions";
import { DayPanel } from "./day-panel";
import { SlotPanel } from "./slot-panel";

/**
 * The leaders' KvK workspace: every day and position side by side. A cell shows who holds the
 * slot, or how many applicants want it. Tap a day's header to review its applications; tap a
 * time to assign it. Updates live as players apply and other leaders make changes.
 */
export function Workspace({ event }: { event: WorkspaceEvent }) {
  const { t, tag } = useI18n();
  const l = t.kvk.leader;
  useRealtimeRefresh([{ table: "slots" }, { table: "applications" }, { table: "kvk_events" }], `leader-${event.id}`);
  const selection = useGridSelection();
  const { busy, result, run } = useRun();

  const columns = useMemo(() => toColumns(event.event_days), [event]);
  const slotMinutes = eventSlotMinutes(event.event_days);
  const total = slotCount(slotMinutes);

  const index = useMemo(() => {
    const days = new Map(event.event_days.map((d) => [d.id, d]));
    const slots = new Map<string, WorkspaceEvent["event_days"][number]["slots"][number]>();
    const demand = new Map<string, number>();
    for (const d of event.event_days) {
      for (const s of d.slots) slots.set(`${d.id}:${s.slot_index}`, s);
      for (const a of d.applications) {
        if (a.status === "rejected" || a.anytime) continue;
        for (const i of a.preferred_slots) demand.set(`${d.id}:${i}`, (demand.get(`${d.id}:${i}`) ?? 0) + 1);
      }
    }
    return { days, slots, demand };
  }, [event]);

  const pendingTotal = event.event_days.reduce((n, d) => n + d.applications.filter((a) => a.status === "pending").length, 0);
  const acceptedTotal = event.event_days.reduce((n, d) => n + d.applications.filter((a) => a.status === "accepted").length, 0);

  function getCell(col: GridColumn, slot: number): GridCell {
    const s = index.slots.get(`${col.id}:${slot}`);
    if (s?.profile_id) {
      const name = s.profile?.ingame_name ?? t.admin.day.unknownPlayer;
      return {
        tone: "taken",
        locked: s.locked,
        label: name,
        content: (
          <>
            <AllianceDot tag={s.profile?.alliance_tag} />
            <span className="truncate" title={name}>
              {name}
            </span>
          </>
        ),
      };
    }
    const want = index.demand.get(`${col.id}:${slot}`) ?? 0;
    if (want === 0) return { tone: "empty", locked: s?.locked, label: t.kvk.grid.legendOpen };
    const tone: CellTone = want >= 3 ? "heat3" : want === 2 ? "heat2" : "heat1";
    return {
      tone,
      locked: s?.locked,
      label: fmt(t.kvk.grid.wantedBy, { n: want }),
      content: <span className="font-mono text-[10px] text-muted">★ {want}</span>,
    };
  }

  const openDay = selection.day ? index.days.get(selection.day) : undefined;
  const dayIndex = openDay ? columns.findIndex((c) => c.id === openDay.id) : -1;
  const slotOpen = openDay && selection.slot !== null && selection.slot < total ? selection.slot : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-xl font-semibold">{l.title}</h2>
        <RunButton
          tone="primary"
          className="ml-auto"
          busy={busy === "all"}
          disabled={acceptedTotal === 0}
          onClick={() => run("all", () => autoFillEvent(event.id))}
        >
          <Sparkles className="size-4" aria-hidden /> {l.autofillAll}
        </RunButton>
      </div>
      <p className="text-sm text-muted">{l.hint}</p>
      {pendingTotal > 0 && <Notice tone="warning">{fmt(l.pendingWarning, { n: pendingTotal })}</Notice>}
      <RunResult result={result} />

      <KvkGrid
        columns={columns}
        slotMinutes={slotMinutes}
        getCell={getCell}
        selected={{ dayId: selection.day, slot: selection.slot }}
        ariaLabel={t.kvk.grid.label}
        onCellClick={(col, slot) => selection.open(col.id, slot)}
        onHeaderClick={(col) => selection.open(col.id)}
        renderHeader={(col, variant) => {
          const d = index.days.get(col.id)!;
          const pending = d.applications.filter((a) => a.status === "pending").length;
          const filled = d.slots.filter((s) => s.profile_id).length;
          return (
            <span className={clsx("flex flex-wrap items-center gap-x-2 gap-y-0.5 font-mono text-[10px]", variant === "header" ? "mt-1.5" : "mt-1")}>
              {pending > 0 && (
                <span className={clsx("rounded-full px-1.5", variant === "chip" ? "bg-black/20" : "bg-warning/15 text-warning")}>
                  {fmt(l.headerReview, { n: pending })}
                </span>
              )}
              <span className={variant === "chip" ? "opacity-80" : "text-muted"}>{fmt(l.headerFilled, { filled, total })}</span>
            </span>
          );
        }}
      />

      {openDay && (
        <Drawer
          open
          onClose={selection.close}
          title={
            slotOpen !== null
              ? `${slotLabel(slotOpen, openDay.slot_minutes)} UTC`
              : `${fmt(t.common.day, { n: openDay.day_number })} · ${positionLabel(openDay.position, t)}`
          }
          subtitle={
            slotOpen !== null
              ? `${fmt(t.common.day, { n: openDay.day_number })} · ${positionLabel(openDay.position, t)} · ${formatDay(openDay.date, tag)}`
              : formatDay(openDay.date, tag)
          }
          onPrev={
            slotOpen !== null
              ? slotOpen > 0
                ? () => selection.open(openDay.id, slotOpen - 1)
                : undefined
              : dayIndex > 0
                ? () => selection.open(columns[dayIndex - 1].id)
                : undefined
          }
          onNext={
            slotOpen !== null
              ? slotOpen < total - 1
                ? () => selection.open(openDay.id, slotOpen + 1)
                : undefined
              : dayIndex < columns.length - 1
                ? () => selection.open(columns[dayIndex + 1].id)
                : undefined
          }
        >
          {slotOpen !== null ? (
            <SlotPanel key={`${openDay.id}:${slotOpen}`} day={openDay} slotIndex={slotOpen} onOpenDay={() => selection.open(openDay.id)} />
          ) : (
            <DayPanel key={openDay.id} day={openDay} onOpenSlot={(slot) => selection.open(openDay.id, slot)} />
          )}
        </Drawer>
      )}
    </div>
  );
}
