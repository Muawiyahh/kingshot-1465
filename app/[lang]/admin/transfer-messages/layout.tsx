import { MessagesShell } from "@/components/messages/messages-shell";

/** Leaders' inbox for transfer accounts: players still in another kingdom. */
export default function TransferInboxLayout({ children }: LayoutProps<"/[lang]/admin/transfer-messages">) {
  return <MessagesShell inbox="transfers">{children}</MessagesShell>;
}
