import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { AppNotification } from "@/lib/types";

/** Error codes meaning 0010_notifications.sql hasn't been run yet (missing function or table). */
const NOT_SET_UP = new Set(["PGRST202", "PGRST205", "42883", "42P01"]);

/** How many the bell shows. */
export const NOTIFICATION_LIMIT = 30;

export type NotificationsState = { ready: boolean; items: AppNotification[] };

/**
 * The signed-in user's newest notifications, with which are unread. RLS picks the rows. `ready` is
 * false until the notifications migration has been run. Once per request.
 */
export const getNotifications = cache(async (): Promise<NotificationsState> => {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("my_notifications", { p_limit: NOTIFICATION_LIMIT });
  if (error) return { ready: !NOT_SET_UP.has(error.code ?? ""), items: [] };
  return { ready: true, items: (data ?? []) as AppNotification[] };
});
