import type { ReactNode } from "react";
import { cn } from "./cn";

export function ResponsiveTable({ label, children, className, tableClassName }: { label: string; children: ReactNode; className?: string; tableClassName?: string }) {
  return (
    <div className={cn("tnx-panel overflow-hidden", className)}>
      <div role="region" aria-label={label} tabIndex={0} className="tnx-scrollbar overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary">
        <table className={cn("w-full min-w-[42rem] border-collapse text-sm", tableClassName)}>{children}</table>
      </div>
    </div>
  );
}
