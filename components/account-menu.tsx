"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown, LogOut, ShieldCheck } from "lucide-react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { SECTION_ICONS } from "@/components/section-icons";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { signOut } from "@/app/[lang]/(auth)/actions";

/**
 * The signed-in user's avatar, opening a small menu with everything personal: the account
 * sections, Admin for leaders, and Sign out. Keeps the top bar to a single control.
 */
export function AccountMenu({
  name,
  tag,
  gameId,
  unread,
  leader,
}: {
  name: string;
  tag: string | null;
  gameId: string;
  unread: number;
  leader: boolean;
}) {
  const { locale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const href = (path: string) => localePath(locale, path);
  const unreadText = unread > 0 ? fmt(t.account.messages.unread, { n: unread }) : null;

  // Close on a click outside or Escape (focus returns to the avatar).
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        button.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const items = [
    { key: "overview" as const, path: "/account", label: t.account.nav.label },
    { key: "appointments" as const, path: "/account/appointments", label: t.account.nav.appointments },
    { key: "messages" as const, path: "/account/messages", label: t.account.nav.messages, count: unread },
    { key: "profile" as const, path: "/account/profile", label: t.account.nav.profile },
  ];
  const itemClass =
    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-muted transition-colors hover:bg-white/5 hover:text-fg";

  return (
    <div ref={root} className="relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={unreadText ? `${t.nav.accountMenu}, ${unreadText}` : t.nav.accountMenu}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 cursor-pointer items-center gap-1 rounded-full pr-1.5 pl-1 transition-colors hover:bg-white/5 aria-expanded:bg-white/5"
      >
        <span className="relative">
          <AllianceAvatar tag={tag} size={32} />
          {/* Unread messages: a red dot on the avatar, like an app badge. */}
          {unread > 0 && (
            <span className="absolute -top-0.5 -right-0.5 size-3 rounded-full bg-primary shadow-[0_0_0_2px_var(--bg)]" aria-hidden />
          )}
        </span>
        <ChevronDown className={clsx("size-4 text-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>

      <div
        id={panelId}
        className={clsx(
          "absolute top-full right-0 z-50 mt-2 w-64 origin-top-right rounded-2xl bg-card p-2 shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7),inset_0_0_0_1px_var(--border-strong)] transition duration-150",
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-95 opacity-0",
        )}
      >
        <div className="flex items-center gap-3 px-3 pt-2 pb-3">
          <AllianceAvatar tag={tag} size={40} />
          <div className="min-w-0">
            <p className="truncate font-medium text-fg">{name}</p>
            <p className="font-mono text-xs text-muted">{fmt(t.common.id, { id: gameId })}</p>
          </div>
        </div>
        <div className="border-t border-border pt-1.5">
          {items.map((item) => {
            const Icon = SECTION_ICONS[item.key];
            return (
              <Link key={item.key} href={href(item.path)} onClick={() => setOpen(false)} className={itemClass}>
                <Icon className="size-4 shrink-0" aria-hidden />
                <span className="flex-1">{item.label}</span>
                {item.count ? (
                  <span className="rounded-full bg-primary px-1.5 text-[11px] leading-5 font-semibold text-on-primary tabular-nums">
                    {item.count}
                  </span>
                ) : null}
              </Link>
            );
          })}
          {leader && (
            <Link href={href("/admin")} onClick={() => setOpen(false)} className={itemClass}>
              <ShieldCheck className="size-4 shrink-0 text-gold" aria-hidden />
              <span className="flex-1">{t.nav.admin}</span>
            </Link>
          )}
        </div>
        <form action={signOut} className="mt-1.5 border-t border-border pt-1.5">
          <button type="submit" className={itemClass}>
            <LogOut className="size-4 shrink-0" aria-hidden />
            {t.nav.signOut}
          </button>
        </form>
      </div>
    </div>
  );
}
