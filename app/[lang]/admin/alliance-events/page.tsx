import type { Metadata } from "next";
import { Suspense } from "react";
import { AllianceDot } from "@/components/alliance-banner";
import { QueryTabs, TabList } from "@/components/query-tabs";
import { FormSkeleton } from "@/components/skeleton";
import { Card, Notice, PageHeader } from "@/components/ui";
import { requireLeader } from "@/lib/auth-guards";
import { weekdayNames } from "@/lib/alliance-events";
import { ALLIANCE_TAGS } from "@/lib/alliances";
import { localePath } from "@/lib/i18n/config";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { AllianceEventRow } from "@/lib/types";
import { AllianceEventsForm } from "./events-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.adminAllianceEvents };
}

const tabs = ALLIANCE_TAGS.map((tag) => ({
  value: tag,
  label: (
    <span className="inline-flex items-center gap-2">
      <AllianceDot tag={tag} />
      {tag}
    </span>
  ),
}));

const skeleton = (
  <Card className="p-5 sm:p-7">
    <FormSkeleton fields={6} />
  </Card>
);

export default async function AllianceEventsPage({ searchParams }: PageProps<"/[lang]/admin/alliance-events">) {
  const { locale, t } = await getI18n();
  const s = t.admin.home.events;
  const href = localePath(locale, "/admin/alliance-events");
  return (
    <>
      <PageHeader eyebrow={t.admin.nav.groups.homepage} title={s.title}>
        {s.intro}
      </PageHeader>
      <Suspense
        fallback={
          <>
            <TabList tabs={tabs} active={null} href={href} param="alliance" label={s.alliancesLabel} />
            {skeleton}
          </>
        }
      >
        <Editor searchParams={searchParams} href={href} />
      </Suspense>
    </>
  );
}

async function Editor({
  searchParams,
  href,
}: {
  searchParams: PageProps<"/[lang]/admin/alliance-events">["searchParams"];
  href: string;
}) {
  const [params, { t, tag }, supabase] = await Promise.all([searchParams, getI18n(), createClient()]);
  const alliance = ALLIANCE_TAGS.find((a) => a === params.alliance) ?? ALLIANCE_TAGS[0];
  // The leader check and the lookup run together; only leaders can save anyway (RLS).
  const [, { data, error }] = await Promise.all([
    requireLeader(),
    supabase.from("alliance_events").select("alliance, event, time_utc, weekdays, note").eq("alliance", alliance),
  ]);

  return (
    <QueryTabs
      param="alliance"
      tabs={tabs}
      current={alliance}
      href={href}
      label={t.admin.home.events.alliancesLabel}
      loading={skeleton}
    >
      {error ? (
        <Notice tone="warning">
          {rich(t.admin.settings.missing, {
            file: <span className="font-mono [overflow-wrap:anywhere]">supabase/migrations/0007_homepage_content.sql</span>,
          })}
        </Notice>
      ) : (
        <Card className="p-5 sm:p-7">
          {/* Keyed so switching alliance starts from that alliance's saved times. */}
          <AllianceEventsForm
            key={alliance}
            alliance={alliance}
            rows={(data ?? []) as AllianceEventRow[]}
            dayNames={{ short: weekdayNames(tag), long: weekdayNames(tag, "long") }}
          />
        </Card>
      )}
    </QueryTabs>
  );
}
