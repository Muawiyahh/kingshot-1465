import { Suspense } from "react";
import { Container, Eyebrow } from "@/components/ui";
import { AdminSidebar, AdminSidebarFallback } from "@/components/admin/admin-sidebar";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminLayout({ children }: LayoutProps<"/[lang]/admin">) {
  const { locale, t } = await getI18n();

  return (
    <Container className="py-8 sm:py-12">
      <div className="account-shell lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        {/* On phones an open chat fills the screen like a messaging app, so the menu steps aside. */}
        <aside className="mb-8 lg:mb-0 max-lg:[.account-shell:has([data-chat-open])>&]:hidden">
          <Eyebrow className="mb-4 hidden lg:block">{t.admin.eyebrow}</Eyebrow>
          <div className="lg:sticky lg:top-24">
            <Suspense fallback={<AdminSidebarFallback locale={locale} t={t} />}>
              <AdminSidebar locale={locale} t={t} />
            </Suspense>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
