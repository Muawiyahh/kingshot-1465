import { redirect } from "next/navigation";
import { localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";

/**
 * The schedule used to be public here. It's for signed-in members now, under Account → KvK schedule;
 * old links land there (or on sign-in first).
 */
export default async function PositionsPage() {
  const { locale } = await getI18n();
  redirect(localePath(locale, "/account/schedule"));
}
