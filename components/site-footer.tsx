import Link from "next/link";
import { Crest } from "@/components/crest";
import { FlamingHeart } from "@/components/flaming-heart";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import { site } from "@/lib/site";

/** Kingdom name on the left, the site's credit in the middle, Discord (when set) on the right. */
export async function SiteFooter() {
  const { locale, t } = await getI18n();
  return (
    <footer className="border-t border-border">
      <div className="mx-auto grid w-full max-w-6xl items-center gap-6 px-4 py-10 text-center sm:grid-cols-3 sm:px-6 sm:text-left lg:px-8">
        <Link href={localePath(locale, "/")} className="flex items-center justify-center gap-3 rounded-lg sm:justify-start">
          <Crest className="size-7" />
          <span className="font-display font-semibold">{fmt(t.common.kingdomName, { n: site.kingdom })}</span>
        </Link>
        <p className="text-sm text-muted sm:text-center">
          {rich(t.footer.credit, {
            heart: <FlamingHeart label={t.footer.heart} />,
            name: <span className="font-medium text-gold-soft">{site.creator}</span>,
          })}
        </p>
        {/* Empty when there's no Discord link, so the credit stays centred */}
        <nav aria-label={t.footer.label} className="flex justify-center text-sm text-muted sm:justify-end">
          {site.discordUrl && (
            <a href={site.discordUrl} className="hover:text-fg" target="_blank" rel="noreferrer">
              Discord
            </a>
          )}
        </nav>
      </div>
    </footer>
  );
}
