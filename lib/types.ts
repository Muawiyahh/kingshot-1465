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
  speedup_days: number;
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
};

/** Result shape returned by Server Actions to useActionState forms. */
export type ActionState = { ok?: boolean; error?: string; message?: string } | undefined;

/** What auto-fill did: how many players it placed, and who it couldn't find a free time for. */
export type FillReport = { placed: number; skipped: string[] };
export type FillState = { ok?: boolean; error?: string; message?: string; report?: FillReport } | undefined;

/** One day/position of an event as the leaders' workspace loads it (one nested query). */
export type WorkspaceDay = EventDay & {
  slots: { id: string; slot_index: number; locked: boolean; profile_id: string | null; profile: { ingame_name: string; alliance_tag: string | null } | null }[];
  applications: (Pick<Application, "id" | "profile_id" | "preferred_slots" | "anytime" | "speedup_days" | "note" | "status" | "created_at"> & {
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
