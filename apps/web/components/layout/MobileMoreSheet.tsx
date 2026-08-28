"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Drawer } from "@/components/ui/Overlay";
import {
  isTeacherRouteActive,
  teacherMobilePrimaryItems,
  visibleTeacherAccountItems,
  visibleTeacherNavGroups,
} from "@/lib/navigation/teacher";
import type { UserRole } from "@/lib/roles";
import { useMobileNav } from "./MobileNavContext";

export function MobileMoreSheet({ role }: { role: UserRole | null }) {
  const pathname = usePathname();
  const { isOpen, close } = useMobileNav();
  const primaryPaths = new Set(teacherMobilePrimaryItems.map((navItem) => navItem.href));
  const groups = visibleTeacherNavGroups(role)
    .map((group) => ({ ...group, items: group.items.filter((navItem) => !primaryPaths.has(navItem.href)) }))
    .filter((group) => group.items.length > 0);

  return (
    <Drawer
      open={isOpen}
      onClose={close}
      title="More teacher tools"
      description="Teaching, records, content and account destinations."
      className="md:hidden"
      contentClassName="safe-bottom space-y-5"
    >
      <nav aria-label="More teacher destinations" className="space-y-5">
        {groups.map((group) => (
          <section key={group.id} aria-labelledby={`mobile-more-${group.id}`}>
            <h3 id={`mobile-more-${group.id}`} className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
              {group.label}
            </h3>
            <div className="grid grid-cols-1 gap-1 min-[390px]:grid-cols-2">
              {group.items.map((navItem) => {
                const active = isTeacherRouteActive(pathname, navItem.href);
                const Icon = navItem.icon;
                return (
                  <Link
                    key={navItem.href}
                    href={navItem.href}
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${
                      active ? "bg-primary-50 text-primary" : "text-text-2 hover:bg-border/30 hover:text-text"
                    }`}
                  >
                    <Icon size={18} aria-hidden="true" className="shrink-0" />
                    <span className="min-w-0 truncate">{navItem.label}</span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
        <section aria-labelledby="mobile-more-account">
          <h3 id="mobile-more-account" className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">Account</h3>
          {visibleTeacherAccountItems(role).map((navItem) => {
            const active = isTeacherRouteActive(pathname, navItem.href);
            const Icon = navItem.icon;
            return (
              <Link
                key={navItem.href}
                href={navItem.href}
                aria-current={active ? "page" : undefined}
                className={`flex min-h-12 items-center gap-3 rounded-lg px-3 text-sm font-medium transition-colors ${active ? "bg-primary-50 text-primary" : "text-text-2 hover:bg-border/30 hover:text-text"}`}
              >
                <Icon size={18} aria-hidden="true" />
                {navItem.label}
              </Link>
            );
          })}
        </section>
      </nav>
    </Drawer>
  );
}
