import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, CalendarClock, Crown, Flame, Scale, ShieldCheck, Users } from "lucide-react";
import { Hero } from "@/components/hero";
import { Countdown } from "@/components/countdown";
import { Badge, ButtonLink, Card, Container, Eyebrow, LiveDot, WindowFrame } from "@/components/ui";
import { getLatestPublishedSchedule, getUpcomingEvent } from "@/lib/data";
import { formatDay, isSlotLive, slotLabel } from "@/lib/kvk";
import { site } from "@/lib/site";

const pillarIcons = [Flame, Scale, Users];

export default function HomePage() {
  return (
    <>
      <Hero
        actions={
          <>
            <ButtonLink href="/apply" size="lg">
              Apply for a position
              <ArrowRight className="size-4" aria-hidden />
            </ButtonLink>
            <ButtonLink href="/positions" variant="secondary" size="lg">
              View schedule
            </ButtonLink>
          </>
        }
        countdown={
          <Suspense fallback={null}>
            <NextKvkCountdown />
          </Suspense>
        }
      />

      {/* Stats strip */}
      <section aria-label="Kingdom at a glance" className="border-y border-border bg-bg-elevated/60">
        <Container className="grid grid-cols-2 divide-border sm:grid-cols-4 sm:divide-x">
          {site.stats.map((s) => (
            <div key={s.label} className="px-4 py-8 text-center">
              <p className="font-display text-3xl font-bold text-fg">{s.value}</p>
              <p className="mt-1 font-mono text-xs uppercase tracking-[0.2em] text-muted">{s.label}</p>
            </div>
          ))}
        </Container>
      </section>

      {/* About */}
      <section className="py-24 sm:py-32" aria-labelledby="about-title">
        <Container>
          <Eyebrow>The kingdom</Eyebrow>
          <h2 id="about-title" className="mt-3 max-w-2xl font-display text-3xl font-bold tracking-tight sm:text-5xl">
            One banner. <span className="text-primary">Every</span> time zone.
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {site.pillars.map((p, i) => {
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
            <Eyebrow>KvK castle positions</Eyebrow>
            <h2 id="positions-title" className="mt-3 font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Apply for your window. Leaders assign the slots.
            </h2>
            <ol className="mt-8 space-y-5">
              {[
                { icon: ShieldCheck, t: "Create an account", d: "Sign up with your game ID. A leader verifies you in-game." },
                { icon: CalendarClock, t: "Pick your times", d: "Choose the position and the UTC windows you can be online." },
                { icon: Crown, t: "Get assigned", d: "Leaders review applications and publish the final schedule here." },
              ].map(({ icon: Icon, t, d }, i) => (
                <li key={t} className="flex gap-4">
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-card font-mono text-sm text-gold shadow-[inset_0_0_0_1px_var(--border-strong)]">
                    {i + 1}
                  </span>
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      <Icon className="size-4 text-primary" aria-hidden />
                      {t}
                    </p>
                    <p className="mt-1 text-sm text-muted">{d}</p>
                  </div>
                </li>
              ))}
            </ol>
            <div className="mt-10 flex flex-wrap gap-3">
              <ButtonLink href="/signup">Create account</ButtonLink>
              <ButtonLink href="/positions" variant="ghost">
                Full schedule <ArrowRight className="size-4" aria-hidden />
              </ButtonLink>
            </div>
          </div>
          <Suspense fallback={<SchedulePreviewFrame rows={null} />}>
            <SchedulePreview />
          </Suspense>
        </Container>
      </section>

      {/* Council */}
      <section className="border-t border-border bg-bg-elevated/40 py-24" aria-labelledby="council-title">
        <Container>
          <Eyebrow>Council</Eyebrow>
          <h2 id="council-title" className="mt-3 font-display text-3xl font-bold tracking-tight">
            Questions, migration or transfers?
          </h2>
          <p className="mt-2 text-muted">Message any of the council in-game.</p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {site.council.map((c) => (
              <Card key={c.name} className="flex items-center gap-4 p-5">
                <div className="flex size-12 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#5a0d13] font-display text-lg font-bold text-gold-soft shadow-[inset_0_0_0_1px_rgba(241,208,138,0.3)]">
                  {c.name.slice(0, 1)}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium">{c.name}</p>
                  <p className="text-sm text-muted">
                    {c.role} · <span className="font-mono">ID {c.gameId}</span>
                  </p>
                </div>
              </Card>
            ))}
          </div>
          {site.discordUrl && (
            <div className="mt-10">
              <a href={site.discordUrl} target="_blank" rel="noreferrer" className="text-gold-soft underline-offset-4 hover:underline">
                Join the kingdom Discord →
              </a>
            </div>
          )}
        </Container>
      </section>
    </>
  );
}

async function NextKvkCountdown() {
  const event = await getUpcomingEvent();
  if (!event) return null;
  return <Countdown target={`${event.starts_on}T00:00:00Z`} label={`${event.title} begins in`} />;
}

async function SchedulePreview() {
  const rows = await getLatestPublishedSchedule();
  return <SchedulePreviewFrame rows={rows} />;
}

function SchedulePreviewFrame({ rows }: { rows: Awaited<ReturnType<typeof getLatestPublishedSchedule>> | null }) {
  // Show the first assigned slots of the first day, or a sample when nothing is published yet.
  const first = rows?.[0];
  const sample = !first;
  const preview = sample
    ? [
        { i: 0, name: "Warrior One", tag: "ABC" },
        { i: 1, name: "Iron Duchess", tag: "ABC" },
        { i: 2, name: null, tag: null },
        { i: 3, name: "Northwind", tag: "XYZ" },
        { i: 4, name: "Ember Knight", tag: "ABC" },
      ].map((r) => ({ ...r, minutes: 30 }))
    : rows!
        .filter((r) => r.day_id === first.day_id)
        .slice(0, 5)
        .map((r) => ({ i: r.slot_index, name: r.ingame_name, tag: r.alliance_tag, minutes: r.slot_minutes }));

  return (
    <WindowFrame title={sample ? "positions — sample" : `${first.event_title} · Day ${first.day_number} · ${first.position}`}>
      <div className="flex items-center justify-between px-5 pt-4 pb-2">
        <p className="text-sm font-medium">{sample ? "Day 1 · Construction" : `${formatDay(first.date)} · ${first.position}`}</p>
        {sample ? <Badge>Sample</Badge> : <Badge tone="green"><LiveDot /> Live</Badge>}
      </div>
      <ul className="divide-y divide-border px-2 pb-3">
        {preview.map((r) => {
          const live = !sample && first && isSlotLive(first.date, r.i, r.minutes);
          return (
            <li key={r.i} className="flex items-center gap-4 rounded-xl px-3 py-3">
              <span className="w-28 shrink-0 font-mono text-xs text-muted tabular-nums">{slotLabel(r.i, r.minutes)}</span>
              {r.name ? (
                <span className="min-w-0 truncate text-sm">
                  {r.tag && <span className="mr-1.5 font-mono text-xs text-gold">[{r.tag}]</span>}
                  {r.name}
                </span>
              ) : (
                <span className="text-sm italic text-muted/70">Open</span>
              )}
              {live && <Badge tone="red" className="ml-auto">Now</Badge>}
            </li>
          );
        })}
      </ul>
      <div className="border-t border-border px-5 py-3">
        <Link href="/positions" className="text-sm text-gold-soft hover:underline">
          Open full schedule →
        </Link>
      </div>
    </WindowFrame>
  );
}
