import type { Metadata } from "next";
import { MessagesSquare } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.messages };
}

/** Right-hand pane before a conversation is picked (desktop; phones show only the list). */
export default async function MessagesPage() {
  const { t } = await getI18n();
  return (
    <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted">
      <MessagesSquare className="size-10 text-primary/60" aria-hidden />
      <p className="max-w-xs text-sm">{t.account.messages.choose}</p>
    </div>
  );
}
