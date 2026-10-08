"use client";

import type { ReactNode } from "react";
import clsx from "clsx";
import { useI18n } from "@/components/i18n-provider";
import { Card } from "@/components/ui";
import { ChatLoading } from "./chat-panel";
import { ConversationList } from "./conversation-list";
import { useMessages } from "./messages-context";

/**
 * Two panes like WhatsApp: conversations on the left, the open chat on the right. The list stays
 * mounted while you switch chats. Phones show one pane at a time, switching as soon as you tap.
 */
export function MessagesPanes({ header, children }: { header: ReactNode; children: ReactNode }) {
  const { activeId, pending } = useMessages();
  const { t } = useI18n();
  const m = t.account.messages;
  const open = activeId !== null;

  return (
    // data-chat-open lets the account layout hide its menu on phones while a chat fills the screen.
    <div data-chat-open={open ? "" : undefined}>
      <div className={clsx(open && "max-lg:hidden")}>{header}</div>
      <Card
        className={clsx(
          "grid overflow-hidden lg:h-[min(72dvh,44rem)] lg:min-h-[30rem] lg:grid-cols-[19rem_minmax(0,1fr)]",
          open && "max-lg:h-[calc(100dvh-10rem)] max-lg:min-h-[22rem]",
        )}
      >
        <section
          aria-label={m.listLabel}
          className={clsx("min-h-0 overflow-y-auto lg:border-r lg:border-border", open && "max-lg:hidden")}
        >
          <h2 className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted backdrop-blur">
            {m.listLabel}
          </h2>
          <ConversationList />
        </section>
        <div className={clsx("min-h-0 min-w-0", !open && "max-lg:hidden")}>
          {/* Swap to the clicked person's header straight away instead of waiting for the server. */}
          {pending && activeId !== null ? <ChatLoading /> : children}
        </div>
      </Card>
    </div>
  );
}
