import type { Metadata } from "next";
import { ProfileScreen } from "@/app/[lang]/account/profile/profile-screen";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.profile };
}

/** A leader's own name and alliance, inside the admin panel (Your account → Profile). */
export default function AdminProfilePage() {
  return <ProfileScreen path="/admin/profile" />;
}
