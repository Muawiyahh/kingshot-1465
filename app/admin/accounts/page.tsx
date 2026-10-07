import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import clsx from "clsx";
import { Badge, Card, PageHeader } from "@/components/ui";
import { AllianceAvatar } from "@/components/alliance-banner";
import { requireLeader } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AccountStatus, Profile } from "@/lib/types";
import { setAccountRole, setAccountStatus } from "../actions";

export const metadata: Metadata = { title: "Accounts · Admin" };

const tabs: { key: AccountStatus; label: string }[] = [
  { key: "pending", label: "Waiting" },
  { key: "approved", label: "Approved" },
  { key: "rejected", label: "Rejected" },
];

export default function AccountsPage({ searchParams }: PageProps<"/admin/accounts">) {
  return (
    <>
      <PageHeader title="Accounts">
        Check each player&apos;s game ID and name in-game (tap their avatar or search the ID) before approving.
      </PageHeader>
      <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-card" />}>
        <AccountsList searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function AccountsList({ searchParams }: { searchParams: PageProps<"/admin/accounts">["searchParams"] }) {
  const [leader, params] = await Promise.all([requireLeader(), searchParams]);
  const status = (tabs.find((t) => t.key === params.status)?.key ?? "pending") as AccountStatus;
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("status", status)
    .order("created_at", { ascending: status === "pending" });
  const profiles = (data ?? []) as Profile[];

  return (
    <>
      <div className="mb-6 flex gap-2" role="tablist" aria-label="Account status">
        {tabs.map((t) => (
          <Link
            key={t.key}
            href={`/admin/accounts?status=${t.key}`}
            role="tab"
            aria-selected={t.key === status}
            className={clsx(
              "rounded-full px-4 py-2 text-sm transition-colors",
              t.key === status ? "bg-primary text-on-primary" : "bg-card text-muted hover:text-fg",
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {profiles.length === 0 ? (
        <Card className="p-10 text-center text-muted">Nobody here.</Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {profiles.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center gap-4 p-4 sm:p-5">
                <AllianceAvatar tag={p.alliance_tag} size={40} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {p.alliance_tag && <span className="mr-1.5 font-mono text-xs text-gold">[{p.alliance_tag}]</span>}
                    {p.ingame_name}
                    {p.role !== "player" && (
                      <Badge tone="gold" className="ml-2 align-middle capitalize">
                        {p.role}
                      </Badge>
                    )}
                  </p>
                  <p className="font-mono text-sm text-muted">
                    ID {p.game_id} · joined {new Date(p.created_at).toLocaleDateString("en-GB", { timeZone: "UTC" })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {status !== "approved" && (
                    <StatusButton id={p.id} status="approved" label="Approve" tone="primary" />
                  )}
                  {status !== "rejected" && p.id !== leader.id && (
                    <StatusButton id={p.id} status="rejected" label="Reject" tone="ghost" />
                  )}
                  {status === "rejected" && <StatusButton id={p.id} status="pending" label="Move to waiting" tone="ghost" />}
                  {leader.role === "admin" && status === "approved" && p.id !== leader.id && (
                    <form action={setAccountRole} className="flex items-center gap-2">
                      <input type="hidden" name="profileId" value={p.id} />
                      <label className="sr-only" htmlFor={`role-${p.id}`}>
                        Role for {p.ingame_name}
                      </label>
                      <select
                        id={`role-${p.id}`}
                        name="role"
                        defaultValue={p.role}
                        className="h-9 rounded-full bg-bg-elevated px-3 text-sm shadow-[inset_0_0_0_1px_var(--border-strong)]"
                      >
                        <option value="player">Player</option>
                        <option value="leader">Leader</option>
                        <option value="admin">Admin</option>
                      </select>
                      <button type="submit" className="h-9 cursor-pointer rounded-full px-3 text-sm text-gold-soft hover:bg-white/5">
                        Save role
                      </button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </>
  );
}

function StatusButton({
  id,
  status,
  label,
  tone,
}: {
  id: string;
  status: AccountStatus;
  label: string;
  tone: "primary" | "ghost";
}) {
  return (
    <form action={setAccountStatus}>
      <input type="hidden" name="profileId" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={clsx(
          "h-9 cursor-pointer rounded-full px-4 text-sm font-medium transition-colors",
          tone === "primary" ? "bg-primary text-on-primary hover:bg-primary-hover" : "text-muted hover:bg-white/5 hover:text-fg",
        )}
      >
        {label}
      </button>
    </form>
  );
}
