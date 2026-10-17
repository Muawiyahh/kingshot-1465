import { SectionNav, SectionNavView, type SectionNavGroup } from "@/components/section-nav";
import { getUserId } from "@/lib/auth";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/en";
import { getUnreadByInbox } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

/** The admin sections, grouped by what they manage. Shared with the overview page. */
export function adminGroups(t: Messages): SectionNavGroup[] {
  const n = t.admin.nav;
  return [
    { label: null, items: [{ key: "overview", href: "/admin", label: n.overview, exact: true }] },
    {
      label: n.groups.kvk,
      items: [
        { key: "events", href: "/admin/events", label: n.events, also: ["/admin/days"] },
        { key: "nextKvk", href: "/admin/next-kvk", label: n.nextKvk },
      ],
    },
    {
      label: n.groups.players,
      items: [
        { key: "accounts", href: "/admin/accounts", label: n.accounts },
        // Members and transfer accounts (players still in another kingdom) are read apart.
        { key: "messages", href: "/admin/messages", label: t.account.nav.messages },
        { key: "transferMessages", href: "/admin/transfer-messages", label: n.transferMessages },
      ],
    },
    {
      label: n.groups.kingdom,
      items: [
        { key: "king", href: "/admin/king", label: n.king },
        { key: "server", href: "/admin/server", label: n.server },
      ],
    },
    {
      label: n.groups.homepage,
      items: [
        { key: "allianceEvents", href: "/admin/alliance-events", label: n.allianceEvents },
        { key: "hallOfFame", href: "/admin/hall-of-fame", label: n.hallOfFame },
        { key: "transfers", href: "/admin/transfers", label: n.transfers },
      ],
    },
    {
      // The leader's own profile, inside the admin panel so this menu stays put. Leaders don't need
      // the players' account overview, castle appointments or schedule: the admin overview and the
      // KvK workspace cover them.
      label: t.account.eyebrow,
      items: [{ key: "profile", href: "/admin/profile", label: t.account.nav.profile }],
    },
  ];
}

/** Admin menu with a count of what's waiting next to Accounts, KvK events and both inboxes. */
export async function AdminSidebar({ locale, t }: { locale: Locale; t: Messages }) {
  // getUserId reads the session token locally and marks this request-time, so all three counts
  // start together instead of waiting for a profile lookup first.
  const me = await getUserId();
  const supabase = await createClient();
  const [accounts, applications, unread] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    me ? getUnreadByInbox() : { members: 0, transfers: 0 },
  ]);
  return (
    <SectionNav
      locale={locale}
      label={t.admin.navLabel}
      groups={adminGroups(t)}
      badges={{
        accounts: accounts.count ?? 0,
        events: applications.count ?? 0,
        messages: unread.members,
        transferMessages: unread.transfers,
      }}
    />
  );
}

/** The same menu without highlight or counts, shown instantly while the live one loads. */
export function AdminSidebarFallback({ locale, t }: { locale: Locale; t: Messages }) {
  return <SectionNavView locale={locale} label={t.admin.navLabel} groups={adminGroups(t)} />;
}
