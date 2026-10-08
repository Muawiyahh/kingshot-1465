import { Suspense } from "react";
import { AccountSidebar } from "@/components/account-sidebar";
import { Container, Eyebrow } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";

export default async function AccountLayout({ children }: LayoutProps<"/[lang]/account">) {
  const { locale, t } = await getI18n();

  return (
    <Container className="py-8 sm:py-12">
      <div className="lg:grid lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-12">
        <aside className="mb-8 lg:mb-0">
          <Eyebrow className="mb-4 hidden lg:block">{t.account.eyebrow}</Eyebrow>
          <div className="lg:sticky lg:top-24">
            <Suspense fallback={<div className="h-10 animate-pulse rounded-xl bg-card lg:h-52" />}>
              <AccountSidebar locale={locale} t={t} />
            </Suspense>
          </div>
        </aside>
        <div className="min-w-0">{children}</div>
      </div>
    </Container>
  );
}
