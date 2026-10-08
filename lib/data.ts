import "server-only";
import { connection } from "next/server";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { addDays } from "@/lib/kvk";
import type { KingdomSettings, PublicScheduleRow } from "@/lib/types";

/** Cookie-less anonymous client for public data. */
function publicClient() {
  return createSupabase(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** All slots of the latest published event, with assigned players' public names. */
export async function getLatestPublishedSchedule(): Promise<PublicScheduleRow[]> {
  await connection();
  if (!supabaseConfigured) return [];
  const supabase = publicClient();
  const { data: latest } = await supabase
    .from("kvk_events")
    .select("id")
    .eq("status", "published")
    .order("starts_on", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (!latest) return [];

  // Supabase returns at most 1000 rows per request; a big event (7 days × 2 positions × 96 slots)
  // has more, so read it in pages.
  const PAGE = 1000;
  const rows: PublicScheduleRow[] = [];
  for (let from = 0; ; from += PAGE) {
    const { data } = await supabase
      .from("public_schedule")
      .select("*")
      .eq("event_id", latest.id)
      .order("day_number")
      .order("position")
      .order("slot_index")
      .range(from, from + PAGE - 1);
    const page = (data as PublicScheduleRow[] | null) ?? [];
    rows.push(...page);
    if (page.length < PAGE) break;
  }
  return rows;
}

/** Public kingdom settings (King, server open date). Null until 0002_kingdom_settings.sql has been run. */
export async function getKingdomSettings(): Promise<KingdomSettings | null> {
  await connection();
  if (!supabaseConfigured) return null;
  const { data, error } = await publicClient().from("kingdom_settings").select("*").eq("id", 1).maybeSingle();
  if (error) return null;
  return (data as KingdomSettings | null) ?? null;
}

export type HomeStats = {
  players: number | null;
  king: { name: string; alliance: string | null } | null;
  serverOpenedOn: string | null;
  /** The KvK that is running now, or the next one. */
  kvk: { title: string; startsOn: string; days: number } | null;
};

/**
 * Headline numbers for the homepage cards. Profiles aren't publicly readable,
 * so the player count uses the service role on the server and returns only the number.
 */
export async function getHomeStats(): Promise<HomeStats> {
  await connection();
  const empty: HomeStats = { players: null, king: null, serverOpenedOn: null, kvk: null };
  if (!supabaseConfigured) return empty;

  const today = new Date().toISOString().slice(0, 10);
  const [players, settings, events] = await Promise.all([
    process.env.SUPABASE_SERVICE_ROLE_KEY
      ? createAdminClient().from("profiles").select("id", { count: "exact", head: true }).eq("status", "approved")
      : Promise.resolve({ count: null, error: null }),
    getKingdomSettings(),
    // Anything that started in the last week may still be running.
    publicClient()
      .from("kvk_events")
      .select("title, starts_on, event_days(day_number)")
      .gte("starts_on", addDays(today, -7))
      .order("starts_on", { ascending: true }),
  ]);

  let kvk: HomeStats["kvk"] = null;
  for (const e of (events.data ?? []) as { title: string; starts_on: string; event_days: { day_number: number }[] }[]) {
    const days = Math.max(1, ...e.event_days.map((d) => d.day_number));
    if (addDays(e.starts_on, days) > today) {
      kvk = { title: e.title, startsOn: e.starts_on, days };
      break;
    }
  }

  return {
    players: players.error ? null : (players.count ?? 0),
    king: settings?.king_name ? { name: settings.king_name, alliance: settings.king_alliance } : null,
    serverOpenedOn: settings?.server_opened_on ?? null,
    kvk,
  };
}
