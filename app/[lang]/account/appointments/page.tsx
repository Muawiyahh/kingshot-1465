import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { GridSkeleton } from "@/components/kvk/grid-skeleton";
import { ButtonLink, Card, PageHeader } from "@/components/ui";
import { getUserId } from "@/lib/auth";
import { requireProfile } from "@/lib/auth-guards";
import { getLatestPublishedSchedule } from "@/lib/data";
import { localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { PlayerEvent } from "@/lib/types";
import { PlayerGrid } from "./player-grid";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.appointments };
}

export default async function AppointmentsPage() {
  const { t } = await getI18n();
  const a = t.account.appointments;
  return (
    <>
      <PageHeader eyebrow={t.account.eyebrow} title={a.title}>
        {a.intro}
      </PageHeader>
      <Suspense fallback={<GridSkeleton />}>
        <Appointments />
      </Suspense>
    </>
  );
}

const NOBODY = "00000000-0000-0000-0000-000000000000";
const ORDER = { open: 0, closed: 1, published: 2, draft: 3 } as const;

async function Appointments() {
  const [{ locale, t }, me, supabase] = await Promise.all([getI18n(), getUserId(), createClient()]);
  const id = me ?? NOBODY;
  // Events with their days, and only this player's application and slot per day. (Leaders can
  // read everyone's applications, so the filter matters for them too.) Runs alongside the
  // profile check and the published schedule's names.
  const [profile, { data }, schedule] = await Promise.all([
    requireProfile("/account/appointments"),
    supabase
      .from("kvk_events")
      .select("*, event_days(*, applications(*), slots(id, slot_index))")
      .in("status", ["open", "closed", "published"])
      .eq("event_days.applications.profile_id", id)
      .eq("event_days.slots.profile_id", id)
      .order("starts_on", { ascending: false }),
    getLatestPublishedSchedule(),
  ]);

  // Open and closed events, plus the latest published one; open first.
  const all = ((data ?? []) as PlayerEvent[]).filter((e) => e.event_days.length > 0);
  const latestPublished = all.find((e) => e.status === "published");
  const events = all
    .filter((e) => e.status !== "published" || e === latestPublished)
    .sort((a, b) => ORDER[a.status] - ORDER[b.status] || a.starts_on.localeCompare(b.starts_on));

  if (events.length === 0) {
    return (
      <Card className="px-6 py-14 text-center">
        <p className="font-display text-xl">{t.apply.closedTitle}</p>
        <p className="mt-2 text-muted">{t.apply.closedBody}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <ButtonLink href={localePath(locale, "/positions")} variant="secondary">
            {t.apply.viewCurrent}
          </ButtonLink>
          <Link href={localePath(locale, "/account/messages")} className="self-center text-sm text-gold-soft hover:underline">
            {t.kvk.player.askLeader} →
          </Link>
        </div>
      </Card>
    );
  }

  const accountNotice = profile.status === "approved" ? null : profile.status === "pending" ? t.apply.pending : t.apply.rejected;
  return (
    <PlayerGrid
      events={events}
      schedule={latestPublished ? schedule : []}
      canApply={profile.status === "approved"}
      accountNotice={accountNotice}
    />
  );
}
