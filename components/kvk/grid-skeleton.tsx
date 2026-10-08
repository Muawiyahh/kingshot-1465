import { Bone } from "@/components/skeleton";

/** Placeholder shaped like the KvK grid: a row of day headers over rows of time slots. */
export function GridSkeleton({ columns = 4, rows = 10 }: { columns?: number; rows?: number }) {
  return (
    <div className="overflow-hidden rounded-3xl bg-card shadow-[inset_0_0_0_1px_var(--border)]" aria-hidden>
      <div className="flex gap-px border-b border-border">
        <div className="w-14 shrink-0 p-3">
          <Bone className="h-3 w-8" />
        </div>
        {Array.from({ length: columns }, (_, i) => (
          <div key={i} className={i > 0 ? "hidden flex-1 space-y-2 p-3 md:block" : "flex-1 space-y-2 p-3"}>
            <Bone className="h-2.5 w-20" />
            <Bone className="h-4 w-28" />
          </div>
        ))}
      </div>
      {Array.from({ length: rows }, (_, r) => (
        <div key={r} className="flex h-11 items-center gap-px border-b border-border/50 md:h-9">
          <div className="w-14 shrink-0 px-3">
            <Bone className="h-3 w-9" />
          </div>
          {Array.from({ length: columns }, (_, i) => (
            <div key={i} className={i > 0 ? "hidden flex-1 px-2 md:block" : "flex-1 px-2"}>
              {(r + i) % 3 === 0 && <Bone className="h-3 w-3/4" />}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
}
