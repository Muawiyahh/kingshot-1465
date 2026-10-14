import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import clsx from "clsx";
import { ArrowRight, ChevronDown, Globe } from "lucide-react";
import { Hero } from "@/components/hero";
import { AllianceEvents } from "@/components/home/alliance-events";
import { HallOfFame, HallOfFameSkeleton } from "@/components/home/hall-of-fame";
import { TransferSection } from "@/components/home/transfer-section";
import { KingdomCards } from "@/components/kingdom-cards";
import { Bone } from "@/components/skeleton";
import { ButtonLink, Card, Container, Eyebrow } from "@/components/ui";
import { weekdayNames } from "@/lib/alliance-events";
import { ALLIANCES } from "@/lib/alliances";
import { getUserId } from "@/lib/auth";
import { getHomeContent, getHomeStats } from "@/lib/data";
import { LOCALES, LOCALE_INFO, localePath, type Locale } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { getI18n } from "@/lib/i18n/server";

/**
 * Every section shares one rhythm: the same padding, a hairline above, and a heading block on the
 * same left edge. Anchored sections stop below the sticky header.
 */
const section = "scroll-mt-[var(--site-header-h)] border-t border-border py-20 sm:py-24";

function SectionHeading({ id, eyebrow, title, intro }: { id: string; eyebrow: string; title: string; intro?: ReactNode }) {
  return (
    <div className="mb-10">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 id={id} className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-4xl">
        {title}
      </h2>
      {intro && <p className="mt-3 max-w-2xl text-muted">{intro}</p>}
    </div>
  );
}

export default async function HomePage() {
  const { locale, t, tag } = await getI18n();
  const h = t.home;

  return (
    <>
      <Hero
        actions={
          <>
            <ButtonLink href="#transfer" size="lg">
              {h.heroTransfer}
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="#events" variant="secondary" size="lg">
              {h.heroEvents}
            </ButtonLink>
          </>
        }
        visual={
          <Suspense fallback={<KingdomCards stats={null} />}>
            <HomeCards />
          </Suspense>
        }
      />

      {/* Languages: one quiet row; each link opens this page in that language */}
      <nav aria-label={t.welcome.label} className="border-t border-border bg-bg-elevated/40">
        <Container>
          <ul className="flex flex-wrap items-center justify-center gap-x-1 gap-y-1.5 py-3.5">
            <li aria-hidden className="mr-1.5 flex text-gold-soft">
              <Globe className="size-4" />
            </li>
            {LOCALES.map((l) => (
              <li key={l}>
                <Link
                  href={localePath(l, "/")}
                  lang={LOCALE_INFO[l].tag}
                  aria-current={l === locale ? "true" : undefined}
                  className={clsx(
                    "inline-block rounded-full px-3 py-1.5 text-sm transition-colors",
                    l === locale ? "bg-white/[0.08] text-fg" : "text-muted hover:text-fg",
                  )}
                >
                  {LOCALE_INFO[l].label}
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </nav>

      {/* Alliance events: set by leaders in Admin → Homepage */}
      <section id="events" className={section} aria-labelledby="events-title">
        <Container>
          <SectionHeading id="events-title" eyebrow={h.events.eyebrow} title={h.events.title} intro={h.events.intro} />
          <Suspense fallback={<EventsSkeleton />}>
            <EventsData tag={tag} />
          </Suspense>
        </Container>
      </section>

      {/* Hall of Fame: one player per alliance each week */}
      <section id="hall-of-fame" className={clsx(section, "relative overflow-hidden bg-bg-elevated/40")} aria-labelledby="hof-title">
        <div aria-hidden className="pointer-events-none absolute -top-40 left-1/4 h-72 w-[36rem] rounded-full bg-gold/10 blur-3xl" />
        <Container className="relative">
          <SectionHeading id="hof-title" eyebrow={h.hof.eyebrow} title={h.hof.title} intro={h.hof.intro} />
          <Suspense fallback={<HallOfFameSkeleton />}>
            <HofData t={t} tag={tag} />
          </Suspense>
        </Container>
      </section>

      {/* Transfer to 1465 */}
      <section id="transfer" className={clsx(section, "relative overflow-hidden")} aria-labelledby="transfer-title">
        <div aria-hidden className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
        <Container className="relative">
          <Suspense fallback={<TransferSection content={null} t={t} locale={locale} />}>
            <TransferData t={t} locale={locale} />
          </Suspense>
        </Container>
      </section>

      {/* FAQ: two compact columns */}
      <section className={clsx(section, "bg-bg-elevated/40")} aria-labelledby="faq-title">
        <Container>
          <SectionHeading id="faq-title" eyebrow={h.faq.eyebrow} title={h.faq.title} />
          <div className="grid items-start gap-3 lg:grid-cols-2">
            {h.faq.items.map((item) => (
              <details
                key={item.q}
                className="group rounded-2xl bg-card shadow-[inset_0_0_0_1px_var(--border)] open:bg-card-hover"
              >
                <summary className="flex cursor-pointer list-none items-center gap-4 px-5 py-3.5 font-medium [&::-webkit-details-marker]:hidden">
                  <span className="flex-1">{item.q}</span>
                  <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
                </summary>
                <p className="px-5 pb-4 text-sm leading-relaxed text-muted">{item.a}</p>
              </details>
            ))}
          </div>
        </Container>
      </section>

      {/* Closing call to action, different for signed-in players */}
      <section className={section} aria-labelledby="cta-title">
        <Container>
          <Card className="relative overflow-hidden px-6 py-14 text-center sm:px-12">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 -top-24 mx-auto h-64 max-w-xl rounded-full bg-primary/25 blur-3xl"
            />
            <h2 id="cta-title" className="relative font-display text-3xl font-bold tracking-tight sm:text-4xl">
              {h.cta.title}
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

async function HomeCards() {
  const stats = await getHomeStats();
  return <KingdomCards stats={stats} />;
}

async function EventsData({ tag }: { tag: string }) {
  const { events } = await getHomeContent();
  return <AllianceEvents rows={events} dayNames={weekdayNames(tag)} />;
}

async function HofData({ t, tag }: { t: Messages; tag: string }) {
  const { hallOfFame } = await getHomeContent();
  return <HallOfFame hof={hallOfFame} t={t} tag={tag} />;
}

async function TransferData({ t, locale }: { t: Messages; locale: Locale }) {
  const { transfer } = await getHomeContent();
  return <TransferSection content={transfer} t={t} locale={locale} />;
}

/** The events table's shape: a header row and one row per alliance. */
function EventsSkeleton() {
  return (
    <div aria-hidden>
      <Bone className="mb-5 ml-auto h-11 w-56 rounded-full" />
      <Card className="divide-y divide-border">
        {Array.from({ length: ALLIANCES.length + 1 }, (_, i) => (
          <div key={i} className="flex items-center gap-4 px-5 py-4">
            <Bone className={i === 0 ? "h-3 w-20" : "size-9 shrink-0 rounded-full"} />
            {Array.from({ length: 3 }, (_, j) => (
              <Bone key={j} className="h-4 flex-1" />
            ))}
          </div>
        ))}
      </Card>
    </div>
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
