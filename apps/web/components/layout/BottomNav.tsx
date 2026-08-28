"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal } from "lucide-react";
import { isTeacherRouteActive, teacherMobilePrimaryItems } from "@/lib/navigation/teacher";
import { useMobileNav } from "./MobileNavContext";

export function BottomNav() {
  const pathname = usePathname();
  const { isOpen, toggle } = useMobileNav();
  const primaryActive = teacherMobilePrimaryItems.some((navItem) => isTeacherRouteActive(pathname, navItem.href));
  const moreActive = isOpen || !primaryActive;

  return (
    <nav aria-label="Primary teacher navigation" className="safe-bottom fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface md:hidden">
      <div className="grid h-16 grid-cols-5 px-1">
        {teacherMobilePrimaryItems.map((navItem) => {
          const active = isTeacherRouteActive(pathname, navItem.href);
          const Icon = navItem.icon;
          return (
            <Link
              key={navItem.href}
              href={navItem.href}
              aria-current={active ? "page" : undefined}
              className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold transition-colors ${active ? "text-primary" : "text-muted hover:text-text"}`}
            >
              <Icon size={20} strokeWidth={active ? 2.5 : 1.8} aria-hidden="true" />
              <span className="max-w-full truncate">{navItem.shortLabel ?? navItem.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={toggle}
          aria-haspopup="dialog"
          aria-expanded={isOpen}
          className={`flex min-w-0 flex-col items-center justify-center gap-0.5 rounded-lg px-1 text-[10px] font-semibold transition-colors ${moreActive ? "text-primary" : "text-muted hover:text-text"}`}
        >
          <MoreHorizontal size={20} strokeWidth={moreActive ? 2.5 : 1.8} aria-hidden="true" />
          <span>More</span>
        </button>
      </div>
    </nav>
  );
}
