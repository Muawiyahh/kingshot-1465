import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, PageHeader } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { SettingsGate } from "../settings-gate";
import { ServerForm } from "./server-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.adminServer };
}

export default async function ServerPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader eyebrow={t.admin.nav.groups.kingdom} title={t.admin.settings.server.title}>
        {t.admin.settings.server.intro}
      </PageHeader>
      <Suspense fallback={<div className="h-40 animate-pulse rounded-3xl bg-card" />}>
        <SettingsGate>
          {(settings) => (
            <Card className="max-w-2xl p-6 sm:p-8">
              <ServerForm settings={settings} />
            </Card>
          )}
        </SettingsGate>
      </Suspense>
    </>
  );
}
