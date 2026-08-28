import type { ReactNode } from "react";
import { cn } from "./cn";

export function MobileActionBar({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("safe-bottom fixed inset-x-0 bottom-[var(--teacher-mobile-nav-height)] z-30 border-t border-border bg-surface/95 p-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur md:hidden", className)}>
      <div className="flex items-center gap-2">{children}</div>
    </div>
  );
}
