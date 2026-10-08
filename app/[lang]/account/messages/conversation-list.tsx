"use client";

import Link from "next/link";
import clsx from "clsx";
import { AllianceAvatar } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { useNow } from "@/components/use-now";
import { listTime } from "@/lib/chat-time";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import type { Contact } from "@/lib/types";

/** WhatsApp-style list: banner avatar, name and role, last message, time and unread count. */
export function ConversationList({ contacts, activeId }: { contacts: Contact[]; activeId: string | null }) {
  const { locale, t, tag } = useI18n();
  const m = t.account.messages;
  const now = useNow(60_000);

  if (contacts.length === 0) {
    return <p className="p-6 text-sm text-muted">{m.noContacts}</p>;
  }

  return (
    <ul>
      {contacts.map((c) => {
        const active = c.partner_id === activeId;
        const unread = c.unread > 0;
        return (
          <li key={c.partner_id}>
            <Link
              href={localePath(locale, `/account/messages/${c.partner_id}`)}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "flex items-center gap-3 border-b border-border px-4 py-3 transition-colors",
                active ? "bg-primary/10" : "hover:bg-white/[0.04]",
              )}
            >
              <AllianceAvatar tag={c.alliance_tag} size={46} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={clsx("truncate", unread ? "font-semibold text-fg" : "font-medium text-fg")}>
                    {c.ingame_name}
                  </span>
                  {c.role !== "player" && (
                    <span className="shrink-0 rounded-full bg-gold/10 px-1.5 py-px font-mono text-[10px] uppercase tracking-wider text-gold-soft">
                      {t.admin.accounts.roles[c.role]}
                    </span>
                  )}
                  <span
                    className={clsx(
                      "ml-auto shrink-0 text-[11px] tabular-nums",
                      unread ? "font-semibold text-primary" : "text-muted",
                    )}
                  >
                    {c.last_at && now !== null ? listTime(c.last_at, now, tag) : ""}
                  </span>
                </span>
                <span className="mt-0.5 flex items-center gap-2">
                  <span className={clsx("truncate text-sm", unread ? "text-fg" : "text-muted")}>
                    {c.last_body === null ? (
                      <span className="italic text-muted/70">{m.noMessagesYet}</span>
                    ) : c.last_from_me ? (
                      fmt(m.you, { text: c.last_body })
                    ) : (
                      c.last_body
                    )}
                  </span>
                  {unread && (
                    <span
                      className="ml-auto shrink-0 rounded-full bg-primary px-1.5 text-[11px] leading-5 font-semibold text-on-primary tabular-nums"
                      aria-label={fmt(m.unread, { n: c.unread })}
                    >
                      {c.unread}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}
