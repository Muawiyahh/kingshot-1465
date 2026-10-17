"use client";

import { useI18n } from "@/components/i18n-provider";
import { fmt } from "@/lib/i18n/format";
import { speedupKinds } from "@/lib/kvk";
import type { Application } from "@/lib/types";

/**
 * An application's speedups for leaders: each kind for Chief Minister (construction, research) and
 * Noble Advisor (training, general), else the total.
 */
export function SpeedupSummary({ app, position }: { app: Pick<Application, "speedup_days" | "speedups">; position: string }) {
  const { t, tag } = useI18n();
  const kinds = speedupKinds(position);
  const days = (n: number | undefined) => Number(n ?? 0).toLocaleString(tag);
  if (kinds && app.speedups && kinds.some((k) => app.speedups?.[k] !== undefined)) {
    return (
      <span className="font-mono text-fg">
        {kinds.map((k, i) => (
          <span key={k}>
            {i > 0 && <span className="text-muted"> · </span>}
            {fmt(t.admin.day.kindDays, { kind: t.apply.speedupShort[k], n: days(app.speedups?.[k]) })}
          </span>
        ))}
      </span>
    );
  }
  return <span className="font-mono text-fg">{fmt(t.admin.day.speedups, { n: days(app.speedup_days) })}</span>;
}
