"use client";

import { useActionState } from "react";
import { useI18n } from "@/components/i18n-provider";
import { Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import type { KingdomSettings } from "@/lib/types";
import { updateServer } from "../actions";

export function ServerForm({ settings }: { settings: KingdomSettings }) {
  const { t } = useI18n();
  const s = t.admin.settings.server;
  const [state, action] = useActionState(updateServer, undefined);

  return (
    <form action={action} className="space-y-6">
      <Field label={s.openDate} htmlFor="serverOpenedOn" hint={s.openDateHint}>
        <input
          id="serverOpenedOn"
          name="serverOpenedOn"
          type="date"
          defaultValue={settings.server_opened_on ?? ""}
          className={`${inputClass} sm:w-56`}
        />
      </Field>

      {state?.error && <Notice tone="error">{state.error}</Notice>}
      {state?.ok && <Notice tone="success">{state.message}</Notice>}
      <SubmitButton pendingText={t.common.saving}>{s.save}</SubmitButton>
    </form>
  );
}
