"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { splitLocale } from "@/lib/i18n/config";

type NavLink = { href: string; label: string };

/**
 * The top bar's main links. Pills beside the logo on desktop; on phones, a row of tabs under the
 * bar. Used on its own (nothing highlighted) as the placeholder while the current page is unknown.
 */
export function HeaderNavView({
  links,
  activeHref,
  variant,
  label,
}: {
  links: NavLink[];
  activeHref: string | null;
  variant: "desktop" | "mobile";
  label: string;
}) {
  if (variant === "mobile") {
    return (
      <nav aria-label={label} className="flex border-t border-border md:hidden">
        {links.map((l) => {
          const active = l.href === activeHref;
          return (
            <Link
              key={l.href}
              href={l.href}
              aria-current={active ? "page" : undefined}
              className={clsx(
                "relative flex-1 py-3 text-center text-sm transition-colors",
                active ? "text-fg" : "text-muted hover:text-fg",
              )}
            >
              {l.label}
              {active && <span aria-hidden className="absolute inset-x-6 bottom-0 h-0.5 rounded-full bg-primary" />}
            </Link>
          );
        })}
      </nav>
    );
  }
  return (
    <nav aria-label={label} className="hidden items-center gap-1 md:flex">
      {links.map((l) => {
        const active = l.href === activeHref;
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "rounded-full px-3.5 py-2 text-sm transition-colors",
              active ? "bg-white/[0.07] text-fg" : "text-muted hover:bg-white/5 hover:text-fg",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}

/** HeaderNavView with the current page highlighted. */
export function HeaderNav(props: { links: NavLink[]; variant: "desktop" | "mobile"; label: string }) {
  const pathname = usePathname();
  const { rest } = splitLocale(pathname);
  const active = props.links.find((l) => {
    const target = splitLocale(l.href).rest;
    return rest === target || rest.startsWith(`${target}/`);
  });
  return <HeaderNavView {...props} activeHref={active?.href ?? null} />;
}
