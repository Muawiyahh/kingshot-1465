"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

/**
 * Re-renders the current route whenever rows change in the given tables.
 * RLS decides which changes this visitor receives.
 */
export function useRealtimeRefresh(tables: string[], channelName: string) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const key = tables.join(",");

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = getBrowserClient();
    let channel = supabase.channel(channelName);
    for (const table of key.split(",")) {
      channel = channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
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
