"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlliancePicker } from "@/components/alliance-picker";
import { useI18n } from "@/components/i18n-provider";
import { Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { LOCALES, LOCALE_INFO, localePath } from "@/lib/i18n/config";
import { signIn, signUp } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const { locale, t } = useI18n();
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label={t.auth.gameId} htmlFor="gameId" hint={t.auth.gameIdHintLogin}>
        <input
          id="gameId"
          name="gameId"
          inputMode="numeric"
          autoComplete="username"
          required
          className={inputClass}
          placeholder={t.auth.gameIdPlaceholder}
        />
      </Field>
      <Field label={t.auth.password} htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton className="w-full" pendingText={t.auth.signingIn}>
        {t.auth.signIn}
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        {t.auth.newHere}{" "}
        <Link href={localePath(locale, "/signup")} className="text-gold-soft underline-offset-4 hover:underline">
          {t.auth.createLink}
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const { locale, t } = useI18n();
  const [state, action] = useActionState(signUp, undefined);
  return (
    <form action={action} className="space-y-5">
      <Field label={t.auth.gameId} htmlFor="gameId" hint={t.auth.gameIdHintSignup}>
        <input
          id="gameId"
          name="gameId"
          inputMode="numeric"
          autoComplete="username"
          required
          className={inputClass}
          placeholder={t.auth.gameIdPlaceholder}
        />
      </Field>
      <Field label={t.auth.name} htmlFor="name">
        <input id="name" name="name" required maxLength={30} autoComplete="nickname" className={inputClass} />
      </Field>
      <AlliancePicker />
      <Field label={t.auth.language} htmlFor="language" hint={t.auth.languageHint}>
        <select id="language" name="language" defaultValue={locale} className={inputClass}>
          {LOCALES.map((l) => (
            <option key={l} value={l} lang={LOCALE_INFO[l].tag}>
              {LOCALE_INFO[l].label}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t.auth.password} htmlFor="password" hint={t.auth.passwordHint}>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
      </Field>
      <Field label={t.auth.confirm} htmlFor="confirm">
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton className="w-full" pendingText={t.auth.creating}>
        {t.auth.createAccount}
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        {t.auth.haveAccount}{" "}
        <Link href={localePath(locale, "/login")} className="text-gold-soft underline-offset-4 hover:underline">
          {t.auth.signInLink}
        </Link>
      </p>
    </form>
  );
}
