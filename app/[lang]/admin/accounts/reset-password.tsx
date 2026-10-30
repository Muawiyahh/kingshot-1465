"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound } from "lucide-react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { SubmitButton } from "@/components/submit-button";
import { Badge, Button, Card, Notice, inputClass } from "@/components/ui";
import { fmt } from "@/lib/i18n/format";
import type { ResetAccount } from "@/lib/types";
import { resetPassword } from "../actions";

/**
 * Admins reset a player's password by game ID: find the account, check it's the right player, then
 * reset. The temporary password shows once, for the admin to send to the player in-game.
 */
export function ResetPassword() {
  // A new key starts the steps over with an empty form.
  const [round, setRound] = useState(0);
  return <ResetSteps key={round} restart={() => setRound((r) => r + 1)} />;
}

function ResetSteps({ restart }: { restart: () => void }) {
  const { t } = useI18n();
  const r = t.admin.accounts.reset;
  const [state, action] = useActionState(resetPassword, undefined);
  // Kept here so the game ID stays in the box after an error (React clears the form after an action).
  const [gameId, setGameId] = useState("");
  const account = state?.account;

  return (
    <Card className="mb-6 p-5 sm:p-6">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/10 text-gold">
          <KeyRound className="size-4.5" aria-hidden />
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold">{r.title}</h2>
          <p className="mt-0.5 text-sm text-muted">{r.intro}</p>
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {state?.password && account ? (
          <>
            <Notice tone="success">{fmt(r.done, { name: account.name })}</Notice>
            <AccountRow account={account} />
            <TempPassword password={state.password} />
            <p className="text-sm text-muted">{r.sendIt}</p>
            <Button type="button" variant="secondary" onClick={restart}>
              {r.another}
            </Button>
          </>
        ) : account ? (
          <form action={action} className="space-y-4">
            <input type="hidden" name="gameId" value={account.gameId} />
            <input type="hidden" name="step" value="reset" />
            <p className="text-sm font-medium">{r.check}</p>
            <AccountRow account={account} />
            {state?.error && <Notice tone="error">{state.error}</Notice>}
            <div className="flex flex-wrap gap-2">
              <SubmitButton pendingText={r.resetting}>{r.confirm}</SubmitButton>
              <Button type="button" variant="ghost" onClick={restart}>
                {r.cancel}
              </Button>
            </div>
          </form>
        ) : (
          <form action={action} className="space-y-3">
            <label htmlFor="resetGameId" className="block text-sm font-medium">
              {r.gameId}
            </label>
            <div className="flex flex-wrap gap-2">
              <input
                id="resetGameId"
                name="gameId"
                inputMode="numeric"
                autoComplete="off"
                required
                value={gameId}
                onChange={(e) => setGameId(e.target.value)}
                placeholder={t.auth.gameIdPlaceholder}
                className={`${inputClass} max-w-64 flex-1 basis-48 font-mono`}
              />
              <SubmitButton pendingText={r.finding}>{r.find}</SubmitButton>
            </div>
            {state?.error && <Notice tone="error">{state.error}</Notice>}
          </form>
        )}
      </div>
    </Card>
  );
}

/** The account as the admin will recognise it: banner, [TAG] name, role, game ID. */
function AccountRow({ account }: { account: ResetAccount }) {
  const { t } = useI18n();
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-white/[0.04] p-3">
      <AllianceAvatar tag={account.alliance} size={40} />
      <div className="min-w-0">
        <p className="truncate font-medium">
          {account.alliance && <span className="mr-1.5 font-mono text-xs text-gold">[{account.alliance}]</span>}
          {account.name}
          {account.role !== "player" && (
            <Badge tone="gold" className="ml-2 align-middle">
              {t.admin.accounts.roles[account.role]}
            </Badge>
          )}
        </p>
        <p className="font-mono text-sm text-muted">{fmt(t.common.id, { id: account.gameId })}</p>
      </div>
    </div>
  );
}

/** The temporary password, large and easy to read out, with a copy button. */
function TempPassword({ password }: { password: string }) {
  const { t } = useI18n();
  const r = t.admin.accounts.reset;
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(password);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the password is on screen to copy by hand.
    }
  }

  return (
    <div>
      <p className="mb-2 text-sm font-medium">{r.temp}</p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-xl bg-bg-elevated px-4 py-2.5 font-mono text-xl font-semibold tracking-wider text-gold-soft shadow-[inset_0_0_0_1px_var(--border-strong)] select-all">
          {password}
        </code>
        <button
          type="button"
          onClick={copy}
          className="inline-flex h-11 cursor-pointer items-center gap-2 rounded-full bg-white/5 px-4 text-sm text-fg transition-colors hover:bg-white/10"
        >
          {copied ? <Check className="size-4 text-success" aria-hidden /> : <Copy className="size-4 text-muted" aria-hidden />}
          {copied ? r.copied : r.copy}
        </button>
      </div>
    </div>
  );
}
