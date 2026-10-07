"use client";

import { useActionState, useState } from "react";
import { AllianceAvatar } from "@/components/alliance-banner";
import { Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ALLIANCE_TAGS } from "@/lib/alliances";
import type { KingdomSettings } from "@/lib/types";
import { updateSettings } from "../actions";

export function SettingsForm({ settings }: { settings: KingdomSettings }) {
  const [state, action] = useActionState(updateSettings, undefined);
  const [alliance, setAlliance] = useState(settings.king_alliance ?? "");

  return (
    <form action={action} className="space-y-6">
      <fieldset className="space-y-5">
        <legend className="mb-1 font-display text-lg font-semibold">Current King</legend>
        <div className="flex items-end gap-4">
          <AllianceAvatar tag={alliance} size={64} />
          <div className="grid flex-1 gap-5 sm:grid-cols-[1fr_10rem]">
            <Field label="King's in-game name" htmlFor="kingName" hint="Leave empty if no King is crowned yet.">
              <input
                id="kingName"
                name="kingName"
                maxLength={40}
                defaultValue={settings.king_name ?? ""}
                className={inputClass}
              />
            </Field>
            <Field label="King's alliance" htmlFor="kingAlliance">
              <select
                id="kingAlliance"
                name="kingAlliance"
                value={alliance}
                onChange={(e) => setAlliance(e.target.value)}
                className={inputClass}
              >
                <option value="">None</option>
                {ALLIANCE_TAGS.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-3 font-display text-lg font-semibold">Server</legend>
        <Field
          label="Server open date"
          htmlFor="serverOpenedOn"
          hint="The day 1465 opened. The homepage counts the server's age from this."
        >
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
      <SubmitButton pendingText="Saving…">Save settings</SubmitButton>
    </form>
  );
}
