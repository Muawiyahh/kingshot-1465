import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { RowsSkeleton } from "@/components/skeleton";
import { Card, PageHeader } from "@/components/ui";
import { EventStatusBadge } from "@/components/admin/event-status";
import { requireLeader } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getI18n } from "@/lib/i18n/server";
import { formatDay } from "@/lib/kvk";
import { createClient } from "@/lib/supabase/server";
import type { KvkEvent } from "@/lib/types";
import { CreateEventForm } from "./create-event-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.adminEvents };
}

export default async function EventsPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader eyebrow={t.admin.nav.groups.kvk} title={t.admin.events.title}>
        {t.admin.events.intro}
      </PageHeader>
      <div className="grid gap-10 lg:grid-cols-[1fr_1.1fr]">
        <section aria-labelledby="all-events">
          <h2 id="all-events" className="mb-4 font-display text-lg font-semibold">
            {t.admin.events.all}
          </h2>
          <Suspense fallback={<RowsSkeleton rows={3} avatar={false} />}>
            <EventList />
          </Suspense>
        </section>
        {/* The form needs no data, so it's usable before the list has loaded. */}
        <section aria-labelledby="new-event">
          <h2 id="new-event" className="mb-4 font-display text-lg font-semibold">
            {t.admin.events.newEvent}
          </h2>
          <Card className="p-6">
            <CreateEventForm />
          </Card>
        </section>
      </div>
    </>
  );
}

async function EventList() {
  const [{ locale, t, tag }, supabase] = await Promise.all([getI18n(), createClient()]);
  // The leader check and the query run together; RLS hides drafts from everyone else anyway.
  const [, { data }] = await Promise.all([
    requireLeader(),
    supabase.from("kvk_events").select("*").order("starts_on", { ascending: false }),
  ]);
  const events = (data ?? []) as KvkEvent[];

  if (events.length === 0) return <Card className="p-8 text-center text-muted">{t.admin.events.none}</Card>;
  return (
    <ul className="space-y-2">
      {events.map((e) => (
        <li key={e.id}>
          <Link href={localePath(locale, `/admin/events/${e.id}`)} className="group block rounded-3xl">
            <Card className="flex items-center gap-4 p-5 transition-colors group-hover:bg-card-hover">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{e.title}</p>
                <p className="text-sm text-muted">{fmt(t.admin.events.day1, { date: formatDay(e.starts_on, tag) })}</p>
              </div>
              <EventStatusBadge status={e.status} t={t} />
              <ArrowRight className="size-4 text-muted" aria-hidden />
            </Card>
          </Link>
        </li>
      ))}
    </ul>
  );
}
