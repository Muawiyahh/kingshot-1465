import type { Metadata } from "next";
import { Suspense } from "react";
import { ButtonLink, Card, Container, Notice, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { Application, EventDay, KvkEvent } from "@/lib/types";
import { ApplyDayCard } from "./apply-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.apply };
}

export default async function ApplyPage() {
  const { t } = await getI18n();
  return (
    <Container className="max-w-3xl py-14 sm:py-20">
      <PageHeader eyebrow={t.apply.eyebrow} title={t.apply.title}>
        {t.apply.intro}
      </PageHeader>
      <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-card" />}>
        <ApplyContent />
      </Suspense>
    </Container>
  );
}

async function ApplyContent() {
  const [profile, { locale, t }] = await Promise.all([requireProfile("/apply"), getI18n()]);

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
      <Card className="px-6 py-14 text-center">
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
    <div className="space-y-12">
      {open.map((event) => (
        <section key={event.id} aria-labelledby={`ev-${event.id}`}>
          <h2 id={`ev-${event.id}`} className="mb-4 font-display text-xl font-semibold">
            {event.title}
          </h2>
          <div className="space-y-3">
            {[...event.event_days]
              .sort((a, b) => a.day_number - b.day_number || a.position.localeCompare(b.position))
              .map((day) => (
                <ApplyDayCard key={day.id} day={day} application={byDay.get(day.id) ?? null} />
              ))}
          </div>
        </section>
      ))}
    </div>
  );
}
