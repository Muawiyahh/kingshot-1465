import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { AllianceBanner } from "@/components/alliance-banner";
import { Badge, ButtonLink, Card, Container, Eyebrow, Notice } from "@/components/ui";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDay, slotLabel } from "@/lib/kvk";
import type { ApplicationStatus } from "@/lib/types";

export const metadata: Metadata = { title: "Your account" };

export default function AccountPage({ searchParams }: PageProps<"/account">) {
  return (
    <Container className="max-w-3xl py-14 sm:py-20">
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-card" />}>
        <AccountContent searchParams={searchParams} />
      </Suspense>
    </Container>
  );
}

type AppRow = {
  id: string;
  status: ApplicationStatus;
  speedup_days: number;
  preferred_slots: number[];
  anytime: boolean;
  day: {
    id: string;
    day_number: number;
    date: string;
    position: string;
    slot_minutes: number;
    event: { title: string; status: string };
  };
};

async function AccountContent({ searchParams }: { searchParams: PageProps<"/account">["searchParams"] }) {
  const [profile, { welcome }] = await Promise.all([requireProfile("/account"), searchParams]);
  const supabase = await createClient();

  const [{ data: apps }, { data: mySlots }] = await Promise.all([
    supabase
      .from("applications")
      .select(
        "id, status, speedup_days, preferred_slots, anytime, day:event_days(id, day_number, date, position, slot_minutes, event:kvk_events(title, status))",
      )
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false }),
    // RLS only returns slots of published events, so drafts stay private until leaders publish.
    supabase.from("slots").select("day_id, slot_index").eq("profile_id", profile.id),
  ]);
  const applications = (apps ?? []) as unknown as AppRow[];
  const assigned = new Map(
    ((mySlots ?? []) as { day_id: string; slot_index: number }[]).map((s) => [s.day_id, s.slot_index]),
  );

  return (
    <>
      <div className="mb-10 flex items-center gap-6">
        <AllianceBanner
          tag={profile.alliance_tag}
          className="w-20 shrink-0 sm:w-24"
          title={profile.alliance_tag ? `${profile.alliance_tag} banner` : "No alliance banner"}
        />
        <div className="min-w-0">
          <Eyebrow className="mb-3">Your account</Eyebrow>
          <h1 className="truncate font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            {profile.ingame_name}
          </h1>
          <p className="mt-2 text-muted">
            <span className="font-mono">Game ID {profile.game_id}</span>
            {profile.alliance_tag && <span className="ml-3 font-mono text-gold">[{profile.alliance_tag}]</span>}
          </p>
        </div>
      </div>

      {welcome && profile.status === "pending" && (
        <div className="mb-6">
          <Notice tone="success">Account created. A leader will verify your game ID and approve you soon.</Notice>
        </div>
      )}

      <Card className="mb-8 flex flex-wrap items-center gap-4 p-6">
        {profile.status === "approved" && <CheckCircle2 className="size-6 text-success" aria-hidden />}
        {profile.status === "pending" && <Clock className="size-6 text-warning" aria-hidden />}
        {profile.status === "rejected" && <XCircle className="size-6 text-danger" aria-hidden />}
        <div className="flex-1">
          <p className="font-semibold">
            {profile.status === "approved" && "Approved"}
            {profile.status === "pending" && "Waiting for approval"}
            {profile.status === "rejected" && "Not approved"}
          </p>
          <p className="text-sm text-muted">
            {profile.status === "approved" && "You can apply for KvK castle positions."}
            {profile.status === "pending" && "Leaders check your game ID in-game before approving. You can apply once approved."}
            {profile.status === "rejected" && "Contact a council member in-game if you think this is a mistake."}
          </p>
        </div>
        {profile.status === "approved" && <ButtonLink href="/apply">Apply for a position</ButtonLink>}
      </Card>

      <h2 className="mb-4 font-display text-xl font-semibold">Your applications</h2>
      {applications.length === 0 ? (
        <Card className="p-8 text-center text-muted">No applications yet.</Card>
      ) : (
        <ul className="space-y-3">
          {applications.map((a) => {
            const slotIndex = assigned.get(a.day.id);
            return (
              <li key={a.id}>
                <Card className="flex flex-wrap items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      Day {a.day.day_number} · {a.day.position}
                    </p>
                    <p className="text-sm text-muted">
                      {a.day.event.title} · {formatDay(a.day.date)} · {a.speedup_days} days of speedups
                    </p>
                    {slotIndex !== undefined && (
                      <p className="mt-1 text-sm text-gold-soft">
                        Your slot: <span className="font-mono">{slotLabel(slotIndex, a.day.slot_minutes)} UTC</span>
                      </p>
                    )}
                  </div>
                  <StatusBadge status={a.status} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-8 text-sm text-muted">
        See the full published schedule on the{" "}
        <Link href="/positions" className="text-gold-soft hover:underline">
          positions page
        </Link>
        .
      </p>
    </>
  );
}

function StatusBadge({ status }: { status: ApplicationStatus }) {
  if (status === "accepted") return <Badge tone="green">Accepted</Badge>;
  if (status === "rejected") return <Badge tone="red">Rejected</Badge>;
  return <Badge tone="amber">Pending review</Badge>;
}
