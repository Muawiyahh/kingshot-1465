import type { Metadata } from "next";
import { Suspense } from "react";
import { Card, Notice, PageHeader } from "@/components/ui";
import { requireLeader } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { KingdomSettings } from "@/lib/types";
import { SettingsForm } from "./settings-form";

export const metadata: Metadata = { title: "Kingdom settings · Admin" };

export default function SettingsPage() {
  return (
    <>
      <PageHeader title="Kingdom settings">These show on the homepage cards as soon as you save.</PageHeader>
      <Suspense fallback={<div className="h-72 animate-pulse rounded-3xl bg-card" />}>
        <SettingsContent />
      </Suspense>
    </>
  );
}

async function SettingsContent() {
  await requireLeader();
  const supabase = await createClient();
  const { data, error } = await supabase.from("kingdom_settings").select("*").eq("id", 1).maybeSingle();

  if (error || !data) {
    return (
      <Notice tone="warning">
        The settings table doesn&apos;t exist yet. Run <span className="font-mono">supabase/migrations/0002_kingdom_settings.sql</span> in
        the Supabase SQL Editor, then reload this page.
      </Notice>
    );
  }

  return (
    <Card className="max-w-2xl p-6 sm:p-8">
      <SettingsForm settings={data as KingdomSettings} />
    </Card>
  );
}
