import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CalendarClock, ChevronDown, Flame, Globe, Scale, ShieldCheck, Users } from "lucide-react";
import { Hero } from "@/components/hero";
import { Badge, ButtonLink, Card, Container, Eyebrow, LiveDot, WindowFrame } from "@/components/ui";
import { AllianceAvatar } from "@/components/alliance-banner";
import { KingdomCards } from "@/components/kingdom-cards";
import { SECTION_ICONS } from "@/components/section-icons";
import { getUserId } from "@/lib/auth";
import { getHomeStats, getLatestPublishedSchedule } from "@/lib/data";
import { LOCALES, LOCALE_INFO, localePath, type Locale } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { getI18n } from "@/lib/i18n/server";
import { formatDay, isSlotLive, positionLabel, slotLabel } from "@/lib/kvk";
import { site } from "@/lib/site";

const pillarIcons = [Flame, Scale, Users];

/** Where each guide step sends people (protected pages bounce signed-out visitors to sign-in first). */
const PLAYER_STEP_LINKS = ["/signup", "/account/messages", "/account/appointments", "/positions"];
const LEADER_STEP_LINKS = ["/admin/accounts", "/admin/events", "/admin/events", "/admin"];

export default async function HomePage() {
  const { locale, t, tag } = await getI18n();
  const href = (path: string) => localePath(locale, path);

  return (
    <>
      <Hero
        actions={
          <>
            <ButtonLink href={href("/account/appointments")} size="lg">
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

      {/* Features: one card per part of the site, each linking straight to it */}
      <section className="border-t border-border py-24 sm:py-28" aria-labelledby="features-title">
        <Container>
          <Eyebrow>{t.home.features.eyebrow}</Eyebrow>
          <h2 id="features-title" className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t.home.features.title}
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {(
              [
                { key: "schedule", icon: CalendarClock, path: "/positions" },
                { key: "appointments", icon: SECTION_ICONS.appointments, path: "/account/appointments" },
                { key: "messages", icon: SECTION_ICONS.messages, path: "/account/messages" },
                { key: "profile", icon: SECTION_ICONS.profile, path: "/account/profile" },
              ] as const
            ).map(({ key, icon: Icon, path }) => {
              const f = t.home.features[key];
              return (
                <Link key={key} href={href(path)} className="group rounded-3xl">
                  <Card className="flex h-full flex-col p-6 transition-colors group-hover:bg-card-hover">
                    <span className="mb-5 inline-flex size-11 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(224,64,74,0.25)]">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <h3 className="font-display text-lg font-semibold">{f.title}</h3>
                    <p className="mt-2 flex-1 text-sm leading-relaxed text-muted">{f.body}</p>
                    <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-medium text-gold-soft">
                      {f.cta}
                      <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                    </span>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Languages: each one links to this page in that language */}
          <Card className="mt-4 flex flex-col gap-5 p-6 lg:flex-row lg:items-center">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-gold/10 text-gold-soft shadow-[inset_0_0_0_1px_rgba(217,164,65,0.3)]">
              <Globe className="size-5" aria-hidden />
            </span>
            <div className="lg:max-w-xs">
              <h3 className="font-display text-lg font-semibold">{t.home.features.languages.title}</h3>
              <p className="mt-1 text-sm text-muted">{t.home.features.languages.body}</p>
            </div>
            <ul className="flex flex-wrap gap-2 lg:ml-auto lg:justify-end">
              {LOCALES.map((l) => (
                <li key={l}>
                  <Link
                    href={localePath(l, "/")}
                    lang={LOCALE_INFO[l].tag}
                    aria-current={l === locale ? "true" : undefined}
                    className={
                      l === locale
                        ? "inline-block rounded-full bg-primary px-3 py-1.5 text-sm text-on-primary"
                        : "inline-block rounded-full bg-white/5 px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white/10 hover:text-fg"
                    }
                  >
                    {LOCALE_INFO[l].label}
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </Container>
      </section>

      {/* How it works: a short guide for players and for leaders, every step linked */}
      <section className="border-t border-border bg-bg-elevated/40 py-24 sm:py-28" aria-labelledby="guide-title">
        <Container>
          <Eyebrow>{t.home.guide.eyebrow}</Eyebrow>
          <h2 id="guide-title" className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {t.home.guide.title}
          </h2>
          <div className="mt-12 grid gap-6 lg:grid-cols-2">
            <GuideColumn
              icon={Users}
              title={t.home.guide.players}
              steps={t.home.guide.playerSteps.map((step, i) => ({ ...step, href: href(PLAYER_STEP_LINKS[i]) }))}
            />
            <GuideColumn
              icon={ShieldCheck}
              title={t.home.guide.leaders}
              note={t.home.guide.leadersNote}
              steps={t.home.guide.leaderSteps.map((step, i) => ({ ...step, href: href(LEADER_STEP_LINKS[i]) }))}
            />
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
            <p className="mt-5 max-w-xl leading-relaxed text-muted">{t.home.positionsBody}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <ButtonLink href={href("/account/appointments")}>{t.home.applyCta}</ButtonLink>
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

      {/* FAQ */}
      <section className="border-t border-border py-24" aria-labelledby="faq-title">
        <Container className="grid gap-10 lg:grid-cols-[1fr_1.6fr]">
          <div>
            <Eyebrow>{t.home.faq.eyebrow}</Eyebrow>
            <h2 id="faq-title" className="mt-3 font-display text-3xl font-bold tracking-tight">
              {t.home.faq.title}
            </h2>
          </div>
          <div className="space-y-3">
            {t.home.faq.items.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl bg-card shadow-[inset_0_0_0_1px_var(--border)] open:bg-card-hover"
              >
                <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-4 font-medium [&::-webkit-details-marker]:hidden">
                  <span className="flex-1">{item.q}</span>
                  <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
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

      {/* Closing call to action, different for signed-in players */}
      <section className="py-24" aria-labelledby="cta-title">
        <Container>
          <Card className="relative overflow-hidden px-6 py-14 text-center sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 max-w-xl rounded-full bg-primary/25 blur-3xl"
            />
            <h2 id="cta-title" className="relative font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {t.home.cta.title}
            </h2>
            <Suspense fallback={<StartActions signedIn={false} t={t} locale={locale} />}>
              <PersonalStart t={t} locale={locale} />
            </Suspense>
          </Card>
        </Container>
      </section>
    </>
  );
}

/** A numbered, linked list of steps for one kind of user. */
function GuideColumn({
  icon: Icon,
  title,
  note,
  steps,
}: {
  icon: typeof Users;
  title: string;
  note?: string;
  steps: { title: string; body: string; cta: string; href: string }[];
}) {
  return (
    <Card className="p-6 sm:p-8">
      <h3 className="flex items-center gap-3 font-display text-xl font-semibold">
        <span className="inline-flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <Icon className="size-4" aria-hidden />
        </span>
        {title}
      </h3>
      <ol className="mt-6 space-y-6">
        {steps.map((step, i) => (
          <li key={step.title} className="relative flex gap-4">
            {i < steps.length - 1 && (
              <span aria-hidden className="absolute top-11 bottom-[-1.25rem] left-5 w-px bg-border-strong" />
            )}
            <span className="relative flex size-10 shrink-0 items-center justify-center rounded-full bg-bg-elevated font-mono text-sm text-gold shadow-[inset_0_0_0_1px_var(--border-strong)]">
              {i + 1}
            </span>
            <div className="min-w-0 pt-1.5">
              <p className="font-medium">{step.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted">{step.body}</p>
              <Link href={step.href} className="mt-2 inline-flex items-center gap-1 text-sm text-gold-soft hover:underline">
                {step.cta} <ArrowRight className="size-3.5" aria-hidden />
              </Link>
            </div>
          </li>
        ))}
      </ol>
      {note && <p className="mt-6 border-t border-border pt-4 text-xs text-muted">{note}</p>}
    </Card>
  );
}

/** Buttons under the closing heading: sign up / sign in, or straight into the account. */
function StartActions({ signedIn, t, locale }: { signedIn: boolean; t: Messages; locale: Locale }) {
  const href = (path: string) => localePath(locale, path);
  return (
    <>
      <p className="relative mx-auto mt-3 max-w-lg text-muted">{signedIn ? t.home.cta.bodyIn : t.home.cta.bodyOut}</p>
      <div className="relative mt-8 flex flex-wrap justify-center gap-3">
        {signedIn ? (
          <>
            <ButtonLink href={href("/account")} size="lg">
              {t.home.cta.openAccount} <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href={href("/account/messages")} variant="secondary" size="lg">
              {t.account.nav.messages}
            </ButtonLink>
          </>
        ) : (
          <>
            <ButtonLink href={href("/signup")} size="lg">
              {t.home.createAccount} <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href={href("/login")} variant="secondary" size="lg">
              {t.nav.signIn}
            </ButtonLink>
          </>
        )}
      </div>
    </>
  );
}

/** Reads only the session token (no database call), so it adds no wait. */
async function PersonalStart({ t, locale }: { t: Messages; locale: Locale }) {
  const me = await getUserId();
  return <StartActions signedIn={me !== null} t={t} locale={locale} />;
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
        { i: 0, name: "Caketie", tag: "KNG" },
        { i: 1, name: "Orange Cowboy", tag: "ERA" },
        { i: 2, name: null, tag: null },
        { i: 3, name: "BabyToes", tag: "GGG" },
        { i: 4, name: "SugaMami", tag: "ALT" },
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
