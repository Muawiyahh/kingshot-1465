/** Supported languages. Safe to import from client and server code. */

export const LOCALES = ["en", "de", "zh-cn", "zh-tw", "fr", "es", "id", "tl", "pt-br", "ko"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";
export const LOCALE_COOKIE = "NEXT_LOCALE";

export const LOCALE_INFO: Record<Locale, { label: string; short: string; /** BCP 47 tag for <html lang> and Intl */ tag: string }> = {
  en: { label: "English", short: "EN", tag: "en-GB" },
  de: { label: "Deutsch", short: "DE", tag: "de-DE" },
  "zh-cn": { label: "简体中文", short: "简", tag: "zh-CN" },
  "zh-tw": { label: "繁體中文", short: "繁", tag: "zh-TW" },
  fr: { label: "Français", short: "FR", tag: "fr-FR" },
  es: { label: "Español", short: "ES", tag: "es-ES" },
  id: { label: "Bahasa Indonesia", short: "ID", tag: "id-ID" },
  tl: { label: "Tagalog", short: "TL", tag: "fil-PH" },
  "pt-br": { label: "Português (Brasil)", short: "PT", tag: "pt-BR" },
  ko: { label: "한국어", short: "KO", tag: "ko-KR" },
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/** "/positions" + "de" → "/de/positions". Paths must start with "/". */
export function localePath(locale: Locale, path: string) {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}

/** Splits "/de/positions" into { locale: "de", rest: "/positions" }. */
export function splitLocale(pathname: string): { locale: Locale | null; rest: string } {
  const [, first, ...more] = pathname.split("/");
  if (isLocale(first)) return { locale: first, rest: `/${more.join("/")}` };
  return { locale: null, rest: pathname };
}

/** Swaps (or adds) the locale prefix of a path. */
export function switchLocale(pathname: string, locale: Locale) {
  return localePath(locale, splitLocale(pathname).rest);
}

/** Best supported locale for an Accept-Language header. */
export function matchAcceptLanguage(header: string | null | undefined): Locale {
  if (!header) return DEFAULT_LOCALE;
  const wanted = header
    .split(",")
    .map((part) => {
      const [tag, q] = part.trim().split(";q=");
      return { tag: tag.toLowerCase(), q: q ? Number(q) : 1 };
    })
    .filter((w) => w.tag && !Number.isNaN(w.q))
    .sort((a, b) => b.q - a.q);

  for (const { tag } of wanted) {
    if (isLocale(tag)) return tag;
    const [base, region] = tag.split("-");
    if (base === "zh") {
      return ["tw", "hk", "mo", "hant"].includes(region ?? "") || tag.includes("hant") ? "zh-tw" : "zh-cn";
    }
    if (base === "pt") return "pt-br";
    if (base === "fil") return "tl";
    if (base === "in") return "id";
    if (isLocale(base)) return base;
  }
  return DEFAULT_LOCALE;
}
