"use client";

import { useState, useTransition, type ReactNode } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";
import { Notice } from "@/components/ui";
import { fmt } from "@/lib/i18n/format";
import type { ActionState, FillState } from "@/lib/types";

type Result = NonNullable<FillState> | NonNullable<ActionState>;

/** Runs a leader action and keeps its outcome (error, message, auto-fill report) for display. */
export function useRun() {
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  function run(key: string, action: () => Promise<FillState | ActionState>) {
    setBusy(key);
    start(async () => {
      setResult((await action()) ?? null);
      setBusy(null);
    });
  }
  return { pending, busy, result, run, clear: () => setResult(null) };
}

/** Error, success message and the list of players auto-fill couldn't place. */
export function RunResult({ result }: { result: Result | null }) {
  const { t } = useI18n();
  if (!result) return null;
  if (result.error) return <Notice tone="error">{result.error}</Notice>;
  const report = "report" in result ? result.report : undefined;
  if (!result.message && !report) return null;
  return (
    <div className="space-y-2">
      {result.message && <Notice tone="success">{result.message}</Notice>}
      {report && report.skipped.length > 0 && (
        <Notice tone="warning">{fmt(t.kvk.leader.fillSkipped, { names: report.skipped.join(", ") })}</Notice>
      )}
    </div>
  );
}

/** Small button that shows a spinner while its action runs. */
export function RunButton({
  busy,
  disabled,
  onClick,
  tone = "ghost",
  children,
  className,
  title,
}: {
  busy: boolean;
  disabled?: boolean;
  onClick: () => void;
  tone?: "primary" | "ghost" | "danger";
  children: ReactNode;
  className?: string;
  title?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy || disabled}
      aria-busy={busy || undefined}
      title={title}
      className={clsx(
        "inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full px-3.5 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50 aria-busy:cursor-wait aria-busy:opacity-100",
        tone === "primary" && "bg-primary text-on-primary hover:bg-primary-hover",
        tone === "ghost" && "text-muted hover:bg-white/5 hover:text-fg",
        tone === "danger" && "bg-danger/10 text-danger hover:bg-danger/20",
        className,
      )}
    >
      {busy && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
