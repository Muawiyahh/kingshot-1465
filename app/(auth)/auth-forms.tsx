"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { signIn, signUp } from "./actions";

export function LoginForm({ next }: { next?: string }) {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-5">
      {next && <input type="hidden" name="next" value={next} />}
      <Field label="Game ID" htmlFor="gameId" hint="Tap your avatar in-game to find it.">
        <input
          id="gameId"
          name="gameId"
          inputMode="numeric"
          autoComplete="username"
          required
          className={inputClass}
          placeholder="e.g. 123456789"
        />
      </Field>
      <Field label="Password" htmlFor="password">
        <input id="password" name="password" type="password" autoComplete="current-password" required className={inputClass} />
      </Field>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton className="w-full" pendingText="Signing in…">Sign in</SubmitButton>
      <p className="text-center text-sm text-muted">
        New to the site?{" "}
        <Link href="/signup" className="text-gold-soft underline-offset-4 hover:underline">
          Create an account
        </Link>
      </p>
    </form>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signUp, undefined);
  return (
    <form action={action} className="space-y-5">
      <Field label="Game ID" htmlFor="gameId" hint="The number on your in-game profile card. Leaders check it before approving you.">
        <input id="gameId" name="gameId" inputMode="numeric" autoComplete="username" required className={inputClass} placeholder="e.g. 123456789" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-[1fr_8rem]">
        <Field label="In-game name" htmlFor="name">
          <input id="name" name="name" required maxLength={30} autoComplete="nickname" className={inputClass} />
        </Field>
        <Field label="Alliance tag" htmlFor="alliance" hint="Optional">
          <input id="alliance" name="alliance" maxLength={8} className={`${inputClass} uppercase`} placeholder="ABC" />
        </Field>
      </div>
      <Field label="Password" htmlFor="password" hint="At least 8 characters. Don't reuse your game account password.">
        <input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required className={inputClass} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm">
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required className={inputClass} />
      </Field>
      {state?.error && <Notice tone="error">{state.error}</Notice>}
      <SubmitButton className="w-full" pendingText="Creating account…">Create account</SubmitButton>
      <p className="text-center text-sm text-muted">
        Already have one?{" "}
        <Link href="/login" className="text-gold-soft underline-offset-4 hover:underline">
          Sign in
        </Link>
      </p>
    </form>
  );
}
