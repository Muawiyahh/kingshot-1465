import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { FormSkeleton } from "@/components/skeleton";
import { Card, Notice, PageHeader } from "@/components/ui";
import { requireLeader } from "@/lib/auth-guards";
import { currentWeek, weekStart } from "@/lib/alliance-events";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import { addDays } from "@/lib/kvk";
import { createClient } from "@/lib/supabase/server";
import type { HallOfFameRow } from "@/lib/types";
import { HallOfFameForm } from "./hof-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.adminHallOfFame };
}

export default async function HallOfFamePage({ searchParams }: PageProps<"/[lang]/admin/hall-of-fame">) {
  const { t } = await getI18n();
  const s = t.admin.home.hof;
  return (
    <>
      <PageHeader eyebrow={t.admin.nav.groups.homepage} title={s.title}>
        {s.intro}
      </PageHeader>
      <Suspense
        fallback={
          <Card className="p-5 sm:p-7">
            <FormSkeleton fields={7} />
          </Card>
        }
      >
        <Editor searchParams={searchParams} />
      </Suspense>
    </>
  );
}

const arrow =
  "flex size-10 items-center justify-center rounded-full bg-card text-muted shadow-[inset_0_0_0_1px_var(--border-strong)] transition-colors hover:bg-card-hover hover:text-fg";

async function Editor({ searchParams }: { searchParams: PageProps<"/[lang]/admin/hall-of-fame">["searchParams"] }) {
  const [params, { locale, t, tag }, supabase] = await Promise.all([searchParams, getI18n(), createClient()]);
  const s = t.admin.home.hof;
  const thisWeek = currentWeek();
  const week = typeof params.week === "string" && /^\d{4}-\d{2}-\d{2}$/.test(params.week) ? weekStart(params.week) : thisWeek;

  // The leader check and both lookups run together; only leaders can save anyway (RLS).
  const [, picks, players] = await Promise.all([
    requireLeader(),
    supabase.from("hall_of_fame").select("week_of, alliance, player_name, quote").eq("week_of", week),
    // Name suggestions: approved players, grouped by alliance below.
    supabase.from("profiles").select("ingame_name, alliance_tag").eq("status", "approved").not("alliance_tag", "is", null).order("ingame_name"),
  ]);

  const suggestions: Record<string, string[]> = {};
  for (const p of (players.data ?? []) as { ingame_name: string; alliance_tag: string }[]) {
    (suggestions[p.alliance_tag] ??= []).push(p.ingame_name);
  }

  const href = (w: string) => `${localePath(locale, "/admin/hall-of-fame")}?week=${w}`;
  const label = fmt(s.week, {
    date: new Date(`${week}T00:00:00Z`).toLocaleDateString(tag, { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" }),
  });

  return (
    <>
      <div className="mb-6 flex flex-wrap items-center gap-3">
        <Link href={href(addDays(week, -7))} aria-label={s.prevWeek} title={s.prevWeek} className={arrow}>
          <ChevronLeft className="size-5" aria-hidden />
        </Link>
        <h2 className="min-w-0 font-display text-lg font-semibold" aria-live="polite">
          {label}
        </h2>
        <Link href={href(addDays(week, 7))} aria-label={s.nextWeek} title={s.nextWeek} className={arrow}>
          <ChevronRight className="size-5" aria-hidden />
        </Link>
        {week !== thisWeek && (
          <Link href={href(thisWeek)} className="text-sm text-gold-soft hover:underline">
            {s.thisWeek}
          </Link>
        )}
      </div>
      {picks.error ? (
        <Notice tone="warning">
          {rich(t.admin.settings.missing, {
            file: <span className="font-mono [overflow-wrap:anywhere]">supabase/migrations/0007_homepage_content.sql</span>,
          })}
        </Notice>
      ) : (
        <Card className="p-5 sm:p-7">
          {/* Keyed so another week starts from that week's saved picks. */}
          <HallOfFameForm key={week} week={week} picks={(picks.data ?? []) as HallOfFameRow[]} suggestions={suggestions} />
        </Card>
      )}
    </>
  );
}
