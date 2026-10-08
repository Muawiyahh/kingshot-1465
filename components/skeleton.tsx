import clsx from "clsx";
import { Card } from "@/components/ui";

/**
 * Loading placeholders shaped like the content they stand in for, so pages keep their layout while
 * data loads instead of collapsing into one grey block.
 */
export function Bone({ className }: { className?: string }) {
  // Default rounding only when the caller doesn't set its own (two rounded-* classes would clash).
  const rounded = className?.includes("rounded") ? null : "rounded-md";
  return <span aria-hidden className={clsx("block animate-pulse bg-white/[0.06]", rounded, className)} />;
}

/** Eyebrow, title and intro of a PageHeader. */
export function HeaderSkeleton() {
  return (
    <div className="mb-10" aria-hidden>
      <Bone className="mb-4 h-3 w-24" />
      <Bone className="h-9 w-64 max-w-full" />
      <Bone className="mt-4 h-4 w-full max-w-xl" />
    </div>
  );
}

/** Cards with an icon, a title and two lines, in a grid. */
export function CardGridSkeleton({ count = 4, className }: { count?: number; className?: string }) {
  return (
    <div className={clsx("grid gap-4 sm:grid-cols-2", className)} aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="flex items-start gap-4 p-5">
          <Bone className="size-10 shrink-0 rounded-xl" />
          <span className="flex-1 space-y-2">
            <Bone className="h-4 w-32" />
            <Bone className="h-3 w-full" />
            <Bone className="h-3 w-2/3" />
          </span>
        </Card>
      ))}
    </div>
  );
}

/** Number tiles like the "Needs your attention" counters. */
export function StatSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3" aria-hidden>
      {Array.from({ length: count }, (_, i) => (
        <Card key={i} className="p-6">
          <Bone className="size-5" />
          <Bone className="mt-4 h-9 w-12" />
          <Bone className="mt-2 h-3 w-28" />
        </Card>
      ))}
    </div>
  );
}

/** A list of rows, each with an avatar or badge, two lines of text and an action. */
export function RowsSkeleton({ rows = 4, avatar = true }: { rows?: number; avatar?: boolean }) {
  return (
    <Card className="divide-y divide-border overflow-hidden" aria-hidden>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-4 p-4 sm:p-5">
          {avatar && <Bone className="size-12 shrink-0 rounded-full" />}
          <span className="flex-1 space-y-2">
            <Bone className="h-4 w-40 max-w-full" />
            <Bone className="h-3 w-56 max-w-full" />
          </span>
          <Bone className="h-9 w-24 rounded-full" />
        </div>
      ))}
    </Card>
  );
}

/** A form card: label + field pairs and a button. */
export function FormSkeleton({ fields = 2 }: { fields?: number }) {
  return (
    <Card className="max-w-2xl space-y-6 p-6 sm:p-8" aria-hidden>
      {Array.from({ length: fields }, (_, i) => (
        <span key={i} className="block space-y-2">
          <Bone className="h-4 w-36" />
          <Bone className="h-11 w-full rounded-xl" />
        </span>
      ))}
      <Bone className="h-11 w-36 rounded-full" />
    </Card>
  );
}

/** Section heading (h2) placeholder. */
export function TitleSkeleton({ className }: { className?: string }) {
  return <Bone className={clsx("mb-4 h-6 w-48", className)} />;
}
