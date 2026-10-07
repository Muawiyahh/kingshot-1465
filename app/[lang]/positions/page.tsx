import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, PageHeader, Notice } from "@/components/ui";
import { ScheduleView } from "@/components/schedule-view";
import { getLatestPublishedSchedule } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { supabaseConfigured } from "@/lib/supabase/config";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.positions };
}

export default async function PositionsPage() {
  const { t } = await getI18n();
  return (
    <Container className="py-14 sm:py-20">
      <PageHeader eyebrow={t.positionsPage.eyebrow} title={t.positionsPage.title}>
        {t.positionsPage.intro}
      </PageHeader>
      {!supabaseConfigured && (
        <div className="mb-6">
          <Notice tone="warning">{t.positionsPage.notConnected}</Notice>
        </div>
      )}
      <Suspense fallback={<ScheduleSkeleton />}>
        <ScheduleData />
      </Suspense>
    </Container>
  );
}

async function ScheduleData() {
  const rows = await getLatestPublishedSchedule();
  return <ScheduleView rows={rows} />;
}

function ScheduleSkeleton() {
  return (
    <div className="animate-pulse space-y-3" aria-hidden>
      <div className="flex gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-10 w-36 rounded-full bg-card" />
        ))}
      </div>
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="h-14 rounded-2xl bg-card" />
      ))}
    </div>
  );
}
