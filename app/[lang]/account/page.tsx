import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CheckCircle2, Clock, XCircle } from "lucide-react";
import { AllianceBanner } from "@/components/alliance-banner";
import { Badge, ButtonLink, Card, Container, Eyebrow, Notice } from "@/components/ui";
import { requireProfile } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import { formatDay, positionLabel, slotLabel } from "@/lib/kvk";
import type { ApplicationStatus } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.account };
}

export default function AccountPage({ searchParams }: PageProps<"/[lang]/account">) {
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

async function AccountContent({ searchParams }: { searchParams: PageProps<"/[lang]/account">["searchParams"] }) {
  const [profile, { welcome }, { locale, t, tag }] = await Promise.all([
    requireProfile("/account"),
    searchParams,
    getI18n(),
  ]);
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

  const statusBody = {
    approved: t.account.approvedBody,
    pending: t.account.pendingBody,
    rejected: t.account.rejectedBody,
  }[profile.status];

  return (
    <>
      <div className="mb-10 flex items-center gap-6">
        <AllianceBanner
          tag={profile.alliance_tag}
          className="w-24 shrink-0 sm:w-28"
          title={profile.alliance_tag ? fmt(t.account.bannerTitle, { tag: profile.alliance_tag }) : t.account.noBanner}
        />
        <div className="min-w-0">
          <Eyebrow className="mb-3">{t.account.eyebrow}</Eyebrow>
          <h1 className="truncate font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
            {profile.ingame_name}
          </h1>
          <p className="mt-2 text-muted">
            <span className="font-mono">{fmt(t.common.gameId, { id: profile.game_id })}</span>
            {profile.alliance_tag && <span className="ml-3 font-mono text-gold">[{profile.alliance_tag}]</span>}
          </p>
        </div>
      </div>

      {welcome && profile.status === "pending" && (
        <div className="mb-6">
          <Notice tone="success">{t.account.welcome}</Notice>
        </div>
      )}

      <Card className="mb-8 flex flex-wrap items-center gap-4 p-6">
        {profile.status === "approved" && <CheckCircle2 className="size-6 text-success" aria-hidden />}
        {profile.status === "pending" && <Clock className="size-6 text-warning" aria-hidden />}
        {profile.status === "rejected" && <XCircle className="size-6 text-danger" aria-hidden />}
        <div className="flex-1">
          <p className="font-semibold">{t.status.account[profile.status]}</p>
          <p className="text-sm text-muted">{statusBody}</p>
        </div>
        {profile.status === "approved" && <ButtonLink href={localePath(locale, "/apply")}>{t.account.applyCta}</ButtonLink>}
      </Card>

      <h2 className="mb-4 font-display text-xl font-semibold">{t.account.applicationsTitle}</h2>
      {applications.length === 0 ? (
        <Card className="p-8 text-center text-muted">{t.account.none}</Card>
      ) : (
        <ul className="space-y-3">
          {applications.map((a) => {
            const slotIndex = assigned.get(a.day.id);
            return (
              <li key={a.id}>
                <Card className="flex flex-wrap items-center gap-4 p-5">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">
                      {fmt(t.common.day, { n: a.day.day_number })} · {positionLabel(a.day.position, t)}
                    </p>
                    <p className="text-sm text-muted">
                      {a.day.event.title} · {formatDay(a.day.date, tag)} ·{" "}
                      {fmt(t.account.speedups, { n: Number(a.speedup_days).toLocaleString(tag) })}
                    </p>
                    {slotIndex !== undefined && (
                      <p className="mt-1 font-mono text-sm text-gold-soft">
                        {fmt(t.account.yourSlot, { slot: slotLabel(slotIndex, a.day.slot_minutes) })}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={a.status} t={t} />
                </Card>
              </li>
            );
          })}
        </ul>
      )}
      <p className="mt-8 text-sm text-muted">
        {rich(t.account.seeSchedule, {
          link: (
            <Link href={localePath(locale, "/positions")} className="text-gold-soft hover:underline">
              {t.account.positionsLink}
            </Link>
          ),
        })}
      </p>
    </>
  );
}

function StatusBadge({ status, t }: { status: ApplicationStatus; t: Messages }) {
  if (status === "accepted") return <Badge tone="green">{t.status.application.accepted}</Badge>;
  if (status === "rejected") return <Badge tone="red">{t.status.application.rejected}</Badge>;
  return <Badge tone="amber">{t.status.application.pending}</Badge>;
}
