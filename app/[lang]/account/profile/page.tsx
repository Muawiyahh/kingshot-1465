import type { Metadata } from "next";
import { getI18n } from "@/lib/i18n/server";
import { ProfileScreen } from "./profile-screen";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.profile };
}

/** Players' profile. Leaders edit theirs inside the admin panel (/admin/profile). */
export default function ProfilePage() {
  return <ProfileScreen path="/account/profile" leadersTo="/admin/profile" />;
}
