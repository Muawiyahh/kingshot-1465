import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CalendarRange, ClipboardList, UserCheck } from "lucide-react";
import { SECTION_ICONS } from "@/components/section-icons";
import { adminGroups } from "@/components/admin/admin-sidebar";
import { Card, PageHeader } from "@/components/ui";
import { EventStatusBadge } from "@/components/admin/event-status";
import { requireLeader } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
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

  const [accounts, applications, { data: events }, { data: settings }, unread] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("kvk_events").select("*").order("starts_on", { ascending: false }).limit(5),
    supabase.from("kingdom_settings").select("*").eq("id", 1).maybeSingle(),
    getUnreadCount(leader.id),
  ]);
  const kingdom = settings as KingdomSettings | null;

  // What each section currently holds, so the menu doubles as a status board.
  const current: Partial<Record<string, string>> = {
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

  const stats = [
    { label: t.admin.overview.accountsToApprove, value: accounts.count ?? 0, href: href("/admin/accounts"), icon: UserCheck },
    { label: t.admin.overview.applicationsToReview, value: applications.count ?? 0, href: href("/admin/events"), icon: ClipboardList },
    { label: t.admin.overview.events, value: events?.length ?? 0, href: href("/admin/events"), icon: CalendarRange },
  ];

  return (
    <>
      <PageHeader title={fmt(t.admin.overview.welcome, { name: leader.ingame_name })}>{t.admin.overview.intro}</PageHeader>
      <h2 className="mb-4 font-display text-xl font-semibold">{t.admin.overview.attention}</h2>
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

      <h2 className="mt-12 mb-4 font-display text-xl font-semibold">{t.admin.overview.manage}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {adminGroups(t)
          .flatMap((group) => group.items.map((item) => ({ ...item, group: group.label })))
          .filter((item) => item.group)
          .map((item) => {
            const Icon = SECTION_ICONS[item.key];
            return (
              <Link key={item.key} href={href(item.href)} className="group rounded-3xl">
                <Card className="flex h-full items-start gap-4 p-5 transition-colors group-hover:bg-card-hover">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(214,58,68,0.3)]">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[11px] uppercase tracking-[0.18em] text-gold">{item.group}</span>
                    <span className="mt-1 block font-medium">{item.label}</span>
                    <span className="mt-1 block text-sm text-muted">
                      {t.admin.overview.cards[item.key as keyof typeof t.admin.overview.cards]}
                    </span>
                    {current[item.key] && (
                      <span className="mt-3 inline-block rounded-full bg-white/5 px-2.5 py-1 font-mono text-xs text-fg">
                        {current[item.key]}
                      </span>
                    )}
                  </span>
                  <ArrowRight className="mt-1 size-4 shrink-0 text-muted transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Card>
              </Link>
            );
          })}
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
