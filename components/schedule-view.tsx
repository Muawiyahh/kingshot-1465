"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Lock, Search } from "lucide-react";
import { Badge, Card, LiveDot, inputClass } from "@/components/ui";
import { useNow } from "@/components/use-now";
import { useRealtimeRefresh } from "@/components/use-realtime-refresh";
import { formatDay, isSlotLive, slotLabel } from "@/lib/kvk";
import { supabaseConfigured } from "@/lib/supabase/config";
import type { PublicScheduleRow } from "@/lib/types";

type DayGroup = {
  dayId: string;
  dayNumber: number;
  date: string;
  position: string;
  rows: PublicScheduleRow[];
};

export function ScheduleView({ rows }: { rows: PublicScheduleRow[] }) {
  const connected = useRealtimeRefresh(["slots", "kvk_events"], "public-schedule");
  const now = useNow();
  const [query, setQuery] = useState("");

  const days = useMemo(() => {
    const map = new Map<string, DayGroup>();
    for (const r of rows) {
      const g = map.get(r.day_id) ?? {
        dayId: r.day_id,
        dayNumber: r.day_number,
        date: r.date,
        position: r.position,
        rows: [],
      };
      g.rows.push(r);
      map.set(r.day_id, g);
    }
    return [...map.values()].sort((a, b) => a.dayNumber - b.dayNumber || a.position.localeCompare(b.position));
  }, [rows]);

  // Default to the day/position that is live right now, else the first.
  const liveDay = now === null ? undefined : days.find((d) => d.rows.some((r) => isSlotLive(d.date, r.slot_index, r.slot_minutes, now)));
  const [picked, setPicked] = useState<string | null>(null);
  const activeId = picked ?? liveDay?.dayId ?? days[0]?.dayId;
  const active = days.find((d) => d.dayId === activeId);

  if (days.length === 0) {
    return (
      <Card className="px-6 py-16 text-center">
        <p className="font-display text-xl">No schedule published yet</p>
        <p className="mt-2 text-muted">
          When leaders publish the KvK position schedule it will appear here automatically.
        </p>
      </Card>
    );
  }

  const q = query.trim().toLowerCase();
  const visible = active?.rows.filter(
    (r) => !q || r.ingame_name?.toLowerCase().includes(q) || r.alliance_tag?.toLowerCase().includes(q),
  );
  const filled = active?.rows.filter((r) => r.ingame_name).length ?? 0;

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <p className="font-display text-lg">{days[0].rows[0].event_title}</p>
        {connected ? (
          <Badge tone="green">
            <LiveDot /> Live updates on
          </Badge>
        ) : (
          supabaseConfigured && <Badge>Connecting…</Badge>
        )}
      </div>

      <div role="tablist" aria-label="Day and position" className="-mx-4 mb-6 flex gap-2 overflow-x-auto px-4 pb-2">
        {days.map((d) => {
          const selected = d.dayId === activeId;
          return (
            <button
              key={d.dayId}
              role="tab"
              aria-selected={selected}
              onClick={() => setPicked(d.dayId)}
              className={clsx(
                "shrink-0 cursor-pointer rounded-2xl px-4 py-2.5 text-left transition-colors",
                selected
                  ? "bg-primary text-on-primary shadow-[0_0_35px_-12px_var(--glow)]"
                  : "bg-card text-muted shadow-[inset_0_0_0_1px_var(--border)] hover:text-fg",
              )}
            >
              <span className="block text-xs opacity-80">
                Day {d.dayNumber} · {formatDay(d.date)}
              </span>
              <span className="block text-sm font-semibold">{d.position}</span>
            </button>
          );
        })}
      </div>

      {active && (
        <Card className="overflow-hidden">
          <div className="flex flex-wrap items-center gap-4 border-b border-border p-4 sm:p-5">
            <div>
              <p className="font-semibold">
                Day {active.dayNumber} · {active.position}
              </p>
              <p className="text-sm text-muted">
                {filled} of {active.rows.length} slots assigned
              </p>
            </div>
            <label className="relative ml-auto w-full sm:w-64">
              <span className="sr-only">Find a player</span>
              <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted" aria-hidden />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find player or alliance"
                className={clsx(inputClass, "pl-10")}
              />
            </label>
          </div>
          <ul className="divide-y divide-border">
            {visible?.map((r) => {
              const live = now !== null && isSlotLive(r.date, r.slot_index, r.slot_minutes, now);
              return (
                <li
                  key={r.slot_id}
                  className={clsx(
                    "flex items-center gap-4 px-4 py-3 sm:px-5",
                    live && "bg-primary/10 shadow-[inset_3px_0_0_var(--primary)]",
                  )}
                >
                  <span className="hidden w-8 shrink-0 font-mono text-xs text-muted/70 tabular-nums sm:inline">
                    {String(r.slot_index + 1).padStart(2, "0")}
                  </span>
                  <span className="w-[6.5rem] shrink-0 font-mono text-xs tabular-nums text-muted sm:w-28 sm:text-sm">
                    {slotLabel(r.slot_index, r.slot_minutes)}
                  </span>
                  {r.ingame_name ? (
                    <span className="min-w-0 truncate">
                      {r.alliance_tag && <span className="mr-1.5 font-mono text-xs text-gold">[{r.alliance_tag}]</span>}
                      {r.ingame_name}
                    </span>
                  ) : (
                    <span className="text-sm italic text-muted/60">Not assigned</span>
                  )}
                  <span className="ml-auto flex items-center gap-2">
                    {r.locked && <Lock className="size-3.5 text-muted/60" aria-label="Locked" />}
                    {live && (
                      <Badge tone="red">
                        <LiveDot /> Now
                      </Badge>
                    )}
                  </span>
                </li>
              );
            })}
            {visible?.length === 0 && <li className="px-5 py-10 text-center text-muted">No match for “{query}”.</li>}
          </ul>
        </Card>
      )}
    </div>
  );
}
