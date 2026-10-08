import type { Metadata } from "next";
import Link from "next/link";
import { cache, Suspense } from "react";
import { ArrowRight, CalendarRange, ClipboardList, UserCheck } from "lucide-react";
import { adminGroups } from "@/components/admin/admin-sidebar";
import { EventStatusBadge } from "@/components/admin/event-status";
import { SectionCards } from "@/components/section-cards";
import { Bone, RowsSkeleton, StatSkeleton } from "@/components/skeleton";
import { Card } from "@/components/ui";
import { getUserId } from "@/lib/auth";
import { requireLeader } from "@/lib/auth-guards";
import { localePath, type Locale } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import { formatDay } from "@/lib/kvk";
import { getUnreadCount } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";
import type { KingdomSettings, KvkEvent } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.admin };
}

/**
 * Everything the overview shows, fetched in one go and shared by its sections. The leader check
 * runs alongside the queries rather than before them (RLS protects the data either way).
 */
const loadOverview = cache(async () => {
  // Both of these are local (session token and cookies), so every query below starts at once.
  const [me, supabase] = await Promise.all([getUserId(), createClient()]);
  const [leader, accounts, applications, { data: events }, { data: settings }, unread] = await Promise.all([
    requireLeader(),
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("kvk_events").select("*").order("starts_on", { ascending: false }).limit(5),
    supabase.from("kingdom_settings").select("*").eq("id", 1).maybeSingle(),
    me ? getUnreadCount(me) : 0,
  ]);
  return {
    leader,
    pendingAccounts: accounts.count ?? 0,
    pendingApplications: applications.count ?? 0,
    events: (events ?? []) as KvkEvent[],
    kingdom: settings as KingdomSettings | null,
    unread,
  };
});

/**
 * One loading boundary for the whole page, so everything appears in a single step (React spaces
 * out separate reveals). The placeholder already shows the headings and the section cards.
 */
export default async function AdminHome() {
  const { locale, t } = await getI18n();
  return (
    <Suspense fallback={<OverviewSkeleton locale={locale} t={t} />}>
      <Overview />
    </Suspense>
  );
}

function OverviewSkeleton({ locale, t }: { locale: Locale; t: Messages }) {
  const o = t.admin.overview;
  return (
    <>
      <div className="mb-10">
        <Bone className="h-9 w-72 max-w-full sm:h-10" />
        <p className="mt-3 max-w-2xl text-muted">{o.intro}</p>
      </div>
      <h2 className="mb-4 font-display text-xl font-semibold">{o.attention}</h2>
      <StatSkeleton />
      <h2 className="mt-12 mb-4 font-display text-xl font-semibold">{o.manage}</h2>
      <SectionCards cards={manageCards(locale, t)} />
      <h2 className="mt-12 mb-4 font-display text-xl font-semibold">{o.recent}</h2>
      <RowsSkeleton rows={2} avatar={false} />
    </>
  );
}

async function Overview() {
  const { t } = await getI18n();
  const o = t.admin.overview;
  return (
    <>
      <div className="mb-10">
        <Welcome />
        <p className="mt-3 max-w-2xl text-muted">{o.intro}</p>
      </div>
      <h2 className="mb-4 font-display text-xl font-semibold">{o.attention}</h2>
      <Stats />
      <h2 className="mt-12 mb-4 font-display text-xl font-semibold">{o.manage}</h2>
      <ManageCards />
      <h2 className="mt-12 mb-4 font-display text-xl font-semibold">{o.recent}</h2>
      <RecentEvents />
    </>
  );
}

async function Welcome() {
  const [{ leader }, { t }] = await Promise.all([loadOverview(), getI18n()]);
  return (
    <h1 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">
      {fmt(t.admin.overview.welcome, { name: leader.ingame_name })}
    </h1>
  );
}

async function Stats() {
  const [data, { locale, t }] = await Promise.all([loadOverview(), getI18n()]);
  const href = (path: string) => localePath(locale, path);
  const stats = [
    { label: t.admin.overview.accountsToApprove, value: data.pendingAccounts, href: href("/admin/accounts"), icon: UserCheck },
    { label: t.admin.overview.applicationsToReview, value: data.pendingApplications, href: href("/admin/events"), icon: ClipboardList },
    { label: t.admin.overview.events, value: data.events.length, href: href("/admin/events"), icon: CalendarRange },
  ];
  return (
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
  );
}

/** One card per admin section, with what it currently holds when known. */
function manageCards(locale: Locale, t: Messages, current: Partial<Record<string, string>> = {}) {
  return adminGroups(t)
    .flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })))
    .filter((item) => item.group)
    .map((item) => ({
      key: item.key,
      href: localePath(locale, item.href),
      label: item.label,
      group: item.group,
      description: t.admin.overview.cards[item.key as keyof typeof t.admin.overview.cards],
      current: current[item.key],
    }));
}

async function ManageCards() {
  const [{ kingdom, unread }, { locale, t, tag }] = await Promise.all([loadOverview(), getI18n()]);
  const current = {
    messages: unread > 0 ? fmt(t.account.messages.unread, { n: unread }) : undefined,
    king: kingdom?.king_name ? `${kingdom.king_name}${kingdom.king_alliance ? ` [${kingdom.king_alliance}]` : ""}` : undefined,
    server: kingdom?.server_opened_on
      ? new Date(`${kingdom.server_opened_on}T00:00:00Z`).toLocaleDateString(tag, {
          day: "numeric",
          month: "short",
          year: "numeric",
          timeZone: "UTC",
        })
      : undefined,
  };
  return <SectionCards cards={manageCards(locale, t, current)} />;
}

async function RecentEvents() {
  const [{ events }, { locale, t, tag }] = await Promise.all([loadOverview(), getI18n()]);
  const href = (path: string) => localePath(locale, path);
  if (events.length === 0) {
    return (
      <Card className="p-8 text-center text-muted">
        {rich(t.admin.overview.noEvents, {
          link: (
            <Link href={href("/admin/events")} className="text-gold-soft hover:underline">
              {t.admin.overview.createFirst}
            </Link>
          ),
        })}
      </Card>
    );
  }
  return (
    <ul className="space-y-2">
      {events.map((e) => (
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
  );
}
