import type { Metadata } from "next";
import { fmt } from "@/lib/i18n/format";
import { getI18n } from "@/lib/i18n/server";
import { site } from "@/lib/site";
import { AuthShell } from "../auth-shell";
import { SignupForm } from "../auth-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.join };
}

export default async function SignupPage() {
  const { t } = await getI18n();
  return (
    <AuthShell title={fmt(t.auth.signupTitle, { name: fmt(t.common.kingdomName, { n: site.kingdom }) })} subtitle={t.auth.signupSubtitle}>
      <SignupForm />
    </AuthShell>
  );
}
