import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { GridSkeleton } from "@/components/kvk/grid-skeleton";
import { HeaderSkeleton } from "@/components/skeleton";
import { requireLeader } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { isUuid } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

/**
 * Old per-day page. Days are now reviewed and assigned in the event workspace, so this sends
 * links and bookmarks there with that day's drawer open.
 */
export default function DayPage({ params }: PageProps<"/[lang]/admin/days/[dayId]">) {
  return (
    <Suspense
      fallback={
        <>
          <HeaderSkeleton />
          <GridSkeleton columns={5} />
        </>
      }
    >
      <ToWorkspace params={params} />
    </Suspense>
  );
}

async function ToWorkspace({ params }: { params: PageProps<"/[lang]/admin/days/[dayId]">["params"] }): Promise<null> {
  const [{ dayId }, { locale }, supabase] = await Promise.all([params, getI18n(), createClient()]);
  if (!isUuid(dayId)) notFound();
  const [, { data }] = await Promise.all([
    requireLeader(),
    supabase.from("event_days").select("event_id").eq("id", dayId).maybeSingle(),
  ]);
  if (!data) notFound();
  redirect(`${localePath(locale, `/admin/events/${data.event_id}`)}?day=${dayId}`);
}
