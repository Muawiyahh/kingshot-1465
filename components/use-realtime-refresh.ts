"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

export type RealtimeTable = { table: string; event?: "INSERT" | "UPDATE" | "DELETE" | "*" };

/**
 * Re-renders the current route whenever rows change in the given tables.
 * RLS decides which changes this visitor receives, except for DELETE events, which Supabase
 * sends to every subscriber; listen only to INSERT/UPDATE where that matters.
 */
export function useRealtimeRefresh(tables: RealtimeTable[], channelName: string) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = tables.map((t) => `${t.table}:${t.event ?? "*"}`).join(",");

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = getBrowserClient();
    let channel = supabase.channel(channelName);
    for (const entry of key.split(",")) {
      const [table, event] = entry.split(":");
      channel = channel.on("postgres_changes", { event: event as "*", schema: "public", table }, () => {
        // Batch bursts (e.g. auto-fill touching 40 slots) into one refresh.
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => router.refresh(), 400);
      });
    }
    channel.subscribe((status: string) => setConnected(status === "SUBSCRIBED"));

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
  }, [key, channelName, router]);

  return connected;
}
