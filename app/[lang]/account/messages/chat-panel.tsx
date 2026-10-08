"use client";

import Link from "next/link";
import { Fragment, useEffect, useLayoutEffect, useOptimistic, useRef, useState, useTransition } from "react";
import clsx from "clsx";
import { ArrowLeft, Check, CheckCheck, Clock, SendHorizontal } from "lucide-react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { useNow } from "@/components/use-now";
import { clockTime, dayLabel, differentDay } from "@/lib/chat-time";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import type { ChatMessage, Contact } from "@/lib/types";
import { markRead, sendMessage, translateMessage } from "./actions";
import { useMessages } from "./messages-context";

type Shown = ChatMessage & { pending?: boolean };

const MAX_LENGTH = 1000;

/** One conversation: header, bubbles grouped by day, and the composer. */
export function ChatPanel({
  me,
  partner,
  messages,
  canTranslate,
}: {
  me: string;
  partner: Contact;
  messages: ChatMessage[];
  /** Whether Azure Translator is configured; hides the Translate action otherwise. */
  canTranslate: boolean;
}) {
  const { t, tag } = useI18n();
  const m = t.account.messages;
  const now = useNow(60_000);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();
  const [shown, addPending] = useOptimistic<Shown[], Shown>(messages, (list, msg) => [...list, msg]);
  const scroller = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLTextAreaElement>(null);

  // Keep the newest message in view.
  useLayoutEffect(() => {
    const el = scroller.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [shown.length]);

  // Opening the chat, or a new message arriving while it's open, marks their messages read.
  const unreadFromThem = messages.filter((x) => x.sender_id === partner.partner_id && !x.read_at).length;
  useEffect(() => {
    if (unreadFromThem > 0) void markRead(partner.partner_id);
  }, [unreadFromThem, partner.partner_id]);

  function send() {
    const body = draft.trim();
    if (!body) return;
    if (body.length > MAX_LENGTH) {
      setError(t.errors.messageTooLong);
      return;
    }
    setError(null);
    setDraft("");
    startTransition(async () => {
      addPending({
        id: `pending-${Date.now()}`,
        sender_id: me,
        recipient_id: partner.partner_id,
        body,
        created_at: new Date().toISOString(),
        read_at: null,
        translations: null,
        pending: true,
      });
      const result = await sendMessage(partner.partner_id, body);
      if (result.error) {
        setError(result.error);
        setDraft(body);
      }
    });
    input.current?.focus();
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatHeader partner={partner} />

      <div
        ref={scroller}
        className="min-h-0 flex-1 overflow-y-auto bg-[radial-gradient(ellipse_at_top,rgba(214,58,68,0.06),transparent_60%)] px-3 py-4 sm:px-5"
        aria-live="polite"
      >
        {shown.length === 0 ? (
          <p className="mt-10 text-center text-sm text-muted">{fmt(m.empty, { name: partner.ingame_name })}</p>
        ) : (
          <ol className="space-y-1.5">
            {shown.map((msg, i) => {
              const mine = msg.sender_id === me;
              const newDay = i === 0 || differentDay(shown[i - 1].created_at, msg.created_at);
              const grouped = !newDay && shown[i - 1].sender_id === msg.sender_id;
              return (
                <Fragment key={msg.id}>
                  {newDay && now !== null && (
                    <li className="flex justify-center py-2" aria-hidden>
                      <span className="rounded-full bg-white/5 px-3 py-1 text-[11px] text-muted">
                        {dayLabel(msg.created_at, now, tag)}
                      </span>
                    </li>
                  )}
                  <li className={clsx("flex", mine ? "justify-end" : "justify-start", !grouped && "pt-1.5")}>
                    <Bubble msg={msg} mine={mine} now={now} canTranslate={canTranslate} />
                  </li>
                </Fragment>
              );
            })}
          </ol>
        )}
      </div>

      <form
        className="border-t border-border p-3"
        onSubmit={(e) => {
          e.preventDefault();
          send();
        }}
      >
        {error && (
          <p role="alert" className="mb-2 px-1 text-xs text-danger">
            {error}
          </p>
        )}
        <div className="flex items-end gap-2">
          <label htmlFor="message" className="sr-only">
            {m.placeholder}
          </label>
          <textarea
            id="message"
            ref={input}
            rows={1}
            value={draft}
            maxLength={MAX_LENGTH}
            placeholder={m.placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter sends, Shift+Enter starts a new line (as in WhatsApp on desktop).
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                send();
              }
            }}
            className="max-h-36 min-h-11 flex-1 resize-none rounded-2xl bg-bg-elevated px-4 py-2.5 text-[16px] text-fg [field-sizing:content] placeholder:text-muted/60 shadow-[inset_0_0_0_1px_var(--border-strong)] focus:shadow-[inset_0_0_0_1.5px_var(--gold)] focus:outline-none"
          />
          <button
            type="submit"
            disabled={!draft.trim()}
            aria-label={m.send}
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-40"
          >
            <SendHorizontal className="size-5" aria-hidden />
          </button>
        </div>
      </form>
    </div>
  );
}

/**
 * One message. Incoming messages (not mine) get a Translate action: the first tap calls Azure
 * Translator and caches the result on the message for next time (including for the other person);
 * a second tap just toggles the view, with no further request.
 */
function Bubble({
  msg,
  mine,
  now,
  canTranslate,
}: {
  msg: Shown;
  mine: boolean;
  now: number | null;
  canTranslate: boolean;
}) {
  const { t, locale } = useI18n();
  const m = t.account.messages;
  const cached = msg.translations?.[locale];
  // Every message opens showing the original; a tap reveals the translation (instantly if cached).
  const [shownText, setShownText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [, startTransition] = useTransition();

  function toggle() {
    if (shownText) {
      setShownText(null);
      return;
    }
    if (cached) {
      setShownText(cached);
      return;
    }
    setFailed(false);
    setLoading(true);
    startTransition(async () => {
      const result = await translateMessage(msg.id, locale);
      setLoading(false);
      if (result.text) setShownText(result.text);
      else setFailed(true);
    });
  }

  return (
    <div
      className={clsx(
        "max-w-[80%] rounded-2xl px-3 py-1.5 text-[15px] leading-snug shadow-[0_1px_0_rgba(0,0,0,0.25)]",
        mine
          ? "rounded-br-md bg-primary text-on-primary"
          : "rounded-bl-md bg-card-hover text-fg shadow-[inset_0_0_0_1px_var(--border)]",
        msg.pending && "opacity-70",
      )}
    >
      <span className="whitespace-pre-wrap break-words">{shownText ?? msg.body}</span>
      <span
        className={clsx(
          "float-right mt-1.5 ml-3 flex items-center gap-1 text-[10px] tabular-nums",
          mine ? "text-white/75" : "text-muted",
        )}
      >
        {now !== null && clockTime(msg.created_at)}
        {mine &&
          (msg.pending ? (
            <Clock className="size-3" aria-hidden />
          ) : msg.read_at ? (
            <CheckCheck className="size-3.5 text-gold-soft" aria-hidden />
          ) : (
            <Check className="size-3.5" aria-hidden />
          ))}
      </span>
      {canTranslate && !mine && !msg.pending && (
        <div className="clear-both pt-1">
          <button
            type="button"
            onClick={toggle}
            disabled={loading}
            className="cursor-pointer text-[11px] text-gold-soft underline-offset-2 hover:underline disabled:cursor-wait disabled:no-underline disabled:opacity-70"
          >
            {loading ? m.translating : shownText ? m.showOriginal : m.translate}
          </button>
          {failed && <p className="mt-0.5 text-[11px] text-danger">{t.errors.translateFailed}</p>}
        </div>
      )}
    </div>
  );
}

/** Name, banner and role of the person you're talking to, with a back arrow on phones. */
function ChatHeader({ partner }: { partner: Contact | undefined }) {
  const { locale, t } = useI18n();
  const { open } = useMessages();
  return (
    <div className="flex items-center gap-3 border-b border-border px-4 py-3">
      <Link
        href={localePath(locale, "/account/messages")}
        onClick={() => open(null)}
        className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-fg lg:hidden"
        aria-label={t.account.messages.back}
      >
        <ArrowLeft className="size-5" aria-hidden />
      </Link>
      {partner ? (
        <>
          <AllianceAvatar tag={partner.alliance_tag} size={40} />
          <div className="min-w-0">
            <p className="truncate font-medium">{partner.ingame_name}</p>
            <p className="font-mono text-[11px] uppercase tracking-wider text-gold-soft">
              {t.admin.accounts.roles[partner.role]}
              {partner.alliance_tag && <span className="text-muted"> · [{partner.alliance_tag}]</span>}
            </p>
          </div>
        </>
      ) : (
        <>
          <span className="size-10 animate-pulse rounded-full bg-white/5" />
          <span className="h-4 w-32 animate-pulse rounded bg-white/5" />
        </>
      )}
    </div>
  );
}

/**
 * Shown the moment a conversation is clicked, while its messages load: the real header (from the
 * list, already on screen) over an empty chat, so the pane never goes blank.
 */
export function ChatLoading() {
  const { contacts, activeId } = useMessages();
  const { t } = useI18n();
  const partner = contacts.find((c) => c.partner_id === activeId);
  return (
    <div className="flex h-full min-h-0 flex-col" aria-busy>
      <ChatHeader partner={partner} />
      <div className="flex min-h-0 flex-1 flex-col justify-end gap-2 bg-[radial-gradient(ellipse_at_top,rgba(214,58,68,0.06),transparent_60%)] px-3 py-4 sm:px-5">
        <span className="h-9 w-2/5 animate-pulse self-start rounded-2xl rounded-bl-md bg-white/[0.04]" />
        <span className="h-9 w-1/3 animate-pulse self-end rounded-2xl rounded-br-md bg-primary/10" />
        <span className="h-9 w-1/2 animate-pulse self-start rounded-2xl rounded-bl-md bg-white/[0.04]" />
      </div>
      <div className="border-t border-border p-3">
        <div className="flex items-end gap-2">
          <div className="flex h-11 flex-1 items-center rounded-2xl bg-bg-elevated px-4 text-[16px] text-muted/60 shadow-[inset_0_0_0_1px_var(--border-strong)]">
            {t.account.messages.placeholder}
          </div>
          <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary text-on-primary opacity-40">
            <SendHorizontal className="size-5" aria-hidden />
          </span>
        </div>
      </div>
    </div>
  );
}
