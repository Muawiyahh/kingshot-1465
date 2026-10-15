import type { Metadata } from "next";
import { ConversationPane } from "@/components/messages/messages-shell";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.adminTransferMessages };
}

export default function TransferConversationPage({ params }: PageProps<"/[lang]/admin/transfer-messages/[id]">) {
  return <ConversationPane params={params} inbox="transfers" />;
}
