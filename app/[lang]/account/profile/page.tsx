import type { Metadata } from "next";
import { Suspense } from "react";
import { FormSkeleton } from "@/components/skeleton";
import { Card, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth-guards";
import { getI18n } from "@/lib/i18n/server";
import { ProfileForm } from "./profile-form";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.profile };
}

export default async function ProfilePage() {
  const { t } = await getI18n();
  return (
    <>
      <PageHeader eyebrow={t.account.eyebrow} title={t.account.profile.title}>
        {t.account.profile.intro}
      </PageHeader>
      <Suspense fallback={<FormSkeleton fields={3} />}>
        <ProfileContent />
      </Suspense>
    </>
  );
}

async function ProfileContent() {
  const profile = await requireProfile("/account/profile");
  return (
    <Card className="max-w-2xl p-6 sm:p-8">
      <ProfileForm profile={profile} />
    </Card>
  );
}
