import { SectionNav, SectionNavView, type SectionNavGroup } from "@/components/section-nav";
import { getUserId } from "@/lib/auth";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/en";
import { getUnreadCount } from "@/lib/messages";

/** The account sections. Shared with the account overview page. */
export function accountGroups(t: Messages): SectionNavGroup[] {
  const n = t.account.nav;
  return [
    {
      label: null,
      items: [
        { key: "overview", href: "/account", label: n.overview, exact: true },
        { key: "appointments", href: "/account/appointments", label: n.appointments },
        { key: "messages", href: "/account/messages", label: n.messages },
        { key: "profile", href: "/account/profile", label: n.profile },
      ],
    },
  ];
}

/** Account menu with the number of unread messages. */
export async function AccountSidebar({ locale, t }: { locale: Locale; t: Messages }) {
  // getUserId reads the session token locally (and marks this request-time), so the count starts at once.
  const me = await getUserId();
  const unread = me ? await getUnreadCount(me) : 0;
  return <SectionNav locale={locale} label={t.account.nav.label} groups={accountGroups(t)} badges={{ messages: unread }} />;
}

/** The same menu without highlight or counts, shown instantly while the live one loads. */
export function AccountSidebarFallback({ locale, t }: { locale: Locale; t: Messages }) {
  return <SectionNavView locale={locale} label={t.account.nav.label} groups={accountGroups(t)} />;
}
