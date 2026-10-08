import type { Metadata } from "next";
import { Suspense } from "react";
import { GridSkeleton } from "@/components/kvk/grid-skeleton";
import { PublicGrid } from "@/components/kvk/public-grid";
import { Container, PageHeader, Notice } from "@/components/ui";
import { getUserId } from "@/lib/auth";
import { getLatestPublishedSchedule } from "@/lib/data";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
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
      <Suspense fallback={<GridSkeleton />}>
        <ScheduleData />
      </Suspense>
    </Container>
  );
}

/** The published schedule, plus which of its slots belong to the signed-in player (to ring them). */
async function ScheduleData() {
  const [rows, me] = await Promise.all([getLatestPublishedSchedule(), getUserId()]);
  let ownSlotIds: string[] = [];
  if (me && rows.length) {
    const supabase = await createClient();
    // RLS lets anyone read slots of published events, so this only needs the player's ID.
    const { data } = await supabase.from("slots").select("id").eq("profile_id", me).in("day_id", [...new Set(rows.map((r) => r.day_id))]);
    ownSlotIds = (data ?? []).map((s) => s.id as string);
  }
  return <PublicGrid rows={rows} ownSlotIds={ownSlotIds} />;
}
