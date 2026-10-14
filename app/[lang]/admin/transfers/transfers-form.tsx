"use client";

import { useActionState, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";
import { Plus, Trash2 } from "lucide-react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { Button, Notice, inputClass, textareaClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { fmt } from "@/lib/i18n/format";
import type { KingdomSettings, TransferFact, UserRole } from "@/lib/types";
import { saveTransfers } from "../actions";

const PITCH_MAX = 400;
const MAX_FACTS = 8;
const MAX_MANAGERS = 6;

/** An approved leader or admin who can be made a transfer manager. */
export type LeaderOption = { id: string; ingame_name: string; alliance_tag: string | null; role: UserRole };

type Row<T> = T & { key: number };

/**
 * Pitch, kingdom facts and transfer managers for the homepage's Transfer section. Every field is
 * controlled, so the form keeps what was saved (React resets uncontrolled fields after an action).
 */
export function TransfersForm({
  settings,
  leaders,
  managers: saved,
}: {
  settings: KingdomSettings;
  leaders: LeaderOption[];
  /** Current transfer managers, in display order. */
  managers: { id: string; note: string }[];
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
  // Ticked managers in display order; leaving a leader out means unticking them.
  const [picked, setPicked] = useState(() => saved.filter((m) => leaders.some((l) => l.id === m.id)));

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
    ...picked.map((m) => byId.get(m.id)).filter((l): l is LeaderOption => Boolean(l)),
    ...leaders.filter((l) => !picked.some((m) => m.id === l.id)),
  ];
  const full = picked.length >= MAX_MANAGERS;

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
        {leaders.length === 0 ? (
          <p className="mt-4 text-sm text-muted">{s.noLeaders}</p>
        ) : (
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
      </fieldset>

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.message}</Notice>}
      <SubmitButton pendingText={t.common.saving}>{s.save}</SubmitButton>
    </form>
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
