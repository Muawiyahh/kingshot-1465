import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeleton";
import { Card, Notice, PageHeader } from "@/components/ui";
import { requireLeader } from "@/lib/auth-guards";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { KingdomSettings, ManagerOption } from "@/lib/types";
import { TransfersForm } from "./transfers-form";

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
  const [me, settings, leaders, managers, anyAccount] = await Promise.all([
    requireLeader(),
    supabase.from("kingdom_settings").select("*").eq("id", 1).maybeSingle(),
    supabase
      .from("profiles")
      .select("id, ingame_name, alliance_tag, role")
      .in("role", ["leader", "admin"])
      .eq("status", "approved")
      .order("ingame_name"),
    supabase
      .from("transfer_managers")
      .select("profile_id, note, profile:profiles!profile_id(id, ingame_name, alliance_tag, role, status, transfer)")
      .order("sort"),
    // Present once 0012_any_transfer_manager.sql has been run, which lets members who aren't leaders be managers.
    supabase.rpc("is_transfer_manager", { p: "00000000-0000-0000-0000-000000000000" }),
  ]);

  if (settings.error || !settings.data) return <Missing file="0002_kingdom_settings.sql" text={t.admin.settings.missing} />;
  if (managers.error) return <Missing file="0007_homepage_content.sql" text={t.admin.settings.missing} />;

  // Everyone who can be ticked: leaders and admins, plus members already on the list.
  type Listed = { profile_id: string; note: string | null; profile: (ManagerOption & { status: string; transfer: boolean }) | null };
  const listed = (managers.data ?? []) as unknown as Listed[];
  const options = [...((leaders.data ?? []) as ManagerOption[])];
  for (const { profile: p } of listed) {
    if (p && p.status === "approved" && !p.transfer && !options.some((o) => o.id === p.id)) {
      options.push({ id: p.id, ingame_name: p.ingame_name, alliance_tag: p.alliance_tag, role: p.role });
    }
  }

  return (
    <Card className="max-w-3xl p-6 sm:p-8">
      <TransfersForm
        settings={settings.data as KingdomSettings}
        options={options}
        managers={listed.map((m) => ({ id: m.profile_id, note: m.note ?? "" }))}
        canAddAny={me.role === "admin"}
        anyAccountReady={!anyAccount.error}
      />
    </Card>
  );
}
