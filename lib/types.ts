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
