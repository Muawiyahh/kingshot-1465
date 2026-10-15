import type { ReactNode } from "react";
import { Suspense } from "react";
import { notFound, redirect } from "next/navigation";
import { Bone } from "@/components/skeleton";
import { Card, Notice, PageHeader } from "@/components/ui";
import { getProfile, getUserId, isLeader } from "@/lib/auth";
import { requireLeader, requireProfile } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import type { Messages } from "@/lib/i18n/messages";
import { rich } from "@/lib/i18n/rich";
import { getI18n } from "@/lib/i18n/server";
import { getConversations, getThread, isUuid } from "@/lib/messages";
import { translateConfigured } from "@/lib/translate";
import type { Contact } from "@/lib/types";
import { ChatLoading, ChatPanel } from "./chat-panel";
import { MessagesProvider } from "./messages-context";
import { MessagesLive } from "./messages-live";
import { MessagesPanes } from "./messages-panes";

/**
 * The three inboxes. Players use their account's; leaders and admins read members and transfer
 * accounts (players still in another kingdom) separately in the admin panel.
 */
export type Inbox = "account" | "members" | "transfers";

export const INBOX_PATH: Record<Inbox, string> = {
  account: "/account/messages",
  members: "/admin/messages",
  transfers: "/admin/transfer-messages",
};

/** The admin inbox a conversation belongs in. */
const adminInbox = (c: Contact): Inbox => (c.transfer ? "transfers" : "members");

function inInbox(c: Contact, inbox: Inbox) {
  return inbox === "account" || adminInbox(c) === inbox;
}

function heading(inbox: Inbox, t: Messages) {
  if (inbox === "account") return { eyebrow: t.account.eyebrow, title: t.account.messages.title, intro: t.account.messages.intro };
  if (inbox === "members") return { eyebrow: t.admin.nav.groups.players, title: t.account.messages.title, intro: t.admin.messages.intro };
  return { eyebrow: t.admin.nav.groups.players, title: t.admin.nav.transferMessages, intro: t.admin.transferMessages.intro };
}

function emptyText(inbox: Inbox, t: Messages) {
  if (inbox === "account") return t.account.messages.noContacts;
  return inbox === "members" ? t.admin.messages.empty : t.admin.transferMessages.empty;
}

/**
 * An inbox's layout: header, conversation list and the chat pane (`children`). Loads the list once;
 * switching chats only loads the chat pane, because Next keeps shared layouts mounted.
 */
export async function MessagesShell({ inbox, children }: { inbox: Inbox; children: ReactNode }) {
  const { t } = await getI18n();
  const h = heading(inbox, t);
  const header = (
    <PageHeader eyebrow={h.eyebrow} title={h.title}>
      {h.intro}
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
      <MessagesFrame inbox={inbox} header={header}>
        {children}
      </MessagesFrame>
    </Suspense>
  );
}

async function MessagesFrame({ inbox, header, children }: { inbox: Inbox; header: ReactNode; children: ReactNode }) {
  // Profile check and conversation list load together.
  const [profile, { t }, { ready, contacts }] = await Promise.all([
    inbox === "account" ? requireProfile(INBOX_PATH.account) : requireLeader(),
    getI18n(),
    getConversations(),
  ]);
  // Leaders read their messages in the admin panel, split into members and transfer accounts. The
  // account inbox's pages send them there, keeping the chat that was asked for, so only those render.
  if (inbox === "account" && isLeader(profile)) return <>{children}</>;

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
    <MessagesProvider
      contacts={contacts.filter((c) => inInbox(c, inbox))}
      basePath={INBOX_PATH[inbox]}
      emptyText={emptyText(inbox, t)}
    >
      <MessagesPanes header={header}>{children}</MessagesPanes>
      <MessagesLive me={profile.id} />
    </MessagesProvider>
  );
}

/** For the account inbox's own page: leaders go to the admin inbox instead. */
export async function leadersToAdminInbox() {
  const [profile, { locale }] = await Promise.all([getProfile(), getI18n()]);
  if (isLeader(profile)) redirect(localePath(locale, INBOX_PATH.members));
}

/** The chat pane of an inbox. Its fallback shows the header and composer instantly while messages load. */
export function ConversationPane({ params, inbox }: { params: Promise<{ id: string }>; inbox: Inbox }) {
  return (
    <Suspense fallback={<ChatLoading />}>
      <Conversation params={params} inbox={inbox} />
    </Suspense>
  );
}

async function Conversation({ params, inbox }: { params: Promise<{ id: string }>; inbox: Inbox }) {
  const { id } = await params;
  if (!isUuid(id)) notFound();
  // Only the user's ID is needed, so skip the profile lookup and load the list and chat together.
  const me = (await getUserId()) ?? (await requireProfile(`${INBOX_PATH[inbox]}/${id}`)).id;
  const [{ ready, contacts }, messages, { locale }] = await Promise.all([getConversations(), getThread(me, id), getI18n()]);
  if (!ready) return null;

  // Only people from the user's own list can be opened, so a guessed ID shows nothing.
  const partner = contacts.find((c) => c.partner_id === id);
  if (!partner) notFound();

  // A chat opened from the wrong inbox (an old link, say) moves to the right one.
  const leader = inbox === "account" ? isLeader(await getProfile()) : true;
  const home = inbox === "account" && !leader ? "account" : adminInbox(partner);
  if (home !== inbox) redirect(localePath(locale, `${INBOX_PATH[home]}/${id}`));

  return (
    <ChatPanel key={partner.partner_id} me={me} partner={partner} messages={messages} canTranslate={translateConfigured} />
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
            <Bone className="size-[2.875rem] shrink-0 rounded-full" />
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
