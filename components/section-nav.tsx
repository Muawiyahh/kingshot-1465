"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { SECTION_ICONS, type SectionKey } from "@/components/section-icons";
import { localePath, splitLocale, type Locale } from "@/lib/i18n/config";

export type SectionNavItem = {
  key: SectionKey;
  href: string;
  label: string;
  /** Highlight only on this exact path (for overview pages that prefix every other link). */
  exact?: boolean;
  /** Other path prefixes that belong to this section, e.g. day pages under an event. */
  also?: string[];
};

export type SectionNavGroup = {
  /** Heading beside (phones) or above (desktop) the group; null for an ungrouped link. */
  label: string | null;
  items: SectionNavItem[];
};

type ViewProps = {
  locale: Locale;
  label: string;
  groups: SectionNavGroup[];
  badges?: Partial<Record<SectionKey, number>>;
  isActive?: (item: SectionNavItem) => boolean;
  onNavigate?: (item: SectionNavItem) => void;
};

/**
 * The menu's markup. Used on its own (no highlight, no counts) as the instant placeholder while the
 * live menu loads, so the menu never disappears.
 */
export function SectionNavView({ locale, label, groups, badges = {}, isActive = () => false, onNavigate }: ViewProps) {
  return (
    <nav aria-label={label}>
      <div className="flex flex-col gap-2 lg:gap-6">
        {groups.map((group, g) => (
          <div key={group.label ?? g} className="flex flex-wrap items-center gap-1 lg:flex-col lg:items-stretch">
            {group.label && (
              <p className="min-w-[4.5rem] px-1 font-mono text-[0.6875rem] uppercase tracking-[0.18em] text-muted lg:px-3 lg:pb-1">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const Icon = SECTION_ICONS[item.key];
              const active = isActive(item);
              const count = badges[item.key] ?? 0;
              return (
                <Link
                  key={item.key}
                  href={localePath(locale, item.href)}
                  aria-current={active ? "page" : undefined}
                  onClick={() => onNavigate?.(item)}
                  className={clsx(
                    "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm whitespace-nowrap transition-colors",
                    active
                      ? "bg-primary/12 text-fg shadow-[inset_0_0_0_1px_rgba(214,58,68,0.35)]"
                      : "text-muted hover:bg-white/5 hover:text-fg",
                  )}
                >
                  <Icon className={clsx("size-4 shrink-0", active ? "text-primary" : "text-muted")} aria-hidden />
                  <span className="flex-1">{item.label}</span>
                  {count > 0 && (
                    <span className="rounded-full bg-primary px-1.5 text-[0.6875rem] leading-5 font-semibold text-on-primary tabular-nums">
                      {count}
                    </span>
                  )}
                </Link>
              );
            })}
          </div>
        ))}
      </div>
    </nav>
  );
}

/** Whether a path (without the locale) belongs to a menu item. */
function belongs(item: SectionNavItem, path: string) {
  if (item.exact) return path === item.href;
  return [item.href, ...(item.also ?? [])].some((p) => path === p || path.startsWith(`${p}/`));
}

/**
 * Side menu for the admin and account areas: vertical on desktop, one wrapped row per group on
 * phones. The section being opened lights up immediately, before its page has loaded, whether the
 * click came from this menu or from any other link to it (an overview card, the avatar menu).
 */
export function SectionNav(props: Omit<ViewProps, "isActive" | "onNavigate">) {
  const { rest } = splitLocale(usePathname());
  // A click, remembered with the page it happened on. Once the URL moves on, the URL wins again.
  const [clicked, setClicked] = useState<{ key: SectionKey; from: string } | null>(null);
  const pendingKey = clicked && clicked.from === rest ? clicked.key : null;
  const isActive = (item: SectionNavItem) => (pendingKey ? item.key === pendingKey : belongs(item, rest));

  const { groups } = props;
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      // Plain clicks only (a modified click opens a new tab). Links cancel the browser's own
      // navigation, so this listens before they do, in the capture phase.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const link = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!link || link.target === "_blank") return;
      const url = new URL(link.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      const to = splitLocale(url.pathname).rest;
      const item = groups.flatMap((g) => g.items).find((i) => belongs(i, to));
      if (item) setClicked({ key: item.key, from: rest });
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [groups, rest]);

  return <SectionNavView {...props} isActive={isActive} />;
}
