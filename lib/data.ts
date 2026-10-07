import "server-only";
import { connection } from "next/server";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";
import type { KvkEvent, PublicScheduleRow } from "@/lib/types";

/** Cookie-less anonymous client for public data. */
function publicClient() {
  return createSupabase(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** The next KvK that hasn't started yet (or the most recent one), for the homepage countdown. */
export async function getUpcomingEvent(): Promise<KvkEvent | null> {
  await connection();
  if (!supabaseConfigured) return null;
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await publicClient()
    .from("kvk_events")
    .select("*")
    .gte("starts_on", today)
    .order("starts_on", { ascending: true })
    .limit(1)
    .maybeSingle();
  return (data as KvkEvent | null) ?? null;
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

  const { data } = await supabase
    .from("public_schedule")
    .select("*")
    .eq("event_id", latest.id)
    .order("day_number")
    .order("position")
    .order("slot_index");
  return (data as PublicScheduleRow[] | null) ?? [];
}
