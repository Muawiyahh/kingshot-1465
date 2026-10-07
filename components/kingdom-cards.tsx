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
          "relative flex h-full min-h-[10.5rem] flex-col rounded-[calc(1rem-1px)] p-4 backdrop-blur-xl sm:min-h-[11.5rem]",
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
          <span className="min-w-0 self-center font-mono text-[10px] leading-tight uppercase tracking-[0.08em] break-words text-muted sm:tracking-[0.18em]">
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

function kvkDisplay(kvk: HomeStats["kvk"], now: number | null, t: Messages): { value: ReactNode; sub: string } {
  if (!kvk) return { value: dim, sub: t.cards.noneScheduled };
  if (now === null) return { value: dim, sub: kvk.title };

  const start = utcMidnight(kvk.startsOn);
  const end = start + kvk.days * DAY;
  if (now >= start && now < end) {
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

  const ms = Math.max(0, start - now);
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const text =
    d > 0
      ? fmt(t.cards.countdownDays, { d, h: pad(h) })
      : h > 0
        ? fmt(t.cards.countdownHours, { h, m: pad(m) })
        : fmt(t.cards.countdownMinutes, { m: pad(m), s: pad(s) });
  return { value: text, sub: kvk.title };
}

/** Six glass tiles with the kingdom's key facts: two rows of three on larger screens. */
export function KingdomCards({ stats }: { stats: HomeStats | null }) {
  const { t, tag } = useI18n();
  const now = useNow(1000);
  const kvk = kvkDisplay(stats?.kvk ?? null, now, t);

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

  const tiles: { key: string; tile: ReactNode }[] = [
    {
      key: "king",
      tile: (
        <Tile seed={0}
          featured
          icon={<Crown className="size-3.5" aria-hidden />}
          label={t.cards.king}
          value={
            stats?.king ? (
              <span className="flex items-center gap-2.5">
                <AllianceAvatar tag={stats.king.alliance} size={44} />
                <span className="truncate text-lg sm:text-xl">{stats.king.name}</span>
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
      key: "kvk",
      tile: (
        <Tile seed={3} icon={<Hourglass className="size-3.5" aria-hidden />} label={t.cards.nextKvk} value={kvk.value} sub={kvk.sub} />
      ),
    },
    {
      key: "time",
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
  ];

  return (
    <div role="group" aria-label={fmt(t.cards.group, { kingdom: site.kingdom })} className="grid auto-rows-fr grid-cols-2 gap-3.5 sm:grid-cols-3 sm:gap-5">
      {tiles.map((t, i) => (
        <motion.div
          key={t.key}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.2 + i * 0.08 }}
          className="h-full"
        >
          {t.tile}
        </motion.div>
      ))}
    </div>
  );
}
