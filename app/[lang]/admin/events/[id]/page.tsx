import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import clsx from "clsx";
import { Check } from "lucide-react";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { EventStatusBadge } from "@/components/admin/event-status";
import { GridSkeleton } from "@/components/kvk/grid-skeleton";
import { PendingButton } from "@/components/pending-button";
import { Bone, HeaderSkeleton } from "@/components/skeleton";
import { Card, PageHeader } from "@/components/ui";
import { requireLeader } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getI18n } from "@/lib/i18n/server";
import { formatDay } from "@/lib/kvk";
import { createClient } from "@/lib/supabase/server";
import type { EventStatus, WorkspaceEvent } from "@/lib/types";
import { deleteEvent, setEventStatus } from "../../actions";
import { Workspace } from "./workspace";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.adminEvent };
}

const STEPS: EventStatus[] = ["draft", "open", "closed", "published"];

/** Everything the workspace shows, in one request: days, every slot and its holder, every application. */
const WORKSPACE_SELECT =
  "*, event_days(id, event_id, day_number, date, position, slot_minutes, " +
  "slots(id, slot_index, locked, profile_id, profile:profiles(ingame_name, alliance_tag)), " +
  "applications(id, profile_id, preferred_slots, anytime, speedup_days, note, status, created_at, " +
  "profile:profiles!applications_profile_id_fkey(ingame_name, alliance_tag, game_id)))";

export default async function EventPage({ params }: PageProps<"/[lang]/admin/events/[id]">) {
  const { locale, t } = await getI18n();
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href={localePath(locale, "/admin/events")} className="text-muted hover:text-fg">
          {t.admin.event.allEvents}
        </Link>
      </p>
      <Suspense fallback={<EventSkeleton />}>
        <EventContent params={params} />
      </Suspense>
    </>
  );
}

/** Shaped like the page: header, the four stage buttons, then the grid. */
function EventSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <Card className="mb-8 p-4" aria-hidden>
        <div className="grid gap-2 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Bone key={i} className="h-14 rounded-2xl" />
          ))}
        </div>
      </Card>
      <GridSkeleton columns={5} />
    </>
  );
}

async function EventContent({ params }: { params: PageProps<"/[lang]/admin/events/[id]">["params"] }) {
  const [{ id }, { t, tag }, supabase] = await Promise.all([params, getI18n(), createClient()]);
  // The leader check runs alongside the query; RLS limits drafts and applications to leaders anyway.
  const [, { data }] = await Promise.all([
    requireLeader(),
    supabase.from("kvk_events").select(WORKSPACE_SELECT).eq("id", id).maybeSingle(),
  ]);
  if (!data) notFound();
  const event = data as unknown as WorkspaceEvent;
  const currentStep = STEPS.indexOf(event.status);
  const e = t.admin.event;

  return (
    <>
      <PageHeader eyebrow={t.admin.nav.groups.kvk} title={event.title}>
        <span className="mr-3">{fmt(e.day1Is, { date: formatDay(event.starts_on, tag) })}</span>
        <EventStatusBadge status={event.status} t={t} />
      </PageHeader>

      <Card className="mb-8 p-4">
        <p className="mb-3 text-sm font-medium">{e.stage}</p>
        <ol className="grid grid-cols-2 gap-2 lg:grid-cols-4">
          {STEPS.map((status, i) => {
            const active = status === event.status;
            return (
              <li key={status}>
                <form action={setEventStatus}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="status" value={status} />
                  <PendingButton
                    plain
                    disabled={active}
                    aria-current={active ? "step" : undefined}
                    className={clsx(
                      "flex h-full w-full cursor-pointer flex-col items-start gap-0.5 rounded-2xl px-3.5 py-3 text-left transition-colors disabled:cursor-default aria-busy:animate-pulse",
                      active
                        ? "bg-primary/15 shadow-[inset_0_0_0_1px_var(--primary)]"
                        : "bg-bg-elevated shadow-[inset_0_0_0_1px_var(--border)] hover:bg-card-hover",
                    )}
                  >
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {i < currentStep ? (
                        <Check className="size-4 text-success" aria-hidden />
                      ) : (
                        <span className="font-mono text-xs text-muted">{i + 1}</span>
                      )}
                      {e.steps[status].label}
                    </span>
                    <span className="text-xs text-muted max-sm:hidden">{e.steps[status].help}</span>
                  </PendingButton>
                </form>
              </li>
            );
          })}
        </ol>
      </Card>

      <Workspace event={event} />

      <div className="mt-14 border-t border-border pt-6">
        <form action={deleteEvent}>
          <input type="hidden" name="eventId" value={event.id} />
          <ConfirmButton message={fmt(e.deleteConfirm, { title: event.title })}>{e.deleteEvent}</ConfirmButton>
        </form>
      </div>
    </>
  );
}
