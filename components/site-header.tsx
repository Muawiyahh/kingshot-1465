import Link from "next/link";
import { Suspense } from "react";
import { Crest } from "@/components/crest";
import { UserNav } from "@/components/user-nav";
import { buttonClass } from "@/components/ui";
import { site } from "@/lib/site";

const links = [
  { href: "/", label: "Home" },
  { href: "/positions", label: "Positions" },
  { href: "/apply", label: "Apply" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border bg-bg/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-6 px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-2.5 rounded-lg" aria-label={`${site.name} home`}>
          <Crest className="size-8" />
          <span className="font-display text-lg font-bold tracking-wide">
            <span className="text-gold-soft">#</span>
            {site.kingdom}
          </span>
        </Link>
        <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
          {links.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="rounded-full px-3 py-2 text-sm text-muted transition-colors hover:bg-white/5 hover:text-fg"
            >
              {l.label}
            </Link>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Suspense
            fallback={
              <Link href="/login" className={buttonClass("secondary", "sm")}>
                Sign in
              </Link>
            }
          >
            <UserNav />
          </Suspense>
        </div>
      </div>
      {/* Mobile nav */}
      <nav aria-label="Main mobile" className="flex items-center justify-around border-t border-border sm:hidden">
        {links.map((l) => (
          <Link key={l.href} href={l.href} className="flex-1 py-3 text-center text-sm text-muted hover:text-fg">
            {l.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
