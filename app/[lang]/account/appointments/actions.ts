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

/**
 * Applies for one day/position, updates a pending application, or re-applies after a rejection
 * (back to pending, ready for leaders to review again). Accepted applications are frozen.
 */
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
  const [{ data: day }, { data: existing }] = await Promise.all([
    supabase.from("event_days").select("id, slot_minutes, event:kvk_events(status)").eq("id", v.dayId).maybeSingle(),
    supabase.from("applications").select("id, status").eq("profile_id", profile.id).eq("day_id", v.dayId).maybeSingle(),
  ]);
  const event = day?.event as unknown as { status: string } | null;
  if (!day || event?.status !== "open") return { error: t.errors.applicationsClosed };

  const max = slotCount(day.slot_minutes as number);
  // Picked times are kept even with "any time" on, so switching it off later brings them back.
  // (Auto-fill tries them first, then any free time.)
  const slots = [...new Set(v.slots)].filter((s) => s < max).sort((a, b) => a - b);
  const fields = { preferred_slots: slots, anytime: v.anytime, speedup_days: v.speedupDays, note: v.note || null };

  if (existing) {
    if (existing.status === "accepted") return { error: t.errors.alreadyReviewed };
    // Always back to pending with no reviewer: this is also how a rejected player re-applies.
    // .select() so a write that RLS silently skipped (0 rows) is reported, not treated as saved.
    const { data: saved, error } = await supabase
      .from("applications")
      .update({ ...fields, status: "pending", reviewed_by: null })
      .eq("id", existing.id)
      .select("id");
    if (error || !saved?.length) return { error: t.errors.updateFailed };
  } else {
    const { error } = await supabase.from("applications").insert({ ...fields, profile_id: profile.id, day_id: v.dayId });
    if (error) return { error: t.errors.submitFailed };
  }

  refresh();
  const message = !existing
    ? t.success.applicationSubmitted
    : existing.status === "rejected"
      ? t.success.applicationResubmitted
      : t.success.applicationUpdated;
  return { ok: true, message };
}

/** Withdraws a pending or rejected application (RLS refuses accepted ones). */
export async function withdrawApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getActionI18n();
  const profile = await getProfile();
  if (!profile) return { error: t.errors.signInFirst };
  const dayId = z.string().uuid().safeParse(formData.get("dayId"));
  if (!dayId.success) return { error: t.errors.cantWithdraw };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("applications")
    .delete()
    .eq("profile_id", profile.id)
    .eq("day_id", dayId.data)
    .select("id");
  if (error || !data?.length) return { error: t.errors.cantWithdraw };

  refresh();
  return { ok: true, message: t.success.withdrawn };
}
