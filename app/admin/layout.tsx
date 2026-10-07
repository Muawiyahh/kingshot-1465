import Link from "next/link";
import { Container, Eyebrow } from "@/components/ui";

const nav = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/accounts", label: "Accounts" },
  { href: "/admin/events", label: "KvK events" },
  { href: "/admin/settings", label: "Kingdom settings" },
];

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Container className="py-10 sm:py-14">
      <div className="mb-10 flex flex-wrap items-center gap-4 border-b border-border pb-4">
        <Eyebrow>Leadership</Eyebrow>
        <nav aria-label="Admin" className="flex flex-wrap gap-1">
          {nav.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className="rounded-full px-3 py-1.5 text-sm text-muted transition-colors hover:bg-white/5 hover:text-fg"
            >
              {n.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </Container>
  );
}
