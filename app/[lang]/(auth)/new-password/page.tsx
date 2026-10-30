import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { mustChangePassword } from "@/lib/password-reset";
import { createClient } from "@/lib/supabase/server";
import { AuthShell } from "../auth-shell";
import { NewPasswordForm } from "../auth-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.newPassword };
}

/** Where a player lands after signing in with a temporary password from an admin. */
export default async function NewPasswordPage() {
  const { t } = await getI18n();
  const n = t.auth.newPassword;
  return (
    <AuthShell title={n.title} subtitle={n.subtitle}>
      <Suspense fallback={<NewPasswordForm />}>
        <OnlyAfterReset />
      </Suspense>
    </AuthShell>
  );
}

/** Anyone without a pending reset has nothing to do here. */
async function OnlyAfterReset() {
  await connection();
  const [{ locale }, supabase] = await Promise.all([getI18n(), createClient()]);
  const { data } = await supabase.auth.getClaims();
  if (!data?.claims?.sub) redirect(localePath(locale, "/login"));
  if (!mustChangePassword(data.claims)) redirect(localePath(locale, "/account"));
  return <NewPasswordForm />;
}
