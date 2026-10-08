import type { ReactNode } from "react";
import { Suspense } from "react";
import { Bone } from "@/components/skeleton";
import { Card, Notice, PageHeader } from "@/components/ui";
import { requireProfile } from "@/lib/auth-guards";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import { getConversations } from "@/lib/messages";
import { MessagesProvider } from "./messages-context";
import { MessagesLive } from "./messages-live";
import { MessagesPanes } from "./messages-panes";

/**
 * Loads the conversation list once. Switching chats only loads the chat pane, because Next keeps
 * shared layouts mounted between sibling pages.
 */
export default async function MessagesLayout({ children }: LayoutProps<"/[lang]/account/messages">) {
  const { t } = await getI18n();
  const m = t.account.messages;
  const header = (
    <PageHeader eyebrow={t.account.eyebrow} title={m.title}>
      {m.intro}
    </PageHeader>
  );
  return (
    <Suspense
      fallback={
        <>
          {header}
          <MessagesSkeleton />
        </>
      }
    >
      <MessagesFrame header={header}>{children}</MessagesFrame>
    </Suspense>
  );
}

async function MessagesFrame({ header, children }: { header: ReactNode; children: ReactNode }) {
  // Profile check and conversation list load together.
  const [profile, { t }, { ready, contacts }] = await Promise.all([
    requireProfile("/account/messages"),
    getI18n(),
    getConversations(),
  ]);

  if (!ready) {
    return (
      <>
        {header}
        <Notice tone="warning">
          {rich(t.account.messages.notSetUp, {
            file: <span className="font-mono">supabase/migrations/0004_messages.sql</span>,
          })}
        </Notice>
      </>
    );
  }

  return (
    <MessagesProvider contacts={contacts}>
      <MessagesPanes header={header}>{children}</MessagesPanes>
      <MessagesLive me={profile.id} />
    </MessagesProvider>
  );
}

/** Two panes like the real screen: a few conversation rows and an empty chat area. */
function MessagesSkeleton() {
  return (
    <Card className="grid overflow-hidden lg:h-[min(72dvh,44rem)] lg:min-h-[30rem] lg:grid-cols-[19rem_minmax(0,1fr)]" aria-hidden>
      <div className="lg:border-r lg:border-border">
        <div className="border-b border-border px-4 py-3">
          <Bone className="h-3 w-24" />
        </div>
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-3 border-b border-border px-4 py-3">
            <Bone className="size-[46px] shrink-0 rounded-full" />
            <span className="flex-1 space-y-2">
              <Bone className="h-4 w-28" />
              <Bone className="h-3 w-40" />
            </span>
          </div>
        ))}
      </div>
      <div className="hidden lg:block" />
    </Card>
  );
}
