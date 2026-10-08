import type { ReactNode } from "react";
import { Notice } from "@/components/ui";
import { requireLeader } from "@/lib/auth-guards";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { KingdomSettings } from "@/lib/types";

/** Loads the kingdom settings row for the King and Server pages, or explains how to create it. */
export async function SettingsGate({ children }: { children: (settings: KingdomSettings) => ReactNode }) {
  const [{ t }, supabase] = await Promise.all([getI18n(), createClient()]);
  // The leader check and the lookup run together; only leaders can save anyway (RLS).
  const [, { data, error }] = await Promise.all([
    requireLeader(),
    supabase.from("kingdom_settings").select("*").eq("id", 1).maybeSingle(),
  ]);

  if (error || !data) {
    return (
      <Notice tone="warning">
        {rich(t.admin.settings.missing, {
          file: <span className="font-mono">supabase/migrations/0002_kingdom_settings.sql</span>,
        })}
      </Notice>
    );
  }
  return <>{children(data as KingdomSettings)}</>;
}
