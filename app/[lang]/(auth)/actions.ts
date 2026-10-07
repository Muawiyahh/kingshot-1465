"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/config";
import { gameIdToEmail } from "@/lib/auth";
import { ALLIANCE_TAGS } from "@/lib/alliances";
import { isLocale, localePath, switchLocale } from "@/lib/i18n/config";
import { getActionI18n } from "@/lib/i18n/action";
import type { Messages } from "@/lib/i18n/messages";
import type { ActionState } from "@/lib/types";

type ErrorKey = keyof Messages["errors"];

// Validation messages are keys into t.errors, translated when returned.
const gameId = z
  .string()
  .trim()
  .regex(/^[0-9]{6,12}$/, "gameId" satisfies ErrorKey);

const signupSchema = z
  .object({
    gameId,
    name: z
      .string()
      .trim()
      .min(1, "nameRequired" satisfies ErrorKey)
      .max(30, "nameTooLong" satisfies ErrorKey),
    alliance: z.enum(ALLIANCE_TAGS, { message: "alliance" satisfies ErrorKey }).optional(),
    password: z.string().min(8, "passwordShort" satisfies ErrorKey),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "passwordMismatch" satisfies ErrorKey });

function errorText(t: Messages, key: string) {
  return key in t.errors ? t.errors[key as ErrorKey] : t.errors.generic;
}

function safeNext(value: FormDataEntryValue | null, fallback: string) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { locale, t } = await getActionI18n();
  if (!supabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return { error: t.errors.notConfigured };

  const parsed = signupSchema.safeParse({
    gameId: formData.get("gameId"),
    name: formData.get("name"),
    alliance: formData.get("alliance") || undefined,
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: errorText(t, parsed.error.issues[0].message) };
  const v = parsed.data;
  const chosen = formData.get("language");
  const language = isLocale(chosen) ? chosen : locale;

  const admin = createAdminClient();
  const email = gameIdToEmail(v.gameId);

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email,
    password: v.password,
    email_confirm: true,
    user_metadata: { game_id: v.gameId },
  });
  if (createError || !created.user) {
    const exists = createError?.message.toLowerCase().includes("already");
    return { error: exists ? t.errors.accountExists : t.errors.createFailed };
  }

  const profile = {
    id: created.user.id,
    game_id: v.gameId,
    ingame_name: v.name,
    alliance_tag: v.alliance ?? null,
  };
  let { error: profileError } = await admin.from("profiles").insert({ ...profile, language });
  // The language column is missing until 0003_profile_language.sql has been run: save without it.
  // Postgres reports 42703 (undefined column); Supabase's API reports PGRST204 (not in schema cache).
  if (profileError?.code === "42703" || profileError?.code === "PGRST204") {
    ({ error: profileError } = await admin.from("profiles").insert(profile));
  }
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return { error: profileError.code === "23505" ? t.errors.accountExists : t.errors.profileFailed };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password: v.password });
  redirect(`${localePath(language, "/account")}?welcome=1`);
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { locale, t } = await getActionI18n();
  if (!supabaseConfigured) return { error: t.errors.notConfigured };

  const id = gameId.safeParse(formData.get("gameId"));
  const password = formData.get("password");
  if (!id.success) return { error: errorText(t, id.error.issues[0].message) };
  if (typeof password !== "string" || !password) return { error: t.errors.passwordRequired };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: gameIdToEmail(id.data),
    password,
  });
  if (error || !data.user) return { error: t.errors.badLogin };

  // Open the site in the player's saved language.
  const { data: profile } = await supabase.from("profiles").select("language").eq("id", data.user.id).maybeSingle();
  const preferred = isLocale(profile?.language) ? profile.language : locale;
  const next = safeNext(formData.get("next"), localePath(locale, "/account"));
  redirect(switchLocale(next, preferred));
}

export async function signOut() {
  const { locale } = await getActionI18n();
  if (supabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect(localePath(locale, "/"));
}
