"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { getProfile, isLeader } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { planAutofill, type FillSlot } from "@/lib/autofill";
import { addDays, positionLabel, slotCount } from "@/lib/kvk";
import { ALLIANCE_TAGS } from "@/lib/alliances";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getActionI18n } from "@/lib/i18n/action";
import type { Messages } from "@/lib/i18n/messages";
import type { ActionState, ApplicationStatus, EventStatus, FillReport, FillState, Profile } from "@/lib/types";

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

const reviewStatus = z.enum(["pending", "accepted", "rejected"]);

/**
 * Accepts, rejects, or undoes a review (back to pending). Anyone who stops being accepted loses
 * their slot that day, unless it's locked: then nothing changes and the leader is told to unlock it.
 * Undo clears the reviewer so the player can edit their application again.
 */
export async function reviewApplication(applicationId: string, nextStatus: ApplicationStatus): Promise<ActionState> {
  const [{ profile, supabase, audit }, { t }] = await Promise.all([leaderContext(), getActionI18n()]);
  const id = uuid.safeParse(applicationId);
  const status = reviewStatus.safeParse(nextStatus);
  if (!id.success || !status.success) return { error: t.errors.reviewFailed };

  const { data: app } = await supabase.from("applications").select("profile_id, day_id").eq("id", id.data).maybeSingle();
  if (!app) return { error: t.errors.reviewFailed };

  let heldSlot: { id: string; locked: boolean } | null = null;
  if (status.data !== "accepted") {
    const { data } = await supabase
      .from("slots")
      .select("id, locked")
      .eq("day_id", app.day_id)
      .eq("profile_id", app.profile_id)
      .maybeSingle();
    heldSlot = data;
    if (heldSlot?.locked) return { error: t.errors.unlockToReject };
  }

  const { error } = await supabase
    .from("applications")
    .update({ status: status.data, reviewed_by: status.data === "pending" ? null : profile.id })
    .eq("id", id.data);
  if (error) return { error: t.errors.reviewFailed };
  if (heldSlot) await supabase.from("slots").update({ profile_id: null }).eq("id", heldSlot.id).eq("locked", false);

  await audit("application.review", id.data, { status: status.data });
  refresh();
  return { ok: true };
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

export async function toggleSlotLock(slotId: string): Promise<ActionState> {
  const [{ supabase, audit }, { t }] = await Promise.all([leaderContext(), getActionI18n()]);
  const id = uuid.safeParse(slotId);
  if (!id.success) return { error: t.errors.slotNotFound };
  const { data: slot } = await supabase.from("slots").select("locked").eq("id", id.data).maybeSingle();
  if (!slot) return { error: t.errors.slotNotFound };
  const { error } = await supabase.from("slots").update({ locked: !slot.locked }).eq("id", id.data);
  if (error) return { error: t.errors.slotFailed };
  await audit("slot.lock", id.data, { locked: !slot.locked });
  refresh();
  return { ok: true };
}

type DayForFill = {
  id: string;
  day_number: number;
  position: string;
  slots: FillSlot[];
  applications: {
    profile_id: string;
    preferred_slots: number[];
    anytime: boolean;
    speedup_days: number;
    created_at: string;
    status: string;
    profile: { ingame_name: string } | null;
  }[];
};

const FILL_SELECT =
  "id, day_number, position, slots(id, slot_index, profile_id, locked), applications(profile_id, preferred_slots, anytime, speedup_days, created_at, status, profile:profiles!applications_profile_id_fkey(ingame_name))";

/**
 * Plans and saves auto-fill for some days. Each write only fills a slot that is still empty and
 * unlocked, so if another leader changes something at the same moment the report stays truthful.
 */
async function fill(
  supabase: Awaited<ReturnType<typeof createClient>>,
  days: DayForFill[],
  label: (d: DayForFill) => string | null,
) {
  const report: FillReport = { placed: 0, skipped: [] };
  const writes: Promise<void>[] = [];
  for (const day of days) {
    const plan = planAutofill(
      day.slots,
      day.applications
        .filter((a) => a.status === "accepted")
        .map((a) => ({ ...a, name: a.profile?.ingame_name ?? "?" })),
    );
    const where = label(day);
    const tag = (name: string) => (where ? `${name} (${where})` : name);
    report.skipped.push(...plan.skipped.map(tag));
    for (const u of plan.updates) {
      writes.push(
        (async () => {
          const { data } = await supabase
            .from("slots")
            .update({ profile_id: u.profileId })
            .eq("id", u.slotId)
            .is("profile_id", null)
            .eq("locked", false)
            .select("id");
          if (data?.length) report.placed++;
          else report.skipped.push(tag(u.name));
        })(),
      );
    }
  }
  await Promise.all(writes);
  return report;
}

function fillMessage(t: Messages, report: FillReport) {
  if (report.placed === 0 && report.skipped.length === 0) return t.kvk.leader.fillNone;
  return fmt(t.kvk.leader.fillPlaced, { n: report.placed });
}

export async function autoFillDay(dayId: string): Promise<FillState> {
  const [{ supabase, audit }, { t }] = await Promise.all([leaderContext(), getActionI18n()]);
  const id = uuid.safeParse(dayId);
  if (!id.success) return { error: t.errors.generic };
  const { data } = await supabase.from("event_days").select(FILL_SELECT).eq("id", id.data).maybeSingle();
  if (!data) return { error: t.errors.generic };
  const report = await fill(supabase, [data as unknown as DayForFill], () => null);
  await audit("day.autofill", id.data, report);
  refresh();
  return { ok: true, message: fillMessage(t, report), report };
}

/** Auto-fills every day and position of an event in one go. */
export async function autoFillEvent(eventId: string): Promise<FillState> {
  const [{ supabase, audit }, { t }] = await Promise.all([leaderContext(), getActionI18n()]);
  const id = uuid.safeParse(eventId);
  if (!id.success) return { error: t.errors.generic };
  const { data } = await supabase.from("event_days").select(FILL_SELECT).eq("event_id", id.data).order("day_number");
  if (!data) return { error: t.errors.generic };
  const days = data as unknown as DayForFill[];
  const report = await fill(supabase, days, (d) => `${fmt(t.common.day, { n: d.day_number })} · ${positionLabel(d.position, t)}`);
  await audit("event.autofill", id.data, report);
  refresh();
  return { ok: true, message: fillMessage(t, report), report };
}

/** Empties every unlocked slot of a day. */
export async function clearDay(dayId: string): Promise<ActionState> {
  const [{ supabase, audit }, { t }] = await Promise.all([leaderContext(), getActionI18n()]);
  const id = uuid.safeParse(dayId);
  if (!id.success) return { error: t.errors.generic };
  const { error } = await supabase.from("slots").update({ profile_id: null }).eq("day_id", id.data).eq("locked", false);
  if (error) return { error: t.errors.slotFailed };
  await audit("day.clear", id.data);
  refresh();
  return { ok: true };
}
