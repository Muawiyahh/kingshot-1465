import Link from "next/link";
import { Suspense } from "react";
import { Crest } from "@/components/crest";
import { HeaderNav, HeaderNavView } from "@/components/header-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { UserNav } from "@/components/user-nav";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getI18n } from "@/lib/i18n/server";
import { site } from "@/lib/site";

/**
 * Minimal top bar: logo (home), two main links, then language and the account menu. Phones get
 * the two links as tabs under the bar.
 */
export async function SiteHeader() {
  const { locale, t } = await getI18n();
  const links = [
    { href: localePath(locale, "/positions"), label: t.nav.positions },
    { href: localePath(locale, "/account/appointments"), label: t.nav.apply },
  ];
  // The highlight reads the URL, so the links show at once and light up a moment later.
  const nav = (variant: "desktop" | "mobile") => (
    <Suspense fallback={<HeaderNavView links={links} activeHref={null} variant={variant} label={t.nav.main} />}>
      <HeaderNav links={links} variant={variant} label={t.nav.main} />
    </Suspense>
  );

  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/75 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-3 px-4 sm:gap-8 sm:px-6 lg:px-8">
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
        {nav("desktop")}
        <div className="ml-auto flex items-center gap-1 sm:gap-2">
          <LanguageSwitcher />
          <Suspense fallback={<span className="size-10 animate-pulse rounded-full bg-white/5" aria-hidden />}>
            <UserNav />
          </Suspense>
        </div>
      </div>
      {nav("mobile")}
    </header>
  );
}
