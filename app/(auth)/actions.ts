"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigured } from "@/lib/supabase/config";
import { gameIdToEmail } from "@/lib/auth";
import { ALLIANCE_TAGS } from "@/lib/alliances";
import type { ActionState } from "@/lib/types";

const NOT_CONFIGURED: ActionState = {
  error: "Accounts aren't switched on yet. The site admin needs to connect Supabase.",
};

const gameId = z
  .string()
  .trim()
  .regex(/^[0-9]{6,12}$/, "Your game ID is the 6–12 digit number on your profile card.");

const signupSchema = z
  .object({
    gameId,
    name: z.string().trim().min(1, "Enter your in-game name.").max(30, "Names are at most 30 characters."),
    alliance: z.enum(ALLIANCE_TAGS, { message: "Pick your alliance from the list." }).optional(),
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ["confirm"], message: "Passwords don't match." });

function safeNext(value: FormDataEntryValue | null, fallback: string) {
  const next = typeof value === "string" ? value : "";
  return next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

export async function signUp(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!supabaseConfigured || !process.env.SUPABASE_SERVICE_ROLE_KEY) return NOT_CONFIGURED;

  const parsed = signupSchema.safeParse({
    gameId: formData.get("gameId"),
    name: formData.get("name"),
    alliance: formData.get("alliance") || undefined,
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const v = parsed.data;

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
    return {
      error: exists
        ? "An account with this game ID already exists. Sign in instead."
        : "Couldn't create your account. Try again in a minute.",
    };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    game_id: v.gameId,
    ingame_name: v.name,
    alliance_tag: v.alliance ?? null,
  });
  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    return {
      error: profileError.code === "23505"
        ? "An account with this game ID already exists. Sign in instead."
        : "Couldn't save your profile. Try again in a minute.",
    };
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password: v.password });
  redirect("/account?welcome=1");
}

export async function signIn(_prev: ActionState, formData: FormData): Promise<ActionState> {
  if (!supabaseConfigured) return NOT_CONFIGURED;

  const id = gameId.safeParse(formData.get("gameId"));
  const password = formData.get("password");
  if (!id.success) return { error: id.error.issues[0].message };
  if (typeof password !== "string" || !password) return { error: "Enter your password." };

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: gameIdToEmail(id.data),
    password,
  });
  if (error) return { error: "That game ID and password don't match." };

  redirect(safeNext(formData.get("next"), "/account"));
}

export async function signOut() {
  if (supabaseConfigured) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
