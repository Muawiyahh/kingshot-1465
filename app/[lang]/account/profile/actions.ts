"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { ALLIANCE_TAGS } from "@/lib/alliances";
import { getActionI18n } from "@/lib/i18n/action";
import type { Messages } from "@/lib/i18n/messages";
import { createClient } from "@/lib/supabase/server";
import type { ActionState } from "@/lib/types";

type ErrorKey = keyof Messages["errors"];

// Same rules as sign-up. Messages are keys into t.errors.
const schema = z.object({
  name: z
    .string()
    .trim()
    .min(1, "nameRequired" satisfies ErrorKey)
    .max(30, "nameTooLong" satisfies ErrorKey),
  alliance: z.union([z.enum(ALLIANCE_TAGS), z.literal("")], { message: "alliance" satisfies ErrorKey }),
});

/** Players can change their in-game name and alliance. RLS and the guard trigger stop anything else changing. */
export async function updateProfile(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getActionI18n();
  const profile = await getProfile();
  if (!profile) return { error: t.errors.signInFirst };

  const parsed = schema.safeParse({ name: formData.get("name") ?? "", alliance: formData.get("alliance") ?? "" });
  if (!parsed.success) {
    const key = parsed.error.issues[0].message;
    return { error: key in t.errors ? t.errors[key as ErrorKey] : t.errors.generic };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("profiles")
    .update({ ingame_name: parsed.data.name, alliance_tag: parsed.data.alliance || null })
    .eq("id", profile.id)
    .select("id");
  if (error || !data?.length) return { error: t.errors.profileFailed };

  refresh();
  return { ok: true, message: t.success.profileSaved };
}
