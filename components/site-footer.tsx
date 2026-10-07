import Link from "next/link";
import { Crest } from "@/components/crest";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getI18n } from "@/lib/i18n/server";
import { site } from "@/lib/site";

export async function SiteFooter() {
  const { locale, t } = await getI18n();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Crest className="size-7" />
          <div>
            <p className="font-display font-semibold">{fmt(t.common.kingdomName, { n: site.kingdom })}</p>
            <p className="text-xs text-muted">{t.home.motto}</p>
          </div>
        </div>
        <nav aria-label={t.footer.label} className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href={localePath(locale, "/positions")} className="hover:text-fg">
            {t.nav.positions}
          </Link>
          <Link href={localePath(locale, "/apply")} className="hover:text-fg">
            {t.nav.apply}
          </Link>
          {site.discordUrl && (
            <a href={site.discordUrl} className="hover:text-fg" target="_blank" rel="noreferrer">
              Discord
            </a>
          )}
        </nav>
        <p className="text-xs text-muted">{t.footer.disclaimer}</p>
      </div>
    </footer>
  );
}
