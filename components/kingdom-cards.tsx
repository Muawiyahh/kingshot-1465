"use client";

import type { CSSProperties, ReactNode } from "react";
import clsx from "clsx";
import { motion } from "motion/react";
import { CalendarDays, Clock, Crown, Hourglass, ShieldHalf, Users } from "lucide-react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { CountUp } from "@/components/count-up";
import { LiveDot } from "@/components/ui";
import { useNow } from "@/components/use-now";
import { useI18n } from "@/components/i18n-provider";
import { ALLIANCES } from "@/lib/alliances";
import type { HomeStats } from "@/lib/data";
import { fmt } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages/en";
import { site } from "@/lib/site";

const ease = [0.16, 1, 0.3, 1] as const;
const DAY = 86_400_000;

function utcMidnight(date: string) {
  return Date.parse(`${date}T00:00:00Z`);
}

function Tile({
  icon,
  label,
  value,
  sub,
  featured,
  seed,
  className,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub: ReactNode;
  featured?: boolean;
  /** Offsets the glow's slow pulse so the tiles don't breathe in step. */
  seed: number;
  className?: string;
}) {
  const glowDelay = { "--glow-delay": `-${(seed * 1.3).toFixed(1)}s` } as CSSProperties;
  return (
    <div
      className={clsx(
        "tile-glow relative h-full rounded-2xl p-[1px] transition-transform duration-300 ease-out hover:-translate-y-1",
        featured ? "bg-gradient-to-br from-gold/60 via-primary/25 to-primary/55" : "bg-gradient-to-br from-primary/45 via-primary/15 to-primary/40",
        className,
      )}
      style={glowDelay}
    >
      <div
        className={clsx(
          "relative flex h-full flex-col rounded-[calc(1rem-1px)] p-4 backdrop-blur-xl",
          // The King's full-width tile only needs its content's height; the others share a row height.
          !featured && "min-h-[10.5rem] sm:min-h-[10rem]",
          featured ? "bg-[#1d1517]/80" : "bg-card/75",
          "shadow-[0_20px_40px_-14px_rgba(0,0,0,0.7)]",
        )}
      >
        <div className="flex items-start gap-2">
          <span
            className={clsx(
              "flex size-7 shrink-0 items-center justify-center rounded-lg",
              "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(214,58,68,0.3)]",
            )}
          >
            {icon}
          </span>
          {/* Wraps instead of truncating: some languages need two lines on small cards. */}
          <span className="min-w-0 self-center font-mono text-[0.625rem] leading-tight uppercase tracking-[0.08em] break-words text-muted sm:tracking-[0.18em]">
            {label}
          </span>
        </div>
        <div className="mt-3 min-w-0 font-display text-2xl font-bold tracking-tight text-fg tabular-nums sm:text-[1.7rem]">
          {value}
        </div>
        <div className="mt-auto pt-1.5 text-xs text-muted">{sub}</div>
      </div>
    </div>
  );
}

const dim = <span className="text-muted/50">—</span>;

/** Days, hours, minutes and seconds left, each over its unit. Ticks with the page's clock. */
function Countdown({ ms, t }: { ms: number; t: Messages }) {
  const u = t.cards.units;
  const parts: [number, string][] = [
    [Math.floor(ms / DAY), u.d],
    [Math.floor((ms % DAY) / 3_600_000), u.h],
    [Math.floor((ms % 3_600_000) / 60_000), u.m],
    [Math.floor((ms % 60_000) / 1000), u.s],
  ];
  return (
    <span role="timer" className="flex items-start gap-3 sm:gap-4">
      {parts.map(([n, unit]) => (
        <span key={unit} className="flex min-w-[2ch] flex-col items-center">
          <span className="leading-none">{String(n).padStart(2, "0")}</span>
          <span className="mt-1.5 font-mono text-[0.625rem] font-normal tracking-wider text-muted uppercase">{unit}</span>
        </span>
      ))}
    </span>
  );
}

/**
 * The Next KvK tile. A KvK event that is running shows its day; otherwise it counts down to the date
 * leaders set in Admin → Next KvK, or else to the next KvK event. Shown once the clock is known, so
 * the server and browser renders match.
 */
function kvkDisplay(stats: HomeStats | null, now: number | null, t: Messages, tag: string): { value: ReactNode; sub: string } {
  const kvk = stats?.kvk ?? null;
  const setAt = stats?.nextKvkAt ? Date.parse(stats.nextKvkAt) : null;
  if (!kvk && setAt === null) return { value: dim, sub: t.cards.noneScheduled };
  if (now === null) return { value: dim, sub: " " };

  if (kvk) {
    const start = utcMidnight(kvk.startsOn);
    if (now >= start && now < start + kvk.days * DAY) {
      const day = Math.floor((now - start) / DAY) + 1;
      return {
        value: (
          <span className="inline-flex items-center gap-2">
            <LiveDot /> {t.common.live}
          </span>
        ),
        sub: `${fmt(t.cards.liveDay, { day, days: kvk.days })} · ${kvk.title}`,
      };
    }
  }
  if (setAt !== null && setAt > now) {
    const d = new Date(setAt);
    return {
      value: <Countdown ms={setAt - now} t={t} />,
      sub: fmt(t.cards.startsAt, {
        date: d.toLocaleDateString(tag, { weekday: "short", day: "numeric", month: "short", timeZone: "UTC" }),
        time: d.toISOString().slice(11, 16),
      }),
    };
  }
  if (kvk && utcMidnight(kvk.startsOn) > now) {
    return { value: <Countdown ms={utcMidnight(kvk.startsOn) - now} t={t} />, sub: kvk.title };
  }
  return { value: dim, sub: t.cards.noneScheduled };
}

/** Six glass tiles with the kingdom's key facts, the King on a row of their own. */
export function KingdomCards({ stats }: { stats: HomeStats | null }) {
  const { t, tag } = useI18n();
  const now = useNow(1000);
  const kvk = kvkDisplay(stats, now, t, tag);

  // HH:MM in every language, matching the game and the slot times.
  const pad = (n: number) => String(n).padStart(2, "0");
  const clock = (utc: boolean) => {
    if (now === null) return "--:--";
    const d = new Date(now);
    return utc
      ? `${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`
      : `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const opened = stats?.serverOpenedOn ? utcMidnight(stats.serverOpenedOn) : null;
  const serverDay = opened !== null && now !== null ? Math.max(1, Math.floor((now - opened) / DAY) + 1) : null;

  // The King gets a full row so the name always fits. Wider screens (6 columns): King; Alliances,
  // Governors, Server time as thirds; Server age and Next KvK as halves (the countdown needs the room).
  // Phones (2 columns): King, 2 × 2, then Next KvK across the screen.
  const tiles: { key: string; tile: ReactNode; span: string }[] = [
    {
      key: "king",
      span: "col-span-2 sm:col-span-6",
      tile: (
        <Tile seed={0}
          featured
          icon={<Crown className="size-3.5" aria-hidden />}
          label={t.cards.king}
          value={
            stats?.king ? (
              <span className="flex items-center gap-2.5">
                <AllianceAvatar tag={stats.king.alliance} size={44} />
                <span className="truncate text-lg sm:text-xl" title={stats.king.name}>
                  {stats.king.name}
                </span>
              </span>
            ) : (
              dim
            )
          }
          sub={
            stats?.king
              ? stats.king.alliance
                ? `[${stats.king.alliance}] · ${t.cards.reigning}`
                : t.cards.reigning
              : t.cards.notAnnounced
          }
        />
      ),
    },
    {
      key: "alliances",
      span: "sm:col-span-2",
      tile: (
        <Tile seed={1}
          icon={<ShieldHalf className="size-3.5" aria-hidden />}
          label={t.cards.alliances}
          value={<CountUp value={ALLIANCES.length} delay={0.3} />}
          sub={
            <span role="img" className="flex flex-wrap gap-1" aria-label={ALLIANCES.map((a) => a.tag).join(", ")}>
              {ALLIANCES.map((a) => (
                <AllianceAvatar key={a.tag} tag={a.tag} size={26} />
              ))}
            </span>
          }
        />
      ),
    },
    {
      key: "players",
      span: "sm:col-span-2",
      tile: (
        <Tile seed={2}
          icon={<Users className="size-3.5" aria-hidden />}
          label={t.cards.governors}
          value={stats?.players != null ? <CountUp value={stats.players} delay={0.4} /> : dim}
          sub={t.cards.registered}
        />
      ),
    },
    {
      key: "time",
      span: "sm:col-span-2",
      tile: (
        <Tile seed={4}
          icon={<Clock className="size-3.5" aria-hidden />}
          label={t.cards.serverTime}
          value={
            <span>
              {clock(true)}
              <span className="ml-1 font-mono text-xs font-normal text-muted">UTC</span>
            </span>
          }
          sub={fmt(t.cards.yourTime, { time: clock(false) })}
        />
      ),
    },
    {
      key: "age",
      span: "sm:col-span-3",
      tile: (
        <Tile seed={5}
          icon={<CalendarDays className="size-3.5" aria-hidden />}
          label={t.cards.serverAge}
          value={serverDay !== null ? fmt(t.cards.serverDay, { n: serverDay.toLocaleString(tag) }) : dim}
          sub={
            stats?.serverOpenedOn
              ? fmt(t.cards.since, {
                  date: new Date(`${stats.serverOpenedOn}T00:00:00Z`).toLocaleDateString(tag, {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    timeZone: "UTC",
                  }),
                })
              : t.cards.openDateNotSet
          }
        />
      ),
    },
    {
      key: "kvk",
      span: "col-span-2 sm:col-span-3",
      tile: (
        <Tile seed={3} icon={<Hourglass className="size-3.5" aria-hidden />} label={t.cards.nextKvk} value={kvk.value} sub={kvk.sub} />
      ),
    },
  ];

  return (
    <div role="group" aria-label={fmt(t.cards.group, { kingdom: site.kingdom })} className="grid grid-cols-2 gap-3.5 sm:grid-cols-6 sm:gap-5">
      {tiles.map((t, i) => (
        <motion.div
          key={t.key}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.2 + i * 0.08 }}
          className={clsx("h-full", t.span)}
        >
          {t.tile}
        </motion.div>
      ))}
    </div>
  );
}
