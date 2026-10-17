"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Search } from "lucide-react";
import { AllianceDot } from "@/components/alliance-banner";
import { EventStatusBadge } from "@/components/admin/event-status";
import { useI18n } from "@/components/i18n-provider";
import { KvkGrid, type GridCell, type GridColumn, type GridHandle } from "@/components/kvk/kvk-grid";
import { OwnSlots, type OwnSlot } from "@/components/kvk/own-slots";
import { Badge, Card, LiveDot, inputClass } from "@/components/ui";
import { useRealtimeRefresh } from "@/components/use-realtime-refresh";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { slotCount } from "@/lib/kvk";
import { supabaseConfigured } from "@/lib/supabase/config";
import type { EventStatus, PublicScheduleRow } from "@/lib/types";

export type ScheduleEvent = { id: string; title: string; status: EventStatus };

/**
 * The KvK schedule, read-only: who holds each 30-minute slot, day by day. Live, with search, the
 * viewer's own slots ringed in gold, and a "Your slots" list that jumps straight to them.
 */
export function ScheduleView({
  events,
  rows,
  ownSlotIds,
  jump,
}: {
  events: ScheduleEvent[];
  rows: PublicScheduleRow[];
  ownSlotIds: string[];
  /** A cell to open at, e.g. from a notification's link (?day=…&slot=…). */
  jump: { dayId: string; slot: number } | null;
}) {
  const { locale, t } = useI18n();
  const connected = useRealtimeRefresh([{ table: "slots", event: "UPDATE" }, { table: "kvk_events" }], "kvk-schedule");
  const [query, setQuery] = useState("");
  const grid = useRef<GridHandle>(null);
  const own = useMemo(() => new Set(ownSlotIds), [ownSlotIds]);

  // The viewer's slots across every event shown, in schedule order.
  const mine = useMemo(
    () =>
      rows
        .filter((r) => own.has(r.slot_id))
        .map((r) => ({
          eventId: r.event_id,
          dayId: r.day_id,
          dayNumber: r.day_number,
          position: r.position,
          date: r.date,
          slot: r.slot_index,
          slotMinutes: r.slot_minutes,
        })),
    [rows, own],
  );

  const [eventId, setEventId] = useState(() => {
    const at = jump ? rows.find((r) => r.day_id === jump.dayId)?.event_id : undefined;
    return at ?? events[0]?.id ?? null;
  });
  const event = events.find((e) => e.id === eventId) ?? events[0];

  const { columns, cells, slotMinutes, filled } = useMemo(() => {
    const byDay = new Map<string, GridColumn>();
    const cells = new Map<string, PublicScheduleRow>();
    const filled = new Map<string, number>();
    for (const r of rows) {
      if (r.event_id !== event?.id) continue;
      if (!byDay.has(r.day_id)) byDay.set(r.day_id, { id: r.day_id, dayNumber: r.day_number, date: r.date, position: r.position });
      cells.set(`${r.day_id}:${r.slot_index}`, r);
      if (r.ingame_name) filled.set(r.day_id, (filled.get(r.day_id) ?? 0) + 1);
    }
    const columns = [...byDay.values()].sort((a, b) => a.dayNumber - b.dayNumber || a.position.localeCompare(b.position));
    const minutes = rows.find((r) => r.event_id === event?.id)?.slot_minutes ?? 30;
    return { columns, cells, slotMinutes: minutes, filled };
  }, [rows, event?.id]);

  // A jump into another event's table (or from the link) waits until that table is on screen.
  const pending = useRef<{ dayId: string; slot: number } | null>(jump);
  useEffect(() => {
    const p = pending.current;
    if (!p || !columns.some((c) => c.id === p.dayId)) return;
    pending.current = null;
    grid.current?.jumpTo(p.dayId, p.slot);
  }, [columns]);

  function jumpTo(o: OwnSlot & { eventId?: string }) {
    if (o.eventId && o.eventId !== event?.id) {
      pending.current = { dayId: o.dayId, slot: o.slot };
      setEventId(o.eventId);
    } else {
      grid.current?.jumpTo(o.dayId, o.slot);
    }
  }

  if (!event || columns.length === 0) {
    return (
      <Card className="px-6 py-16 text-center">
        <p className="font-display text-xl">{t.schedule.emptyTitle}</p>
        <p className="mt-2 text-muted">{t.schedule.emptyBody}</p>
      </Card>
    );
  }

  const q = query.trim().toLowerCase();
  const isMatch = (r: PublicScheduleRow) =>
    !!q && (!!r.ingame_name?.toLowerCase().includes(q) || !!r.alliance_tag?.toLowerCase().includes(q));
  const eventRows = rows.filter((r) => r.event_id === event.id);
  const matches = q ? eventRows.filter(isMatch).length : 0;
  const firstOwn = mine.find((m) => m.eventId === event.id);

  function getCell(col: GridColumn, slot: number): GridCell {
    const r = cells.get(`${col.id}:${slot}`);
    if (!r?.ingame_name) return { tone: "empty", label: t.kvk.grid.legendOpen, dim: !!q, locked: r?.locked };
    const match = isMatch(r);
    const isOwn = own.has(r.slot_id);
    return {
      tone: "taken",
      label: isOwn ? t.kvk.grid.yours : r.alliance_tag ? `[${r.alliance_tag}] ${r.ingame_name}` : r.ingame_name,
      own: isOwn,
      locked: r.locked,
      match,
      dim: !!q && !match,
      content: (
        <>
          <AllianceDot tag={r.alliance_tag} />
          {r.alliance_tag && <span className="font-mono text-[0.625rem] text-gold md:hidden">[{r.alliance_tag}]</span>}
          <span className="truncate" title={r.ingame_name}>
            {r.ingame_name}
          </span>
        </>
      ),
    };
  }

  const total = slotCount(slotMinutes);
  const s = t.account.schedule;

  return (
    <div className="space-y-5">
      <OwnSlots
        slots={mine}
        onJump={jumpTo}
        empty={
          <>
            {s.noSlots}{" "}
            <Link href={localePath(locale, "/account/appointments")} className="text-gold-soft hover:underline">
              {s.applyCta} →
            </Link>
          </>
        }
      />

      {events.length > 1 && (
        <div role="tablist" aria-label={t.kvk.player.eventsLabel} className="flex flex-wrap gap-2">
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

      <div className="flex flex-wrap items-center gap-3">
        <h2 className="font-display text-lg font-semibold">{event.title}</h2>
        {connected ? (
          <Badge tone="green">
            <LiveDot /> {t.schedule.liveOn}
          </Badge>
        ) : (
          supabaseConfigured && <Badge>{t.schedule.connecting}</Badge>
        )}
        <label className="relative w-full sm:ml-auto sm:w-64">
          <span className="sr-only">{t.schedule.findPlayer}</span>
          <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t.schedule.searchPlaceholder}
            className={clsx(inputClass, "pl-10")}
          />
        </label>
      </div>
      {q && matches === 0 && <p className="text-sm text-muted">{fmt(t.schedule.noMatch, { query })}</p>}

      <KvkGrid
        ref={grid}
        columns={columns}
        slotMinutes={slotMinutes}
        getCell={getCell}
        focus={jump && columns.some((c) => c.id === jump.dayId) ? jump : firstOwn ? { dayId: firstOwn.dayId, slot: firstOwn.slot } : null}
        hideJumpToFocus
        ariaLabel={t.kvk.grid.label}
        renderHeader={(col, variant) => (
          <span className={clsx("block font-mono text-[0.625rem] text-muted", variant === "chip" ? "opacity-80" : "mt-1")}>
            {fmt(t.kvk.leader.headerFilled, { filled: filled.get(col.id) ?? 0, total })}
          </span>
        )}
      />
    </div>
  );
}
