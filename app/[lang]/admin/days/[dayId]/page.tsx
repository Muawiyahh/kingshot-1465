import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import clsx from "clsx";
import { Sparkles } from "lucide-react";
import { PendingButton } from "@/components/pending-button";
import { Bone, HeaderSkeleton, RowsSkeleton, TitleSkeleton } from "@/components/skeleton";
import { Badge, Card, PageHeader, buttonClass } from "@/components/ui";
import { AllianceAvatar } from "@/components/alliance-banner";
import { EventStatusBadge } from "@/components/admin/event-status";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { requireLeader } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { formatDay, positionLabel, slotLabel, slotStartLabel } from "@/lib/kvk";
import type { ApplicationStatus, EventStatus } from "@/lib/types";
import { autoFillDay, clearDay, reviewApplication } from "../../actions";
import { SlotRow, type Candidate } from "./slot-row";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.adminDay };
}

type DayRow = {
  id: string;
  day_number: number;
  date: string;
  position: string;
  slot_minutes: number;
  event: { id: string; title: string; status: EventStatus };
};
type SlotRowData = {
  id: string;
  slot_index: number;
  locked: boolean;
  profile_id: string | null;
  profile: { ingame_name: string; alliance_tag: string | null } | null;
};
type AppRow = {
  id: string;
  profile_id: string;
  preferred_slots: number[];
  anytime: boolean;
  speedup_days: number;
  note: string | null;
  status: ApplicationStatus;
  profile: { ingame_name: string; alliance_tag: string | null; game_id: string };
};

export default function DayPage({ params }: PageProps<"/[lang]/admin/days/[dayId]">) {
  return (
    <Suspense fallback={<DaySkeleton />}>
      <DayContent params={params} />
    </Suspense>
  );
}

/** Shaped like the page: back link, header, then applications beside the slot list. */
function DaySkeleton() {
  return (
    <>
      <Bone className="mb-3 h-4 w-40" />
      <HeaderSkeleton />
      <div className="grid gap-8 xl:grid-cols-[1fr_1.15fr]">
        <div>
          <TitleSkeleton />
          <RowsSkeleton rows={3} />
        </div>
        <div>
          <TitleSkeleton />
          <RowsSkeleton rows={6} avatar={false} />
        </div>
      </div>
    </>
  );
}

/** "00:00–02:00, 14:30–15:00" from a list of slot indexes. */
function ranges(indexes: number[], minutes: number) {
  const sorted = [...indexes].sort((a, b) => a - b);
  const out: string[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const start = sorted[i];
    while (i + 1 < sorted.length && sorted[i + 1] === sorted[i] + 1) i++;
    out.push(`${slotStartLabel(start, minutes)}–${slotLabel(sorted[i], minutes).slice(-5)}`);
  }
  return out.join(", ");
}

async function DayContent({ params }: { params: PageProps<"/[lang]/admin/days/[dayId]">["params"] }) {
  const [{ dayId }, { locale, t, tag }, supabase] = await Promise.all([params, getI18n(), createClient()]);
  const dt = t.admin.day;

  // The leader check runs alongside the three queries (RLS protects the data either way).
  const [, { data: dayData }, { data: slotData }, { data: appData }] = await Promise.all([
    requireLeader(),
    supabase
      .from("event_days")
      .select("id, day_number, date, position, slot_minutes, event:kvk_events(id, title, status)")
      .eq("id", dayId)
      .maybeSingle(),
    supabase
      .from("slots")
      .select("id, slot_index, locked, profile_id, profile:profiles(ingame_name, alliance_tag)")
      .eq("day_id", dayId)
      .order("slot_index"),
    supabase
      .from("applications")
      .select(
        "id, profile_id, preferred_slots, anytime, speedup_days, note, status, profile:profiles!applications_profile_id_fkey(ingame_name, alliance_tag, game_id)",
      )
      .eq("day_id", dayId)
      .order("speedup_days", { ascending: false }),
  ]);
  if (!dayData) notFound();

  const day = dayData as unknown as DayRow;
  const slots = (slotData ?? []) as unknown as SlotRowData[];
  const apps = (appData ?? []) as unknown as AppRow[];

  const candidates: Candidate[] = apps
    .filter((a) => a.status === "accepted")
    .map((a) => ({
      profileId: a.profile_id,
      name: a.profile.ingame_name,
      tag: a.profile.alliance_tag,
      speedupDays: Number(a.speedup_days),
      preferred: a.preferred_slots,
      anytime: a.anytime,
    }));
  const assignedElsewhere: Record<string, number> = {};
  for (const s of slots) if (s.profile_id) assignedElsewhere[s.profile_id] = s.slot_index;

  const statusOrder: Record<ApplicationStatus, number> = { pending: 0, accepted: 1, rejected: 2 };
  const sortedApps = [...apps].sort(
    (a, b) => statusOrder[a.status] - statusOrder[b.status] || Number(b.speedup_days) - Number(a.speedup_days),
  );
  const filled = slots.filter((s) => s.profile_id).length;

  return (
    <>
      <p className="mb-2 text-sm">
        <Link href={localePath(locale, `/admin/events/${day.event.id}`)} className="text-muted hover:text-fg">
          ← {day.event.title}
        </Link>
      </p>
      <PageHeader eyebrow={t.admin.nav.groups.kvk} title={`${fmt(t.common.day, { n: day.day_number })} · ${positionLabel(day.position, t)}`}>
        <span className="mr-3">
          {formatDay(day.date, tag)} · {dt.allTimesUtc}
        </span>
        <EventStatusBadge status={day.event.status} t={t} />
      </PageHeader>

      <div className="grid gap-8 xl:grid-cols-[1fr_1.15fr]">
        {/* Applications */}
        <section aria-labelledby="apps-title">
          <h2 id="apps-title" className="mb-4 font-display text-lg font-semibold">
            {dt.applications} <span className="font-mono text-sm text-muted">({apps.length})</span>
          </h2>
          {sortedApps.length === 0 ? (
            <Card className="p-8 text-center text-muted">{dt.noApplications}</Card>
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-border">
                {sortedApps.map((a) => (
                  <li
                    key={a.id}
                    className={clsx(
                      "p-4 transition-opacity sm:p-5 has-[[aria-busy=true]]:opacity-60",
                      a.status === "rejected" && "opacity-60",
                    )}
                  >
                    <div className="flex flex-wrap items-start gap-3">
                      <AllianceAvatar tag={a.profile.alliance_tag} size={44} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {a.profile.alliance_tag && (
                            <span className="mr-1.5 font-mono text-xs text-gold">[{a.profile.alliance_tag}]</span>
                          )}
                          {a.profile.ingame_name}
                          <span className="ml-2 font-mono text-xs text-muted">{fmt(t.common.id, { id: a.profile.game_id })}</span>
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          <span className="font-mono text-fg">{fmt(dt.speedups, { n: Number(a.speedup_days) })}</span> ·{" "}
                          {a.anytime ? t.common.anyTime : ranges(a.preferred_slots, day.slot_minutes)}
                        </p>
                        {a.note && <p className="mt-1 text-sm text-muted italic">“{a.note}”</p>}
                        {assignedElsewhere[a.profile_id] !== undefined && (
                          <p className="mt-1 text-xs text-success">
                            {fmt(dt.assigned, { slot: slotLabel(assignedElsewhere[a.profile_id], day.slot_minutes) })}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {a.status === "pending" ? (
                          <>
                            <ReviewButton id={a.id} status="accepted" label={dt.accept} primary />
                            <ReviewButton id={a.id} status="rejected" label={dt.reject} />
                          </>
                        ) : (
                          <>
                            <Badge tone={a.status === "accepted" ? "green" : "red"}>
                              {t.status.application[a.status as Exclude<ApplicationStatus, "pending">]}
                            </Badge>
                            <ReviewButton id={a.id} status="pending" label={dt.undo} />
                          </>
                        )}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Card>
          )}
        </section>

        {/* Slots */}
        <section aria-labelledby="slots-title">
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 id="slots-title" className="font-display text-lg font-semibold">
              {dt.slots} <span className="font-mono text-sm text-muted">({filled}/{slots.length})</span>
            </h2>
            <div className="ml-auto flex items-center gap-2">
              <form action={autoFillDay}>
                <input type="hidden" name="dayId" value={day.id} />
                <PendingButton className={buttonClass("primary", "sm")} disabled={candidates.length === 0}>
                  <Sparkles className="size-4" aria-hidden /> {dt.autofill}
                </PendingButton>
              </form>
              <form action={clearDay}>
                <input type="hidden" name="dayId" value={day.id} />
                <ConfirmButton message={dt.clearConfirm}>{dt.clear}</ConfirmButton>
              </form>
            </div>
          </div>
          <p className="mb-4 text-xs text-muted">{dt.help}</p>
          <Card className="overflow-hidden">
            <ul className="divide-y divide-border">
              {slots.map((s) => (
                <SlotRow
                  key={s.id}
                  slotId={s.id}
                  slotIndex={s.slot_index}
                  slotMinutes={day.slot_minutes}
                  locked={s.locked}
                  assignedId={s.profile_id}
                  assignedName={s.profile?.ingame_name ?? null}
                  candidates={candidates}
                  assignedElsewhere={assignedElsewhere}
                />
              ))}
            </ul>
          </Card>
        </section>
      </div>
    </>
  );
}

function ReviewButton({
  id,
  status,
  label,
  primary,
}: {
  id: string;
  status: ApplicationStatus;
  label: string;
  primary?: boolean;
}) {
  return (
    <form action={reviewApplication}>
      <input type="hidden" name="applicationId" value={id} />
      <input type="hidden" name="status" value={status} />
      <PendingButton
        className={clsx(
          "h-9 cursor-pointer rounded-full px-3.5 text-sm font-medium transition-colors",
          primary ? "bg-primary text-on-primary hover:bg-primary-hover" : "text-muted hover:bg-white/5 hover:text-fg",
        )}
      >
        {label}
      </PendingButton>
    </form>
  );
}
