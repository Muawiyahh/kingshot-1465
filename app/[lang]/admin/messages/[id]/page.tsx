import type { Metadata } from "next";
import { ConversationPane } from "@/components/messages/messages-shell";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.messages };
}

export default function MembersConversationPage({ params }: PageProps<"/[lang]/admin/messages/[id]">) {
  return <ConversationPane params={params} inbox="members" />;
}
