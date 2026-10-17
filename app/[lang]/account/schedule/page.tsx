import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { GridSkeleton } from "@/components/kvk/grid-skeleton";
import { ScheduleView } from "@/components/kvk/schedule-view";
import { ButtonLink, Card, Notice, PageHeader } from "@/components/ui";
import { getUserId, isLeader } from "@/lib/auth";
import { requireProfile } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { getSchedule, pickEvents, VISIBLE_STATUSES } from "@/lib/schedule";
import { createClient } from "@/lib/supabase/server";
import type { KvkEvent } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.schedule };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** The KvK schedule on its own: who holds each slot, for signed-in members. Applying is under Castle appointments. */
export default async function SchedulePage({ searchParams }: PageProps<"/[lang]/account/schedule">) {
  const { t } = await getI18n();
  const s = t.account.schedule;
  return (
    <>
      <PageHeader eyebrow={t.account.eyebrow} title={s.title}>
        {s.intro}
      </PageHeader>
      <Suspense fallback={<GridSkeleton />}>
        <Schedule searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Schedule({ searchParams }: { searchParams: PageProps<"/[lang]/account/schedule">["searchParams"] }) {
  const [{ locale, t }, me, supabase, params] = await Promise.all([getI18n(), getUserId(), createClient(), searchParams]);
  const [profile, { data }] = await Promise.all([
    requireProfile("/account/schedule"),
    supabase.from("kvk_events").select("id, title, status, starts_on").in("status", VISIBLE_STATUSES).order("starts_on", { ascending: false }),
  ]);

  // Leaders see and change the schedule in Admin → KvK events.
  if (isLeader(profile)) redirect(localePath(locale, "/admin/events"));

  if (profile.transfer) {
    return (
      <Card className="px-6 py-14 text-center">
        <p className="mx-auto max-w-lg text-muted">{t.account.transfer.appointments}</p>
        <div className="mt-6">
          <ButtonLink href={localePath(locale, "/account/messages")}>{t.account.transfer.cta}</ButtonLink>
        </div>
      </Card>
    );
  }
  // Members waiting for approval see it too; rejected accounts don't (the database agrees).
  if (profile.status === "rejected") return <Notice tone="warning">{t.apply.rejected}</Notice>;

  const events = pickEvents((data ?? []) as Pick<KvkEvent, "id" | "title" | "status" | "starts_on">[]);
  const rows = await getSchedule(events.map((e) => e.id));
  // The player's own slots, to ring them and list them. Players can always read their own.
  let ownSlotIds: string[] = [];
  if (me && rows.length) {
    const { data: own } = await supabase.from("slots").select("id").eq("profile_id", me).in("day_id", [...new Set(rows.map((r) => r.day_id))]);
    ownSlotIds = (own ?? []).map((x) => x.id as string);
  }

  const day = typeof params.day === "string" && UUID.test(params.day) ? params.day : null;
  const slot = typeof params.slot === "string" && /^\d{1,2}$/.test(params.slot) ? Number(params.slot) : null;
  return (
    <ScheduleView
      events={events.filter((e) => rows.some((r) => r.event_id === e.id))}
      rows={rows}
      ownSlotIds={ownSlotIds}
      jump={day && slot !== null ? { dayId: day, slot } : null}
    />
  );
}
