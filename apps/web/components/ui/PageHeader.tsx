import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "./cn";

export type BreadcrumbItem = { label: string; href?: string };

export function Breadcrumb({ items, className }: { items: BreadcrumbItem[]; className?: string }) {
  return (
    <nav aria-label="Breadcrumb" className={className}>
      <ol className="flex flex-wrap items-center gap-1 text-xs text-text-2">
        {items.map((item, index) => (
          <li key={`${item.label}-${index}`} className="flex items-center gap-1">
            {index > 0 && <ChevronRight size={13} className="text-muted" aria-hidden="true" />}
            {item.href ? <Link href={item.href} className="rounded-sm hover:text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary">{item.label}</Link> : <span aria-current="page" className="font-medium text-text">{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}

export function PageHeader({ title, description, breadcrumb, primaryAction, secondaryActions, status, className }: { title: ReactNode; description?: ReactNode; breadcrumb?: BreadcrumbItem[]; primaryAction?: ReactNode; secondaryActions?: ReactNode; status?: ReactNode; className?: string }) {
  return (
    <header className={cn("space-y-3", className)}>
      {breadcrumb && breadcrumb.length > 0 && <Breadcrumb items={breadcrumb} />}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-text md:text-2xl">{title}</h1>
            {status}
          </div>
          {description && <p className="mt-1 max-w-3xl text-sm leading-6 text-text-2">{description}</p>}
        </div>
        {(primaryAction || secondaryActions) && <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:justify-end">{secondaryActions}{primaryAction}</div>}
      </div>
    </header>
  );
}
