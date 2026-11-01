"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

/**
 * The header logo's link home. Already on the homepage, a link to it does nothing, so it scrolls
 * back to the top instead (and drops any #section from the address). The current path is read on
 * click rather than with usePathname(): the hook would make every page's header wait for the request
 * URL, which blocks prerendering under Cache Components.
 */
export function HomeLink({ href, onClick, ...props }: ComponentProps<typeof Link> & { href: string }) {
  return (
    <Link
      href={href}
      onClick={(e) => {
        onClick?.(e);
        if (location.pathname !== href || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        window.scrollTo({ top: 0, behavior: reduce ? "auto" : "smooth" });
        if (location.hash) history.replaceState(history.state, "", href);
      }}
      {...props}
    />
  );
}
