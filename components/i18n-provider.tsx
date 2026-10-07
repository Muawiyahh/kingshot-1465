"use client";

import { createContext, useContext, type ReactNode } from "react";
import { LOCALE_INFO, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages/en";

type I18n = { locale: Locale; t: Messages; tag: string };

const I18nContext = createContext<I18n | null>(null);

/** Makes the current language's messages available to Client Components. */
export function I18nProvider({ locale, messages, children }: { locale: Locale; messages: Messages; children: ReactNode }) {
  return (
    <I18nContext value={{ locale, t: messages, tag: LOCALE_INFO[locale].tag }}>{children}</I18nContext>
  );
}

export function useI18n(): I18n {
  const value = useContext(I18nContext);
  if (!value) throw new Error("useI18n must be used inside <I18nProvider>");
  return value;
}
