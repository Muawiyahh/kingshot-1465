import { lang } from "next/root-params";
import { notFound } from "next/navigation";
import { LOCALE_INFO, isLocale, type Locale } from "@/lib/i18n/config";
import { loadMessages } from "@/lib/i18n/messages";

/**
 * Language of the current page, from the /[lang] URL segment.
 * For Server Components and server utilities only (not Server Actions — see ./action.ts).
 */
export async function getLocale(): Promise<Locale> {
  const value = await lang();
  if (!isLocale(value)) notFound();
  return value;
}

/** Current locale, its messages, and its BCP 47 tag for Intl formatting. */
export async function getI18n() {
  const locale = await getLocale();
  return { locale, t: await loadMessages(locale), tag: LOCALE_INFO[locale].tag };
}
