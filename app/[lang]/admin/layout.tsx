import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui";
import { localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

export default async function AdminLayout({ children }: LayoutProps<"/[lang]/admin">) {
  const { locale, t } = await getI18n();
  const nav = [
    { href: "/admin", label: t.admin.nav.overview },
    { href: "/admin/accounts", label: t.admin.nav.accounts },
    { href: "/admin/events", label: t.admin.nav.events },
    { href: "/admin/settings", label: t.admin.nav.settings },
  ];

  return (
    <Container className="py-10 sm:py-14">
      <div className="mb-10 flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <Eyebrow>{t.admin.eyebrow}</Eyebrow>
        <nav aria-label={t.admin.navLabel} className="flex flex-wrap gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={localePath(locale, n.href)}
              className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-fg"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </Container>
  );
}
