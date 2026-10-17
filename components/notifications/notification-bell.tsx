"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { Bell, BellOff } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";
import { getBrowserClient } from "@/lib/supabase/client";
import { supabaseConfigured } from "@/lib/supabase/config";
import type { AppNotification } from "@/lib/types";
import { loadNotifications, markNotificationsSeen } from "./actions";
import { describe, timeAgo, type Tone } from "./describe";

const TONES: Record<Tone, string> = {
  success: "bg-success/12 text-success",
  gold: "bg-gold/12 text-gold",
  primary: "bg-primary/15 text-primary",
  muted: "bg-white/5 text-muted",
};

/** Reload at most this often when the tab comes back into view. */
const STALE_MS = 30_000;

/**
 * The bell in the top bar: a count of unread notifications, and a panel listing the newest.
 * Opening it marks everything read; what was new stays marked until the panel closes. Updates
 * live (RLS decides which rows reach the browser), or polls if Realtime can't connect.
 */
export function NotificationBell({
  me,
  initial,
  ready,
  leader,
}: {
  me: string;
  initial: AppNotification[];
  ready: boolean;
  leader: boolean;
}) {
  const { locale, t } = useI18n();
  const tn = t.notifications;
  const [items, setItems] = useState(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  const [open, setOpen] = useState(false);
  // The list renders from the first open on, so times are worked out in the browser only.
  const [now, setNow] = useState<number | null>(null);
  const [fresh, setFresh] = useState<Set<string>>(() => new Set());
  const openRef = useRef(false);
  const loadedAt = useRef(0);
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const panelId = useId();
  const titleId = useId();

  // New data from the server (a page refresh after saving, say) replaces the list.
  if (initial !== prevInitial) {
    setPrevInitial(initial);
    setItems(initial);
  }

  const known = items.filter((n) => describe(n, t, locale, leader));
  const unread = known.filter((n) => n.unread).length;
  const freshCount = known.filter((n) => fresh.has(n.id)).length;

  /** Marks the unread ones as seen, keeping them highlighted while the panel is open. */
  const seeAll = useCallback((list: AppNotification[]) => {
    const ids = list.filter((n) => n.unread).map((n) => n.id);
    if (!ids.length) return list;
    setFresh((prev) => new Set([...prev, ...ids]));
    void markNotificationsSeen();
    return list.map((n) => (n.unread ? { ...n, unread: false } : n));
  }, []);

  const reload = useCallback(async () => {
    loadedAt.current = Date.now();
    const next = await loadNotifications();
    if (!next.ready) return;
    setItems(openRef.current ? seeAll(next.items) : next.items);
    if (openRef.current) setNow(Date.now());
  }, [seeAll]);

  function toggle() {
    const next = !open;
    openRef.current = next;
    setOpen(next);
    if (next) {
      setNow(Date.now());
      setItems(seeAll(items));
      if (Date.now() - loadedAt.current > STALE_MS) void reload();
    } else {
      setFresh(new Set());
    }
  }

  function close(focusButton = false) {
    openRef.current = false;
    setOpen(false);
    setFresh(new Set());
    if (focusButton) button.current?.focus();
  }

  // Close on a click outside or Escape (focus returns to the bell).
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) close();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(true);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  // Live updates, with polling as the fallback, and a reload when the tab comes back.
  const [connected, setConnected] = useState(false);
  useEffect(() => {
    if (!supabaseConfigured || !ready) return;
    loadedAt.current = Date.now();
    const supabase = getBrowserClient();
    let timer: ReturnType<typeof setTimeout> | null = null;
    const soon = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => void reload(), 400);
    };
    let cancelled = false;
    const channel = supabase
      .channel(`notifications-${me}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "notifications" }, soon)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "notifications" }, soon);
    // Realtime needs the user's token for RLS to let their rows through.
    void supabase.auth.getSession().then(async ({ data }: { data: { session: { access_token: string } | null } }) => {
      if (cancelled) return;
      if (data.session) await supabase.realtime.setAuth(data.session.access_token);
      channel.subscribe((status: string) => setConnected(status === "SUBSCRIBED"));
    });
    const onVisible = () => {
      if (document.visibilityState === "visible" && Date.now() - loadedAt.current > STALE_MS) void reload();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [me, ready, reload]);

  useEffect(() => {
    if (connected || !supabaseConfigured || !ready) return;
    const id = setInterval(() => {
      if (document.visibilityState === "visible") void reload();
    }, 60_000);
    return () => clearInterval(id);
  }, [connected, ready, reload]);

  const label = unread ? fmt(tn.openUnread, { n: unread }) : tn.open;

  return (
    // Phones: the panel spans the top bar (the header is its containing block). Larger screens: it
    // hangs from the bell.
    <div ref={root} className="sm:relative">
      <button
        ref={button}
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        aria-label={label}
        title={tn.title}
        onClick={toggle}
        className="relative flex size-10 cursor-pointer items-center justify-center rounded-full text-muted transition-colors hover:bg-white/5 hover:text-fg aria-expanded:bg-white/5 aria-expanded:text-fg"
      >
        <Bell className={clsx("size-[1.1875rem]", unread > 0 && "text-fg")} aria-hidden />
        {unread > 0 && (
          <span
            className="absolute top-0.5 right-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[0.625rem] leading-none font-semibold text-on-primary tabular-nums shadow-[0_0_0_2px_var(--bg)]"
            aria-hidden
          >
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      <div
        id={panelId}
        role="region"
        aria-labelledby={titleId}
        className={clsx(
          "absolute top-full right-4 left-4 z-50 mt-2 origin-top overflow-hidden rounded-2xl bg-card shadow-[0_25px_50px_-12px_rgba(0,0,0,0.7),inset_0_0_0_1px_var(--border-strong)] transition duration-150 sm:right-0 sm:left-auto sm:w-[23rem] sm:origin-top-right",
          open ? "visible translate-y-0 scale-100 opacity-100" : "invisible -translate-y-1 scale-95 opacity-0",
        )}
      >
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 id={titleId} className="font-display text-base font-semibold">
            {tn.title}
          </h2>
          {freshCount > 0 && (
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-xs font-medium text-primary">
              {fmt(tn.newCount, { n: freshCount })}
            </span>
          )}
        </div>

        {now !== null &&
          (known.length ? (
            <ul className="max-h-[min(70dvh,32rem)] overflow-y-auto overscroll-contain p-1.5">
              {known.map((n) => {
                const info = describe(n, t, locale, leader)!;
                const Icon = info.icon;
                const isNew = fresh.has(n.id);
                return (
                  <li key={n.id}>
                    <Link
                      href={localePath(locale, info.href)}
                      onClick={() => close()}
                      className={clsx(
                        "flex gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5",
                        isNew && "bg-primary/[0.06]",
                      )}
                    >
                      <span className={clsx("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", TONES[info.tone])}>
                        <Icon className="size-4" aria-hidden />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm leading-snug text-fg/85">{info.text}</span>
                        <span className="mt-0.5 block text-xs text-muted">
                          <time dateTime={n.created_at}>{timeAgo(n.created_at, now, t, locale)}</time>
                        </span>
                      </span>
                      {isNew && (
                        <span className="mt-1.5 size-2 shrink-0 rounded-full bg-primary">
                          <span className="sr-only">{tn.isNew}</span>
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex flex-col items-center px-6 py-10 text-center">
              <span className="flex size-11 items-center justify-center rounded-full bg-white/5 text-muted">
                <BellOff className="size-5" aria-hidden />
              </span>
              <p className="mt-3 max-w-[16rem] text-sm text-muted">{tn.empty}</p>
              {!ready && leader && (
                <p className="mt-3 max-w-[18rem] text-xs text-warning">
                  {rich(tn.notSetUp, {
                    file: <span className="font-mono">supabase/migrations/0010_notifications.sql</span>,
                  })}
                </p>
              )}
            </div>
          ))}
      </div>
    </div>
  );
}
