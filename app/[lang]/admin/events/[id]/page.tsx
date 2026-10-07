import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import clsx from "clsx";
import { ArrowRight, Check } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { EventStatusBadge } from "@/components/admin/event-status";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { requireLeader } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { formatDay, positionLabel, slotCount } from "@/lib/kvk";
import type { EventDay, EventStatus, KvkEvent } from "@/lib/types";
import { deleteEvent, setEventStatus } from "../../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.adminEvent };
}

const STEPS: EventStatus[] = ["draft", "open", "closed", "published"];

export default function EventPage({ params }: PageProps<"/[lang]/admin/events/[id]">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-card" />}>
      <EventContent params={params} />
    </Suspense>
  );
}

async function EventContent({ params }: { params: PageProps<"/[lang]/admin/events/[id]">["params"] }) {
  const [, { id }, { locale, t, tag }] = await Promise.all([requireLeader(), params, getI18n()]);
  const supabase = await createClient();

  const { data } = await supabase.from("kvk_events").select("*, event_days(*)").eq("id", id).maybeSingle();
  if (!data) notFound();
  const event = data as KvkEvent & { event_days: EventDay[] };
  const dayIds = event.event_days.map((d) => d.id);

  const [{ data: apps }, { data: filled }] = await Promise.all([
    supabase.from("applications").select("day_id, status").in("day_id", dayIds),
    supabase.from("slots").select("day_id").in("day_id", dayIds).not("profile_id", "is", null),
  ]);

  const counts = new Map<string, { pending: number; accepted: number; filled: number }>();
  for (const d of dayIds) counts.set(d, { pending: 0, accepted: 0, filled: 0 });
  for (const a of apps ?? []) {
    const c = counts.get(a.day_id)!;
    if (a.status === "pending") c.pending++;
    if (a.status === "accepted") c.accepted++;
  }
  for (const s of filled ?? []) counts.get(s.day_id)!.filled++;

  const days = [...event.event_days].sort((a, b) => a.day_number - b.day_number || a.position.localeCompare(b.position));
  const currentStep = STEPS.indexOf(event.status);
  const e = t.admin.event;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href={localePath(locale, "/admin/events")} className="text-muted hover:text-fg">
          {e.allEvents}
        </Link>
      </p>
      <PageHeader title={event.title}>
        <span className="mr-3">{fmt(e.day1Is, { date: formatDay(event.starts_on, tag) })}</span>
        <EventStatusBadge status={event.status} t={t} />
      </PageHeader>

      <Card className="mb-10 p-5">
        <p className="mb-4 text-sm font-medium">{e.stage}</p>
        <ol className="grid gap-2 sm:grid-cols-4">
          {STEPS.map((status, i) => {
            const active = status === event.status;
            return (
              <li key={status}>
                <form action={setEventStatus}>
                  <input type="hidden" name="eventId" value={event.id} />
                  <input type="hidden" name="status" value={status} />
                  <button
                    type="submit"
                    disabled={active}
                    aria-current={active ? "step" : undefined}
                    className={clsx(
                      "flex h-full w-full cursor-pointer flex-col items-start gap-1 rounded-2xl p-4 text-left transition-colors disabled:cursor-default",
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
                    <span className="text-xs text-muted">{e.steps[status].help}</span>
                  </button>
                </form>
              </li>
            );
          })}
        </ol>
      </Card>

      <h2 className="mb-4 font-display text-lg font-semibold">{e.daysTitle}</h2>
      <ul className="space-y-2">
        {days.map((d) => {
          const c = counts.get(d.id)!;
          return (
            <li key={d.id}>
              <Link href={localePath(locale, `/admin/days/${d.id}`)} className="group block rounded-3xl">
                <Card className="flex flex-wrap items-center gap-4 p-5 transition-colors group-hover:bg-card-hover">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {fmt(t.common.day, { n: d.day_number })} · {positionLabel(d.position, t)}
                    </p>
                    <p className="text-sm text-muted">{formatDay(d.date, tag)}</p>
                  </div>
                  <dl className="flex gap-6 text-center text-sm">
                    <div>
                      <dt className="text-xs text-muted">{e.toReview}</dt>
                      <dd className={clsx("font-mono", c.pending > 0 && "text-warning")}>{c.pending}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">{e.accepted}</dt>
                      <dd className="font-mono">{c.accepted}</dd>
                    </div>
                    <div>
                      <dt className="text-xs text-muted">{e.slotsFilled}</dt>
                      <dd className="font-mono">
                        {c.filled}/{slotCount(d.slot_minutes)}
                      </dd>
                    </div>
                  </dl>
                  <ArrowRight className="size-4 text-muted" aria-hidden />
                </Card>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-14 border-t border-border pt-6">
        <form action={deleteEvent}>
          <input type="hidden" name="eventId" value={event.id} />
          <ConfirmButton message={fmt(e.deleteConfirm, { title: event.title })}>{e.deleteEvent}</ConfirmButton>
        </form>
      </div>
    </>
  );
}
