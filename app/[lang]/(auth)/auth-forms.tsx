"use client";

import Link from "next/link";
import { useActionState } from "react";
import { AlliancePicker } from "@/components/alliance-picker";
import { useI18n } from "@/components/i18n-provider";
import { Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { LOCALES, LOCALE_INFO, localePath } from "@/lib/i18n/config";
import { setNewPassword, signIn, signUp, signUpTransfer } from "./actions";

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
      <TransferPrompt />
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
      <TransferPrompt />
    </form>
  );
}

/** The player's own password, replacing the temporary one an admin gave them. */
export function NewPasswordForm() {
  const { t } = useI18n();
  const [state, action] = useActionState(setNewPassword, undefined);
  return (
    <form action={action} className="space-y-5">
      <Field label={t.auth.newPassword.label} htmlFor="password" hint={t.auth.passwordHint}>
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
      </Field>
      <Field label={t.auth.confirm} htmlFor="confirm">
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton className="w-full" pendingText={t.common.saving}>
        {t.auth.newPassword.save}
      </SubmitButton>
    </form>
  );
}

/** Points players from other kingdoms to the transfer account instead. */
function TransferPrompt() {
  const { locale, t } = useI18n();
  return (
    <p className="border-t border-border pt-4 text-center text-sm text-muted">
      {t.auth.transfer.prompt}{" "}
      <Link href={localePath(locale, "/transfer")} className="text-gold-soft underline-offset-4 hover:underline">
        {t.auth.transfer.link}
      </Link>
    </p>
  );
}

/**
 * Sign-up for players in another kingdom: no alliance, their current kingdom instead, and no
 * approval wait. `to` is the transfer manager they picked on the homepage, if any.
 */
export function TransferSignupForm({ to }: { to?: string }) {
  const { locale, t } = useI18n();
  const tr = t.auth.transfer;
  const [state, action] = useActionState(signUpTransfer, undefined);
  const login = `${localePath(locale, "/login")}?next=${encodeURIComponent(localePath(locale, to ? `/account/messages/${to}` : "/account/messages"))}`;
  return (
    <form action={action} className="space-y-5">
      {to && <input type="hidden" name="to" value={to} />}
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
      <Field label={t.auth.name} htmlFor="name">
        <input id="name" name="name" required maxLength={30} autoComplete="nickname" className={inputClass} />
      </Field>
      <Field label={tr.kingdom} htmlFor="fromKingdom" hint={tr.kingdomHint}>
        <input
          id="fromKingdom"
          name="fromKingdom"
          inputMode="numeric"
          required
          maxLength={5}
          className={`${inputClass} sm:w-40`}
          placeholder={tr.kingdomPlaceholder}
        />
      </Field>
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
        {tr.create}
      </SubmitButton>
      <p className="text-center text-sm text-muted">
        {t.auth.haveAccount}{" "}
        <Link href={login} className="text-gold-soft underline-offset-4 hover:underline">
          {t.auth.signInLink}
        </Link>
      </p>
    </form>
  );
}
