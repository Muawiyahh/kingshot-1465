"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

/** A transfer manager's game ID that copies itself, ready to paste into the game's player search. */
export function CopyGameId({ id }: { id: string }) {
  const { t } = useI18n();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked: the ID is on screen to copy by hand.
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={copy}
        title={t.home.transfer.copyId}
        aria-label={`${t.home.transfer.copyId}: ${id}`}
        className="inline-flex h-9 cursor-pointer items-center gap-2 rounded-full bg-white/5 px-3 font-mono text-sm text-fg transition-colors hover:bg-white/10"
      >
        {copied ? <Check className="size-3.5 text-success" aria-hidden /> : <Copy className="size-3.5 text-muted" aria-hidden />}
        {id}
      </button>
      <span className="sr-only" aria-live="polite">
        {copied ? t.home.transfer.copied : ""}
      </span>
    </>
  );
}
