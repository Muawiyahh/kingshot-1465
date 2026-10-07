import type { Metadata, Viewport } from "next";
import { Cinzel, Geist, Geist_Mono } from "next/font/google";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { I18nProvider } from "@/components/i18n-provider";
import { LOCALES, LOCALE_INFO, localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { site } from "@/lib/site";
import "../globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
const cinzel = Cinzel({ variable: "--font-cinzel", subsets: ["latin"], weight: ["600", "700", "900"] });

export function generateStaticParams() {
  return LOCALES.map((lang) => ({ lang }));
}

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getI18n();
  return {
    title: { default: t.meta.siteTitle, template: `%s · ${site.name}` },
    description: t.meta.description,
    // Tell search engines about every language version of the site.
    alternates: {
      languages: Object.fromEntries(LOCALES.map((l) => [LOCALE_INFO[l].tag, localePath(l, "/")])),
      canonical: localePath(locale, "/"),
    },
  };
}

export const viewport: Viewport = {
  themeColor: "#0d0a0b",
};

export default async function RootLayout({ children }: LayoutProps<"/[lang]">) {
  const { locale, t, tag } = await getI18n();
  return (
    <html lang={tag} className={`${geistSans.variable} ${geistMono.variable} ${cinzel.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <I18nProvider locale={locale} messages={t}>
          <a
            href="#main"
            className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-card focus:px-4 focus:py-2"
          >
            {t.nav.skip}
          </a>
          <SiteHeader />
          <main id="main" className="flex-1">
            {children}
          </main>
          <SiteFooter />
        </I18nProvider>
      </body>
    </html>
  );
}
