"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import clsx from "clsx";
import { AllianceDot } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { eventSlotMinutes, toColumns } from "@/components/kvk/columns";
import { Drawer } from "@/components/kvk/drawer";
import { KvkGrid, type GridCell, type GridColumn } from "@/components/kvk/kvk-grid";
import { useGridSelection } from "@/components/kvk/use-grid-selection";
import { EventStatusBadge } from "@/components/admin/event-status";
import { Notice } from "@/components/ui";
import { useRealtimeRefresh } from "@/components/use-realtime-refresh";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { formatDay, positionLabel, slotStartLabel } from "@/lib/kvk";
import type { PlayerEvent, PublicScheduleRow } from "@/lib/types";
import { ApplyPanel, StatusBadge } from "./apply-panel";

/**
 * The player's KvK view: the current event as a day-by-day grid. While applications are open,
 * tapping a time opens the drawer to apply for that day; the grid shows where they applied
 * (amber pending, green accepted, red rejected). Once published, it shows everyone's slots with
 * the player's own ringed in gold.
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

  function getCell(col: GridColumn, slot: number): GridCell {
    const day = dayById.get(col.id)!;
    const app = day.applications[0];
    const mine = day.slots.some((s) => s.slot_index === slot);
    if (event.status === "published") {
      const r = names.get(`${col.id}:${slot}`);
      if (!r?.ingame_name) return { tone: "empty", label: t.kvk.grid.legendOpen };
      return {
        tone: "taken",
        own: mine,
        locked: r.locked,
        label: mine ? t.kvk.grid.yours : r.ingame_name,
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
    const wants = app && (app.preferred_slots.includes(slot) || (app.anytime && app.preferred_slots.length === 0));
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

      <Legend published={event.status === "published"} />

      <KvkGrid
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
          if (event.status === "published" && own)
            return (
              <span className={clsx("block font-mono text-[10px] text-gold-soft", variant === "header" && "mt-1")}>
                ★ {slotStartLabel(own.slot_index, day.slot_minutes)}
              </span>
            );
          if (!app) return variant === "header" && event.status === "open" ? <span className="mt-1 block text-[11px] text-muted">{t.apply.notApplied}</span> : null;
          return (
            <span className={clsx("block", variant === "header" ? "mt-1.5" : "mt-1")}>
              <StatusBadge status={app.status} />
            </span>
          );
        }}
      />

      {event.status === "published" && (
        <Link href={localePath(locale, "/positions")} className="inline-block text-sm text-gold-soft hover:underline">
          {p.publicSchedule} →
        </Link>
      )}

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

function Legend({ published }: { published: boolean }) {
  const { t } = useI18n();
  const items = published
    ? [{ cls: "bg-gold/10 shadow-[inset_0_0_0_2px_var(--gold)]", label: t.kvk.grid.yours }, { cls: "bg-white/[0.06]", label: t.kvk.grid.legendTaken }]
    : [
        { cls: "bg-warning/25", label: t.status.application.pendingShort },
        { cls: "bg-success/25", label: t.status.application.accepted },
        { cls: "bg-danger/20", label: t.status.application.rejected },
      ];
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span aria-hidden className={clsx("inline-block size-3 rounded-sm", i.cls)} />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
