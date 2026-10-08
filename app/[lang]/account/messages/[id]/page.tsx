import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { requireProfile } from "@/lib/auth-guards";
import { getI18n } from "@/lib/i18n/server";
import { getConversations, getThread } from "@/lib/messages";
import { ChatPanel } from "../chat-panel";
import { MessagesShell } from "../messages-shell";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.messages };
}

export default function ConversationPage({ params }: PageProps<"/[lang]/account/messages/[id]">) {
  return (
    <Suspense fallback={<div className="h-[32rem] animate-pulse rounded-3xl bg-card" />}>
      <Conversation params={params} />
    </Suspense>
  );
}

async function Conversation({ params }: { params: PageProps<"/[lang]/account/messages/[id]">["params"] }) {
  const { id } = await params;
  const profile = await requireProfile(`/account/messages/${id}`);
  const { ready, contacts } = await getConversations();
  if (!ready) return <MessagesShell me={profile.id} ready={false} contacts={[]} activeId={null} />;

  // Only people from the user's own list can be opened, so a guessed ID shows nothing.
  const partner = contacts.find((c) => c.partner_id === id);
  if (!partner) notFound();
  const messages = await getThread(profile.id, partner.partner_id);

  return (
    <MessagesShell me={profile.id} ready contacts={contacts} activeId={partner.partner_id}>
      <ChatPanel key={partner.partner_id} me={profile.id} partner={partner} messages={messages} />
    </MessagesShell>
  );
}
