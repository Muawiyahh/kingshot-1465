import type { Metadata } from "next";
import { Suspense } from "react";
import { Container, PageHeader, Notice } from "@/components/ui";
import { ScheduleView } from "@/components/schedule-view";
import { getLatestPublishedSchedule } from "@/lib/data";
import { supabaseConfigured } from "@/lib/supabase/config";

export const metadata: Metadata = { title: "KvK positions" };

export default function PositionsPage() {
  return (
    <Container className="py-14 sm:py-20">
      <PageHeader eyebrow="KvK castle positions" title="Position schedule">
        Every slot is in <strong className="text-fg">UTC</strong> (in-game server time). Use your buffs during your
        window. This page updates by itself when leaders change the schedule.
      </PageHeader>
      {!supabaseConfigured && (
        <div className="mb-6">
          <Notice tone="warning">The database isn&apos;t connected yet, so no schedule can be shown.</Notice>
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
