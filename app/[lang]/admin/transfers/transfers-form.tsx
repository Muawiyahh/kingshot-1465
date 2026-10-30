"use client";

import { useActionState, useRef, useState, useTransition, type ReactNode } from "react";
import clsx from "clsx";
import { Loader2, Plus, Trash2, UserPlus } from "lucide-react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { Button, Notice, inputClass, textareaClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { fmt } from "@/lib/i18n/format";
import { rich } from "@/lib/i18n/rich";
import type { KingdomSettings, ManagerOption, TransferFact } from "@/lib/types";
import { findTransferManager, saveTransfers } from "../actions";

const PITCH_MAX = 400;
const MAX_FACTS = 8;
const MAX_MANAGERS = 12;

type Row<T> = T & { key: number };

/**
 * Pitch, kingdom facts and transfer managers for the homepage's Transfer section. Every field is
 * controlled, so the form keeps what was saved (React resets uncontrolled fields after an action).
 */
export function TransfersForm({
  settings,
  options,
  managers: saved,
  canAddAny,
  anyAccountReady,
}: {
  settings: KingdomSettings;
  /** Who can be ticked: leaders and admins, plus members already on the list. */
  options: ManagerOption[];
  /** Current transfer managers, in display order. */
  managers: { id: string; note: string }[];
  /** Admins can add any member by game ID. */
  canAddAny: boolean;
  /** Whether 0012_any_transfer_manager.sql has been run, without which other members can't be managers. */
  anyAccountReady: boolean;
}) {
  const { t } = useI18n();
  const s = t.admin.home.transfers;
  const [state, action] = useActionState(saveTransfers, undefined);
  // Saved rows are keyed by position; rows added here count up from well past them.
  const nextKey = useRef(1_000);

  const [pitch, setPitch] = useState(settings.transfer_pitch ?? "");
  const [facts, setFacts] = useState<Row<TransferFact>[]>(() =>
    (Array.isArray(settings.transfer_facts) ? settings.transfer_facts : []).map((f, key) => ({ ...f, key })),
  );
  // Members an admin has looked up here, shown with the others until the form is saved.
  const [added, setAdded] = useState<ManagerOption[]>([]);
  // After a save the server lists them too, so they aren't repeated.
  const leaders = [...options, ...added.filter((a) => !options.some((o) => o.id === a.id))];
  // Ticked managers in display order; leaving someone out means unticking them.
  const [picked, setPicked] = useState(() => saved.filter((m) => options.some((l) => l.id === m.id)));

  function addFact() {
    const key = nextKey.current++;
    setFacts((all) => [...all, { label: "", value: "", key }]);
  }
  const setFact = (key: number, patch: Partial<TransferFact>) =>
    setFacts((all) => all.map((f) => (f.key === key ? { ...f, ...patch } : f)));

  const toggle = (id: string) =>
    setPicked((all) => (all.some((m) => m.id === id) ? all.filter((m) => m.id !== id) : [...all, { id, note: "" }]));
  const setNote = (id: string, note: string) => setPicked((all) => all.map((m) => (m.id === id ? { ...m, note } : m)));

  // Managers first, in their order; everyone else after, by name.
  const byId = new Map(leaders.map((l) => [l.id, l]));
  const ordered = [
    ...picked.map((m) => byId.get(m.id)).filter((l): l is ManagerOption => Boolean(l)),
    ...leaders.filter((l) => !picked.some((m) => m.id === l.id)),
  ];
  const full = picked.length >= MAX_MANAGERS;

  // Adds a looked-up member to the list, ticked.
  function addAccount(account: ManagerOption) {
    if (!leaders.some((l) => l.id === account.id)) setAdded((all) => [...all, account]);
    if (!picked.some((m) => m.id === account.id) && !full) setPicked((all) => [...all, { id: account.id, note: "" }]);
  }

  return (
    <form action={action} className="space-y-10">
      <label className="block space-y-2">
        <span className="flex justify-between gap-2 text-sm font-medium">
          <span>{s.pitch}</span>
          <span className="text-xs font-normal text-muted tabular-nums">
            {pitch.length}/{PITCH_MAX}
          </span>
        </span>
        <textarea
          name="pitch"
          rows={5}
          maxLength={PITCH_MAX}
          value={pitch}
          placeholder={t.home.transfer.pitch}
          onChange={(e) => setPitch(e.target.value)}
          className={textareaClass}
        />
        <span className="block text-xs text-muted">{s.pitchHint}</span>
      </label>

      <fieldset>
        <legend className="text-sm font-medium">{s.facts}</legend>
        <p className="mt-1 text-xs text-muted">{s.factsHint}</p>
        <ul className="mt-4 space-y-3 empty:hidden">
          {facts.map((f) => (
            <li key={f.key} className="flex items-end gap-2">
              <div className="grid flex-1 gap-2 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                <Labelled label={s.factLabel}>
                  <input name="factLabel" value={f.label} maxLength={40} onChange={(e) => setFact(f.key, { label: e.target.value })} className={inputClass} />
                </Labelled>
                <Labelled label={s.factValue}>
                  <input name="factValue" value={f.value} maxLength={80} onChange={(e) => setFact(f.key, { value: e.target.value })} className={inputClass} />
                </Labelled>
              </div>
              <button
                type="button"
                onClick={() => setFacts((all) => all.filter((x) => x.key !== f.key))}
                aria-label={s.remove}
                title={s.remove}
                className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted transition-colors hover:bg-danger/10 hover:text-danger"
              >
                <Trash2 className="size-4" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
        <Button type="button" variant="secondary" size="sm" className="mt-4" onClick={addFact} disabled={facts.length >= MAX_FACTS}>
          <Plus className="size-4" aria-hidden />
          {s.addFact}
        </Button>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">{s.managers}</legend>
        <p className="mt-1 text-xs text-muted">{s.managersHint}</p>
        {leaders.length === 0 && !canAddAny ? (
          <p className="mt-4 text-sm text-muted">{s.noLeaders}</p>
        ) : leaders.length === 0 ? null : (
          <ul className="mt-4 divide-y divide-border rounded-2xl shadow-[inset_0_0_0_1px_var(--border)]">
            {ordered.map((l) => {
              const mine = picked.find((m) => m.id === l.id);
              return (
                <li key={l.id} className={clsx("flex flex-wrap items-center gap-3 px-4 py-3", mine && "bg-primary/[0.06]")}>
                  <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-3">
                    <input
                      type="checkbox"
                      name="manager"
                      value={l.id}
                      checked={Boolean(mine)}
                      disabled={!mine && full}
                      onChange={() => toggle(l.id)}
                      className="size-5 shrink-0 accent-[var(--primary)]"
                    />
                    <AllianceAvatar tag={l.alliance_tag} size={36} />
                    <span className="min-w-0">
                      <span className="block truncate font-medium">
                        {l.alliance_tag && <span className="mr-1.5 font-mono text-xs text-gold">[{l.alliance_tag}]</span>}
                        {l.ingame_name}
                      </span>
                      <span className="block text-xs text-muted">{t.admin.accounts.roles[l.role]}</span>
                    </span>
                  </label>
                  {mine && (
                    <input
                      name={`note.${l.id}`}
                      value={mine.note}
                      maxLength={40}
                      placeholder={s.notePlaceholder}
                      aria-label={fmt(s.noteFor, { name: l.ingame_name })}
                      onChange={(e) => setNote(l.id, e.target.value)}
                      className={`${inputClass} h-10 w-full sm:w-56`}
                    />
                  )}
                </li>
              );
            })}
          </ul>
        )}
        {canAddAny &&
          (anyAccountReady ? (
            <AddAccount onFound={addAccount} full={full} />
          ) : (
            <div className="mt-4">
              <Notice tone="warning">
                {rich(s.addNeedsUpdate, { file: <span className="font-mono [overflow-wrap:anywhere]">supabase/migrations/0012_any_transfer_manager.sql</span> })}
              </Notice>
            </div>
          ))}
      </fieldset>

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.message}</Notice>}
      <SubmitButton pendingText={t.common.saving}>{s.save}</SubmitButton>
    </form>
  );
}

/**
 * Admins add any member as a transfer manager by game ID. It's looked up straight away and joins
 * the list ticked; saving the form makes it stick.
 */
function AddAccount({ onFound, full }: { onFound: (account: ManagerOption) => void; full: boolean }) {
  const { t } = useI18n();
  const s = t.admin.home.transfers;
  const [gameId, setGameId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const add = () =>
    start(async () => {
      const result = await findTransferManager(gameId);
      setError(result?.error ?? null);
      if (result?.account) {
        onFound(result.account);
        setGameId("");
      }
    });

  return (
    <div className="mt-4 rounded-2xl bg-white/[0.03] p-4 shadow-[inset_0_0_0_1px_var(--border)]">
      <label htmlFor="managerGameId" className="block text-sm font-medium">
        {s.addAccount}
      </label>
      <p className="mt-1 text-xs text-muted">{s.addAccountHint}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {/* No name: it isn't part of the saved form. Enter adds instead of saving. */}
        <input
          id="managerGameId"
          inputMode="numeric"
          autoComplete="off"
          value={gameId}
          placeholder={t.auth.gameIdPlaceholder}
          onChange={(e) => setGameId(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (gameId.trim() && !full) add();
            }
          }}
          className={`${inputClass} max-w-64 flex-1 basis-48 font-mono`}
        />
        <Button type="button" variant="secondary" onClick={add} disabled={pending || full || !gameId.trim()} aria-busy={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <UserPlus className="size-4" aria-hidden />}
          {pending ? s.adding : s.add}
        </Button>
      </div>
      {full && <p className="mt-2 text-xs text-muted">{fmt(s.listFull, { n: MAX_MANAGERS })}</p>}
      {error && (
        <div className="mt-3">
          <Notice tone="error">{error}</Notice>
        </div>
      )}
    </div>
  );
}

function Labelled({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="block text-xs text-muted">{label}</span>
      {children}
    </label>
  );
}
