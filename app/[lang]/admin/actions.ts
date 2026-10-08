"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, isLeader } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { addDays, slotCount } from "@/lib/kvk";
import { ALLIANCE_TAGS } from "@/lib/alliances";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getActionI18n } from "@/lib/i18n/action";
import type { Messages } from "@/lib/i18n/messages";
import type { ActionState, EventStatus, Profile } from "@/lib/types";

type ErrorKey = keyof Messages["errors"];

function errorText(t: Messages, key: string) {
  return key in t.errors ? t.errors[key as ErrorKey] : t.errors.generic;
}

/** Every admin action re-checks the caller; RLS enforces the same rules in the database. */
async function leaderContext() {
  const profile = await getProfile();
  if (!isLeader(profile)) throw new Error("Not authorised");
  const supabase = await createClient();
  async function audit(action: string, target: string, payload?: unknown) {
    await supabase.from("audit_log").insert({ actor_id: profile!.id, action, target, payload: payload ?? null });
  }
  return { profile: profile as Profile, supabase, audit };
}

const uuid = z.string().uuid();

// ---------------------------------------------------------------------------
// Accounts
// ---------------------------------------------------------------------------

export async function setAccountStatus(formData: FormData) {
  const { supabase, audit } = await leaderContext();
  const id = uuid.parse(formData.get("profileId"));
  const status = z.enum(["pending", "approved", "rejected"]).parse(formData.get("status"));
  await supabase.from("profiles").update({ status }).eq("id", id);
  await audit("account.status", id, { status });
  refresh();
}

export async function setAccountRole(formData: FormData) {
  const { profile, supabase, audit } = await leaderContext();
  if (profile.role !== "admin") throw new Error("Only admins can change roles");
  const id = uuid.parse(formData.get("profileId"));
  const role = z.enum(["player", "leader", "admin"]).parse(formData.get("role"));
  if (id === profile.id) throw new Error("You can't change your own role");
  await supabase.from("profiles").update({ role }).eq("id", id);
  await audit("account.role", id, { role });
  refresh();
}

// ---------------------------------------------------------------------------
// Kingdom: King and server
// ---------------------------------------------------------------------------

const kingSchema = z.object({
  kingName: z
    .string()
    .trim()
    .max(40, "kingNameTooLong" satisfies ErrorKey),
  kingAlliance: z.union([z.enum(ALLIANCE_TAGS), z.literal("")]),
});

const serverSchema = z.object({
  serverOpenedOn: z.union([z.string().regex(/^\d{4}-\d{2}-\d{2}$/), z.literal("")]),
});

/** Saves some of the kingdom_settings columns and refreshes the homepage cards. */
async function saveSettings(fields: Record<string, string | null>, auditAction: string): Promise<ActionState> {
  const [{ profile, supabase, audit }, { t }] = await Promise.all([leaderContext(), getActionI18n()]);
  const values = { ...fields, updated_by: profile.id };
  const { data, error } = await supabase.from("kingdom_settings").update(values).eq("id", 1).select("id");
  if (error || !data?.length) return { error: t.errors.settingsFailed };
  await audit(auditAction, "kingdom", values);
  refresh();
  return { ok: true, message: t.success.settingsSaved };
}

export async function updateKing(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getActionI18n();
  const parsed = kingSchema.safeParse({
    kingName: formData.get("kingName") ?? "",
    kingAlliance: formData.get("kingAlliance") ?? "",
  });
  if (!parsed.success) return { error: errorText(t, parsed.error.issues[0].message) };
  const v = parsed.data;
  return saveSettings({ king_name: v.kingName || null, king_alliance: v.kingAlliance || null }, "king.update");
}

export async function updateServer(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const { t } = await getActionI18n();
  const parsed = serverSchema.safeParse({ serverOpenedOn: formData.get("serverOpenedOn") ?? "" });
  if (!parsed.success) return { error: t.errors.generic };
  return saveSettings({ server_opened_on: parsed.data.serverOpenedOn || null }, "server.update");
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

const eventSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "eventTitle" satisfies ErrorKey)
    .max(60),
  season: z.coerce.number().int().min(0).max(999).optional(),
  startsOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "eventDate" satisfies ErrorKey),
  slotMinutes: z.coerce.number().refine((n) => [15, 30, 60].includes(n), "slotLength" satisfies ErrorKey),
  days: z
    .array(z.object({ day: z.coerce.number().int().min(1).max(7), position: z.string().trim().min(1).max(40) }))
    .min(1, "eventDays" satisfies ErrorKey),
});

export async function createEvent(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const [{ supabase, audit }, { locale, t }] = await Promise.all([leaderContext(), getActionI18n()]);
  const dayNums = formData.getAll("dayNumber");
  const positions = formData.getAll("position");
  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    season: formData.get("season") || undefined,
    startsOn: formData.get("startsOn"),
    slotMinutes: formData.get("slotMinutes") || 30,
    days: dayNums.map((d, i) => ({ day: d, position: positions[i] })).filter((r) => String(r.position ?? "").trim()),
  });
  if (!parsed.success) return { error: errorText(t, parsed.error.issues[0].message) };
  const v = parsed.data;

  const seen = new Set<string>();
  for (const d of v.days) {
    const key = `${d.day}|${d.position.toLowerCase()}`;
    if (seen.has(key)) return { error: fmt(t.errors.duplicateDay, { day: d.day, position: d.position }) };
    seen.add(key);
  }

  const { data: event, error } = await supabase
    .from("kvk_events")
    .insert({ title: v.title, season: v.season ?? null, starts_on: v.startsOn })
    .select("id")
    .single();
  if (error || !event) return { error: t.errors.eventFailed };

  const { data: days, error: daysError } = await supabase
    .from("event_days")
    .insert(
      v.days.map((d) => ({
        event_id: event.id,
        day_number: d.day,
        date: addDays(v.startsOn, d.day - 1),
        position: d.position,
        slot_minutes: v.slotMinutes,
      })),
    )
    .select("id");
  if (daysError || !days) {
    await supabase.from("kvk_events").delete().eq("id", event.id);
    return { error: t.errors.daysFailed };
  }

  const count = slotCount(v.slotMinutes);
  const slots = days.flatMap((d) => Array.from({ length: count }, (_, i) => ({ day_id: d.id, slot_index: i })));
  const { error: slotsError } = await supabase.from("slots").insert(slots);
  if (slotsError) {
    await supabase.from("kvk_events").delete().eq("id", event.id);
    return { error: t.errors.slotsFailed };
  }

  await audit("event.create", event.id, { title: v.title });
  redirect(localePath(locale, `/admin/events/${event.id}`));
}

export async function setEventStatus(formData: FormData) {
  const { supabase, audit } = await leaderContext();
  const id = uuid.parse(formData.get("eventId"));
  const status = z.enum(["draft", "open", "closed", "published"]).parse(formData.get("status")) as EventStatus;
  await supabase
    .from("kvk_events")
    .update({ status, published_at: status === "published" ? new Date().toISOString() : null })
    .eq("id", id);
  await audit("event.status", id, { status });
  refresh();
}

export async function deleteEvent(formData: FormData) {
  const [{ supabase, audit }, { locale }] = await Promise.all([leaderContext(), getActionI18n()]);
  const id = uuid.parse(formData.get("eventId"));
  await supabase.from("kvk_events").delete().eq("id", id);
  await audit("event.delete", id);
  redirect(localePath(locale, "/admin/events"));
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export async function reviewApplication(formData: FormData) {
  const { profile, supabase, audit } = await leaderContext();
  const id = uuid.parse(formData.get("applicationId"));
  const status = z.enum(["pending", "accepted", "rejected"]).parse(formData.get("status"));

  const { data: app } = await supabase
    .from("applications")
    .update({ status, reviewed_by: profile.id })
    .eq("id", id)
    .select("profile_id, day_id")
    .single();

  // Someone who is no longer accepted shouldn't keep a slot.
  if (app && status !== "accepted") {
    await supabase.from("slots").update({ profile_id: null }).eq("day_id", app.day_id).eq("profile_id", app.profile_id);
  }
  await audit("application.review", id, { status });
  refresh();
}

// ---------------------------------------------------------------------------
// Slots
// ---------------------------------------------------------------------------

export async function assignSlot(slotId: string, profileId: string | null): Promise<ActionState> {
  const [{ supabase, audit }, { t }] = await Promise.all([leaderContext(), getActionI18n()]);
  const sid = uuid.parse(slotId);
  const pid = profileId ? uuid.parse(profileId) : null;

  const { data: slot } = await supabase.from("slots").select("id, day_id, locked").eq("id", sid).single();
  if (!slot) return { error: t.errors.slotNotFound };
  if (slot.locked) return { error: t.errors.unlockFirst };

  if (pid) {
    // Moving a player: free their current slot on this day first.
    const { data: current } = await supabase
      .from("slots")
      .select("id, locked")
      .eq("day_id", slot.day_id)
      .eq("profile_id", pid)
      .maybeSingle();
    if (current && current.id !== sid) {
      if (current.locked) return { error: t.errors.playerLocked };
      await supabase.from("slots").update({ profile_id: null }).eq("id", current.id);
    }
  }

  const { error } = await supabase.from("slots").update({ profile_id: pid }).eq("id", sid);
  if (error) return { error: t.errors.slotFailed };
  await audit("slot.assign", sid, { profile_id: pid });
  refresh();
  return { ok: true };
}

export async function toggleSlotLock(formData: FormData) {
  const { supabase, audit } = await leaderContext();
  const id = uuid.parse(formData.get("slotId"));
  const { data: slot } = await supabase.from("slots").select("locked").eq("id", id).single();
  if (!slot) return;
  await supabase.from("slots").update({ locked: !slot.locked }).eq("id", id);
  await audit("slot.lock", id, { locked: !slot.locked });
  refresh();
}

/**
 * Fills empty, unlocked slots with accepted applicants who don't have a slot yet.
 * Highest speedups go first and get their earliest preferred free slot.
 */
export async function autoFillDay(formData: FormData) {
  const { supabase, audit } = await leaderContext();
  const dayId = uuid.parse(formData.get("dayId"));

  const [{ data: slots }, { data: apps }] = await Promise.all([
    supabase.from("slots").select("id, slot_index, profile_id, locked").eq("day_id", dayId).order("slot_index"),
    supabase
      .from("applications")
      .select("profile_id, preferred_slots, anytime, speedup_days, created_at")
      .eq("day_id", dayId)
      .eq("status", "accepted")
      .order("speedup_days", { ascending: false })
      .order("created_at", { ascending: true }),
  ]);
  if (!slots || !apps) return;

  const assigned = new Set(slots.filter((s) => s.profile_id).map((s) => s.profile_id as string));
  const free = new Map(slots.filter((s) => !s.profile_id && !s.locked).map((s) => [s.slot_index as number, s.id as string]));
  const updates: { id: string; profile_id: string }[] = [];

  for (const a of apps) {
    if (assigned.has(a.profile_id)) continue;
    const wanted: number[] = a.anytime ? [...free.keys()].sort((x, y) => x - y) : (a.preferred_slots as number[]);
    const pick = wanted.find((i) => free.has(i));
    if (pick === undefined) continue;
    updates.push({ id: free.get(pick)!, profile_id: a.profile_id });
    free.delete(pick);
    assigned.add(a.profile_id);
  }

  for (const u of updates) {
    await supabase.from("slots").update({ profile_id: u.profile_id }).eq("id", u.id);
  }
  await audit("day.autofill", dayId, { assigned: updates.length });
  refresh();
}

export async function clearDay(formData: FormData) {
  const { supabase, audit } = await leaderContext();
  const dayId = uuid.parse(formData.get("dayId"));
  await supabase.from("slots").update({ profile_id: null }).eq("day_id", dayId).eq("locked", false);
  await audit("day.clear", dayId);
  refresh();
}
