"use client";

import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";
import clsx from "clsx";
import { Loader2 } from "lucide-react";

/**
 * A plain submit button that reacts the moment it's pressed: it disables itself, shows a spinner
 * and sets aria-busy (rows use that to dim) until the server action finishes.
 */
export function PendingButton({
  className,
  children,
  disabled,
  plain,
  ...props
}: ComponentProps<"button"> & {
  /** Keep the caller's own layout and skip the spinner; style the busy state with `aria-busy:`. */
  plain?: boolean;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      {...props}
      disabled={pending || disabled}
      aria-busy={pending || undefined}
      className={clsx(!plain && "inline-flex items-center justify-center gap-1.5", "aria-busy:cursor-wait", className)}
    >
      {pending && !plain && <Loader2 className="size-3.5 animate-spin" aria-hidden />}
      {children}
    </button>
  );
}
