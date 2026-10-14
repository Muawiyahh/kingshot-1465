import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeleton";
import { Card, Notice, PageHeader } from "@/components/ui";
import { requireLeader } from "@/lib/auth-guards";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { KingdomSettings } from "@/lib/types";
import { TransfersForm, type LeaderOption } from "./transfers-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.adminTransfers };
}

export default async function TransfersPage() {
  const { t } = await getI18n();
  const s = t.admin.home.transfers;
  return (
    <>
      <PageHeader eyebrow={t.admin.nav.groups.homepage} title={s.title}>
        {s.intro}
      </PageHeader>
      <Suspense
        fallback={
          <Card className="max-w-3xl p-6 sm:p-8">
            <FormSkeleton fields={3} />
          </Card>
        }
      >
        <Editor />
      </Suspense>
    </>
  );
}

function Missing({ file, text }: { file: string; text: string }) {
  return (
    <Notice tone="warning">
      {rich(text, { file: <span className="font-mono [overflow-wrap:anywhere]">supabase/migrations/{file}</span> })}
    </Notice>
  );
}

async function Editor() {
  const [{ t }, supabase] = await Promise.all([getI18n(), createClient()]);
  // The leader check and every lookup run together; only leaders can save anyway (RLS).
  const [, settings, leaders, managers] = await Promise.all([
    requireLeader(),
    supabase.from("kingdom_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("profiles")
      .select("id, ingame_name, alliance_tag, role")
      .in("role", ["leader", "admin"])
      .eq("status", "approved")
      .order("ingame_name"),
    supabase.from("transfer_managers").select("profile_id, note").order("sort"),
  ]);

  if (settings.error || !settings.data) return <Missing file="0002_kingdom_settings.sql" text={t.admin.settings.missing} />;
  if (managers.error) return <Missing file="0007_homepage_content.sql" text={t.admin.settings.missing} />;

  return (
    <Card className="max-w-3xl p-6 sm:p-8">
      <TransfersForm
        settings={settings.data as KingdomSettings}
        leaders={(leaders.data ?? []) as LeaderOption[]}
        managers={(managers.data ?? []).map((m) => ({ id: m.profile_id as string, note: (m.note as string | null) ?? "" }))}
      />
    </Card>
  );
}
