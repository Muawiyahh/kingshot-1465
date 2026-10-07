import Link from "next/link";
import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-medium transition-[background-color,color,box-shadow,transform] duration-200 ease-out active:scale-[0.97] disabled:pointer-events-none disabled:opacity-50 cursor-pointer select-none";

const variants: Record<Variant, string> = {
  primary:
    "bg-primary text-on-primary hover:bg-primary-hover shadow-[0_0_45px_-12px_var(--glow)] hover:shadow-[0_0_55px_-10px_var(--glow)]",
  secondary: "bg-card text-fg hover:bg-card-hover shadow-[inset_0_0_0_1px_var(--border-strong)]",
  ghost: "text-muted hover:text-fg hover:bg-white/5",
  danger: "bg-danger/10 text-danger hover:bg-danger/20 shadow-[inset_0_0_0_1px_rgba(248,113,113,0.3)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return clsx(base, variants[variant], sizes[size], className);
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<"button"> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...props} />;
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return <Link className={buttonClass(variant, size, className)} {...props} />;
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={clsx(
        "rounded-3xl bg-card shadow-[inset_0_0_0_1px_var(--border)] ring-0",
        className,
      )}
      {...props}
    />
  );
}

/** macOS-style window frame, carried over from muawiyahalthaf.com. */
export function WindowFrame({
  title,
  children,
  className,
}: {
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "overflow-hidden rounded-2xl bg-bg-elevated shadow-[0_25px_50px_-12px_rgba(0,0,0,0.6),inset_0_0_0_1px_var(--border-strong)]",
        className,
      )}
    >
      <div className="flex items-center gap-2 border-b border-border px-4 py-3">
        <span className="size-3 rounded-full bg-[#ff5f57]" aria-hidden />
        <span className="size-3 rounded-full bg-[#febc2e]" aria-hidden />
        <span className="size-3 rounded-full bg-[#28c840]" aria-hidden />
        {title && <span className="ml-3 truncate font-mono text-xs text-muted">{title}</span>}
      </div>
      {children}
    </div>
  );
}

const badgeTones = {
  neutral: "bg-white/5 text-muted",
  gold: "bg-gold/10 text-gold-soft",
  red: "bg-primary/15 text-[#ff8a90]",
  green: "bg-success/10 text-success",
  amber: "bg-warning/10 text-warning",
} as const;

export function Badge({
  tone = "neutral",
  className,
  ...props
}: ComponentProps<"span"> & { tone?: keyof typeof badgeTones }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        badgeTones[tone],
        className,
      )}
      {...props}
    />
  );
}

export function LiveDot({ className }: { className?: string }) {
  return (
    <span className={clsx("relative inline-flex size-2", className)} aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-60" />
      <span className="relative inline-flex size-2 rounded-full bg-success" />
    </span>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={clsx("font-mono text-xs uppercase tracking-[0.2em] text-gold", className)}>
      {children}
    </p>
  );
}

export function PageHeader({
  eyebrow,
  title,
  children,
}: {
  eyebrow?: string;
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="mb-10">
      {eyebrow && <Eyebrow className="mb-3">{eyebrow}</Eyebrow>}
      <h1 className="font-display text-3xl font-bold tracking-tight text-fg sm:text-4xl">{title}</h1>
      {children && <div className="mt-3 max-w-2xl text-muted">{children}</div>}
    </div>
  );
}

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  children,
  htmlFor,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
  htmlFor: string;
}) {
  return (
    <div className="space-y-2">
      <label htmlFor={htmlFor} className="block text-sm font-medium text-fg">
        {label}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-muted">{hint}</p>}
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "block h-11 w-full rounded-xl bg-bg-elevated px-4 text-[16px] text-fg placeholder:text-muted/60 shadow-[inset_0_0_0_1px_var(--border-strong)] transition-shadow focus:outline-none focus:shadow-[inset_0_0_0_1.5px_var(--gold)]";

export function Notice({
  tone = "neutral",
  children,
}: {
  tone?: "neutral" | "error" | "success" | "warning";
  children: ReactNode;
}) {
  const tones = {
    neutral: "bg-white/5 text-muted",
    error: "bg-danger/10 text-danger",
    success: "bg-success/10 text-success",
    warning: "bg-warning/10 text-warning",
  };
  return (
    <div role={tone === "error" ? "alert" : "status"} className={clsx("rounded-2xl px-4 py-3 text-sm", tones[tone])}>
      {children}
    </div>
  );
}
