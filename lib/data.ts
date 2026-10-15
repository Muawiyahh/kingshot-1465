import "server-only";
import { connection } from "next/server";
import { cache } from "react";
import { createClient as createSupabase } from "@supabase/supabase-js";
import { SUPABASE_ANON_KEY, SUPABASE_URL, supabaseConfigured } from "@/lib/supabase/config";
import { createAdminClient } from "@/lib/supabase/admin";
import { currentWeek } from "@/lib/alliance-events";
import { addDays } from "@/lib/kvk";
import type {
  AllianceEventRow,
  HallOfFameRow,
  KingdomSettings,
  PublicScheduleRow,
  TransferFact,
  TransferManager,
} from "@/lib/types";

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

/**
 * Public kingdom settings (King, server open date, Transfer section). Null until
 * 0002_kingdom_settings.sql has been run. Read once per request however many sections ask.
 */
export const getKingdomSettings = cache(async (): Promise<KingdomSettings | null> => {
  await connection();
  if (!supabaseConfigured) return null;
  const { data, error } = await publicClient().from("kingdom_settings").select("*").eq("id", 1).maybeSingle();
  if (error) return null;
  return (data as KingdomSettings | null) ?? null;
});

export type HomeContent = {
  /** Every alliance's event times. */
  events: AllianceEventRow[];
  /** The latest Hall of Fame week up to this one, or null if there's none yet. */
  hallOfFame: { weekOf: string; picks: HallOfFameRow[] } | null;
  transfer: { pitch: string | null; facts: TransferFact[]; managers: TransferManager[] };
};

const isText = (v: unknown): v is string => typeof v === "string";

/**
 * The leader-edited homepage sections. Before 0007_homepage_content.sql has been run the tables and
 * columns are missing; every part then comes back empty instead of failing the page.
 */
export const getHomeContent = cache(async (): Promise<HomeContent> => {
  await connection();
  const empty: HomeContent = { events: [], hallOfFame: null, transfer: { pitch: null, facts: [], managers: [] } };
  if (!supabaseConfigured) return empty;

  const supabase = publicClient();
  const [settings, events, picks, managers] = await Promise.all([
    getKingdomSettings(),
    supabase.from("alliance_events").select("alliance, event, time_utc, weekdays, note"),
    // A week holds at most one pick per alliance, so this always covers the whole latest week.
    supabase
      .from("hall_of_fame")
      .select("week_of, alliance, player_name, quote")
      .lte("week_of", currentWeek())
      .order("week_of", { ascending: false })
      .limit(50),
    supabase
      .from("public_transfer_managers")
      .select("profile_id, ingame_name, alliance_tag, game_id, note")
      .order("sort")
      .order("ingame_name"),
  ]);

  const hof = (picks.data ?? []) as HallOfFameRow[];
  const weekOf = hof[0]?.week_of;
  const facts = Array.isArray(settings?.transfer_facts) ? settings.transfer_facts : [];
  type ManagerRow = { profile_id: string; ingame_name: string; alliance_tag: string | null; game_id: string; note: string | null };

  return {
    events: (events.data ?? []) as AllianceEventRow[],
    hallOfFame: weekOf ? { weekOf, picks: hof.filter((p) => p.week_of === weekOf) } : null,
    transfer: {
      pitch: settings?.transfer_pitch?.trim() || null,
      facts: facts.filter((f) => isText(f?.label) && isText(f?.value)),
      managers: ((managers.data ?? []) as ManagerRow[]).map((m) => ({
        profileId: m.profile_id,
        name: m.ingame_name,
        alliance: m.alliance_tag,
        gameId: m.game_id,
        note: m.note,
      })),
    },
  };
});

/**
 * Approved members (not transfer accounts). Profiles aren't publicly readable, so this uses the
 * service role on the server and returns only the number. Before 0007 there's no transfer column,
 * so every approved account counts.
 */
async function countMembers(): Promise<{ count: number | null; error: unknown }> {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) return { count: null, error: null };
  const approved = () => createAdminClient().from("profiles").select("id", { count: "exact", head: true }).eq("status", "approved");
  const members = await approved().eq("transfer", false);
  return members.error ? approved() : members;
}

export type HomeStats = {
  players: number | null;
  king: { name: string; alliance: string | null } | null;
  serverOpenedOn: string | null;
  /** The KvK that is running now, or the next one. */
  kvk: { title: string; startsOn: string; days: number } | null;
  /** The next KvK's start as leaders set it in Admin → Next KvK (ISO, UTC), if they have. */
  nextKvkAt: string | null;
};

/** Headline numbers for the homepage cards (and the Transfer section's facts). Once per request. */
export const getHomeStats = cache(async (): Promise<HomeStats> => {
  await connection();
  const empty: HomeStats = { players: null, king: null, serverOpenedOn: null, kvk: null, nextKvkAt: null };
  if (!supabaseConfigured) return empty;

  const today = new Date().toISOString().slice(0, 10);
  const [players, settings, events] = await Promise.all([
    countMembers(),
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
    nextKvkAt: settings?.next_kvk_at ?? null,
  };
});
