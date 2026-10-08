"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
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
              <p className="min-w-[4.5rem] px-1 font-mono text-[11px] uppercase tracking-[0.18em] text-muted lg:px-3 lg:pb-1">
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
                    <span className="rounded-full bg-primary px-1.5 text-[11px] leading-5 font-semibold text-on-primary tabular-nums">
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

/**
 * Side menu for the admin and account areas: vertical on desktop, one wrapped row per group on
 * phones. The clicked section lights up immediately, before its page has loaded.
 */
export function SectionNav(props: Omit<ViewProps, "isActive" | "onNavigate">) {
  const { rest } = splitLocale(usePathname());
  // A click, remembered with the page it happened on. Once the URL moves on, the URL wins again.
  const [clicked, setClicked] = useState<{ key: SectionKey; from: string } | null>(null);
  const pendingKey = clicked && clicked.from === rest ? clicked.key : null;

  const matches = (item: SectionNavItem) => {
    if (item.exact) return rest === item.href;
    return [item.href, ...(item.also ?? [])].some((p) => rest === p || rest.startsWith(`${p}/`));
  };
  const isActive = (item: SectionNavItem) => (pendingKey ? item.key === pendingKey : matches(item));

  return <SectionNavView {...props} isActive={isActive} onNavigate={(item) => setClicked({ key: item.key, from: rest })} />;
}
