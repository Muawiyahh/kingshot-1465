"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, MessageCircle } from "lucide-react";
import clsx from "clsx";
import { AllianceAvatar } from "@/components/alliance-banner";
import { CopyGameId } from "@/components/home/copy-game-id";
import { useI18n } from "@/components/i18n-provider";
import { localePath } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/format";
import type { TransferManager } from "@/lib/types";

/** Rows shown before "Show all", so a long list of managers doesn't take over the section. */
const VISIBLE = 5;

/**
 * Transfer managers as compact rows: banner, name, game ID (tap to copy), note and a Message button.
 * Past five, the rest fold away behind "Show all".
 */
export function ManagerList({ managers }: { managers: TransferManager[] }) {
  const { locale, t } = useI18n();
  const tr = t.home.transfer;
  const [all, setAll] = useState(false);
  const shown = all ? managers : managers.slice(0, VISIBLE);
  const hidden = managers.length - VISIBLE;

  return (
    <>
      <ul className="relative mt-2 divide-y divide-border/60">
        {shown.map((m) => (
          <li key={m.profileId} className="flex items-center gap-3 py-2.5">
            <AllianceAvatar tag={m.alliance} size={34} />
            <div className="min-w-0 flex-1">
              <p className="flex min-w-0 items-baseline gap-1.5">
                {m.alliance && <span className="shrink-0 font-mono text-[0.6875rem] text-gold">[{m.alliance}]</span>}
                <span className="truncate font-medium" title={m.name}>
                  {m.name}
                </span>
              </p>
              <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted">
                {m.gameId && <CopyGameId id={m.gameId} compact />}
                {m.note && <span className="truncate">· {m.note}</span>}
              </div>
            </div>
            <Link
              href={`${localePath(locale, "/transfer")}?to=${m.profileId}`}
              className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full bg-primary/15 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary hover:text-on-primary"
            >
              <MessageCircle className="size-3.5" aria-hidden />
              {tr.message}
              <span className="sr-only"> {m.name}</span>
            </Link>
          </li>
        ))}
      </ul>
      {hidden > 0 && (
        <button
          type="button"
          onClick={() => setAll((a) => !a)}
          aria-expanded={all}
          className="relative mt-1 inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full px-3 text-sm text-gold-soft transition-colors hover:bg-white/5"
        >
          {all ? tr.showFewer : fmt(tr.showAll, { n: managers.length })}
          <ChevronDown className={clsx("size-4 transition-transform", all && "rotate-180")} aria-hidden />
        </button>
      )}
    </>
  );
}
