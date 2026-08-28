import type { ReactNode } from "react";
import { cn } from "./cn";

export type MetricStripItem = { label: string; value: ReactNode; detail?: ReactNode };

export function MetricStrip({ items, label = "Summary metrics", className }: { items: MetricStripItem[]; label?: string; className?: string }) {
  return (
    <dl aria-label={label} className={cn("grid divide-y divide-border rounded-xl border border-border bg-surface sm:grid-cols-2 sm:divide-x sm:divide-y-0 lg:grid-cols-4", className)}>
      {items.map((metric) => (
        <div key={metric.label} className="min-w-0 px-4 py-3">
          <dt className="text-xs font-medium text-text-2">{metric.label}</dt>
          <dd className="mt-1 text-lg font-semibold text-text">{metric.value}</dd>
          {metric.detail && <div className="mt-0.5 text-xs text-muted">{metric.detail}</div>}
        </div>
      ))}
    </dl>
  );
}
