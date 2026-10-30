import type { SpeedupKind } from "@/lib/kvk";

export type UserRole = "player" | "leader" | "admin";
export type AccountStatus = "pending" | "approved" | "rejected";
export type EventStatus = "draft" | "open" | "closed" | "published";
export type ApplicationStatus = "pending" | "accepted" | "rejected";

export type Profile = {
  id: string;
  game_id: string;
  ingame_name: string;
  alliance_tag: string | null;
  avatar_url: string | null;
  role: UserRole;
  status: AccountStatus;
  /** Preferred site language (a Locale). Missing until 0003_profile_language.sql has been run. */
  language?: string | null;
  /** A player from another kingdom talking to the transfer managers (0007_homepage_content.sql). */
  transfer?: boolean;
  /** The kingdom a transfer account is coming from. */
  from_kingdom?: number | null;
  /** When they last opened the bell (0010_notifications.sql). */
  notifications_seen_at?: string | null;
  created_at: string;
};

export type KvkEvent = {
  id: string;
  title: string;
  season: number | null;
  starts_on: string;
  status: EventStatus;
  published_at: string | null;
};

export type EventDay = {
  id: string;
  event_id: string;
  day_number: number;
  date: string;
  position: string;
  slot_minutes: number;
};

export type Slot = {
  id: string;
  day_id: string;
  slot_index: number;
  profile_id: string | null;
  locked: boolean;
};

export type Application = {
  id: string;
  profile_id: string;
  day_id: string;
  preferred_slots: number[];
  anytime: boolean;
  /** Total speedups in days; sorting and auto-fill use it. */
  speedup_days: number;
  /**
   * Days of each kind (construction, research, training, general) for Chief Minister and Noble
   * Advisor. Missing until 0011_appointments.sql has been run.
   */
  speedups?: Partial<Record<SpeedupKind, number>> | null;
  note: string | null;
  status: ApplicationStatus;
  created_at: string;
};

export type PublicScheduleRow = {
  slot_id: string;
  day_id: string;
  slot_index: number;
  locked: boolean;
  event_id: string;
  day_number: number;
  date: string;
  position: string;
  slot_minutes: number;
  event_title: string;
  season: number | null;
  ingame_name: string | null;
  alliance_tag: string | null;
  avatar_url: string | null;
};

export type KingdomSettings = {
  id: number;
  king_name: string | null;
  king_alliance: string | null;
  server_opened_on: string | null;
  updated_at: string;
  /** Transfer to 1465 section. Missing until 0007_homepage_content.sql has been run. */
  transfer_pitch?: string | null;
  transfer_facts?: TransferFact[];
  /** When the next KvK starts (UTC). Missing until 0009_next_kvk.sql has been run. */
  next_kvk_at?: string | null;
};

/** A line of kingdom facts in the Transfer section, e.g. "Min. power" → "50M". */
export type TransferFact = { label: string; value: string };

/** A member who answers transfer accounts, as the homepage lists them. */
export type TransferManager = { profileId: string; name: string; alliance: string | null; gameId: string; note: string | null };

/** An account Admin → Transfers can tick as a transfer manager: leaders and admins, plus any member an admin adds. */
export type ManagerOption = { id: string; ingame_name: string; alliance_tag: string | null; role: UserRole };
export type ManagerLookup = { error?: string; account?: ManagerOption } | undefined;

/** One alliance's time for one event (0007_homepage_content.sql). */
export type AllianceEventRow = {
  alliance: string;
  event: string;
  /** HH:MM, UTC. */
  time_utc: string | null;
  /** 0 = Sunday … 6 = Saturday. */
  weekdays: number[];
  note: string | null;
};

export type HallOfFameRow = {
  /** Monday of the week, YYYY-MM-DD. */
  week_of: string;
  alliance: string;
  player_name: string;
  quote: string | null;
};

/** Result shape returned by Server Actions to useActionState forms. */
export type ActionState = { ok?: boolean; error?: string; message?: string } | undefined;

/**
 * Admin → Accounts password reset: the account found by game ID (shown for the admin to check), then
 * the temporary password once it's reset. The password only ever travels in this response.
 */
export type ResetAccount = { gameId: string; name: string; alliance: string | null; role: UserRole };
export type ResetState = { error?: string; account?: ResetAccount; password?: string } | undefined;

/** What auto-fill did: how many players it placed, and who it couldn't find a free time for. */
export type FillReport = { placed: number; skipped: string[] };
export type FillState = { ok?: boolean; error?: string; message?: string; report?: FillReport } | undefined;

/** One day/position of an event as the leaders' workspace loads it (one nested query). */
export type WorkspaceDay = EventDay & {
  slots: { id: string; slot_index: number; locked: boolean; profile_id: string | null; profile: { ingame_name: string; alliance_tag: string | null } | null }[];
  applications: (Pick<Application, "id" | "profile_id" | "preferred_slots" | "anytime" | "speedup_days" | "speedups" | "note" | "status" | "created_at"> & {
    profile: { ingame_name: string; alliance_tag: string | null; game_id: string } | null;
  })[];
};
export type WorkspaceEvent = KvkEvent & { event_days: WorkspaceDay[] };

/** One day/position of an event as a player's page loads it: their own application and slot only. */
export type PlayerDay = EventDay & {
  applications: Application[];
  slots: { id: string; slot_index: number }[];
};
export type PlayerEvent = KvkEvent & { event_days: PlayerDay[] };

/** Someone the signed-in user can message, with the latest message between them (0004_messages.sql). */
export type Contact = {
  partner_id: string;
  ingame_name: string;
  alliance_tag: string | null;
  role: UserRole;
  /** Transfer account, and the kingdom it's coming from (missing until 0007 has been run). */
  transfer?: boolean;
  from_kingdom?: number | null;
  last_body: string | null;
  last_at: string | null;
  last_from_me: boolean | null;
  unread: number;
};

export type ChatMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
  /** Cached Azure translations, keyed by locale (0005_message_translations.sql). */
  translations: Record<string, string> | null;
};

/**
 * One entry in the bell (0010_notifications.sql). The database stores a kind plus its details, and
 * the browser writes the sentence in the reader's language. Kinds the site doesn't know are skipped.
 */
export type AppNotification = {
  id: string;
  kind: string;
  data: Record<string, unknown>;
  created_at: string;
  unread: boolean;
};
