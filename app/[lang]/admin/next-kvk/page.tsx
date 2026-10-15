import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeleton";
import { Card, Notice, PageHeader } from "@/components/ui";
import { fmt } from "@/lib/i18n/format";
import type { Messages } from "@/lib/i18n/messages";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import { SettingsGate } from "../settings-gate";
import { NextKvkForm } from "./next-kvk-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.adminNextKvk };
}

/** "The homepage counts down to Tue, 20 October 2026 at 00:00 UTC." or "No date set." */
function summary(at: string | null, t: Messages, tag: string) {
  if (!at) return t.admin.nextKvk.none;
  const d = new Date(at);
  return fmt(t.admin.nextKvk.current, {
    date: d.toLocaleDateString(tag, { weekday: "short", day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }),
    time: d.toISOString().slice(11, 16),
  });
}

export default async function NextKvkPage() {
  const { t, tag } = await getI18n();
  return (
    <>
      <PageHeader eyebrow={t.admin.nav.groups.kvk} title={t.admin.nextKvk.title}>
        {t.admin.nextKvk.intro}
      </PageHeader>
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <SettingsGate>
          {(settings) =>
            // The column arrives with 0009; until then explain how to switch it on.
            "next_kvk_at" in settings ? (
              <Card className="max-w-2xl p-6 sm:p-8">
                {/* Remount after a save or clear, so the fields show what's stored */}
                <NextKvkForm
                  key={settings.next_kvk_at ?? "none"}
                  at={settings.next_kvk_at ?? null}
                  summary={summary(settings.next_kvk_at ?? null, t, tag)}
                />
              </Card>
            ) : (
              <Notice tone="warning">
                {rich(t.admin.settings.needsUpdate, {
                  file: <span className="font-mono [overflow-wrap:anywhere]">supabase/migrations/0009_next_kvk.sql</span>,
                })}
              </Notice>
            )
          }
        </SettingsGate>
      </Suspense>
    </>
  );
}
