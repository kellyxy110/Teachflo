import type { ReactNode } from "react";
import { AlertCircle, Inbox } from "lucide-react";
import { cn } from "./cn";

export function EmptyState({ icon, title, description, action, className }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface px-5 py-10 text-center", className)}>
      <div className="mb-3 text-muted" aria-hidden="true">{icon ?? <Inbox size={36} />}</div>
      <h2 className="text-base font-semibold text-text">{title}</h2>
      {description && <p className="mt-1 max-w-md text-sm leading-6 text-text-2">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-lg bg-border/60 motion-reduce:animate-none", className)} />;
}

export function LoadingState({ label = "Loading", className }: { label?: string; className?: string }) {
  return (
    <div role="status" aria-live="polite" className={cn("space-y-3 rounded-xl border border-border bg-surface p-4", className)}>
      <span className="sr-only">{label}</span>
      <Skeleton className="h-5 w-40" />
      <Skeleton className="h-11 w-full" />
      <Skeleton className="h-11 w-full" />
    </div>
  );
}

export function ErrorState({ title = "Something went wrong", description, action, className }: { title?: string; description: string; action?: ReactNode; className?: string }) {
  return (
    <div role="alert" className={cn("flex flex-col items-center rounded-xl border border-danger/25 bg-danger-50 px-5 py-8 text-center", className)}>
      <AlertCircle size={32} className="text-danger" aria-hidden="true" />
      <h2 className="mt-3 font-semibold text-text">{title}</h2>
      <p className="mt-1 max-w-md text-sm text-text-2">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
