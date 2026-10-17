"use server";

import { refresh } from "next/cache";
import { z } from "zod";
import { getProfile } from "@/lib/auth";
import { getActionI18n } from "@/lib/i18n/action";
import type { Messages } from "@/lib/i18n/messages";
import { createClient } from "@/lib/supabase/server";
import { slotCount, speedupKinds, SPEEDUP_KINDS } from "@/lib/kvk";
import type { ActionState } from "@/lib/types";

type ErrorKey = keyof Messages["errors"];

const days = z.coerce
  .number()
  .min(0, "speedupNegative" satisfies ErrorKey)
  .max(100000);

// Validation messages are keys into t.errors, translated when returned.
const schema = z.object({
  dayId: z.string().uuid(),
  slots: z.array(z.coerce.number().int().min(0)).max(96),
  anytime: z.boolean(),
  speedupDays: days,
  // Each kind of speedup, for positions that ask for them (see speedupKinds). Blank = not given.
  speedups: z.object(Object.fromEntries(SPEEDUP_KINDS.map((k) => [k, z.union([z.literal(""), days])]))),
  note: z
    .string()
    .trim()
    .max(500, "noteTooLong" satisfies ErrorKey),
});

/** Codes for a column the database doesn't have: `speedups` before 0011_appointments.sql is run. */
const MISSING_COLUMN = new Set(["PGRST204", "42703"]);

/** The same application without the per-kind speedups, for a database that can't store them yet. */
function withoutSpeedups<T extends { speedups: unknown }>(fields: T): Omit<T, "speedups"> {
  const rest: Partial<T> = { ...fields };
  delete rest.speedups;
  return rest as Omit<T, "speedups">;
}

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
    speedups: Object.fromEntries(SPEEDUP_KINDS.map((k) => [k, String(formData.get(`speedup-${k}`) ?? "").trim()])),
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
    supabase.from("event_days").select("id, slot_minutes, position, event:kvk_events(status)").eq("id", v.dayId).maybeSingle(),
    supabase.from("applications").select("id, status").eq("profile_id", profile.id).eq("day_id", v.dayId).maybeSingle(),
  ]);
  const event = day?.event as unknown as { status: string } | null;
  if (!day || event?.status !== "open") return { error: t.errors.applicationsClosed };

  const max = slotCount(day.slot_minutes as number);
  // Picked times are kept even with "any time" on, so switching it off later brings them back.
  // (Auto-fill tries them first, then any free time.)
  const slots = [...new Set(v.slots)].filter((s) => s < max).sort((a, b) => a - b);
  // Chief Minister and Noble Advisor ask for each kind of speedup; the total is their sum.
  const kinds = speedupKinds(day.position as string);
  let speedups: Record<string, number> = {};
  let total = v.speedupDays;
  if (kinds) {
    if (kinds.some((k) => v.speedups[k] === "")) return { error: t.errors.speedupsRequired };
    speedups = Object.fromEntries(kinds.map((k) => [k, Number(v.speedups[k])]));
    total = Math.round(kinds.reduce((n, k) => n + speedups[k], 0) * 10) / 10;
  }
  const fields = { preferred_slots: slots, anytime: v.anytime, speedup_days: total, speedups, note: v.note || null };

  if (existing) {
    if (existing.status === "accepted") return { error: t.errors.alreadyReviewed };
    // Always back to pending with no reviewer: this is also how a rejected player re-applies.
    // .select() so a write that RLS silently skipped (0 rows) is reported, not treated as saved.
    const update = (values: Partial<typeof fields>) =>
      supabase.from("applications").update({ ...values, status: "pending", reviewed_by: null }).eq("id", existing.id).select("id");
    let { data: saved, error } = await update(fields);
    if (MISSING_COLUMN.has(error?.code ?? "")) ({ data: saved, error } = await update(withoutSpeedups(fields)));
    if (error || !saved?.length) return { error: t.errors.updateFailed };
  } else {
    const insert = (values: Partial<typeof fields>) =>
      supabase.from("applications").insert({ ...values, profile_id: profile.id, day_id: v.dayId });
    let { error } = await insert(fields);
    if (MISSING_COLUMN.has(error?.code ?? "")) ({ error } = await insert(withoutSpeedups(fields)));
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
