import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Badge, ButtonLink, Card, Notice, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import { formatDay, positionLabel, slotLabel } from "@/lib/kvk";
import { createClient } from "@/lib/supabase/server";
import type { Application, ApplicationStatus, EventDay, KvkEvent, Profile } from "@/lib/types";
import { ApplyDayCard } from "./apply-form";

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
      <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-card" />}>
        <AppointmentsContent />
      </Suspense>
    </>
  );
}

async function AppointmentsContent() {
  const [profile, { t }] = await Promise.all([requireProfile("/account/appointments"), getI18n()]);
  return (
    <div className="space-y-14">
      <section aria-labelledby="open-applications">
        <h2 id="open-applications" className="mb-4 font-display text-xl font-semibold">
          {t.account.appointments.applyTitle}
        </h2>
        <OpenApplications profile={profile} />
      </section>
      <section aria-labelledby="your-applications">
        <h2 id="your-applications" className="mb-4 font-display text-xl font-semibold">
          {t.account.applicationsTitle}
        </h2>
        <YourApplications profile={profile} />
      </section>
    </div>
  );
}

/** One form per day and position of every event that's open for applications. */
async function OpenApplications({ profile }: { profile: Profile }) {
  const { locale, t } = await getI18n();

  if (profile.status !== "approved") {
    return <Notice tone="warning">{profile.status === "pending" ? t.apply.pending : t.apply.rejected}</Notice>;
  }

  const supabase = await createClient();
  const { data: events } = await supabase
    .from("kvk_events")
    .select("*, event_days(*)")
    .eq("status", "open")
    .order("starts_on");

  const open = (events ?? []) as (KvkEvent & { event_days: EventDay[] })[];
  if (open.length === 0) {
    return (
      <Card className="px-6 py-12 text-center">
        <p className="font-display text-xl">{t.apply.closedTitle}</p>
        <p className="mt-2 text-muted">{t.apply.closedBody}</p>
        <div className="mt-6">
          <ButtonLink href={localePath(locale, "/positions")} variant="secondary">
            {t.apply.viewCurrent}
          </ButtonLink>
        </div>
      </Card>
    );
  }

  const dayIds = open.flatMap((e) => e.event_days.map((d) => d.id));
  const { data: apps } = await supabase
    .from("applications")
    .select("*")
    .eq("profile_id", profile.id)
    .in("day_id", dayIds);
  const byDay = new Map(((apps ?? []) as Application[]).map((a) => [a.day_id, a]));

  return (
    <div className="space-y-10">
      {open.map((event) => (
        <div key={event.id}>
          <h3 className="mb-3 font-mono text-xs uppercase tracking-[0.18em] text-gold">{event.title}</h3>
          <div className="space-y-3">
            {[...event.event_days]
              .sort((a, b) => a.day_number - b.day_number || a.position.localeCompare(b.position))
              .map((day) => (
                <ApplyDayCard key={day.id} day={day} application={byDay.get(day.id) ?? null} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

type AppRow = {
  id: string;
  status: ApplicationStatus;
  speedup_days: number;
  day: {
    id: string;
    day_number: number;
    date: string;
    position: string;
    slot_minutes: number;
    event: { title: string; status: string };
  };
};

/** Every application the player has made, with the slot they were given once it's published. */
async function YourApplications({ profile }: { profile: Profile }) {
  const { locale, t, tag } = await getI18n();
  const supabase = await createClient();
  const [{ data: apps }, { data: mySlots }] = await Promise.all([
    supabase
      .from("applications")
      .select("id, status, speedup_days, day:event_days(id, day_number, date, position, slot_minutes, event:kvk_events(title, status))")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false }),
    // RLS only returns slots of published events, so drafts stay private until leaders publish.
    supabase.from("slots").select("day_id, slot_index").eq("profile_id", profile.id),
  ]);
  const applications = (apps ?? []) as unknown as AppRow[];
  const assigned = new Map(
    ((mySlots ?? []) as { day_id: string; slot_index: number }[]).map((s) => [s.day_id, s.slot_index]),
  );

  return (
    <>
      {applications.length === 0 ? (
        <Card className="p-8 text-center text-muted">{t.account.none}</Card>
      ) : (
        <ul className="space-y-3">
          {applications.map((a) => {
            const slotIndex = assigned.get(a.day.id);
            return (
              <li key={a.id}>
                <Card className="flex flex-wrap items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {fmt(t.common.day, { n: a.day.day_number })} · {positionLabel(a.day.position, t)}
                    </p>
                    <p className="text-sm text-muted">
                      {a.day.event.title} · {formatDay(a.day.date, tag)} ·{" "}
                      {fmt(t.account.speedups, { n: Number(a.speedup_days).toLocaleString(tag) })}
                    </p>
                    {slotIndex !== undefined && (
                      <p className="mt-1 font-mono text-sm text-gold-soft">
                        {fmt(t.account.yourSlot, { slot: slotLabel(slotIndex, a.day.slot_minutes) })}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={a.status} t={t} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-6 text-sm text-muted">
        {rich(t.account.seeSchedule, {
          link: (
            <Link href={localePath(locale, "/positions")} className="text-gold-soft hover:underline">
              {t.account.positionsLink}
            </Link>
          ),
        })}
      </p>
    </>
  );
}

function StatusBadge({ status, t }: { status: ApplicationStatus; t: Messages }) {
  if (status === "accepted") return <Badge tone="green">{t.status.application.accepted}</Badge>;
  if (status === "rejected") return <Badge tone="red">{t.status.application.rejected}</Badge>;
  return <Badge tone="amber">{t.status.application.pending}</Badge>;
}
