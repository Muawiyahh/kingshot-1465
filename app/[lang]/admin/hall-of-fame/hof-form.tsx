"use client";

import { useActionState, useState } from "react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { Notice, inputClass, textareaClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ALLIANCE_TAGS } from "@/lib/alliances";
import type { HallOfFameRow } from "@/lib/types";
import { saveHallOfFame } from "../actions";

const QUOTE_MAX = 160;

/** One week's picks: a player and a quote per alliance. Controlled, so saved values stay after a save. */
export function HallOfFameForm({
  week,
  picks,
  suggestions,
}: {
  week: string;
  picks: HallOfFameRow[];
  /** Approved players' names by alliance, offered while typing. */
  suggestions: Record<string, string[]>;
}) {
  const { t } = useI18n();
  const s = t.admin.home.hof;
  const [state, action] = useActionState(saveHallOfFame, undefined);
  const [values, setValues] = useState(() =>
    Object.fromEntries(
      ALLIANCE_TAGS.map((tag) => {
        const p = picks.find((x) => x.alliance === tag);
        return [tag, { name: p?.player_name ?? "", quote: p?.quote ?? "" }];
      }),
    ),
  );
  const update = (tag: string, patch: Partial<{ name: string; quote: string }>) =>
    setValues((all) => ({ ...all, [tag]: { ...all[tag], ...patch } }));

  return (
    <form action={action} className="space-y-6">
      <input type="hidden" name="week" value={week} />
      <p className="text-sm text-muted">{s.hint}</p>
      <ul className="divide-y divide-border">
        {ALLIANCE_TAGS.map((tag) => {
          const v = values[tag];
          return (
            <li
              key={tag}
              className="grid gap-3 py-5 first:pt-0 last:pb-0 sm:grid-cols-[3.5rem_minmax(0,13rem)_minmax(0,1fr)] sm:items-start"
            >
              <div className="flex items-center gap-3 sm:flex-col sm:gap-1 sm:pt-5">
                <AllianceAvatar tag={tag} size={44} />
                <span className="font-mono text-sm text-gold">{tag}</span>
              </div>
              <label className="block space-y-1.5">
                <span className="block text-xs text-muted">{s.player}</span>
                <input
                  name={`${tag}.name`}
                  list={`hof-names-${tag}`}
                  autoComplete="off"
                  maxLength={40}
                  value={v.name}
                  onChange={(e) => update(tag, { name: e.target.value })}
                  className={inputClass}
                />
                <datalist id={`hof-names-${tag}`}>
                  {(suggestions[tag] ?? []).map((n) => (
                    <option key={n} value={n} />
                  ))}
                </datalist>
              </label>
              <label className="block space-y-1.5">
                <span className="flex justify-between gap-2 text-xs text-muted">
                  <span>{s.quote}</span>
                  <span className="tabular-nums">
                    {v.quote.length}/{QUOTE_MAX}
                  </span>
                </span>
                <textarea
                  name={`${tag}.quote`}
                  rows={2}
                  maxLength={QUOTE_MAX}
                  placeholder={s.quotePlaceholder}
                  value={v.quote}
                  onChange={(e) => update(tag, { quote: e.target.value })}
                  className={textareaClass}
                />
              </label>
            </li>
          );
        })}
      </ul>

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.message}</Notice>}
      <SubmitButton pendingText={t.common.saving}>{s.save}</SubmitButton>
    </form>
  );
}
