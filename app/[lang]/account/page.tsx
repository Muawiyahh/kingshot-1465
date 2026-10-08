import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import { accountGroups } from "@/components/account-sidebar";
import { AllianceBanner } from "@/components/alliance-banner";
import { SECTION_ICONS } from "@/components/section-icons";
import { ButtonLink, Card, Eyebrow, Notice } from "@/components/ui";
import { requireProfile } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getI18n } from "@/lib/i18n/server";
import { getUnreadCount } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.account };
}

export default function AccountPage({ searchParams }: PageProps<"/[lang]/account">) {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-card" />}>
      <Overview searchParams={searchParams} />
    </Suspense>
  );
}

async function Overview({ searchParams }: { searchParams: PageProps<"/[lang]/account">["searchParams"] }) {
  const [profile, { welcome }, { locale, t }] = await Promise.all([
    requireProfile("/account"),
    searchParams,
    getI18n(),
  ]);
  const supabase = await createClient();
  const [applications, unread] = await Promise.all([
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("profile_id", profile.id),
    getUnreadCount(profile.id),
  ]);

  const statusBody = {
    approved: t.account.approvedBody,
    pending: t.account.pendingBody,
    rejected: t.account.rejectedBody,
  }[profile.status];

  // What each section holds right now, shown on its card.
  const current: Partial<Record<string, string>> = {
    appointments: fmt(t.account.applicationsChip, { n: applications.count ?? 0 }),
    messages: unread > 0 ? fmt(t.account.messages.unread, { n: unread }) : undefined,
    profile: `${profile.ingame_name}${profile.alliance_tag ? ` [${profile.alliance_tag}]` : ""}`,
  };
  const sections = accountGroups(t)
    .flatMap((g) => g.items)
    .filter((item) => item.key !== "overview");

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

      <Card className="flex flex-wrap items-center gap-4 p-6">
        {profile.status === "approved" && <CheckCircle2 className="size-6 text-success" aria-hidden />}
        {profile.status === "pending" && <Clock className="size-6 text-warning" aria-hidden />}
        {profile.status === "rejected" && <XCircle className="size-6 text-danger" aria-hidden />}
        <div className="flex-1">
          <p className="font-semibold">{t.status.account[profile.status]}</p>
          <p className="text-sm text-muted">{statusBody}</p>
        </div>
        {profile.status === "approved" && (
          <ButtonLink href={localePath(locale, "/account/appointments")}>{t.account.applyCta}</ButtonLink>
        )}
      </Card>

      <h2 className="mt-12 mb-4 font-display text-xl font-semibold">{t.account.manage}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {sections.map((item) => {
          const Icon = SECTION_ICONS[item.key];
          return (
            <Link key={item.key} href={localePath(locale, item.href)} className="group rounded-3xl">
              <Card className="flex h-full items-start gap-4 p-5 transition-colors group-hover:bg-card-hover">
                <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(214,58,68,0.3)]">
                  <Icon className="size-5" aria-hidden />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block font-medium">{item.label}</span>
                  <span className="mt-1 block text-sm text-muted">
                    {t.account.cards[item.key as keyof typeof t.account.cards]}
                  </span>
                  {current[item.key] && (
                    <span className="mt-3 inline-block max-w-full truncate rounded-full bg-white/5 px-2.5 py-1 font-mono text-xs text-fg">
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
    </>
  );
}
