import type { ReactNode } from "react";
import clsx from "clsx";
import { MessagesSquare } from "lucide-react";
import { Card, Notice, PageHeader } from "@/components/ui";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import type { Contact } from "@/lib/types";
import { ConversationList } from "./conversation-list";
import { MessagesLive } from "./messages-live";

/**
 * Two panes like WhatsApp on desktop: conversations on the left, the open chat on the right.
 * Phones show one at a time, the list until a conversation is opened.
 */
export async function MessagesShell({
  me,
  ready,
  contacts,
  activeId,
  children,
}: {
  me: string;
  ready: boolean;
  contacts: Contact[];
  activeId: string | null;
  children?: ReactNode;
}) {
  const { t } = await getI18n();
  const m = t.account.messages;
  const open = activeId !== null;

  return (
    <>
      <div className={clsx(open && "max-lg:hidden")}>
        <PageHeader eyebrow={t.account.eyebrow} title={m.title}>
          {m.intro}
        </PageHeader>
      </div>
      {!ready ? (
        <Notice tone="warning">
          {rich(m.notSetUp, { file: <span className="font-mono">supabase/migrations/0004_messages.sql</span> })}
        </Notice>
      ) : (
        <Card
          className={clsx(
            "grid overflow-hidden lg:h-[min(72dvh,44rem)] lg:min-h-[30rem] lg:grid-cols-[19rem_minmax(0,1fr)]",
            open && "h-[calc(100dvh-13rem)] min-h-[26rem]",
          )}
        >
          <section
            aria-label={m.listLabel}
            className={clsx("min-h-0 overflow-y-auto lg:border-r lg:border-border", open && "max-lg:hidden")}
          >
            <h2 className="sticky top-0 z-10 border-b border-border bg-card/95 px-4 py-3 font-mono text-[11px] uppercase tracking-[0.18em] text-muted backdrop-blur">
              {m.listLabel}
            </h2>
            <ConversationList contacts={contacts} activeId={activeId} />
          </section>
          <div className={clsx("min-h-0 min-w-0", !open && "max-lg:hidden")}>
            {children ?? (
              <div className="flex h-full flex-col items-center justify-center gap-3 p-8 text-center text-muted">
                <MessagesSquare className="size-10 text-primary/60" aria-hidden />
                <p className="max-w-xs text-sm">{m.choose}</p>
              </div>
            )}
          </div>
        </Card>
      )}
      {ready && <MessagesLive me={me} />}
    </>
  );
}
