import type { ReactNode } from "react";
import { cn } from "./cn";

export function ActionBar({ children, secondary, className }: { children: ReactNode; secondary?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex flex-col-reverse gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between", className)}>
      <div className="text-sm text-text-2">{secondary}</div>
      <div className="flex flex-wrap items-center gap-2">{children}</div>
    </div>
  );
}
