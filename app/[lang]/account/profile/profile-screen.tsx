import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeleton";
import { Card, PageHeader } from "@/components/ui";
import { isLeader } from "@/lib/auth";
import { requireProfile } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { ProfileForm } from "./profile-form";

/**
 * Name and alliance, for players (Account → Profile) and for leaders inside the admin panel
 * (Admin → Your account → Profile), so the admin menu never gives way to another one.
 */
export async function ProfileScreen({ path, leadersTo }: { path: string; leadersTo?: string }) {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader eyebrow={t.account.eyebrow} title={t.account.profile.title}>
        {t.account.profile.intro}
      </PageHeader>
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <ProfileContent path={path} leadersTo={leadersTo} />
      </Suspense>
    </>
  );
}

async function ProfileContent({ path, leadersTo }: { path: string; leadersTo?: string }) {
  const [profile, { locale }] = await Promise.all([requireProfile(path), getI18n()]);
  if (leadersTo && isLeader(profile)) redirect(localePath(locale, leadersTo));
  return (
    <Card className="max-w-2xl p-6 sm:p-8">
      <ProfileForm profile={profile} />
    </Card>
  );
}
