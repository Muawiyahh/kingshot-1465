import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, Notice, PageHeader } from "@/components/ui";
import { requireLeader } from "@/lib/auth-guards";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { KingdomSettings } from "@/lib/types";
import { SettingsForm } from "./settings-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.adminSettings };
}

export default async function SettingsPage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader title={t.admin.settings.title}>{t.admin.settings.intro}</PageHeader>
      <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-card" />}>
        <SettingsContent />
      </Suspense>
    </>
  );
}

async function SettingsContent() {
  const [, { t }] = await Promise.all([requireLeader(), getI18n()]);
  const supabase = await createClient();
  const { data, error } = await supabase.from("kingdom_settings").select("*").eq("id", 1).maybeSingle();

  if (error || !data) {
    return (
      <Notice tone="warning">
        {rich(t.admin.settings.missing, {
          file: <span className="font-mono">supabase/migrations/0002_kingdom_settings.sql</span>,
        })}
      </Notice>
    );
  }

  return (
    <Card className="max-w-2xl p-6 sm:p-8">
      <SettingsForm settings={data as KingdomSettings} />
    </Card>
  );
}
