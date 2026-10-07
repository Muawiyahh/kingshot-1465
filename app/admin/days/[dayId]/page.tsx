import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import clsx from "clsx";
import { Sparkles } from "lucide-react";
import { Badge, Button, Card, PageHeader } from "@/components/ui";
import { AllianceAvatar } from "@/components/alliance-banner";
import { EventStatusBadge } from "@/components/admin/event-status";
import { ConfirmButton } from "@/components/admin/confirm-button";
import { requireLeader } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDay, slotLabel, slotStartLabel } from "@/lib/kvk";
import type { ApplicationStatus, EventStatus } from "@/lib/types";
import { autoFillDay, clearDay, reviewApplication } from "../../actions";
import { SlotRow, type Candidate } from "./slot-row";

export const metadata: Metadata = { title: "Assign slots · Admin" };

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

export default function DayPage({ params }: PageProps<"/admin/days/[dayId]">) {
  return (
    <Suspense fallback={<div className="h-96 animate-pulse rounded-3xl bg-card" />}>
      <DayContent params={params} />
    </Suspense>
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

async function DayContent({ params }: { params: PageProps<"/admin/days/[dayId]">["params"] }) {
  const [, { dayId }] = await Promise.all([requireLeader(), params]);
  const supabase = await createClient();

  const [{ data: dayData }, { data: slotData }, { data: appData }] = await Promise.all([
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
        <Link href={`/admin/events/${day.event.id}`} className="text-muted hover:text-fg">
          ← {day.event.title}
        </Link>
      </p>
      <PageHeader title={`Day ${day.day_number} · ${day.position}`}>
        <span className="mr-3">{formatDay(day.date)} · all times UTC</span>
        <EventStatusBadge status={day.event.status} />
      </PageHeader>

      <div className="grid gap-8 xl:grid-cols-[1fr_1.15fr]">
        {/* Applications */}
        <section aria-labelledby="apps-title">
          <h2 id="apps-title" className="mb-4 font-display text-lg font-semibold">
            Applications <span className="font-mono text-sm text-muted">({apps.length})</span>
          </h2>
          {sortedApps.length === 0 ? (
            <Card className="p-8 text-center text-muted">No applications for this position yet.</Card>
          ) : (
            <Card className="overflow-hidden">
              <ul className="divide-y divide-border">
                {sortedApps.map((a) => (
                  <li key={a.id} className={clsx("p-4 sm:p-5", a.status === "rejected" && "opacity-60")}>
                    <div className="flex flex-wrap items-start gap-3">
                      <AllianceAvatar tag={a.profile.alliance_tag} size={36} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {a.profile.alliance_tag && (
                            <span className="mr-1.5 font-mono text-xs text-gold">[{a.profile.alliance_tag}]</span>
                          )}
                          {a.profile.ingame_name}
                          <span className="ml-2 font-mono text-xs text-muted">ID {a.profile.game_id}</span>
                        </p>
                        <p className="mt-1 text-sm text-muted">
                          <span className="font-mono text-fg">{Number(a.speedup_days)}d</span> speedups ·{" "}
                          {a.anytime ? "Any time" : ranges(a.preferred_slots, day.slot_minutes)}
                        </p>
                        {a.note && <p className="mt-1 text-sm text-muted italic">“{a.note}”</p>}
                        {assignedElsewhere[a.profile_id] !== undefined && (
                          <p className="mt-1 text-xs text-success">
                            Assigned {slotLabel(assignedElsewhere[a.profile_id], day.slot_minutes)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        {a.status === "pending" ? (
                          <>
                            <ReviewButton id={a.id} status="accepted" label="Accept" primary />
                            <ReviewButton id={a.id} status="rejected" label="Reject" />
                          </>
                        ) : (
                          <>
                            <Badge tone={a.status === "accepted" ? "green" : "red"} className="capitalize">
                              {a.status}
                            </Badge>
                            <ReviewButton id={a.id} status="pending" label="Undo" />
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
              Slots <span className="font-mono text-sm text-muted">({filled}/{slots.length})</span>
            </h2>
            <div className="ml-auto flex items-center gap-2">
              <form action={autoFillDay}>
                <input type="hidden" name="dayId" value={day.id} />
                <Button type="submit" size="sm" disabled={candidates.length === 0}>
                  <Sparkles className="size-4" aria-hidden /> Auto-fill
                </Button>
              </form>
              <form action={clearDay}>
                <input type="hidden" name="dayId" value={day.id} />
                <ConfirmButton message="Clear every unlocked slot on this day?">Clear</ConfirmButton>
              </form>
            </div>
          </div>
          <p className="mb-4 text-xs text-muted">
            Only accepted applicants appear in the dropdowns. ★ marks players who asked for that time. Auto-fill gives
            the highest speedups their earliest free preferred slot and never touches locked slots. Players see
            assignments once the event is published.
          </p>
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
      <button
        type="submit"
        className={clsx(
          "h-9 cursor-pointer rounded-full px-3.5 text-sm font-medium transition-colors",
          primary ? "bg-primary text-on-primary hover:bg-primary-hover" : "text-muted hover:bg-white/5 hover:text-fg",
        )}
      >
        {label}
      </button>
    </form>
  );
}
