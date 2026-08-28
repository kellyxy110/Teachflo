import type { ReactNode } from "react";
import { cn } from "./cn";

export function DataList({ children, label, className }: { children: ReactNode; label?: string; className?: string }) {
  return <div role="list" aria-label={label} className={cn("divide-y divide-border", className)}>{children}</div>;
}

export function ActivityRow({ title, description, leading, meta, action, className }: { title: ReactNode; description?: ReactNode; leading?: ReactNode; meta?: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <div role="listitem" className={cn("flex min-h-14 items-center gap-3 py-3", className)}>
      {leading && <div className="shrink-0" aria-hidden="true">{leading}</div>}
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium text-text">{title}</div>
        {description && <div className="mt-0.5 line-clamp-2 text-sm text-text-2">{description}</div>}
      </div>
      {meta && <div className="shrink-0 text-xs text-muted">{meta}</div>}
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
