import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ChatMessage, Contact } from "@/lib/types";

/** Error codes meaning 0004_messages.sql hasn't been run yet (missing function or table). */
const NOT_SET_UP = new Set(["PGRST202", "PGRST205", "42883", "42P01"]);

/** Number of messages the user can show in one conversation. */
const THREAD_LIMIT = 200;

/**
 * Everyone the signed-in user can message, newest conversation first.
 * `ready` is false until the messages migration has been run. Call after getProfile().
 */
export async function getConversations(): Promise<{ ready: boolean; contacts: Contact[] }> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_conversations");
  if (error) return { ready: !NOT_SET_UP.has(error.code ?? ""), contacts: [] };
  const contacts = ((data ?? []) as Contact[]).map((c) => ({ ...c, unread: Number(c.unread) }));
  return { ready: true, contacts };
}

/** Unread messages waiting for the user; 0 if messaging isn't set up. */
export async function getUnreadCount(userId: string): Promise<number> {
  const supabase = await createClient();
  const { count, error } = await supabase
    .from("messages")
    .select("id", { count: "exact", head: true })
    .eq("recipient_id", userId)
    .is("read_at", null);
  return error ? 0 : (count ?? 0);
}

/** The latest messages between the user and one partner, oldest first. RLS limits it to their own. */
export async function getThread(me: string, partner: string): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("messages")
    .select("id, sender_id, recipient_id, body, created_at, read_at")
    .or(`and(sender_id.eq.${me},recipient_id.eq.${partner}),and(sender_id.eq.${partner},recipient_id.eq.${me})`)
    .order("created_at", { ascending: false })
    .limit(THREAD_LIMIT);
  return ((data ?? []) as ChatMessage[]).reverse();
}
