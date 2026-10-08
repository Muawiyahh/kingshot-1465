"use client";

import { useActionState } from "react";
import { AlliancePicker } from "@/components/alliance-picker";
import { useI18n } from "@/components/i18n-provider";
import { SubmitButton } from "@/components/submit-button";
import { Field, Notice, inputClass } from "@/components/ui";
import type { Profile } from "@/lib/types";
import { updateProfile } from "./actions";

export function ProfileForm({ profile }: { profile: Profile }) {
  const { t } = useI18n();
  const [state, action] = useActionState(updateProfile, undefined);

  return (
    <form action={action} className="space-y-6">
      <Field label={t.auth.gameId} htmlFor="gameId" hint={t.account.profile.gameIdHint}>
        <input id="gameId" value={profile.game_id} readOnly className={`${inputClass} font-mono text-muted sm:w-64`} />
      </Field>
      <Field label={t.auth.name} htmlFor="name">
        <input
          id="name"
          name="name"
          required
          maxLength={30}
          autoComplete="nickname"
          defaultValue={profile.ingame_name}
          className={inputClass}
        />
      </Field>
      {/* Keyed by the saved tag so the picker shows it again after React resets the form. */}
      <AlliancePicker key={profile.alliance_tag ?? ""} defaultValue={profile.alliance_tag} />

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.message}</Notice>}
      <SubmitButton pendingText={t.common.saving}>{t.account.profile.save}</SubmitButton>
    </form>
  );
}
