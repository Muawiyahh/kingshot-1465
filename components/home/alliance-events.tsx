"use client";

import { useState, useSyncExternalStore } from "react";
import clsx from "clsx";
import { AllianceAvatar, AllianceDot } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { useNow } from "@/components/use-now";
import { ALLIANCE_EVENTS, formatWeekdays, toLocal } from "@/lib/alliance-events";
import { ALLIANCES } from "@/lib/alliances";
import type { AllianceEventRow } from "@/lib/types";

type Mode = "utc" | "local";
type Shown = { time: string | null; days: string | null; note: string | null } | null;

const MODE_KEY = "home-events-time";
const ALLIANCE_KEY = "home-events-alliance";

// Per-viewer choices, kept in this browser only. Storage can be blocked, so every access is guarded.
function readStored(key: string) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}
function store(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}
const subscribeStorage = (cb: () => void) => {
  window.addEventListener("storage", cb);
  return () => window.removeEventListener("storage", cb);
};
/** A saved choice: null on the server and during hydration, so the markup matches. */
function useStored(key: string) {
  return useSyncExternalStore(subscribeStorage, () => readStored(key), () => null);
}

/** "UTC+8" for the viewer's time zone (null on the server). */
function zoneLabel() {
  try {
    const part = new Intl.DateTimeFormat("en-US", { timeZoneName: "shortOffset" })
      .formatToParts(new Date())
      .find((p) => p.type === "timeZoneName")?.value;
    return part ? part.replace("GMT", "UTC") : null;
  } catch {
    return null;
  }
}
const noSubscribe = () => () => {};

/**
 * Every alliance's event times. A table from tablets up; on phones, alliance chips and one
 * alliance's list. Times are UTC unless the viewer switches to their own time.
 */
export function AllianceEvents({
  rows,
  dayNames,
}: {
  rows: AllianceEventRow[];
  /** Short weekday names from the server (0 = Sunday), so server and browser render the same text. */
  dayNames: string[];
}) {
  const { t } = useI18n();
  const e = t.home.events;
  const now = useNow(60_000);
  const zone = useSyncExternalStore(noSubscribe, zoneLabel, () => null);

  const savedMode = useStored(MODE_KEY);
  const savedAlliance = useStored(ALLIANCE_KEY);
  const [chosenMode, setChosenMode] = useState<Mode | null>(null);
  const [chosenAlliance, setChosenAlliance] = useState<string | null>(null);
  const mode: Mode = chosenMode ?? (savedMode === "local" ? "local" : "utc");
  const alliance = chosenAlliance ?? ALLIANCES.find((a) => a.tag === savedAlliance)?.tag ?? ALLIANCES[0].tag;

  if (rows.length === 0) {
    return <p className="rounded-3xl bg-card p-8 text-center text-muted shadow-[inset_0_0_0_1px_var(--border)]">{e.empty}</p>;
  }

  const byKey = new Map(rows.map((r) => [`${r.alliance}:${r.event}`, r]));
  const shown = (tag: string, event: string): Shown => {
    const r = byKey.get(`${tag}:${event}`);
    if (!r) return null;
    let time = r.time_utc;
    let days = r.weekdays ?? [];
    if (mode === "local" && now !== null && time) ({ time, weekdays: days } = toLocal(time, days, now));
    return { time, days: days.length ? formatWeekdays(days, dayNames) : null, note: r.note };
  };

  const pickMode = (m: Mode) => {
    setChosenMode(m);
    store(MODE_KEY, m);
  };
  const pickAlliance = (tag: string) => {
    setChosenAlliance(tag);
    store(ALLIANCE_KEY, tag);
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center gap-3 md:justify-end">
        <span className="text-sm text-muted">{e.showIn}</span>
        <div className="inline-flex rounded-full bg-card p-1 shadow-[inset_0_0_0_1px_var(--border-strong)]">
          {(["utc", "local"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => pickMode(m)}
              className={clsx(
                "h-9 cursor-pointer rounded-full px-4 text-sm whitespace-nowrap transition-colors",
                mode === m ? "bg-primary text-on-primary" : "text-muted hover:text-fg",
              )}
            >
              {m === "utc" ? e.utc : zone ? `${e.local} · ${zone}` : e.local}
            </button>
          ))}
        </div>
      </div>

      {/* Tablets and up: every alliance at once */}
      <div className="hidden overflow-hidden rounded-3xl bg-card shadow-[inset_0_0_0_1px_var(--border)] md:block">
        <table className="w-full table-fixed text-left">
          <caption className="sr-only">{e.title}</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="w-32 px-5 py-4 font-mono text-[11px] font-normal tracking-[0.16em] text-muted uppercase lg:w-36">
                {e.alliance}
              </th>
              {ALLIANCE_EVENTS.map((ev) => (
                <th key={ev} scope="col" className="px-3 py-4 align-bottom font-mono text-[11px] font-normal tracking-[0.1em] text-muted uppercase">
                  <span className="line-clamp-2" title={e.names[ev]}>
                    {e.names[ev]}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {ALLIANCES.map((a) => (
              <tr key={a.tag} className="border-b border-border/60 transition-colors last:border-0 hover:bg-white/[0.02]">
                <th scope="row" className="px-5 py-3 font-normal">
                  <span className="flex items-center gap-3">
                    <AllianceAvatar tag={a.tag} size={36} />
                    <span className="font-mono text-sm text-fg">{a.tag}</span>
                  </span>
                </th>
                {ALLIANCE_EVENTS.map((ev) => (
                  <td key={ev} className="px-3 py-3">
                    <Cell value={shown(a.tag, ev)} notSet={e.notSet} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Phones: one alliance at a time */}
      <div className="md:hidden">
        <div role="group" aria-label={e.chipsLabel} className="flex flex-wrap gap-2">
          {ALLIANCES.map((a) => (
            <button
              key={a.tag}
              type="button"
              aria-pressed={a.tag === alliance}
              onClick={() => pickAlliance(a.tag)}
              className={clsx(
                "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-3.5 font-mono text-sm transition-colors",
                a.tag === alliance
                  ? "bg-primary text-on-primary"
                  : "bg-card text-muted shadow-[inset_0_0_0_1px_var(--border-strong)] hover:text-fg",
              )}
            >
              <AllianceDot tag={a.tag} />
              {a.tag}
            </button>
          ))}
        </div>
        <ul className="mt-4 divide-y divide-border rounded-3xl bg-card shadow-[inset_0_0_0_1px_var(--border)]" aria-label={alliance}>
          {ALLIANCE_EVENTS.map((ev) => (
            <li key={ev} className="flex items-center gap-4 px-5 py-3.5">
              <span className="min-w-0 flex-1 text-sm">{e.names[ev]}</span>
              <Cell value={shown(alliance, ev)} notSet={e.notSet} align="end" />
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Cell({ value, notSet, align = "start" }: { value: Shown; notSet: string; align?: "start" | "end" }) {
  if (!value) {
    return (
      <span className="text-muted/40">
        <span aria-hidden>—</span>
        <span className="sr-only">{notSet}</span>
      </span>
    );
  }
  return (
    <div className={clsx("min-w-0", align === "end" && "max-w-[55%] shrink-0 text-right")}>
      {value.time && <p className="font-mono text-base font-semibold text-fg tabular-nums">{value.time}</p>}
      {value.days && (
        <p className="truncate text-xs text-gold-soft" title={value.days}>
          {value.days}
        </p>
      )}
      {value.note && (
        <p className="truncate text-xs text-muted" title={value.note}>
          {value.note}
        </p>
      )}
    </div>
  );
}
