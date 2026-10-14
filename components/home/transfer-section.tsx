import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { CopyGameId } from "@/components/home/copy-game-id";
import { Bone } from "@/components/skeleton";
import { ButtonLink, Card, Eyebrow } from "@/components/ui";
import type { HomeContent } from "@/lib/data";
import { localePath, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { site } from "@/lib/site";

/**
 * Transfer to 1465: the pitch and kingdom facts beside a short guide and the transfer managers.
 * Visitors message the managers on the site through a transfer account (/transfer).
 * With `content` null it renders as its own loading placeholder.
 */
export function TransferSection({ content, t, locale }: { content: HomeContent["transfer"] | null; t: Messages; locale: Locale }) {
  const tr = t.home.transfer;
  const transfer = (to?: string) => localePath(locale, "/transfer") + (to ? `?to=${to}` : "");
  return (
    <div className="grid gap-10 lg:grid-cols-[1.15fr_1fr] lg:gap-14">
      <div>
        <Eyebrow>{tr.eyebrow}</Eyebrow>
        <h2 id="transfer-title" className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
          {tr.title}
        </h2>
        {content ? (
          <p className="mt-3 max-w-xl leading-relaxed whitespace-pre-line text-muted">{content.pitch ?? tr.pitch}</p>
        ) : (
          <div className="mt-4 max-w-xl space-y-3" aria-hidden>
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-full" />
            <Bone className="h-4 w-2/3" />
          </div>
        )}
        <ButtonLink href={transfer()} size="lg" className="mt-8">
          {tr.cta}
          <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
        {content && content.facts.length > 0 && (
          <>
            <h3 className="mt-10 font-mono text-xs tracking-[0.18em] text-gold uppercase">{tr.factsTitle}</h3>
            <dl className="mt-4 grid grid-cols-2 gap-3">
              {content.facts.map((f, i) => (
                <div key={i} className="min-w-0 rounded-2xl bg-card px-4 py-3.5 shadow-[inset_0_0_0_1px_var(--border)]">
                  <dt className="text-xs text-muted">{f.label}</dt>
                  <dd className="mt-1 font-display text-lg font-semibold [overflow-wrap:anywhere]">{f.value}</dd>
                </div>
              ))}
            </dl>
          </>
        )}
      </div>

      <Card className="relative self-start overflow-hidden p-6 sm:p-8">
        <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-56 rounded-full bg-primary/20 blur-3xl" />
        <h3 className="relative font-display text-xl font-semibold">{tr.contactTitle}</h3>
        <ol className="relative mt-5 space-y-3">
          {tr.steps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/15 font-mono text-xs text-primary">
                {i + 1}
              </span>
              <p className="pt-0.5 text-sm leading-relaxed text-muted">{step}</p>
            </li>
          ))}
        </ol>

        <h4 className="relative mt-8 border-t border-border pt-6 font-mono text-xs tracking-[0.18em] text-gold uppercase">
          {tr.managersTitle}
        </h4>
        {!content ? (
          <div className="mt-4 space-y-4" aria-hidden>
            {[0, 1].map((i) => (
              <div key={i} className="flex gap-3">
                <Bone className="size-10 shrink-0 rounded-full" />
                <span className="flex-1 space-y-2">
                  <Bone className="h-4 w-32" />
                  <Bone className="h-8 w-40 rounded-full" />
                </span>
              </div>
            ))}
          </div>
        ) : content.managers.length === 0 ? (
          <p className="relative mt-4 text-sm text-muted">{tr.noManagers}</p>
        ) : (
          <ul className="relative mt-2 divide-y divide-border/60">
            {content.managers.map((m) => (
              <li key={m.profileId} className="flex gap-3 py-4 last:pb-0">
                <AllianceAvatar tag={m.alliance} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium [overflow-wrap:anywhere]">
                    {m.alliance && <span className="mr-1.5 font-mono text-xs text-gold">[{m.alliance}]</span>}
                    {m.name}
                  </p>
                  {m.note && <p className="mt-0.5 text-xs text-muted">{m.note}</p>}
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Link
                      href={transfer(m.profileId)}
                      className="inline-flex h-9 items-center gap-1.5 rounded-full bg-primary px-3.5 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover"
                    >
                      <MessageCircle className="size-3.5" aria-hidden />
                      {tr.message}
                      <span className="sr-only"> {m.name}</span>
                    </Link>
                    {m.gameId && <CopyGameId id={m.gameId} />}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {site.discordUrl && (
          <a
            href={site.discordUrl}
            target="_blank"
            rel="noreferrer"
            className="relative mt-6 inline-block text-sm text-gold-soft underline-offset-4 hover:underline"
          >
            {t.home.joinDiscord}
          </a>
        )}
      </Card>
    </div>
  );
}
