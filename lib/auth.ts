import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigured } from "@/lib/supabase/config";
import type { Profile } from "@/lib/types";

/** Synthetic login email so players only ever deal with their game ID. */
export function gameIdToEmail(gameId: string) {
  return `${gameId}@players.kingdom1465.app`;
}

/** The signed-in player's profile, or null. Deduped per request. Call behind Suspense. */
export const getProfile = cache(async (): Promise<Profile | null> => {
  // Always request-time, even before Supabase is configured, so builds behave the same either way.
  await connection();
  if (!supabaseConfigured) return null;
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub;
  if (!userId) return null;

  const { data } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  return (data as Profile | null) ?? null;
});

export function isLeader(profile: Profile | null) {
  return Boolean(
    profile && profile.status === "approved" && (profile.role === "leader" || profile.role === "admin"),
  );
}
