import { connection } from "next/server";
import { SectionNav, type SectionNavGroup } from "@/components/section-nav";
import { getProfile } from "@/lib/auth";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/en";
import { getUnreadCount } from "@/lib/messages";
import { createClient } from "@/lib/supabase/server";

/** The admin sections, grouped by what they manage. Shared with the overview page. */
export function adminGroups(t: Messages): SectionNavGroup[] {
  const n = t.admin.nav;
  return [
    { label: null, items: [{ key: "overview", href: "/admin", label: n.overview, exact: true }] },
    { label: n.groups.kvk, items: [{ key: "events", href: "/admin/events", label: n.events, also: ["/admin/days"] }] },
    {
      label: n.groups.players,
      items: [
        { key: "accounts", href: "/admin/accounts", label: n.accounts },
        // Leaders read and answer players' messages in their own account area.
        { key: "messages", href: "/account/messages", label: t.account.nav.messages },
      ],
    },
    {
      label: n.groups.kingdom,
      items: [
        { key: "king", href: "/admin/king", label: n.king },
        { key: "server", href: "/admin/server", label: n.server },
      ],
    },
  ];
}

/** Admin menu with a count of what's waiting next to Accounts, KvK events and Messages. */
export async function AdminSidebar({ locale, t }: { locale: Locale; t: Messages }) {
  // Counts change per request, so never prerender them (same rule as getProfile).
  await connection();
  const supabase = await createClient();
  const profile = await getProfile();
  const [accounts, applications, unread] = await Promise.all([
    supabase.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("applications").select("id", { count: "exact", head: true }).eq("status", "pending"),
    profile ? getUnreadCount(profile.id) : 0,
  ]);
  return (
    <SectionNav
      locale={locale}
      label={t.admin.navLabel}
      groups={adminGroups(t)}
      badges={{ accounts: accounts.count ?? 0, events: applications.count ?? 0, messages: unread }}
    />
  );
}
