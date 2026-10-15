import type { Metadata } from "next";
import { ChoosePane } from "@/components/messages/choose-pane";
import { leadersToAdminInbox } from "@/components/messages/messages-shell";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.messages };
}

export default async function MessagesPage() {
  await leadersToAdminInbox();
  return <ChoosePane />;
}
