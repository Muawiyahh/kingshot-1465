import { MessagesShell } from "@/components/messages/messages-shell";

/** Players' inbox. Leaders are sent to the admin panel, where members and transfer accounts are apart. */
export default function MessagesLayout({ children }: LayoutProps<"/[lang]/account/messages">) {
  return <MessagesShell inbox="account">{children}</MessagesShell>;
}
