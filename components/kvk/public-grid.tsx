"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Search } from "lucide-react";
import { AllianceDot } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { KvkGrid, type GridCell, type GridColumn } from "@/components/kvk/kvk-grid";
import { Badge, Card, LiveDot, inputClass } from "@/components/ui";
import { useRealtimeRefresh } from "@/components/use-realtime-refresh";
import { fmt } from "@/lib/i18n/format";
import { slotCount } from "@/lib/kvk";
import { supabaseConfigured } from "@/lib/supabase/config";
import type { PublicScheduleRow } from "@/lib/types";

/** The published KvK schedule as a read-only day-by-day grid, live, with search and the viewer's own slots ringed. */
export function PublicGrid({ rows, ownSlotIds }: { rows: PublicScheduleRow[]; ownSlotIds: string[] }) {
  const { t } = useI18n();
  const connected = useRealtimeRefresh([{ table: "slots" }, { table: "kvk_events" }], "public-schedule");
  const [query, setQuery] = useState("");

  const { columns, cells, slotMinutes, filled } = useMemo(() => {
    const byDay = new Map<string, GridColumn>();
    const cells = new Map<string, PublicScheduleRow>();
    const filled = new Map<string, number>();
    for (const r of rows) {
      if (!byDay.has(r.day_id)) byDay.set(r.day_id, { id: r.day_id, dayNumber: r.day_number, date: r.date, position: r.position });
      cells.set(`${r.day_id}:${r.slot_index}`, r);
      if (r.ingame_name) filled.set(r.day_id, (filled.get(r.day_id) ?? 0) + 1);
    }
    const columns = [...byDay.values()].sort((a, b) => a.dayNumber - b.dayNumber || a.position.localeCompare(b.position));
    return { columns, cells, slotMinutes: rows[0]?.slot_minutes ?? 30, filled };
  }, [rows]);

  if (columns.length === 0) {
    return (
      <Card className="px-6 py-16 text-center">
        <p className="font-display text-xl">{t.schedule.emptyTitle}</p>
        <p className="mt-2 text-muted">{t.schedule.emptyBody}</p>
      </Card>
    );
  }

  const own = new Set(ownSlotIds);
  const q = query.trim().toLowerCase();
  const isMatch = (r: PublicScheduleRow) =>
    !!q && (!!r.ingame_name?.toLowerCase().includes(q) || !!r.alliance_tag?.toLowerCase().includes(q));
  const matches = q ? rows.filter(isMatch).length : 0;
  const firstOwn = rows.find((r) => own.has(r.slot_id));

  function getCell(col: GridColumn, slot: number): GridCell {
    const r = cells.get(`${col.id}:${slot}`);
    if (!r?.ingame_name) return { tone: "empty", label: t.kvk.grid.legendOpen, dim: !!q, locked: r?.locked };
    const match = isMatch(r);
    return {
      tone: "taken",
      label: r.alliance_tag ? `[${r.alliance_tag}] ${r.ingame_name}` : r.ingame_name,
      own: own.has(r.slot_id),
      locked: r.locked,
      match,
      dim: !!q && !match,
      content: (
        <>
          <AllianceDot tag={r.alliance_tag} />
          {r.alliance_tag && <span className="font-mono text-[10px] text-gold md:hidden">[{r.alliance_tag}]</span>}
          <span className="truncate" title={r.ingame_name}>
            {r.ingame_name}
          </span>
        </>
      ),
    };
  }

  const total = slotCount(slotMinutes);

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <p className="font-display text-lg">{rows[0].event_title}</p>
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
      {q && matches === 0 && <p className="mb-4 text-sm text-muted">{fmt(t.schedule.noMatch, { query })}</p>}
      <KvkGrid
        columns={columns}
        slotMinutes={slotMinutes}
        getCell={getCell}
        focus={firstOwn ? { dayId: firstOwn.day_id, slot: firstOwn.slot_index } : null}
        ariaLabel={t.kvk.grid.label}
        renderHeader={(col, variant) => (
          <span className={clsx("block font-mono text-[10px] text-muted", variant === "chip" ? "opacity-80" : "mt-1")}>
            {fmt(t.kvk.leader.headerFilled, { filled: filled.get(col.id) ?? 0, total })}
          </span>
        )}
      />
      {own.size > 0 && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted">
          <span className="inline-block size-3 rounded-sm bg-gold/10 shadow-[inset_0_0_0_2px_var(--gold)]" aria-hidden />
          {t.kvk.grid.yours}
        </p>
      )}
    </div>
  );
}
