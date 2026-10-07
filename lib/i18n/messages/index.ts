import "server-only";
import type { Locale } from "@/lib/i18n/config";
import type { Messages } from "./en";

export type { Messages };

// Each language is its own chunk, loaded only when a page in that language renders.
const loaders: Record<Locale, () => Promise<Messages>> = {
  en: () => import("./en").then((m) => m.default),
  de: () => import("./de").then((m) => m.default),
  "zh-cn": () => import("./zh-cn").then((m) => m.default),
  "zh-tw": () => import("./zh-tw").then((m) => m.default),
  fr: () => import("./fr").then((m) => m.default),
  es: () => import("./es").then((m) => m.default),
  id: () => import("./id").then((m) => m.default),
  tl: () => import("./tl").then((m) => m.default),
  "pt-br": () => import("./pt-br").then((m) => m.default),
  ko: () => import("./ko").then((m) => m.default),
};

export function loadMessages(locale: Locale) {
  return loaders[locale]();
}
