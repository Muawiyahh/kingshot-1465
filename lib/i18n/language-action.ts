"use server";

import { getProfile } from "@/lib/auth";
import { isLocale } from "@/lib/i18n/config";
import { createClient } from "@/lib/supabase/server";

/** Remembers a signed-in player's language choice. Does nothing for visitors. */
export async function saveLanguage(locale: string) {
  if (!isLocale(locale)) return;
  const profile = await getProfile();
  if (!profile || profile.language === locale) return;
  const supabase = await createClient();
  // RLS lets players update their own row; ignore errors if the column isn't there yet.
  await supabase.from("profiles").update({ language: locale }).eq("id", profile.id);
}
