"use client";

import { useActionState, useState } from "react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { useI18n } from "@/components/i18n-provider";
import { Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ALLIANCE_TAGS } from "@/lib/alliances";
import type { KingdomSettings } from "@/lib/types";
import { updateSettings } from "../actions";

export function SettingsForm({ settings }: { settings: KingdomSettings }) {
  const { t } = useI18n();
  const s = t.admin.settings;
  const [state, action] = useActionState(updateSettings, undefined);
  const [alliance, setAlliance] = useState(settings.king_alliance ?? "");

  return (
    <form action={action} className="space-y-6">
      <fieldset className="space-y-5">
        <legend className="mb-1 font-display text-lg font-semibold">{s.kingLegend}</legend>
        <div className="flex items-end gap-4">
          <AllianceAvatar tag={alliance} size={76} />
          <div className="grid flex-1 gap-5 sm:grid-cols-[1fr_10rem]">
            <Field label={s.kingName} htmlFor="kingName" hint={s.kingNameHint}>
              <input
                id="kingName"
                name="kingName"
                maxLength={40}
                defaultValue={settings.king_name ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label={s.kingAlliance} htmlFor="kingAlliance">
              <select
                id="kingAlliance"
                name="kingAlliance"
                value={alliance}
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
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-display text-lg font-semibold">{s.serverLegend}</legend>
        <Field label={s.openDate} htmlFor="serverOpenedOn" hint={s.openDateHint}>
          <input
            id="serverOpenedOn"
            name="serverOpenedOn"
            type="date"
            defaultValue={settings.server_opened_on ?? ""}
            className={`${inputClass} sm:w-56`}
          />
        </Field>
      </fieldset>

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.message}</Notice>}
      <SubmitButton pendingText={t.common.saving}>{s.save}</SubmitButton>
    </form>
  );
}
