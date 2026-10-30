"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { AllianceDot } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { eventSlotMinutes, toColumns } from "@/components/kvk/columns";
import { Drawer } from "@/components/kvk/drawer";
import { KvkGrid, type GridCell, type GridColumn, type GridHandle } from "@/components/kvk/kvk-grid";
import { OwnSlots } from "@/components/kvk/own-slots";
import { useGridSelection } from "@/components/kvk/use-grid-selection";
import { EventStatusBadge } from "@/components/admin/event-status";
import { Notice } from "@/components/ui";
import { useRealtimeRefresh } from "@/components/use-realtime-refresh";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { formatDay, positionLabel, slotStartLabel } from "@/lib/kvk";
import type { PlayerEvent, PublicScheduleRow } from "@/lib/types";
import { ApplyPanel } from "./apply-panel";

/**
 * The player's KvK view: the current event as a day-by-day grid. While applications are open,
 * tapping a time opens the drawer to apply for that day; the grid shows where they applied
 * (amber pending, green accepted, red rejected), the times other players already hold, and the
 * player's own slots ringed in gold, with buttons that jump to them.
 */
export function PlayerGrid({
  events,
  schedule,
  canApply,
  accountNotice,
}: {
  events: PlayerEvent[];
  schedule: PublicScheduleRow[];
  canApply: boolean;
  accountNotice: string | null;
}) {
  const { locale, t, tag } = useI18n();
  const p = t.kvk.player;
  // A leader's accept/reject shows up live. UPDATE only: RLS can't filter DELETE events.
  useRealtimeRefresh(
    [{ table: "applications", event: "UPDATE" }, { table: "kvk_events" }, { table: "slots", event: "UPDATE" }],
    "player-kvk",
  );
  const selection = useGridSelection();
  const [eventId, setEventId] = useState(() => {
    // The event that owns the day in the URL, else the first (open ones come first).
    const fromUrl = events.find((e) => e.event_days.some((d) => d.id === selection.day));
    return (fromUrl ?? events[0]).id;
  });
  const [flash, setFlash] = useState<string | null>(null);
  const grid = useRef<GridHandle>(null);

  const event = events.find((e) => e.id === eventId) ?? events[0];
  const columns = useMemo(() => toColumns(event.event_days), [event]);
  const slotMinutes = eventSlotMinutes(event.event_days);
  const dayById = useMemo(() => new Map(event.event_days.map((d) => [d.id, d])), [event]);
  const names = useMemo(
    () => new Map(schedule.filter((r) => r.event_id === event.id).map((r) => [`${r.day_id}:${r.slot_index}`, r])),
    [schedule, event.id],
  );

  const ownSlot = event.event_days.flatMap((d) => d.slots.map((s) => ({ dayId: d.id, slot: s.slot_index })))[0] ?? null;
  const firstApplied = event.event_days.find((d) => d.applications[0]);
  const firstWanted = firstApplied?.applications[0]?.preferred_slots[0];
  const focus = ownSlot ?? (firstApplied && firstWanted !== undefined ? { dayId: firstApplied.id, slot: firstWanted } : null);

  // The player's slots in this event, for the "Your slots" list.
  const ownSlots = useMemo(
    () =>
      columns.flatMap((c) => {
        const day = dayById.get(c.id)!;
        return day.slots.map((s) => ({
          dayId: day.id,
          dayNumber: day.day_number,
          position: day.position,
          date: day.date,
          slot: s.slot_index,
          slotMinutes: day.slot_minutes,
        }));
      }),
    [columns, dayById],
  );

  function getCell(col: GridColumn, slot: number): GridCell {
    const day = dayById.get(col.id)!;
    const app = day.applications[0];
    if (day.slots.some((s) => s.slot_index === slot)) {
      return {
        tone: "taken",
        own: true,
        label: t.kvk.grid.yours,
        content: <span className="truncate font-medium text-gold-soft">★ {t.kvk.grid.yours}</span>,
      };
    }
    // Someone else holds this time.
    const r = names.get(`${col.id}:${slot}`);
    if (r?.ingame_name) {
      return {
        tone: "taken",
        locked: r.locked,
        label: r.ingame_name,
        content: (
          <>
            <AllianceDot tag={r.alliance_tag} />
            <span className="truncate" title={r.ingame_name}>
              {r.ingame_name}
            </span>
          </>
        ),
      };
    }
    // Once they hold a slot that day, the other times they picked no longer matter.
    const placed = day.slots.length > 0;
    const wants = !placed && app && (app.preferred_slots.includes(slot) || (app.anytime && app.preferred_slots.length === 0));
    if (!wants) return { tone: "empty", label: t.kvk.grid.legendOpen };
    const statusText =
      app.status === "accepted"
        ? t.status.application.accepted
        : app.status === "rejected"
          ? t.status.application.rejected
          : t.status.application.pendingShort;
    return { tone: app.status, label: statusText };
  }

  const openDay = selection.day ? dayById.get(selection.day) : undefined;
  const dayIndex = openDay ? columns.findIndex((c) => c.id === openDay.id) : -1;
  // The player's other positions on the open day's date (e.g. Chief Minister and Noble Advisor).
  const sameDay = openDay
    ? event.event_days.filter((d) => d.date === openDay.date && d.id !== openDay.id && (d.slots.length > 0 || d.applications.length > 0))
    : [];
  const done = useCallback(
    (message: string) => {
      setFlash(message);
      selection.close();
    },
    [selection],
  );

  const stateText = event.status === "open" ? p.stateOpen : event.status === "closed" ? p.stateClosed : p.statePublished;

  return (
    <div className="space-y-5">
      {events.length > 1 && (
        <div role="tablist" aria-label={p.eventsLabel} className="flex flex-wrap gap-2">
          {events.map((e) => (
            <button
              key={e.id}
              type="button"
              role="tab"
              aria-selected={e.id === event.id}
              onClick={() => setEventId(e.id)}
              className={clsx(
                "flex cursor-pointer items-center gap-2 rounded-full px-4 py-2 text-sm transition-colors",
                e.id === event.id ? "bg-white/10 text-fg" : "bg-card text-muted hover:text-fg",
              )}
            >
              {e.title}
              <EventStatusBadge status={e.status} t={t} />
            </button>
          ))}
        </div>
      )}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="font-display text-xl font-semibold">{event.title}</h2>
        <EventStatusBadge status={event.status} t={t} />
      </div>
      <p className="-mt-2 text-sm text-muted">{stateText}</p>

      {accountNotice && <Notice tone="warning">{accountNotice}</Notice>}
      {flash && <Notice tone="success">{flash}</Notice>}

      <OwnSlots slots={ownSlots} onJump={(o) => grid.current?.jumpTo(o.dayId, o.slot)} />

      <Legend />

      <KvkGrid
        ref={grid}
        hideJumpToFocus={ownSlots.length > 0}
        columns={columns}
        slotMinutes={slotMinutes}
        getCell={getCell}
        focus={focus}
        selected={{ dayId: selection.day, slot: selection.slot }}
        ariaLabel={t.kvk.grid.label}
        onCellClick={(col, slot) => {
          setFlash(null);
          selection.open(col.id, slot);
        }}
        onHeaderClick={(col) => {
          setFlash(null);
          selection.open(col.id);
        }}
        renderHeader={(col, variant) => {
          const day = dayById.get(col.id)!;
          const app = day.applications[0];
          const own = day.slots[0];
          const gap = variant === "header" ? "mt-1" : "mt-0.5";
          if (own)
            return (
              <span className={clsx("block font-mono text-[0.6875rem] text-gold-soft", gap)}>
                ★ {slotStartLabel(own.slot_index, day.slot_minutes)}
              </span>
            );
          if (!app) return variant === "header" && event.status === "open" ? <span className={clsx("block text-[0.6875rem] text-muted", gap)}>{t.apply.notApplied}</span> : null;
          const [tone, text] =
            app.status === "accepted"
              ? ["text-success", t.status.application.accepted]
              : app.status === "rejected"
                ? ["text-danger", t.status.application.rejected]
                : ["text-warning", t.status.application.pendingShort];
          return <span className={clsx("block text-[0.6875rem]", tone, gap)}>{text}</span>;
        }}
      />

      <Link href={localePath(locale, "/account/schedule")} className="inline-block text-sm text-gold-soft hover:underline">
        {p.publicSchedule} →
      </Link>

      {openDay && (
        <Drawer
          open
          onClose={selection.close}
          title={`${fmt(t.common.day, { n: openDay.day_number })} · ${positionLabel(openDay.position, t)}`}
          subtitle={
            <span className="flex flex-wrap items-center gap-2">
              {formatDay(openDay.date, tag)}
              {selection.slot !== null && <span className="font-mono">· {slotStartLabel(selection.slot, openDay.slot_minutes)} UTC</span>}
            </span>
          }
          onPrev={dayIndex > 0 ? () => selection.open(columns[dayIndex - 1].id) : undefined}
          onNext={dayIndex < columns.length - 1 ? () => selection.open(columns[dayIndex + 1].id) : undefined}
        >
          <ApplyPanel
            key={openDay.id}
            day={openDay}
            sameDay={sameDay}
            eventStatus={event.status}
            canApply={canApply}
            accountNotice={accountNotice}
            tappedSlot={selection.slot}
            onDone={done}
          />
        </Drawer>
      )}
    </div>
  );
}

function Legend() {
  const { t } = useI18n();
  const items = [
    { cls: "bg-gold/20 shadow-[inset_0_0_0_1px_rgba(233,196,106,0.6)]", label: t.kvk.grid.yours },
    { cls: "bg-white/10", label: t.kvk.grid.legendTaken },
    { cls: "bg-warning/25", label: t.status.application.pendingShort },
    { cls: "bg-success/25", label: t.status.application.accepted },
    { cls: "bg-danger/20", label: t.status.application.rejected },
  ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className={clsx("inline-block size-3 rounded-[4px]", i.cls)} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
