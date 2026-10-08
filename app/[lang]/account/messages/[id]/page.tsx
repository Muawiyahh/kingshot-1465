import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { getUserId } from "@/lib/auth";
import { requireProfile } from "@/lib/auth-guards";
import { getI18n } from "@/lib/i18n/server";
import { getConversations, getThread, isUuid } from "@/lib/messages";
import { ChatLoading, ChatPanel } from "../chat-panel";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.messages };
}

/** The chat pane. Its fallback shows the header and composer instantly while messages load. */
export default function ConversationPage({ params }: PageProps<"/[lang]/account/messages/[id]">) {
  return (
    <Suspense fallback={<ChatLoading />}>
      <Conversation params={params} />
    </Suspense>
  );
}

async function Conversation({ params }: { params: PageProps<"/[lang]/account/messages/[id]">["params"] }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  // Only the user's ID is needed, so skip the profile lookup and load the list and chat together.
  const me = (await getUserId()) ?? (await requireProfile(`/account/messages/${id}`)).id;
  const [{ ready, contacts }, messages] = await Promise.all([getConversations(), getThread(me, id)]);
  if (!ready) return null;

  // Only people from the user's own list can be opened, so a guessed ID shows nothing.
  const partner = contacts.find((c) => c.partner_id === id);
  if (!partner) notFound();

  return <ChatPanel key={partner.partner_id} me={me} partner={partner} messages={messages} />;
}
