import Link from "next/link";
import { Suspense } from "react";
import { Crest } from "@/components/crest";
import { LanguageSwitcher } from "@/components/language-switcher";
import { UserNav } from "@/components/user-nav";
import { buttonClass } from "@/components/ui";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getI18n } from "@/lib/i18n/server";
import { site } from "@/lib/site";

export async function SiteHeader() {
  const { locale, t } = await getI18n();
  const links = [
    { href: localePath(locale, "/"), label: t.nav.home },
    { href: localePath(locale, "/positions"), label: t.nav.positions },
    { href: localePath(locale, "/account/appointments"), label: t.nav.apply },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:gap-6 sm:px-6 lg:px-8">
        <Link
          href={localePath(locale, "/")}
          className="flex shrink-0 items-center gap-2 rounded-lg sm:gap-2.5"
          aria-label={fmt(t.nav.homeLabel, { name: fmt(t.common.kingdomName, { n: site.kingdom }) })}
        >
          <Crest className="size-7 sm:size-8" />
          <span className="font-display text-lg font-bold tracking-wide">
            <span className="text-gold-soft">#</span>
            {site.kingdom}
          </span>
        </Link>
        <nav aria-label={t.nav.main} className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-1 sm:gap-2 md:gap-3 lg:gap-4">
          <LanguageSwitcher />
          <Suspense
            fallback={
              <Link href={localePath(locale, "/login")} className={buttonClass("secondary", "sm")}>
                {t.nav.signIn}
              </Link>
            }
          >
            <UserNav />
          </Suspense>
        </div>
      </div>
      {/* Mobile nav */}
      <nav aria-label={t.nav.main} className="flex items-center justify-around border-t border-border md:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="flex-1 py-3 text-center text-sm text-muted hover:text-fg">
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
