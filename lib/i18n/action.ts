import "server-only";
import { cookies } from "next/headers";
import { DEFAULT_LOCALE, LANGUAGE_CHOSEN_COOKIE, LANGUAGE_CHOSEN_MAX_AGE, LOCALE_COOKIE, isLocale } from "@/lib/i18n/config";
import { loadMessages } from "@/lib/i18n/messages";

/**
 * Locale inside Server Actions, which can't read the URL segment.
 * proxy.ts keeps the cookie in sync with the language of the page being viewed.
 */
export async function getActionI18n() {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(value) ? value : DEFAULT_LOCALE;
  return { locale, t: await loadMessages(locale) };
}

/** Signed-in players already have a language, so the first-visit picker shouldn't ask them again. */
export async function rememberLanguageChosen() {
  (await cookies()).set(LANGUAGE_CHOSEN_COOKIE, "1", { path: "/", maxAge: LANGUAGE_CHOSEN_MAX_AGE, sameSite: "lax" });
}
