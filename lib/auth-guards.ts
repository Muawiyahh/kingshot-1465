import { redirect } from "next/navigation";
import { getProfile, isLeader } from "@/lib/auth";
import { localePath } from "@/lib/i18n/config";
import { getLocale } from "@/lib/i18n/server";

/**
 * Page guards for Server Components. Kept apart from lib/auth.ts because they
 * read the URL locale, which Server Actions can't do.
 */
export async function requireProfile(next = "/account") {
  const [profile, locale] = await Promise.all([getProfile(), getLocale()]);
  if (!profile) {
    redirect(`${localePath(locale, "/login")}?next=${encodeURIComponent(localePath(locale, next))}`);
  }
  return profile;
}

export async function requireLeader() {
  const profile = await requireProfile("/admin");
  if (!isLeader(profile)) redirect(localePath(await getLocale(), "/account"));
  return profile;
}
