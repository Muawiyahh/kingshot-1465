"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { Crosshair } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { useNow } from "@/components/use-now";
import { Card } from "@/components/ui";
import { fmt } from "@/lib/i18n/format";
import { formatDay, isSlotLive, positionLabel, slotLabel } from "@/lib/kvk";

export type OwnSlot = { dayId: string; dayNumber: number; position: string; date: string; slot: number; slotMinutes: number };

/**
 * The viewer's own slots above a schedule, each with a button that jumps to it in the table, so
 * nobody has to scroll through 48 rows a day to find their time.
 */
export function OwnSlots({ slots, onJump, empty }: { slots: OwnSlot[]; onJump: (s: OwnSlot) => void; empty?: ReactNode }) {
  const { t, tag } = useI18n();
  const s = t.account.schedule;
  const now = useNow(30_000);
  if (!slots.length && !empty) return null;

  return (
    <Card className="p-4 sm:p-5">
      <h2 className="font-display text-base font-semibold">{s.yourSlots}</h2>
      {slots.length === 0 ? (
        <div className="mt-1 text-sm text-muted">{empty}</div>
      ) : (
        <ul className="mt-3 grid gap-2 lg:grid-cols-2">
          {slots.map((o) => {
            const live = now !== null && isSlotLive(o.date, o.slot, o.slotMinutes, now);
            return (
              <li key={`${o.dayId}:${o.slot}`}>
                <button
                  type="button"
                  onClick={() => onJump(o)}
                  className={clsx(
                    "group flex w-full cursor-pointer items-center gap-3 rounded-2xl px-3.5 py-2.5 text-left transition-colors",
                    "bg-gold/[0.07] shadow-[inset_0_0_0_1px_rgba(233,196,106,0.35)] hover:bg-gold/[0.12]",
                  )}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-semibold text-fg">
                      {fmt(t.common.day, { n: o.dayNumber })} · {positionLabel(o.position, t)}
                    </span>
                    <span className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted">
                      <span>{formatDay(o.date, tag)}</span>
                      <span className="font-mono text-gold-soft">{slotLabel(o.slot, o.slotMinutes)} UTC</span>
                      {live && <span className="rounded-full bg-primary px-1.5 leading-4 text-on-primary">{s.now}</span>}
                    </span>
                  </span>
                  <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-white/5 px-3 py-1.5 text-xs text-muted transition-colors group-hover:bg-white/10 group-hover:text-fg">
                    <Crosshair className="size-3.5" aria-hidden />
                    {s.showInTable}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
