import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowRight } from "lucide-react";
import { ButtonLink } from "@/components/ui";
import { getUserId } from "@/lib/auth";
import { localePath } from "@/lib/i18n/config";
import { getI18n } from "@/lib/i18n/server";
import { isUuid } from "@/lib/messages";
import { AuthShell } from "../auth-shell";
import { TransferSignupForm } from "../auth-forms";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.transfer };
}

/** Transfer accounts for players in other kingdoms. `?to=` is the transfer manager they picked. */
export default async function TransferPage({ searchParams }: PageProps<"/[lang]/transfer">) {
  const { t } = await getI18n();
  return (
    <AuthShell title={t.auth.transfer.title} subtitle={t.auth.transfer.subtitle}>
      <Suspense fallback={<TransferSignupForm />}>
        <TransferForPicked searchParams={searchParams} />
      </Suspense>
    </AuthShell>
  );
}

async function TransferForPicked({ searchParams }: { searchParams: PageProps<"/[lang]/transfer">["searchParams"] }) {
  const [{ to }, me, { locale, t }] = await Promise.all([searchParams, getUserId(), getI18n()]);
  const manager = typeof to === "string" && isUuid(to) ? to : undefined;

  // Already signed in: skip the form and go straight to the chat.
  if (me) {
    return (
      <div className="space-y-5 text-center">
        <p className="text-sm text-muted">{t.auth.transfer.signedIn}</p>
        <ButtonLink href={localePath(locale, manager ? `/account/messages/${manager}` : "/account/messages")} className="w-full">
          {t.auth.transfer.openMessages}
          <ArrowRight className="size-4" aria-hidden />
        </ButtonLink>
      </div>
    );
  }
  return <TransferSignupForm to={manager} />;
}
