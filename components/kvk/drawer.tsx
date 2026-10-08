"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { useI18n } from "@/components/i18n-provider";

/**
 * Side panel (tablets and up) or bottom sheet (phones) built on the native <dialog>, which gives
 * focus trapping, Escape and focus return for free.
 *
 * Open state comes from the parent (the URL). The dialog is closed again when this component's
 * effects clean up, because Next keeps pages you leave mounted but hidden: a modal left open
 * there would block the page you moved to.
 */
export function Drawer({
  open,
  onClose,
  title,
  subtitle,
  onPrev,
  onNext,
  footer,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  subtitle?: ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  const { t } = useI18n();
  const d = t.kvk.drawer;
  const ref = useRef<HTMLDialogElement>(null);

  useLayoutEffect(() => {
    const dialog = ref.current;
    if (!dialog || !open) return;
    if (!dialog.open) dialog.showModal();
    document.documentElement.dataset.drawerOpen = "";
    return () => {
      // Closing here (not via onClose) doesn't touch the URL, so leaving the page is unaffected.
      if (dialog.open) dialog.close();
      delete document.documentElement.dataset.drawerOpen;
    };
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-labelledby="drawer-title"
      // Escape: let the parent close it (it owns the URL).
      onCancel={(e) => {
        e.preventDefault();
        onClose();
      }}
      // A click on the dialog element itself is a click on the backdrop.
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="kvk-drawer m-0 flex-col bg-card p-0 text-fg shadow-[0_25px_60px_-15px_rgba(0,0,0,0.8),inset_0_0_0_1px_var(--border-strong)] backdrop:bg-black/60 backdrop:backdrop-blur-sm open:flex max-md:mt-auto max-md:max-h-[88dvh] max-md:w-full max-md:max-w-none max-md:rounded-t-3xl md:ml-auto md:h-dvh md:max-h-dvh md:w-[min(30rem,100vw)]"
    >
      <header className="flex items-start gap-2 border-b border-border px-5 pt-4 pb-3">
        <div className="min-w-0 flex-1">
          <h2 id="drawer-title" className="font-display text-lg leading-snug font-semibold">
            {title}
          </h2>
          {subtitle && <div className="mt-0.5 text-sm text-muted">{subtitle}</div>}
        </div>
        {(onPrev || onNext) && (
          <div className="flex items-center">
            <button
              type="button"
              onClick={onPrev}
              disabled={!onPrev}
              aria-label={d.prev}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-fg disabled:cursor-default disabled:opacity-30"
            >
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button
              type="button"
              onClick={onNext}
              disabled={!onNext}
              aria-label={d.next}
              className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-fg disabled:cursor-default disabled:opacity-30"
            >
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        )}
        <button
          type="button"
          autoFocus
          onClick={onClose}
          aria-label={d.close}
          className="flex size-9 cursor-pointer items-center justify-center rounded-full text-muted hover:bg-white/5 hover:text-fg"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">{children}</div>
      {footer && <footer className="border-t border-border px-5 py-3">{footer}</footer>}
    </dialog>
  );
}
