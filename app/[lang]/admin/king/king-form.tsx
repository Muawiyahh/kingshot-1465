"use client";

import { useActionState, useState } from "react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ALLIANCE_TAGS } from "@/lib/alliances";
import type { KingdomSettings } from "@/lib/types";
import { updateKing } from "../actions";

export function KingForm({ settings }: { settings: KingdomSettings }) {
  const { t } = useI18n();
  const s = t.admin.settings.king;
  const [state, action] = useActionState(updateKing, undefined);
  const [alliance, setAlliance] = useState(settings.king_alliance ?? "");

  return (
    <form action={action} className="space-y-6">
      <div className="flex items-end gap-4">
        <AllianceAvatar tag={alliance} size={76} />
        <div className="grid flex-1 gap-5 sm:grid-cols-[1fr_10rem]">
          <Field label={s.name} htmlFor="kingName" hint={s.nameHint}>
            <input
              id="kingName"
              name="kingName"
              maxLength={40}
              defaultValue={settings.king_name ?? ""}
              className={inputClass}
            />
          </Field>
          <Field label={s.alliance} htmlFor="kingAlliance">
            {/* Uncontrolled and keyed by the saved value: React resets the form after a save, which would put
                a controlled select back on its first option while the avatar kept the old state. */}
            <select
              key={settings.king_alliance ?? ""}
              id="kingAlliance"
              name="kingAlliance"
              defaultValue={settings.king_alliance ?? ""}
              onChange={(e) => setAlliance(e.target.value)}
              className={inputClass}
            >
              <option value="">{t.common.none}</option>
              {ALLIANCE_TAGS.map((tag) => (
                <option key={tag} value={tag}>
                  {tag}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </div>

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.message}</Notice>}
      <SubmitButton pendingText={t.common.saving}>{s.save}</SubmitButton>
    </form>
  );
}
