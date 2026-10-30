import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { cache, Suspense } from "react";
import { ArrowLeftRight, CheckCircle2, Clock, XCircle } from "lucide-react";
import { accountGroups } from "@/components/account-sidebar";
import { AllianceBanner } from "@/components/alliance-banner";
import { SectionCards } from "@/components/section-cards";
import { Bone, CardGridSkeleton } from "@/components/skeleton";
import { ButtonLink, Card, Eyebrow, Notice } from "@/components/ui";
import { getUserId, isLeader } from "@/lib/auth";
import { requireProfile } from "@/lib/auth-guards";
import { localePath, type Locale } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { getI18n, getLocale } from "@/lib/i18n/server";
import { getUnreadCount } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.account };
}

/**
 * The profile and the counts load together: the user's ID comes from their session token, so the
 * counts don't wait for the profile lookup.
 */
const loadAccount = cache(async () => {
  const [me, supabase] = await Promise.all([getUserId(), createClient()]);
  const [profile, applications, unread] = await Promise.all([
    requireProfile("/account"),
    me
      ? supabase.from("applications").select("id", { count: "exact", head: true }).eq("profile_id", me)
      : Promise.resolve({ count: 0 }),
    me ? getUnreadCount(me) : 0,
  ]);
  // Leaders' overview is the admin one (their profile is a card there).
  if (isLeader(profile)) redirect(localePath(await getLocale(), "/admin"));
  return { profile, applications: applications.count ?? 0, unread };
});

/**
 * One loading boundary, so the page appears in a single step. The placeholder shows the banner's
 * outline and blank cards: which sections there are depends on the account (transfer accounts have
 * fewer), so no real card shows before the account is known.
 */
export default async function AccountPage({ searchParams }: PageProps<"/[lang]/account">) {
  const { t } = await getI18n();
  return (
    <Suspense
      fallback={
        <>
          <IdentitySkeleton />
          <h2 className="mt-12 mb-4 font-display text-xl font-semibold">{t.account.manage}</h2>
          <CardGridSkeleton count={2} />
        </>
      }
    >
      <Identity searchParams={searchParams} />
      <h2 className="mt-12 mb-4 font-display text-xl font-semibold">{t.account.manage}</h2>
      <Sections />
    </Suspense>
  );
}

function IdentitySkeleton() {
  return (
    <div aria-hidden>
      <div className="mb-10 flex items-center gap-6">
        <Bone className="h-32 w-24 shrink-0 rounded-xl sm:h-36 sm:w-28" />
        <div className="flex-1 space-y-3">
          <Bone className="h-3 w-24" />
          <Bone className="h-9 w-56 max-w-full" />
          <Bone className="h-4 w-44" />
        </div>
      </div>
      <Card className="flex items-center gap-4 p-6">
        <Bone className="size-6 rounded-full" />
        <span className="flex-1 space-y-2">
          <Bone className="h-4 w-32" />
          <Bone className="h-3 w-64 max-w-full" />
        </span>
      </Card>
    </div>
  );
}

/** Banner, name, game ID and account status. */
async function Identity({ searchParams }: { searchParams: PageProps<"/[lang]/account">["searchParams"] }) {
  const [{ profile }, { welcome }, { locale, t }] = await Promise.all([loadAccount(), searchParams, getI18n()]);
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
            {profile.transfer && profile.from_kingdom && (
              <span className="ml-3 font-mono text-warning">{fmt(t.common.transferFrom, { n: profile.from_kingdom })}</span>
            )}
          </p>
        </div>
      </div>

      {welcome && profile.status === "pending" && (
        <div className="mb-6">
          <Notice tone="success">{t.account.welcome}</Notice>
        </div>
      )}

      {profile.transfer && profile.status === "approved" ? (
        <Card className="flex flex-wrap items-center gap-4 p-6">
          <ArrowLeftRight className="size-6 text-warning" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{t.account.transfer.status}</p>
            <p className="text-sm text-muted">{t.account.transfer.body}</p>
          </div>
          <ButtonLink href={localePath(locale, "/account/messages")}>{t.account.transfer.cta}</ButtonLink>
        </Card>
      ) : (
        <Card className="flex flex-wrap items-center gap-4 p-6">
          {profile.status === "approved" && <CheckCircle2 className="size-6 text-success" aria-hidden />}
          {profile.status === "pending" && <Clock className="size-6 text-warning" aria-hidden />}
          {profile.status === "rejected" && <XCircle className="size-6 text-danger" aria-hidden />}
          <div className="flex-1">
            <p className="font-semibold">{t.status.account[profile.status]}</p>
            <p className="text-sm text-muted">{statusBody}</p>
          </div>
          {profile.status === "approved" && !isLeader(profile) && (
            <ButtonLink href={localePath(locale, "/account/appointments")}>{t.account.applyCta}</ButtonLink>
          )}
        </Card>
      )}
    </>
  );
}

/** One card per account section, with what it currently holds when known. */
function sectionCards(
  locale: Locale,
  t: Messages,
  current: Partial<Record<string, string>>,
  { transfer, leader }: { transfer: boolean; leader: boolean },
) {
  return accountGroups(t, { transfer, leader })
    .flatMap((g) => g.items)
    .filter((item) => item.key !== "overview")
    .map((item) => ({
      key: item.key,
      href: localePath(locale, item.href),
      label: item.label,
      // Transfer accounts can only change their name, not their alliance.
      description:
        transfer && item.key === "profile"
          ? t.account.cards.profileTransfer
          : t.account.cards[item.key as keyof typeof t.account.cards],
      current: current[item.key],
    }));
}

async function Sections() {
  const [{ profile, applications, unread }, { locale, t }] = await Promise.all([loadAccount(), getI18n()]);
  return (
    <SectionCards
      cards={sectionCards(locale, t, {
        appointments: fmt(t.account.applicationsChip, { n: applications }),
        messages: unread > 0 ? fmt(t.account.messages.unread, { n: unread }) : undefined,
        profile: `${profile.ingame_name}${profile.alliance_tag ? ` [${profile.alliance_tag}]` : ""}`,
      }, { transfer: Boolean(profile.transfer), leader: isLeader(profile) })}
    />
  );
}
