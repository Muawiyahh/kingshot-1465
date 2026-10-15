"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";

/**
 * Keeps the messages screens current: re-renders when a message arrives for this user or one of
 * theirs is read. RLS decides which rows reach the browser. Polls instead if Realtime can't connect.
 */
export function MessagesLive({ me }: { me: string }) {
  const router = useRouter();
  const [connected, setConnected] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!supabaseConfigured) return;
    const supabase = getBrowserClient();
    const refresh = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => router.refresh(), 250);
    };
    let cancelled = false;
    const channel = supabase
      .channel(`messages-${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "messages", filter: `recipient_id=eq.${me}` }, refresh)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "messages", filter: `sender_id=eq.${me}` }, refresh);

    // Realtime needs the user's token for RLS to let their rows through.
    void supabase.auth.getSession().then(async ({ data }: { data: { session: { access_token: string } | null } }) => {
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      channel.subscribe((status: string) => setConnected(status === "SUBSCRIBED"));
    });

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
      void supabase.removeChannel(channel);
    };
  }, [me, router]);

  // Fallback: check every 15 seconds while the tab is visible.
  useEffect(() => {
    if (connected || !supabaseConfigured) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, 15_000);
    return () => clearInterval(id);
  }, [connected, router]);

  return null;
}
