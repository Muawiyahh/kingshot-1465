import { AllianceBanner } from "@/components/alliance-banner";
import { Bone } from "@/components/skeleton";
import { Card } from "@/components/ui";
import { ALLIANCES, getAlliance } from "@/lib/alliances";
import { fmt } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import type { HallOfFameRow } from "@/lib/types";

// Six cards: 3 + 3 on wide screens, lined up with the section heading.
const grid = "mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3";

/** This week's pick from each alliance, with their quote. */
export function HallOfFame({
  hof,
  t,
  tag,
}: {
  hof: { weekOf: string; picks: HallOfFameRow[] } | null;
  t: Messages;
  tag: string;
}) {
  if (!hof) return <p className="text-muted">{t.home.hof.empty}</p>;

  const order = new Map(ALLIANCES.map((a, i) => [a.tag, i]));
  // Picks saved for an alliance that has since been removed are left out.
  const picks = hof.picks.filter((p) => order.has(p.alliance)).sort((a, b) => order.get(a.alliance)! - order.get(b.alliance)!);
  const week = new Date(`${hof.weekOf}T00:00:00Z`).toLocaleDateString(tag, { day: "numeric", month: "long", timeZone: "UTC" });

  return (
    <>
      <p className="font-mono text-xs tracking-[0.18em] text-gold-soft uppercase">{fmt(t.home.hof.weekOf, { date: week })}</p>
      <ul className={grid}>
        {picks.map((p) => (
          <li key={p.alliance}>
            {/* Phones: banner beside the text. Wider screens: a plaque, banner on top. */}
            <Card className="relative flex h-full gap-4 overflow-hidden p-5 sm:flex-col sm:items-center sm:gap-0 sm:px-5 sm:pt-7 sm:pb-6 sm:text-center">
              <div
                aria-hidden
                className="pointer-events-none absolute -top-12 -left-12 size-36 rounded-full opacity-35 blur-2xl sm:inset-x-0 sm:-top-16 sm:mx-auto sm:size-40"
                style={{ background: getAlliance(p.alliance).field }}
              />
              <AllianceBanner tag={p.alliance} className="relative h-20 w-[3.7rem] shrink-0" />
              <div className="relative min-w-0 flex-1 sm:mt-4 sm:w-full">
                <p className="font-display text-lg leading-snug font-semibold [overflow-wrap:anywhere]">{p.player_name}</p>
                <p className="font-mono text-xs text-gold">[{p.alliance}]</p>
                {p.quote && (
                  <p className="mt-3 text-sm leading-relaxed text-fg/80 [overflow-wrap:anywhere]">
                    <q>{p.quote}</q>
                  </p>
                )}
              </div>
            </Card>
          </li>
        ))}
      </ul>
    </>
  );
}

export function HallOfFameSkeleton() {
  return (
    <div aria-hidden>
      <Bone className="h-3 w-32" />
      <ul className={grid}>
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i}>
            <Card className="flex gap-4 p-5 sm:flex-col sm:items-center sm:pt-7">
              <Bone className="h-20 w-[3.7rem] shrink-0 rounded-xl" />
              <span className="flex-1 space-y-2 sm:w-full sm:[&>*]:mx-auto">
                <Bone className="h-5 w-28" />
                <Bone className="h-3 w-12" />
                <Bone className="mt-3 h-3 w-full" />
                <Bone className="h-3 w-3/4" />
              </span>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
