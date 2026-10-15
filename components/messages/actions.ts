"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { isLocale } from "@/lib/i18n/config";
import { getActionI18n } from "@/lib/i18n/action";
import { createClient } from "@/lib/supabase/server";
import { translateText } from "@/lib/translate";

const MAX_LENGTH = 1000;
const uuid = z.string().uuid();

/** Sends a message. RLS decides who may write to whom; this only turns its answers into words. */
export async function sendMessage(partnerId: string, body: string): Promise<{ error?: string }> {
  const { t } = await getActionI18n();
  const profile = await getProfile();
  if (!profile) return { error: t.errors.signInFirst };

  const to = uuid.safeParse(partnerId);
  if (!to.success) return { error: t.errors.cantMessage };
  const text = typeof body === "string" ? body.trim() : "";
  if (!text) return { error: t.errors.messageEmpty };
  if (text.length > MAX_LENGTH) return { error: t.errors.messageTooLong };

  const supabase = await createClient();
  const { error } = await supabase.from("messages").insert({ sender_id: profile.id, recipient_id: to.data, body: text });
  if (error) {
    if (error.message.includes("rate_limited")) return { error: t.errors.rateLimited };
    if (error.code === "42501") return { error: t.errors.cantMessage };
    return { error: t.errors.messageFailed };
  }
  refresh();
  return {};
}

/** Marks everything the partner sent to the signed-in user as read. */
export async function markRead(partnerId: string) {
  const profile = await getProfile();
  const from = uuid.safeParse(partnerId);
  if (!profile || !from.success) return;

  const supabase = await createClient();
  await supabase
    .from("messages")
    .update({ read_at: new Date().toISOString() })
    .eq("recipient_id", profile.id)
    .eq("sender_id", from.data)
    .is("read_at", null);
  refresh();
}

/**
 * Translates one message into the viewer's site language. Each message is sent to Azure at most
 * once per language — the result is cached on the row (RLS: only the sender or recipient can read
 * or write it) and reused for every later request, including from the other participant.
 */
export async function translateMessage(messageId: string, to: string): Promise<{ text?: string; error?: string }> {
  const { t } = await getActionI18n();
  const profile = await getProfile();
  if (!profile) return { error: t.errors.signInFirst };

  const id = uuid.safeParse(messageId);
  if (!id.success || !isLocale(to)) return { error: t.errors.translateFailed };

  const supabase = await createClient();
  // RLS already limits this to the sender or recipient's own messages.
  const { data: message, error: readError } = await supabase
    .from("messages")
    .select("body, translations")
    .eq("id", id.data)
    .maybeSingle();
  if (readError || !message) return { error: t.errors.translateFailed };

  const cached = (message.translations as Record<string, string> | null)?.[to];
  if (cached) return { text: cached };

  const translated = await translateText(message.body, to);
  if (!translated) return { error: t.errors.translateFailed };

  // Best-effort cache write: if it fails, the translation still displays, just not cached for next time.
  await supabase.rpc("save_message_translation", { p_message_id: id.data, p_lang: to, p_text: translated });
  return { text: translated };
}
