import { ArrowRight } from "lucide-react";
import { ManagerList } from "@/components/home/manager-list";
import { Bone } from "@/components/skeleton";
import { ButtonLink, Card, Eyebrow } from "@/components/ui";
import { ALLIANCES } from "@/lib/alliances";
import type { HomeContent, HomeStats } from "@/lib/data";
import { localePath, type Locale } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { site } from "@/lib/site";

const DAY = 86_400_000;

/** Day number of the server today (day 1 is the opening day), or null without an opening date. */
function serverDay(openedOn: string | null) {
  if (!openedOn) return null;
  return Math.max(1, Math.floor((Date.now() - Date.parse(`${openedOn}T00:00:00Z`)) / DAY) + 1);
}

/** When the next KvK starts, as a short date: the date leaders set, else a running or upcoming event. */
function nextKvk(stats: HomeStats, t: Messages, tag: string) {
  const short = (ms: number) => new Date(ms).toLocaleDateString(tag, { day: "numeric", month: "short", timeZone: "UTC" });
  const now = Date.now();
  const kvk = stats.kvk;
  if (kvk) {
    const start = Date.parse(`${kvk.startsOn}T00:00:00Z`);
    if (now >= start && now < start + kvk.days * DAY) return t.common.live;
  }
  const setAt = stats.nextKvkAt ? Date.parse(stats.nextKvkAt) : null;
  if (setAt !== null && setAt > now) return short(setAt);
  if (kvk) return short(Date.parse(`${kvk.startsOn}T00:00:00Z`));
  return null;
}

/** The leaders' own facts first, then live numbers about the kingdom. */
function glance(content: HomeContent["transfer"], stats: HomeStats | null, t: Messages, tag: string) {
  const facts: { label: string; value: string; leader?: boolean }[] = content.facts.map((f) => ({ ...f, leader: true }));
  if (!stats) return facts;
  const day = serverDay(stats.serverOpenedOn);
  if (day !== null) facts.push({ label: t.cards.serverAge, value: fmt(t.cards.serverDay, { n: day.toLocaleString(tag) }) });
  facts.push({ label: t.cards.alliances, value: String(ALLIANCES.length) });
  if (stats.players !== null) facts.push({ label: t.cards.governors, value: stats.players.toLocaleString(tag) });
  if (stats.king) {
    facts.push({ label: t.cards.king, value: stats.king.alliance ? `${stats.king.name} [${stats.king.alliance}]` : stats.king.name });
  }
  const kvk = nextKvk(stats, t, tag);
  if (kvk) facts.push({ label: t.cards.nextKvk, value: kvk });
  return facts;
}

/**
 * Transfer to 1465: the pitch and the kingdom at a glance beside a short guide and the transfer
 * managers. Visitors message the managers on the site through a transfer account (/transfer).
 * With `content` null it renders as its own loading placeholder.
 */
export function TransferSection({
  content,
  stats,
  t,
  locale,
  tag,
}: {
  content: HomeContent["transfer"] | null;
  stats: HomeStats | null;
  t: Messages;
  locale: Locale;
  tag: string;
}) {
  const tr = t.home.transfer;
  const facts = content ? glance(content, stats, t, tag) : [];
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
        <ButtonLink href={localePath(locale, "/transfer")} size="lg" className="mt-8">
          {tr.cta}
          <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>

        <h3 className="mt-10 font-mono text-xs tracking-[0.18em] text-gold uppercase">{tr.factsTitle}</h3>
        {content ? (
          <dl className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
            {facts.map((f, i) => (
              // Leaders' own facts get a soft gold edge; the live numbers follow in plain tiles.
              <div
                key={i}
                className={`min-w-0 rounded-2xl bg-card px-4 py-3.5 ${
                  f.leader ? "shadow-[inset_0_0_0_1px_rgba(217,164,65,0.35)]" : "shadow-[inset_0_0_0_1px_var(--border)]"
                }`}
              >
                <dt className="text-xs text-muted">{f.label}</dt>
                <dd
                  className={`mt-1 font-display text-lg leading-snug font-semibold [overflow-wrap:anywhere] ${f.leader ? "text-gold-soft" : ""}`}
                >
                  {f.value}
                </dd>
              </div>
            ))}
          </dl>
        ) : (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <Bone key={i} className="h-[4.5rem] rounded-2xl" />
            ))}
          </div>
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
          <div className="mt-3 space-y-3" aria-hidden>
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex items-center gap-3">
                <Bone className="size-9 shrink-0 rounded-full" />
                <span className="flex-1 space-y-1.5">
                  <Bone className="h-4 w-32" />
                  <Bone className="h-3 w-24" />
                </span>
                <Bone className="h-8 w-24 rounded-full" />
              </div>
            ))}
          </div>
        ) : content.managers.length === 0 ? (
          <p className="relative mt-4 text-sm text-muted">{tr.noManagers}</p>
        ) : (
          <ManagerList managers={content.managers} />
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
