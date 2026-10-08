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
import { markRead, sendMessage } from "./actions";

type Shown = ChatMessage & { pending?: boolean };

const MAX_LENGTH = 1000;

/** One conversation: header, bubbles grouped by day, and the composer. */
export function ChatPanel({ me, partner, messages }: { me: string; partner: Contact; messages: ChatMessage[] }) {
  const { locale, t, tag } = useI18n();
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
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <Link
          href={localePath(locale, "/account/messages")}
          className="-ml-1 flex size-9 items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-fg lg:hidden"
          aria-label={m.back}
        >
          <ArrowLeft className="size-5" aria-hidden />
        </Link>
        <AllianceAvatar tag={partner.alliance_tag} size={40} />
        <div className="min-w-0">
          <p className="truncate font-medium">{partner.ingame_name}</p>
          <p className="font-mono text-[11px] uppercase tracking-wider text-gold-soft">
            {t.admin.accounts.roles[partner.role]}
            {partner.alliance_tag && <span className="text-muted"> · [{partner.alliance_tag}]</span>}
          </p>
        </div>
      </div>

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
                    <div
                      className={clsx(
                        "max-w-[80%] rounded-2xl px-3 py-1.5 text-[15px] leading-snug whitespace-pre-wrap break-words shadow-[0_1px_0_rgba(0,0,0,0.25)]",
                        mine
                          ? "rounded-br-md bg-primary text-on-primary"
                          : "rounded-bl-md bg-card-hover text-fg shadow-[inset_0_0_0_1px_var(--border)]",
                        msg.pending && "opacity-70",
                      )}
                    >
                      {msg.body}
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
                    </div>
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
