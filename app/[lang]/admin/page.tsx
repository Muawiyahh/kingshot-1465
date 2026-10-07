import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CalendarRange, ClipboardList, UserCheck } from "lucide-react";
import { Card, PageHeader } from "@/components/ui";
import { EventStatusBadge } from "@/components/admin/event-status";
import { requireLeader } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import { formatDay } from "@/lib/kvk";
import { createClient } from "@/lib/supabase/server";
import type { KvkEvent } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.admin };
}

export default function AdminHome() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-card" />}>
      <Overview />
    </Suspense>
  );
}

async function Overview() {
  const [leader, { locale, t, tag }] = await Promise.all([requireLeader(), getI18n()]);
  const supabase = await createClient();
  const href = (path: string) => localePath(locale, path);

  const [accounts, applications, { data: events }] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("kvk_events").select("*").order("starts_on", { ascending: false }).limit(5),
  ]);

  const stats = [
    { label: t.admin.overview.accountsToApprove, value: accounts.count ?? 0, href: href("/admin/accounts"), icon: UserCheck },
    { label: t.admin.overview.applicationsToReview, value: applications.count ?? 0, href: href("/admin/events"), icon: ClipboardList },
    { label: t.admin.overview.events, value: events?.length ?? 0, href: href("/admin/events"), icon: CalendarRange },
  ];

  return (
    <>
      <PageHeader title={fmt(t.admin.overview.welcome, { name: leader.ingame_name })}>{t.admin.overview.intro}</PageHeader>
      <div className="grid gap-4 sm:grid-cols-3">
        {stats.map(({ label, value, href, icon: Icon }) => (
          <Link key={label} href={href} className="group rounded-3xl">
            <Card className="h-full p-6 transition-colors group-hover:bg-card-hover">
              <Icon className="size-5 text-gold" aria-hidden />
              <p className="mt-4 font-display text-4xl font-bold tabular-nums">{value}</p>
              <p className="mt-1 text-sm text-muted">{label}</p>
            </Card>
          </Link>
        ))}
      </div>

      <h2 className="mt-12 mb-4 font-display text-xl font-semibold">{t.admin.overview.recent}</h2>
      {(events ?? []).length === 0 ? (
        <Card className="p-8 text-center text-muted">
          {rich(t.admin.overview.noEvents, {
            link: (
              <Link href={href("/admin/events")} className="text-gold-soft hover:underline">
                {t.admin.overview.createFirst}
              </Link>
            ),
          })}
        </Card>
      ) : (
        <ul className="space-y-2">
          {(events as KvkEvent[]).map((e) => (
            <li key={e.id}>
              <Link href={href(`/admin/events/${e.id}`)} className="group block rounded-3xl">
                <Card className="flex items-center gap-4 p-5 transition-colors group-hover:bg-card-hover">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{e.title}</p>
                    <p className="text-sm text-muted">{fmt(t.admin.overview.startsOn, { date: formatDay(e.starts_on, tag) })}</p>
                  </div>
                  <EventStatusBadge status={e.status} t={t} />
                  <ArrowRight className="size-4 text-muted" aria-hidden />
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
