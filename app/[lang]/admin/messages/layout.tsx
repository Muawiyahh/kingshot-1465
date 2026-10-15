import { MessagesShell } from "@/components/messages/messages-shell";

/** Leaders' inbox for members of 1465 and other leaders. Transfer accounts have their own. */
export default function MembersInboxLayout({ children }: LayoutProps<"/[lang]/admin/messages">) {
  return <MessagesShell inbox="members">{children}</MessagesShell>;
}
