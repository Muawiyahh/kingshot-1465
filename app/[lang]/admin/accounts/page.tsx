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
import { makeMember, setAccountRole, setAccountStatus } from "../actions";
import { ResetPassword } from "./reset-password";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.meta.adminAccounts };
}

/** One tab per account status for members, plus one for transfer accounts (whatever their status). */
const TABS = ["pending", "approved", "rejected", "transfers"] as const;
const ROLES: UserRole[] = ["player", "leader", "admin"];

export default async function AccountsPage({
  searchParams,
}: PageProps<"/[lang]/admin/accounts">) {
  const { locale, t } = await getI18n();
  const a = t.admin.accounts;
  const tabs = TABS.map((s) => ({ value: s, label: a.tabs[s] }));
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
  const tab = TABS.find((s) => s === params.status) ?? "pending";
  const list = (withTransferColumn: boolean) => {
    const q = supabase.from("profiles").select("*").order("created_at", { ascending: tab === "pending" });
    if (tab === "transfers") return q.eq("transfer", true);
    return withTransferColumn ? q.eq("status", tab).eq("transfer", false) : q.eq("status", tab);
  };
  // The leader check and the list load together; RLS already limits the list to leaders.
  const [leader, first] = await Promise.all([requireLeader(), list(true)]);
  // Before 0007_homepage_content.sql there's no transfer column: show members unfiltered, and no transfers.
  const { data } = first.error && tab !== "transfers" ? await list(false) : first;
  const profiles = (data ?? []) as Profile[];

  return (
    <>
    {leader.role === "admin" && <ResetPassword />}
    <QueryTabs
      param="status"
      tabs={tabs}
      current={tab}
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
                    {p.transfer && (
                      <Badge tone="amber" className="ml-2 align-middle">
                        {p.from_kingdom ? fmt(t.common.transferFrom, { n: p.from_kingdom }) : t.common.transfer}
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
                  {p.transfer && p.status === "approved" && (
                    <form action={makeMember} title={t.admin.accounts.makeMemberHint}>
                      <input type="hidden" name="profileId" value={p.id} />
                      <PendingButton className="h-9 cursor-pointer rounded-full bg-primary px-4 text-sm font-medium text-on-primary transition-colors hover:bg-primary-hover">
                        {t.admin.accounts.makeMember}
                      </PendingButton>
                    </form>
                  )}
                  {p.status !== "approved" && (
                    <StatusButton
                      id={p.id}
                      status="approved"
                      label={t.admin.accounts.approve}
                      tone="primary"
                    />
                  )}
                  {p.status !== "rejected" && p.id !== leader.id && (
                    <StatusButton
                      id={p.id}
                      status="rejected"
                      label={t.admin.accounts.reject}
                      tone="ghost"
                    />
                  )}
                  {p.status === "rejected" && (
                    <StatusButton
                      id={p.id}
                      status="pending"
                      label={t.admin.accounts.moveToWaiting}
                      tone="ghost"
                    />
                  )}
                  {leader.role === "admin" &&
                    p.status === "approved" &&
                    !p.transfer &&
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
