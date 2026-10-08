import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeleton";
import { Card, PageHeader } from "@/components/ui";
import { getI18n } from "@/lib/i18n/server";
import { SettingsGate } from "../settings-gate";
import { KingForm } from "./king-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.adminKing };
}

export default async function KingPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader eyebrow={t.admin.nav.groups.kingdom} title={t.admin.settings.king.title}>
        {t.admin.settings.king.intro}
      </PageHeader>
      <Suspense fallback={<FormSkeleton fields={2} />}>
        <SettingsGate>
          {(settings) => (
            <Card className="max-w-2xl p-6 sm:p-8">
              <KingForm settings={settings} />
            </Card>
          )}
        </SettingsGate>
      </Suspense>
    </>
  );
}
