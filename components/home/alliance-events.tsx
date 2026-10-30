"use client";

import { useState, useSyncExternalStore, type ReactNode } from "react";
import clsx from "clsx";
import { AllianceAvatar, AllianceDot } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { Bone } from "@/components/skeleton";
import { useNow } from "@/components/use-now";
import { EVENT_ROWS, allianceHasEvent, formatWeekdays, rowName, runLabel, toLocal } from "@/lib/alliance-events";
import { ALLIANCES, getAlliance } from "@/lib/alliances";
import type { Messages } from "@/lib/i18n/messages";
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

// The section heading with the UTC / your-time switch beside it.
const headerRow = "mb-8 flex flex-wrap items-end justify-between gap-x-8 gap-y-4";
// Two cards a row from tablets, three from wide screens (where each card is still ~350px wide).
const cardGrid = "grid gap-4 md:grid-cols-2 xl:grid-cols-3";
// A card row: the event name, then its two runs. Tiles keep a readable minimum and share any extra
// width with the name, so wide cards don't leave a gap between them.
const rowGrid = "grid-cols-[minmax(0,1.4fr)_minmax(5.75rem,1fr)_minmax(5.75rem,1fr)]";

/**
 * Every alliance's event times as one card per alliance: an event per row, its two runs (Legion 1
 * and 2, Day 1 and 2…) side by side so the times line up. Tablets and up show every card; phones
 * pick one alliance with chips. Times are UTC unless the viewer switches to their own time.
 */
export function AllianceEvents({
  heading,
  rows,
  dayNames,
}: {
  heading: ReactNode;
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
    return (
      <>
        <div className={headerRow}>{heading}</div>
        <p className="rounded-3xl bg-card p-8 text-center text-muted shadow-[inset_0_0_0_1px_var(--border)]">{e.empty}</p>
      </>
    );
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
      <div className={headerRow}>
        {heading}
        <div className="flex flex-wrap items-center gap-3">
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
      </div>

      {/* Tablets and up: every alliance's card */}
      <ul className={clsx(cardGrid, "max-md:hidden")}>
        {ALLIANCES.map((a) => (
          <li key={a.tag}>
            <AllianceCard tag={a.tag} shown={shown} t={t} />
          </li>
        ))}
      </ul>

      {/* Phones: one alliance at a time */}
      <div className="md:hidden">
        <div role="group" aria-label={e.chipsLabel} className="mb-4 flex flex-wrap gap-2">
          {ALLIANCES.map((a) => (
            <button
              key={a.tag}
              type="button"
              aria-pressed={a.tag === alliance}
              onClick={() => pickAlliance(a.tag)}
              className={clsx(
                "inline-flex h-10 cursor-pointer items-center gap-2 rounded-full px-3.5 font-mono text-sm transition-colors",
                a.tag === alliance
                  ? "bg-primary/15 text-fg shadow-[inset_0_0_0_1px_var(--primary)]"
                  : "bg-card text-muted shadow-[inset_0_0_0_1px_var(--border-strong)] hover:text-fg",
              )}
            >
              <AllianceDot tag={a.tag} />
              {a.tag}
            </button>
          ))}
        </div>
        <AllianceCard tag={alliance} shown={shown} t={t} />
      </div>
    </div>
  );
}

/** One alliance: its banner colour as a soft glow, then a row per event with the runs side by side. */
function AllianceCard({ tag, shown, t }: { tag: string; shown: (tag: string, event: string) => Shown; t: Messages }) {
  const a = getAlliance(tag);
  // Fortress (and any other limited event) only for the alliances that take part.
  const rows = EVENT_ROWS.map((r) => ({ ...r, runs: r.runs.filter((run) => allianceHasEvent(tag, run.event)) })).filter((r) => r.runs.length);
  const anySet = rows.some((r) => r.runs.some((run) => shown(tag, run.event)));

  return (
    <section
      aria-labelledby={`events-${tag}`}
      className="relative flex h-full flex-col overflow-hidden rounded-3xl bg-card p-5 shadow-[inset_0_0_0_1px_var(--border)]"
    >
      <div aria-hidden className="pointer-events-none absolute -top-20 -left-16 size-52 rounded-full opacity-30 blur-3xl" style={{ background: a.field }} />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-8 top-0 h-px opacity-50"
        style={{ background: `linear-gradient(90deg, transparent, ${a.trim}, transparent)` }}
      />
      <div className="relative flex items-center gap-3">
        <AllianceAvatar tag={tag} size={40} />
        <h3 id={`events-${tag}`} className="font-display text-xl font-semibold tracking-wide" style={{ color: a.trim }}>
          {tag}
        </h3>
      </div>

      {anySet ? (
        <dl className="relative mt-5 space-y-2">
          {rows.map(({ row, runs }) => (
            <div key={row} className={clsx("grid items-center gap-2", rowGrid)}>
              <dt className="text-sm leading-snug text-fg/85">{rowName(row, t)}</dt>
              {runs.map((run) => (
                <dd key={run.event}>
                  <Run label={runLabel(run, t)} value={shown(tag, run.event)} notSet={t.home.events.notSet} />
                </dd>
              ))}
            </div>
          ))}
        </dl>
      ) : (
        // Centred in what's left of the card, which keeps the height of its neighbours.
        <p className="relative flex flex-1 items-center justify-center py-10 text-center text-sm text-muted">{t.home.events.noneSet}</p>
      )}
    </section>
  );
}

/** One run's time: a small tile with its label (#1, Legion 2, Day 1), the time, then weekdays and note. */
function Run({ label, value, notSet }: { label: string | null; value: Shown; notSet: string }) {
  const extra = [value?.days, value?.note].filter(Boolean).join(" · ");
  return (
    <div
      className={clsx(
        "min-w-0 rounded-xl border px-2.5 py-1.5",
        value?.time || extra ? "border-transparent bg-white/[0.045]" : "border-dashed border-white/10",
      )}
    >
      {label && <p className="truncate text-[0.625rem] leading-4 tracking-wide text-muted uppercase">{label}</p>}
      {value?.time ? (
        <p className="font-mono text-[0.95rem] leading-5 font-semibold text-fg tabular-nums">{value.time}</p>
      ) : (
        <p className="leading-5 text-muted/50">
          <span aria-hidden>—</span>
          <span className="sr-only">{notSet}</span>
        </p>
      )}
      {extra && (
        <p className="truncate text-[0.6875rem] leading-4 text-gold-soft/90" title={extra}>
          {extra}
        </p>
      )}
    </div>
  );
}

/** Loading shape: the heading with the switch beside it, then the cards. */
export function AllianceEventsSkeleton({ heading }: { heading: ReactNode }) {
  return (
    <>
      <div className={headerRow}>
        {heading}
        <Bone className="h-11 w-56 rounded-full" />
      </div>
      <div aria-hidden className={cardGrid}>
        {ALLIANCES.map((a, i) => (
          <div key={a.tag} className={clsx("rounded-3xl bg-card p-5 shadow-[inset_0_0_0_1px_var(--border)]", i > 0 && "max-md:hidden")}>
            <div className="flex items-center gap-3">
              <Bone className="size-10 rounded-full" />
              <Bone className="h-5 w-14" />
            </div>
            <div className="mt-5 space-y-2">
              {EVENT_ROWS.map((r) => (
                <div key={r.row} className={clsx("grid items-center gap-2", rowGrid)}>
                  <Bone className="h-3.5 w-20" />
                  <Bone className="h-11 rounded-xl" />
                  {r.runs.length > 1 && <Bone className="h-11 rounded-xl" />}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
