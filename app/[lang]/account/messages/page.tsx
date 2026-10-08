import type { Metadata } from "next";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth-guards";
import { getI18n } from "@/lib/i18n/server";
import { getConversations } from "@/lib/messages";
import { MessagesShell } from "./messages-shell";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.messages };
}

export default function MessagesPage() {
  return (
    <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-3xl bg-card" />}>
      <Inbox />
    </Suspense>
  );
}

async function Inbox() {
  const profile = await requireProfile("/account/messages");
  const { ready, contacts } = await getConversations();
  return <MessagesShell me={profile.id} ready={ready} contacts={contacts} activeId={null} />;
}
