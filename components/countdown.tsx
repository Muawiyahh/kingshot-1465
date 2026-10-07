"use client";

import { useNow } from "@/components/use-now";

function parts(ms: number) {
  const s = Math.max(0, Math.floor(ms / 1000));
  return {
    d: Math.floor(s / 86400),
    h: Math.floor((s % 86400) / 3600),
    m: Math.floor((s % 3600) / 60),
    s: s % 60,
  };
}

/** Live countdown to a UTC instant. Shows dashes until hydrated so server and client markup match. */
export function Countdown({ target, label }: { target: string; label: string }) {
  const now = useNow(1000);
  const t = Date.parse(target);
  const p = parts(now === null ? 0 : t - now);
  const units = [
    ["d", "days"],
    ["h", "hrs"],
    ["m", "min"],
    ["s", "sec"],
  ] as const;

  return (
    <div className="inline-flex flex-col gap-3 rounded-2xl bg-card/70 p-4 shadow-[inset_0_0_0_1px_var(--border)] backdrop-blur">
      <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-gold">{label}</p>
      <div className="flex gap-3" role="timer" aria-live="off">
        {units.map(([k, u]) => (
          <div key={k} className="min-w-14 text-center">
            <p className="font-mono text-2xl font-semibold tabular-nums text-fg sm:text-3xl">
              {now === null ? "--" : String(p[k]).padStart(2, "0")}
            </p>
            <p className="text-[11px] uppercase tracking-wider text-muted">{u}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
