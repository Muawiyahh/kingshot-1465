"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import clsx from "clsx";
import { AllianceAvatar } from "@/components/alliance-banner";
import { Field, Notice, inputClass } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { ALLIANCE_TAGS } from "@/lib/alliances";
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

/** Banner tiles as radio buttons; the chosen banner becomes the player's profile picture. */
function AlliancePicker() {
  const [selected, setSelected] = useState<string | null>(null);
  const options = [...ALLIANCE_TAGS, ""];
  return (
    <fieldset>
      <legend className="mb-1 text-sm font-medium text-fg">Alliance</legend>
      <p className="mb-3 text-xs text-muted">Pick yours. Its banner becomes your profile picture.</p>
      <div className="grid grid-cols-4 gap-2">
        {options.map((tag) => {
          const on = selected === tag;
          return (
            <label
              key={tag || "none"}
              className={clsx(
                "flex cursor-pointer flex-col items-center gap-1.5 rounded-2xl px-1 py-2.5 transition-colors has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-gold",
                on
                  ? "bg-gold/10 shadow-[inset_0_0_0_1.5px_var(--gold)]"
                  : "bg-bg-elevated shadow-[inset_0_0_0_1px_var(--border)] hover:bg-card-hover",
              )}
            >
              <input
                type="radio"
                name="alliance"
                value={tag}
                checked={on}
                onChange={() => setSelected(tag)}
                required
                className="sr-only"
              />
              <AllianceAvatar tag={tag} size={44} />
              <span className={clsx("font-mono text-[11px]", on ? "text-gold-soft" : "text-muted")}>
                {tag || "None"}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

export function SignupForm() {
  const [state, action] = useActionState(signUp, undefined);
  return (
    <form action={action} className="space-y-5">
      <Field label="Game ID" htmlFor="gameId" hint="The number on your in-game profile card. Leaders check it before approving you.">
        <input id="gameId" name="gameId" inputMode="numeric" autoComplete="username" required className={inputClass} placeholder="e.g. 123456789" />
      </Field>
      <Field label="In-game name" htmlFor="name">
        <input id="name" name="name" required maxLength={30} autoComplete="nickname" className={inputClass} />
      </Field>
      <AlliancePicker />
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
