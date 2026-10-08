"use client";

import { AllianceAvatar } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { ALLIANCE_TAGS } from "@/lib/alliances";

/**
 * Banner tiles as radio buttons; the chosen banner becomes the player's profile picture.
 * Uncontrolled (styled with :checked), so React's reset after a form action can't desync it.
 * Give it a `key` of the saved value to show a new default after saving.
 */
export function AlliancePicker({ defaultValue }: { defaultValue?: string | null }) {
  const { t } = useI18n();
  const options = [...ALLIANCE_TAGS, ""];
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-fg">{t.auth.alliance}</legend>
      <p className="mb-3 text-xs text-muted">{t.auth.allianceHint}</p>
      <div className="grid grid-cols-4 gap-2">
        {options.map((tag) => (
          <label
            key={tag || "none"}
            className="flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl bg-bg-elevated px-1 py-2.5 shadow-[inset_0_0_0_1px_var(--border)] transition-colors hover:bg-card-hover has-[:checked]:bg-gold/10 has-[:checked]:shadow-[inset_0_0_0_1.5px_var(--gold)] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold"
          >
            <input
              type="radio"
              name="alliance"
              value={tag}
              defaultChecked={defaultValue === undefined ? undefined : (defaultValue ?? "") === tag}
              required
              className="peer sr-only"
            />
            <AllianceAvatar tag={tag} size={56} />
            <span className="font-mono text-[11px] text-muted peer-checked:text-gold-soft">{tag || t.common.none}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
