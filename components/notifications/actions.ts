"use server";

import { getUserId } from "@/lib/auth";
import { getNotifications, type NotificationsState } from "@/lib/notifications";
import { createClient } from "@/lib/supabase/server";

/** The bell's list, reloaded when something changes. */
export async function loadNotifications(): Promise<NotificationsState> {
  if (!(await getUserId())) return { ready: true, items: [] };
  return getNotifications();
}

/** Opening the bell marks everything up to now as read. */
export async function markNotificationsSeen() {
  if (!(await getUserId())) return;
  const supabase = await createClient();
  await supabase.rpc("mark_notifications_seen");
}
