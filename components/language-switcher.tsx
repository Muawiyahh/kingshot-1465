"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Globe } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { LOCALES, LOCALE_INFO, isLocale, switchLocale } from "@/lib/i18n/config";
import { saveLanguage } from "@/lib/i18n/language-action";

export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <label className="relative flex h-9 w-9 items-center rounded-full text-sm text-muted transition-colors hover:bg-white/5 hover:text-fg sm:w-auto">
      <span className="sr-only">{t.nav.language}</span>
      <Globe className="pointer-events-none absolute left-2.5 size-4" aria-hidden />
      {/* Globe only on phones to leave room for the sign-in buttons; code from sm up. */}
      <span aria-hidden className="pointer-events-none hidden pl-8 pr-2 font-mono text-xs sm:inline">
        {LOCALE_INFO[locale].short}
      </span>
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          if (!isLocale(next)) return;
          start(() => {
            void saveLanguage(next);
            // Read the URL at click time rather than with usePathname(), so the header
            // never depends on URL data while pages are prerendered.
            router.push(switchLocale(window.location.pathname, next) + window.location.search);
          });
        }}
        className="absolute inset-0 cursor-pointer appearance-none bg-transparent text-transparent"
      >
        {LOCALES.map((l) => (
          <option key={l} value={l} lang={LOCALE_INFO[l].tag}>
            {LOCALE_INFO[l].label}
          </option>
        ))}
      </select>
    </label>
  );
}
