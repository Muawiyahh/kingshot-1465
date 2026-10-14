import { SectionNav, SectionNavView, type SectionNavGroup } from "@/components/section-nav";
import { getProfile, getUserId } from "@/lib/auth";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/en";
import { getUnreadCount } from "@/lib/messages";

/**
 * The account sections. Shared with the account overview page. Transfer accounts (players still in
 * another kingdom) have no castle appointments.
 */
export function accountGroups(t: Messages, { transfer = false } = {}): SectionNavGroup[] {
  const n = t.account.nav;
  return [
    {
      label: null,
      items: [
        { key: "overview" as const, href: "/account", label: n.overview, exact: true },
        { key: "appointments" as const, href: "/account/appointments", label: n.appointments },
        { key: "messages" as const, href: "/account/messages", label: n.messages },
        { key: "profile" as const, href: "/account/profile", label: n.profile },
      ].filter((item) => !(transfer && item.key === "appointments")),
    },
  ];
}

/** Account menu with the number of unread messages. */
export async function AccountSidebar({ locale, t }: { locale: Locale; t: Messages }) {
  // getUserId reads the session token locally (and marks this request-time), so the count starts at once.
  const me = await getUserId();
  const [profile, unread] = await Promise.all([getProfile(), me ? getUnreadCount(me) : 0]);
  return (
    <SectionNav
      locale={locale}
      label={t.account.nav.label}
      groups={accountGroups(t, { transfer: Boolean(profile?.transfer) })}
      badges={{ messages: unread }}
    />
  );
}

/** The same menu without highlight or counts, shown instantly while the live one loads. */
export function AccountSidebarFallback({ locale, t }: { locale: Locale; t: Messages }) {
  return <SectionNavView locale={locale} label={t.account.nav.label} groups={accountGroups(t)} />;
}
