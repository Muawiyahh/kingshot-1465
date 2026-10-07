import type { ReactNode } from "react";
import { Crest } from "@/components/crest";

export function AuthShell({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <div className="relative overflow-hidden">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[28rem] w-[40rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]"
      />
      <div className="relative mx-auto flex w-full max-w-md flex-col px-4 py-16 sm:py-24">
        <Crest className="mx-auto mb-6 size-12" />
        <h1 className="text-center font-display text-3xl font-bold">{title}</h1>
        <p className="mt-2 mb-8 text-center text-sm text-muted">{subtitle}</p>
        <div className="rounded-3xl bg-card p-6 shadow-[inset_0_0_0_1px_var(--border),0_25px_50px_-12px_rgba(0,0,0,0.6)] sm:p-8">
          {children}
        </div>
      </div>
    </div>
  );
}
