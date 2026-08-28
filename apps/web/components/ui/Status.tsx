import type { ReactNode } from "react";
import { AlertCircle, AlertTriangle, CheckCircle2, Clock3, Info, Loader2 } from "lucide-react";
import { cn } from "./cn";

export type StatusTone = "success" | "warning" | "error" | "pending" | "processing" | "info" | "neutral";

const tones: Record<StatusTone, string> = {
  success: "border-success/25 bg-success-50 text-green-800 dark:text-green-300",
  warning: "border-warning/30 bg-warning-50 text-amber-800 dark:text-amber-300",
  error: "border-danger/25 bg-danger-50 text-red-800 dark:text-red-300",
  pending: "border-border bg-bg text-text-2",
  processing: "border-primary/25 bg-primary-50 text-primary",
  info: "border-primary/25 bg-primary-50 text-blue-800 dark:text-blue-300",
  neutral: "border-border bg-bg text-text-2",
};

const icons = {
  success: CheckCircle2,
  warning: AlertTriangle,
  error: AlertCircle,
  pending: Clock3,
  processing: Loader2,
  info: Info,
  neutral: Info,
};

export function StatusMessage({ tone = "info", title, children, className }: { tone?: StatusTone; title?: string; children: ReactNode; className?: string }) {
  const Icon = icons[tone];
  return (
    <div role={tone === "error" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-xl border p-4 text-sm", tones[tone], className)}>
      <Icon size={18} className={cn("mt-0.5 shrink-0", tone === "processing" && "animate-spin motion-reduce:animate-none")} aria-hidden="true" />
      <div className="min-w-0">
        {title && <p className="font-semibold">{title}</p>}
        <div className={cn("leading-5", title && "mt-0.5")}>{children}</div>
      </div>
    </div>
  );
}

export function StatusBadge({ tone = "neutral", children, className }: { tone?: StatusTone; children: ReactNode; className?: string }) {
  const Icon = icons[tone];
  return (
    <span className={cn("inline-flex min-h-6 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold", tones[tone], className)}>
      <Icon size={12} aria-hidden="true" />
      {children}
    </span>
  );
}
