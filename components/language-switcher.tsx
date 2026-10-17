"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { ChevronDown, Globe } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { rememberLanguageChosen } from "@/components/language-welcome";
import { LOCALES, LOCALE_INFO, isLocale, switchLocale } from "@/lib/i18n/config";
import { saveLanguage } from "@/lib/i18n/language-action";

/** The footer's language picker: globe, the current language's own name, and a native select over it. */
export function LanguageSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <label className="relative inline-flex h-9 items-center gap-2 rounded-full border border-border px-3 text-sm text-muted transition-colors focus-within:border-border-strong hover:border-border-strong hover:text-fg">
      <span className="sr-only">{t.nav.language}</span>
      <Globe className="pointer-events-none size-4" aria-hidden />
      <span aria-hidden lang={LOCALE_INFO[locale].tag} className="pointer-events-none">
        {LOCALE_INFO[locale].label}
      </span>
      <ChevronDown className="pointer-events-none size-3.5 opacity-70" aria-hidden />
      <select
        value={locale}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value;
          if (!isLocale(next)) return;
          rememberLanguageChosen();
          start(() => {
            void saveLanguage(next);
            // Read the URL at click time rather than with usePathname(), so the footer
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
