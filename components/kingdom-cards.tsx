"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { motion } from "motion/react";
import { CalendarDays, Clock, Crown, Hourglass, ShieldHalf, Users } from "lucide-react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { CountUp } from "@/components/count-up";
import { LiveDot } from "@/components/ui";
import { useNow } from "@/components/use-now";
import { ALLIANCES } from "@/lib/alliances";
import type { HomeStats } from "@/lib/data";

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
  className,
}: {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub: ReactNode;
  featured?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "h-full rounded-2xl p-[1px] transition-transform duration-300 ease-out hover:-translate-y-1",
        featured ? "bg-gradient-to-br from-gold/60 via-gold/10 to-primary/50" : "bg-white/[0.07]",
        className,
      )}
    >
      <div
        className={clsx(
          "flex h-full flex-col rounded-[calc(1rem-1px)] p-4 backdrop-blur-xl",
          featured ? "bg-[#1d1517]/95" : "bg-card/80",
          "shadow-[0_20px_40px_-14px_rgba(0,0,0,0.7)]",
        )}
      >
        <div className="flex items-center gap-2">
          <span
            className={clsx(
              "flex size-7 shrink-0 items-center justify-center rounded-lg",
              featured
                ? "bg-gold/15 text-gold-soft shadow-[inset_0_0_0_1px_rgba(217,164,65,0.35)]"
                : "bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(214,58,68,0.3)]",
            )}
          >
            {icon}
          </span>
          <span className="truncate font-mono text-[10px] uppercase tracking-[0.18em] text-muted">{label}</span>
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

function kvkDisplay(kvk: HomeStats["kvk"], now: number | null): { value: ReactNode; sub: string } {
  if (!kvk) return { value: dim, sub: "none scheduled" };
  if (now === null) return { value: dim, sub: kvk.title };

  const start = utcMidnight(kvk.startsOn);
  const end = start + kvk.days * DAY;
  if (now >= start && now < end) {
    const day = Math.floor((now - start) / DAY) + 1;
    return {
      value: (
        <span className="inline-flex items-center gap-2">
          <LiveDot /> Live
        </span>
      ),
      sub: `Day ${day} of ${kvk.days} · ${kvk.title}`,
    };
  }

  const ms = Math.max(0, start - now);
  const d = Math.floor(ms / DAY);
  const h = Math.floor((ms % DAY) / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const text = d > 0 ? `${d}d ${pad(h)}h` : h > 0 ? `${h}h ${pad(m)}m` : `${pad(m)}m ${pad(s)}s`;
  return { value: text, sub: kvk.title };
}

/** Six glass tiles with the kingdom's key facts: two rows of three on larger screens. */
export function KingdomCards({ stats }: { stats: HomeStats | null }) {
  const now = useNow(1000);
  const kvk = kvkDisplay(stats?.kvk ?? null, now);

  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    now === null ? "--:--" : new Date(now).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", ...opts });

  const opened = stats?.serverOpenedOn ? utcMidnight(stats.serverOpenedOn) : null;
  const serverDay = opened !== null && now !== null ? Math.max(1, Math.floor((now - opened) / DAY) + 1) : null;

  const tiles: { key: string; tile: ReactNode }[] = [
    {
      key: "king",
      tile: (
        <Tile
          featured
          icon={<Crown className="size-3.5" aria-hidden />}
          label="Current King"
          value={
            stats?.king ? (
              <span className="flex items-center gap-2.5">
                <AllianceAvatar tag={stats.king.alliance} size={34} />
                <span className="truncate text-lg sm:text-xl">{stats.king.name}</span>
              </span>
            ) : (
              dim
            )
          }
          sub={stats?.king ? (stats.king.alliance ? `[${stats.king.alliance}] · reigning` : "reigning") : "not announced yet"}
        />
      ),
    },
    {
      key: "alliances",
      tile: (
        <Tile
          icon={<ShieldHalf className="size-3.5" aria-hidden />}
          label="Alliances"
          value={<CountUp value={ALLIANCES.length} delay={0.3} />}
          sub={
            <span role="img" className="flex -space-x-1.5" aria-label={ALLIANCES.map((a) => a.tag).join(", ")}>
              {ALLIANCES.map((a) => (
                <AllianceAvatar key={a.tag} tag={a.tag} size={20} className="ring-2 ring-card" />
              ))}
            </span>
          }
        />
      ),
    },
    {
      key: "players",
      tile: (
        <Tile
          icon={<Users className="size-3.5" aria-hidden />}
          label="Governors"
          value={stats?.players != null ? <CountUp value={stats.players} delay={0.4} /> : dim}
          sub="registered on the site"
        />
      ),
    },
    {
      key: "kvk",
      tile: (
        <Tile icon={<Hourglass className="size-3.5" aria-hidden />} label="Next KvK" value={kvk.value} sub={kvk.sub} />
      ),
    },
    {
      key: "time",
      tile: (
        <Tile
          icon={<Clock className="size-3.5" aria-hidden />}
          label="Server time"
          value={
            <span>
              {fmt({ timeZone: "UTC" })}
              <span className="ml-1 font-mono text-xs font-normal text-muted">UTC</span>
            </span>
          }
          sub={`Your time ${fmt({})}`}
        />
      ),
    },
    {
      key: "age",
      tile: (
        <Tile
          icon={<CalendarDays className="size-3.5" aria-hidden />}
          label="Server age"
          value={serverDay !== null ? <>Day {serverDay.toLocaleString("en-US")}</> : dim}
          sub={
            stats?.serverOpenedOn
              ? `since ${new Date(`${stats.serverOpenedOn}T00:00:00Z`).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" })}`
              : "open date not set"
          }
        />
      ),
    },
  ];

  return (
    <div role="group" aria-label="Kingdom 1465 at a glance" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4">
      {tiles.map((t, i) => (
        <motion.div
          key={t.key}
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease, delay: 0.2 + i * 0.08 }}
          // Middle column sits a little lower for a staggered rhythm.
          className={clsx(i % 3 === 1 && "sm:mt-6", i % 3 !== 1 && "sm:mb-6")}
        >
          {t.tile}
        </motion.div>
      ))}
    </div>
  );
}
