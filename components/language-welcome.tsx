"use client";

import { useEffect, useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";
import { Check, Globe } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import {
  LANGUAGE_CHOSEN_COOKIE,
  LANGUAGE_CHOSEN_MAX_AGE,
  LOCALES,
  LOCALE_INFO,
  switchLocale,
  type Locale,
} from "@/lib/i18n/config";
import { saveLanguage } from "@/lib/i18n/language-action";

/** Stops the first-visit picker from opening again in this browser. */
export function rememberLanguageChosen() {
  document.cookie = `${LANGUAGE_CHOSEN_COOKIE}=1; path=/; max-age=${LANGUAGE_CHOSEN_MAX_AGE}; samesite=lax`;
}

/**
 * Asks first-time visitors to pick a language, so someone who can't read English never has to
 * find the globe menu. The page is already in their browser's language, and every option is
 * written in its own script. The cookie is read here rather than on the server, so pages stay
 * prerendered.
 */
export function LanguageWelcome() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const ref = useRef<HTMLDialogElement>(null);
  const [pending, start] = useTransition();

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog || document.cookie.split("; ").some((c) => c.startsWith(`${LANGUAGE_CHOSEN_COOKIE}=`))) return;
    dialog.showModal();
    // Start on the language the page is already in, not simply the first button.
    dialog.querySelector<HTMLButtonElement>('button[aria-current="true"]')?.focus();
    return () => {
      if (dialog.open) dialog.close();
    };
  }, []);

  function choose(next: Locale) {
    rememberLanguageChosen();
    if (next === locale) {
      ref.current?.close();
      return;
    }
    start(() => {
      void saveLanguage(next);
      const { pathname, search, hash } = window.location;
      router.replace(switchLocale(pathname, next) + search + hash);
    });
  }

  // Escape or a click outside keeps the language the page is already in.
  function keepCurrent() {
    rememberLanguageChosen();
    ref.current?.close();
  }

  return (
    <dialog
      ref={ref}
      aria-labelledby="welcome-title"
      onCancel={keepCurrent}
      onClick={(e) => {
        if (e.target === e.currentTarget) keepCurrent();
      }}
      className="lang-welcome m-auto w-[min(28rem,calc(100vw-2rem))] max-h-[calc(100dvh-2rem)] overflow-y-auto rounded-3xl bg-card p-0 text-fg shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),inset_0_0_0_1px_var(--border-strong)] backdrop:bg-black/70 backdrop:backdrop-blur-sm"
    >
      <div className="relative overflow-hidden px-5 pt-7 pb-5 sm:px-7">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 -top-20 mx-auto h-40 max-w-xs rounded-full bg-primary/25 blur-3xl" />
        <span className="relative mx-auto flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-[inset_0_0_0_1px_rgba(224,64,74,0.3)]">
          <Globe className="size-6" aria-hidden />
        </span>
        <h2 id="welcome-title" className="relative mt-4 text-center font-display text-2xl font-bold tracking-tight">
          {t.welcome.title}
        </h2>
        <ul aria-label={t.welcome.label} className="relative mt-6 grid grid-cols-2 gap-2">
          {LOCALES.map((l) => {
            const current = l === locale;
            return (
              <li key={l}>
                <button
                  type="button"
                  lang={LOCALE_INFO[l].tag}
                  aria-current={current ? "true" : undefined}
                  disabled={pending}
                  onClick={() => choose(l)}
                  className={clsx(
                    "flex min-h-12 w-full cursor-pointer items-center gap-2 rounded-2xl px-3.5 py-2.5 text-left text-[15px] transition-colors disabled:cursor-wait disabled:opacity-60",
                    current
                      ? "bg-primary/15 text-fg shadow-[inset_0_0_0_1.5px_var(--primary)]"
                      : "bg-white/[0.04] text-fg shadow-[inset_0_0_0_1px_var(--border)] hover:bg-white/[0.08]",
                  )}
                >
                  <span className="min-w-0 flex-1 leading-tight">{LOCALE_INFO[l].label}</span>
                  {current && <Check className="size-4 shrink-0 text-primary" aria-hidden />}
                </button>
              </li>
            );
          })}
        </ul>
        <p className="relative mt-5 text-center text-xs leading-relaxed text-muted">{t.welcome.hint}</p>
      </div>
    </dialog>
  );
}
