import { Suspense } from "react";
import { AccountSidebar } from "@/components/account-sidebar";
import { AdminSidebar } from "@/components/admin/admin-sidebar";
import { Bone } from "@/components/skeleton";
import { Container, Eyebrow } from "@/components/ui";
import { getProfile, isLeader } from "@/lib/auth";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { getI18n } from "@/lib/i18n/server";

export default async function AccountLayout({ children }: LayoutProps<"/[lang]/account">) {
  const { locale, t } = await getI18n();

  return (
    <Container className="py-8 sm:py-12">
      <div className="account-shell lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        {/* On phones an open chat fills the screen like a messaging app, so the menu steps aside. */}
        <aside className="mb-8 lg:mb-0 max-lg:[.account-shell:has([data-chat-open])>&]:hidden">
          <Suspense fallback={<MenuSkeleton />}>
            <PanelMenu locale={locale} t={t} />
          </Suspense>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}

/**
 * Players get their account menu. Leaders and admins get the admin menu, which lists these account
 * pages too, so their own pages feel part of the one admin panel.
 */
async function PanelMenu({ locale, t }: { locale: Locale; t: Messages }) {
  const leader = isLeader(await getProfile());
  return (
    <>
      <Eyebrow className="mb-4 hidden lg:block">{leader ? t.admin.eyebrow : t.account.eyebrow}</Eyebrow>
      <div className="lg:sticky lg:top-24">
        {leader ? <AdminSidebar locale={locale} t={t} /> : <AccountSidebar locale={locale} t={t} />}
      </div>
    </>
  );
}

/** Menu-shaped placeholder while the account's role is checked, so the wrong menu never flashes. */
function MenuSkeleton() {
  return (
    <div aria-hidden className="space-y-2.5">
      <Bone className="mb-4 hidden h-3 w-24 lg:block" />
      {[0, 1, 2, 3].map((i) => (
        <Bone key={i} className="h-9 w-full max-w-[14rem] rounded-xl" />
      ))}
    </div>
  );
}
