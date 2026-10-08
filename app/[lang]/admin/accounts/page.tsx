import type { Metadata } from "next";
import { Suspense } from "react";
import clsx from "clsx";
import { AllianceAvatar } from "@/components/alliance-banner";
import { PendingButton } from "@/components/pending-button";
import { QueryTabs, TabList } from "@/components/query-tabs";
import { RowsSkeleton } from "@/components/skeleton";
import { Badge, Card, PageHeader } from "@/components/ui";
import { requireLeader } from "@/lib/auth-guards";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import { getI18n } from "@/lib/i18n/server";
import { createClient } from "@/lib/supabase/server";
import type { AccountStatus, Profile, UserRole } from "@/lib/types";
import { setAccountRole, setAccountStatus } from "../actions";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.adminAccounts };
}

const STATUSES: AccountStatus[] = ["pending", "approved", "rejected"];
const ROLES: UserRole[] = ["player", "leader", "admin"];

export default async function AccountsPage({
  searchParams,
}: PageProps<"/[lang]/admin/accounts">) {
  const { locale, t } = await getI18n();
  const a = t.admin.accounts;
  const tabs = STATUSES.map((s) => ({ value: s, label: a.tabs[s] }));
  const href = localePath(locale, "/admin/accounts");
  return (
    <>
      <PageHeader eyebrow={t.admin.nav.groups.players} title={a.title}>
        {a.intro}
      </PageHeader>
      {/* One loading boundary for tabs and list; the tab row shows (unhighlighted) at once. */}
      <Suspense
        fallback={
          <>
            <TabList
              tabs={tabs}
              active={null}
              href={href}
              param="status"
              label={a.tabsLabel}
            />
            <RowsSkeleton rows={3} />
          </>
        }
      >
        <AccountsList searchParams={searchParams} tabs={tabs} href={href} />
      </Suspense>
    </>
  );
}

async function AccountsList({
  searchParams,
  tabs,
  href,
}: {
  searchParams: PageProps<"/[lang]/admin/accounts">["searchParams"];
  tabs: { value: string; label: string }[];
  href: string;
}) {
  const [params, { t, tag }, supabase] = await Promise.all([
    searchParams,
    getI18n(),
    createClient(),
  ]);
  const status = STATUSES.find((s) => s === params.status) ?? "pending";
  // The leader check and the list load together; RLS already limits the list to leaders.
  const [leader, { data }] = await Promise.all([
    requireLeader(),
    supabase
      .from("profiles")
      .select("*")
      .eq("status", status)
      .order("created_at", { ascending: status === "pending" }),
  ]);
  const profiles = (data ?? []) as Profile[];

  return (
    <QueryTabs
      param="status"
      tabs={tabs}
      current={status}
      href={href}
      label={t.admin.accounts.tabsLabel}
      loading={<RowsSkeleton rows={3} />}
    >
      {profiles.length === 0 ? (
        <Card className="p-10 text-center text-muted">
          {t.admin.accounts.empty}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y divide-border">
            {profiles.map((p) => (
              // Rows dim while one of their buttons is working.
              <li
                key={p.id}
                className="flex flex-wrap items-center gap-4 p-4 transition-opacity sm:p-5 has-[[aria-busy=true]]:opacity-60"
              >
                <AllianceAvatar tag={p.alliance_tag} size={48} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium">
                    {p.alliance_tag && (
                      <span className="mr-1.5 font-mono text-xs text-gold">
                        [{p.alliance_tag}]
                      </span>
                    )}
                    {p.ingame_name}
                    {p.role !== "player" && (
                      <Badge tone="gold" className="ml-2 align-middle">
                        {t.admin.accounts.roles[p.role]}
                      </Badge>
                    )}
                  </p>
                  <p className="font-mono text-sm text-muted">
                    {fmt(t.common.id, { id: p.game_id })} ·{" "}
                    {fmt(t.admin.accounts.joined, {
                      date: new Date(p.created_at).toLocaleDateString(tag, {
                        timeZone: "UTC",
                      }),
                    })}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {status !== "approved" && (
                    <StatusButton
                      id={p.id}
                      status="approved"
                      label={t.admin.accounts.approve}
                      tone="primary"
                    />
                  )}
                  {status !== "rejected" && p.id !== leader.id && (
                    <StatusButton
                      id={p.id}
                      status="rejected"
                      label={t.admin.accounts.reject}
                      tone="ghost"
                    />
                  )}
                  {status === "rejected" && (
                    <StatusButton
                      id={p.id}
                      status="pending"
                      label={t.admin.accounts.moveToWaiting}
                      tone="ghost"
                    />
                  )}
                  {leader.role === "admin" &&
                    status === "approved" &&
                    p.id !== leader.id && (
                      <form
                        action={setAccountRole}
                        className="flex items-center gap-2"
                      >
                        <input type="hidden" name="profileId" value={p.id} />
                        <label className="sr-only" htmlFor={`role-${p.id}`}>
                          {fmt(t.admin.accounts.roleFor, {
                            name: p.ingame_name,
                          })}
                        </label>
                        <select
                          id={`role-${p.id}`}
                          name="role"
                          defaultValue={p.role}
                          className="h-9 rounded-full bg-bg-elevated px-3 text-sm shadow-[inset_0_0_0_1px_var(--border-strong)]"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r}>
                              {t.admin.accounts.roles[r]}
                            </option>
                          ))}
                        </select>
                        <PendingButton className="h-9 cursor-pointer rounded-full px-3 text-sm text-gold-soft hover:bg-white/5">
                          {t.admin.accounts.saveRole}
                        </PendingButton>
                      </form>
                    )}
                </div>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </QueryTabs>
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
      <PendingButton
        className={clsx(
          "h-9 cursor-pointer rounded-full px-4 text-sm font-medium transition-colors",
          tone === "primary"
            ? "bg-primary text-on-primary hover:bg-primary-hover"
            : "text-muted hover:bg-white/5 hover:text-fg",
        )}
      >
        {label}
      </PendingButton>
    </form>
  );
}
