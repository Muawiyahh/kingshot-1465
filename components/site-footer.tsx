import Link from "next/link";
import { Crest } from "@/components/crest";
import { site } from "@/lib/site";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-3">
          <Crest className="size-7" />
          <div>
            <p className="font-display font-semibold">{site.name}</p>
            <p className="text-xs text-muted">{site.motto}</p>
          </div>
        </div>
        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted">
          <Link href="/positions" className="hover:text-fg">Positions</Link>
          <Link href="/apply" className="hover:text-fg">Apply</Link>
          {site.discordUrl && (
            <a href={site.discordUrl} className="hover:text-fg" target="_blank" rel="noreferrer">
              Discord
            </a>
          )}
        </nav>
        <p className="text-xs text-muted">
          Fan-made community site. Not affiliated with Kingshot or Century Games.
        </p>
      </div>
    </footer>
  );
}
