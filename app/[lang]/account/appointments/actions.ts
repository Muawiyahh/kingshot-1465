"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { getActionI18n } from "@/lib/i18n/action";
import type { Messages } from "@/lib/i18n/messages";
import { createClient } from "@/lib/supabase/server";
import { slotCount } from "@/lib/kvk";
import type { ActionState } from "@/lib/types";

type ErrorKey = keyof Messages["errors"];

// Validation messages are keys into t.errors, translated when returned.
const schema = z.object({
  dayId: z.string().uuid(),
  slots: z.array(z.coerce.number().int().min(0)).max(96),
  anytime: z.boolean(),
  speedupDays: z.coerce
    .number()
    .min(0, "speedupNegative" satisfies ErrorKey)
    .max(100000),
  note: z
    .string()
    .trim()
    .max(500, "noteTooLong" satisfies ErrorKey),
});

export async function saveApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getActionI18n();
  const profile = await getProfile();
  if (!profile) return { error: t.errors.signInFirst };
  if (profile.status !== "approved") return { error: t.errors.notApproved };

  const parsed = schema.safeParse({
    dayId: formData.get("dayId"),
    slots: formData.getAll("slot"),
    anytime: formData.get("anytime") === "on",
    speedupDays: formData.get("speedupDays") || 0,
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) {
    const key = parsed.error.issues[0].message;
    return { error: key in t.errors ? t.errors[key as ErrorKey] : t.errors.generic };
  }
  const v = parsed.data;
  if (!v.anytime && v.slots.length === 0) return { error: t.errors.pickSlot };

  const supabase = await createClient();
  const { data: day } = await supabase
    .from("event_days")
    .select("id, slot_minutes, event:kvk_events(status)")
    .eq("id", v.dayId)
    .maybeSingle();
  const event = day?.event as unknown as { status: string } | null;
  if (!day || event?.status !== "open") return { error: t.errors.applicationsClosed };

  const max = slotCount(day.slot_minutes as number);
  const slots = [...new Set(v.slots)].filter((s) => s < max).sort((a, b) => a - b);

  const { data: existing } = await supabase
    .from("applications")
    .select("id, status")
    .eq("profile_id", profile.id)
    .eq("day_id", v.dayId)
    .maybeSingle();

  const fields = {
    preferred_slots: v.anytime ? [] : slots,
    anytime: v.anytime,
    speedup_days: v.speedupDays,
    note: v.note || null,
  };

  if (existing) {
    if (existing.status !== "pending") return { error: t.errors.alreadyReviewed };
    const { error } = await supabase.from("applications").update(fields).eq("id", existing.id);
    if (error) return { error: t.errors.updateFailed };
  } else {
    const { error } = await supabase
      .from("applications")
      .insert({ ...fields, profile_id: profile.id, day_id: v.dayId });
    if (error) return { error: t.errors.submitFailed };
  }

  refresh();
  return { ok: true, message: existing ? t.success.applicationUpdated : t.success.applicationSubmitted };
}

export async function withdrawApplication(formData: FormData) {
  const profile = await getProfile();
  if (!profile) return;
  const dayId = z.string().uuid().safeParse(formData.get("dayId"));
  if (!dayId.success) return;

  const supabase = await createClient();
  // RLS only lets players delete their own pending applications.
  await supabase.from("applications").delete().eq("profile_id", profile.id).eq("day_id", dayId.data);
  refresh();
}
