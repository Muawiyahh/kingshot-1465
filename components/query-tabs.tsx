"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import clsx from "clsx";

type Tab = { value: string; label: string };

/**
 * Tabs that switch a ?param on the same page. The clicked tab lights up and the content below
 * swaps to `loading` straight away, instead of the old list sitting there until the new one arrives.
 */
export function QueryTabs({
  param,
  tabs,
  current,
  href,
  label,
  loading,
  children,
}: {
  param: string;
  tabs: Tab[];
  /** The tab the server rendered (from the URL). Passed in, so the tabs and list load as one. */
  current: string;
  /** Page path (already localised) the tabs link to. */
  href: string;
  label: string;
  loading: ReactNode;
  children: ReactNode;
}) {
  const [clicked, setClicked] = useState<{ to: string; from: string } | null>(null);
  const pending = clicked !== null && clicked.from === current && clicked.to !== current;
  const active = pending ? clicked.to : current;

  return (
    <>
      <TabList tabs={tabs} active={active} href={href} param={param} label={label} onPick={(to) => setClicked({ to, from: current })} />
      {pending ? loading : children}
    </>
  );
}

/** The tab row on its own; also the instant placeholder before the page knows which tab is open. */
export function TabList({
  tabs,
  active,
  href,
  param,
  label,
  onPick,
}: {
  tabs: Tab[];
  active: string | null;
  href: string;
  param: string;
  label: string;
  onPick?: (value: string) => void;
}) {
  return (
    <div className="mb-6 flex flex-wrap gap-2" role="tablist" aria-label={label}>
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={`${href}?${param}=${tab.value}`}
          role="tab"
          aria-selected={tab.value === active}
          onClick={() => onPick?.(tab.value)}
          className={clsx(
            "rounded-full px-4 py-2 text-sm transition-colors",
            tab.value === active ? "bg-primary text-on-primary" : "bg-card text-muted hover:text-fg",
          )}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}
