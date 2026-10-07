import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CalendarClock, Crown, Flame, Scale, ShieldCheck, Users } from "lucide-react";
import { Hero } from "@/components/hero";
import { Badge, ButtonLink, Card, Container, Eyebrow, LiveDot, WindowFrame } from "@/components/ui";
import { AllianceAvatar } from "@/components/alliance-banner";
import { KingdomCards } from "@/components/kingdom-cards";
import { getHomeStats, getLatestPublishedSchedule } from "@/lib/data";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { getI18n } from "@/lib/i18n/server";
import { formatDay, isSlotLive, positionLabel, slotLabel } from "@/lib/kvk";
import { site } from "@/lib/site";

const pillarIcons = [Flame, Scale, Users];
const stepIcons = [ShieldCheck, CalendarClock, Crown];

export default async function HomePage() {
  const { locale, t, tag } = await getI18n();
  const href = (path: string) => localePath(locale, path);

  return (
    <>
      <Hero
        actions={
          <>
            <ButtonLink href={href("/apply")} size="lg">
              {t.home.applyCta}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href={href("/positions")} variant="secondary" size="lg">
              {t.home.viewSchedule}
            </ButtonLink>
          </>
        }
        visual={
          <Suspense fallback={<KingdomCards stats={null} />}>
            <HomeCards />
          </Suspense>
        }
      />

      {/* About */}
      <section className="border-t border-border py-24 sm:py-32" aria-labelledby="about-title">
        <Container>
          <Eyebrow>{t.home.kingdomEyebrow}</Eyebrow>
          <h2 id="about-title" className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-5xl">
            {t.home.aboutBefore} <span className="text-primary">{t.home.aboutHighlight}</span> {t.home.aboutAfter}
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {t.home.pillars.map((p, i) => {
              const Icon = pillarIcons[i % pillarIcons.length];
              return (
                <Card key={p.title} className="group p-7 transition-colors hover:bg-card-hover">
                  <div className="mb-5 inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(224,64,74,0.25)]">
                    <Icon className="size-5" aria-hidden />
                  </div>
                  <h3 className="font-display text-xl font-semibold">{p.title}</h3>
                  <p className="mt-2 leading-relaxed text-muted">{p.body}</p>
                </Card>
              );
            })}
          </div>
        </Container>
      </section>

      {/* Positions preview */}
      <section className="pb-24 sm:pb-32" aria-labelledby="positions-title">
        <Container className="grid items-center gap-12 lg:grid-cols-[1fr_1.2fr]">
          <div>
            <Eyebrow>{t.home.positionsEyebrow}</Eyebrow>
            <h2 id="positions-title" className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {t.home.positionsTitle}
            </h2>
            <ol className="mt-8 space-y-5">
              {t.home.steps.map((step, i) => {
                const Icon = stepIcons[i % stepIcons.length];
                return (
                  <li key={step.title} className="flex gap-4">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card font-mono text-sm text-gold shadow-[inset_0_0_0_1px_var(--border-strong)]">
                      {i + 1}
                    </span>
                    <div>
                      <p className="flex items-center gap-2 font-medium">
                        <Icon className="size-4 text-primary" aria-hidden />
                        {step.title}
                      </p>
                      <p className="mt-1 text-sm text-muted">{step.body}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href={href("/signup")}>{t.home.createAccount}</ButtonLink>
              <ButtonLink href={href("/positions")} variant="ghost">
                {t.home.fullSchedule} <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </div>
          <Suspense fallback={<SchedulePreviewFrame rows={null} t={t} tag={tag} href={href("/positions")} />}>
            <SchedulePreview t={t} tag={tag} href={href("/positions")} />
          </Suspense>
        </Container>
      </section>

      {/* Council */}
      <section className="border-t border-border bg-bg-elevated/40 py-24" aria-labelledby="council-title">
        <Container>
          <Eyebrow>{t.home.councilEyebrow}</Eyebrow>
          <h2 id="council-title" className="mt-3 font-display text-3xl font-bold tracking-tight">
            {t.home.councilTitle}
          </h2>
          <p className="mt-2 text-muted">{t.home.councilSub}</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {site.council.map((c) => (
              <Card key={c.name} className="flex items-center gap-4 p-5">
                <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#5a0d13] font-display text-lg font-bold text-gold-soft shadow-[inset_0_0_0_1px_rgba(241,208,138,0.3)]">
                  {c.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-sm text-muted">
                    {t.home.councilRoles[c.role]} · <span className="font-mono">{fmt(t.common.id, { id: c.gameId })}</span>
                  </p>
                </div>
              </Card>
            ))}
          </div>
          {site.discordUrl && (
            <div className="mt-10">
              <a href={site.discordUrl} target="_blank" rel="noreferrer" className="text-gold-soft underline-offset-4 hover:underline">
                {t.home.joinDiscord}
              </a>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

async function HomeCards() {
  const stats = await getHomeStats();
  return <KingdomCards stats={stats} />;
}

type PreviewProps = { t: Messages; tag: string; href: string };

async function SchedulePreview(props: PreviewProps) {
  const rows = await getLatestPublishedSchedule();
  return <SchedulePreviewFrame rows={rows} {...props} />;
}

function SchedulePreviewFrame({
  rows,
  t,
  tag,
  href,
}: PreviewProps & { rows: Awaited<ReturnType<typeof getLatestPublishedSchedule>> | null }) {
  // Show the first assigned slots of the first day, or a sample when nothing is published yet.
  const first = rows?.[0];
  const sample = !first;
  const preview = sample
    ? [
        { i: 0, name: "Warrior One", tag: "GGG" },
        { i: 1, name: "Iron Duchess", tag: "ERA" },
        { i: 2, name: null, tag: null },
        { i: 3, name: "Northwind", tag: "GBC" },
        { i: 4, name: "Ember Knight", tag: "KOR" },
      ].map((r) => ({ ...r, minutes: 30 }))
    : rows!
        .filter((r) => r.day_id === first.day_id)
        .slice(0, 5)
        .map((r) => ({ i: r.slot_index, name: r.ingame_name, tag: r.alliance_tag, minutes: r.slot_minutes }));

  const dayLabel = (n: number) => fmt(t.common.day, { n });
  return (
    <WindowFrame
      title={
        sample
          ? t.home.previewSample
          : `${first.event_title} · ${dayLabel(first.day_number)} · ${positionLabel(first.position, t)}`
      }
    >
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <p className="text-sm font-medium">
          {sample
            ? `${dayLabel(1)} · ${t.positionNames.construction}`
            : `${formatDay(first.date, tag)} · ${positionLabel(first.position, t)}`}
        </p>
        {sample ? (
          <Badge>{t.common.sample}</Badge>
        ) : (
          <Badge tone="green">
            <LiveDot /> {t.common.live}
          </Badge>
        )}
      </div>
      <ul className="divide-y divide-border px-2 pb-3">
        {preview.map((r) => {
          const live = !sample && first && isSlotLive(first.date, r.i, r.minutes);
          return (
            <li key={r.i} className="flex items-center gap-4 rounded-xl px-3 py-3">
              <span className="w-28 shrink-0 font-mono text-xs text-muted tabular-nums">{slotLabel(r.i, r.minutes)}</span>
              {r.name ? (
                <span className="flex min-w-0 items-center gap-2.5 text-sm">
                  <AllianceAvatar tag={r.tag} size={32} />
                  <span className="truncate">
                    {r.tag && <span className="mr-1.5 font-mono text-xs text-gold">[{r.tag}]</span>}
                    {r.name}
                  </span>
                </span>
              ) : (
                <span className="text-sm italic text-muted/70">{t.common.open}</span>
              )}
              {live && (
                <Badge tone="red" className="ml-auto">
                  {t.common.now}
                </Badge>
              )}
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border px-5 py-3">
        <Link href={href} className="text-sm text-gold-soft hover:underline">
          {t.home.openFullSchedule}
        </Link>
      </div>
    </WindowFrame>
  );
}
