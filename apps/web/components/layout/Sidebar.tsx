"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import type { TeacherNavItem } from "@/lib/navigation/teacher";
import {
  isTeacherRouteActive,
  visibleTeacherAccountItems,
  visibleTeacherNavGroups,
} from "@/lib/navigation/teacher";
import type { UserRole } from "@/lib/roles";
import { useSidebarCollapse } from "./SidebarCollapseContext";

function NavLink({ navItem, pathname, collapsed }: { navItem: TeacherNavItem; pathname: string; collapsed: boolean }) {
  const active = isTeacherRouteActive(pathname, navItem.href);
  const Icon = navItem.icon;

  return (
    <Link
      href={navItem.href}
      aria-current={active ? "page" : undefined}
      title={collapsed ? navItem.label : undefined}
      className={`group relative flex min-h-10 items-center rounded-lg text-sm font-medium transition-colors ${
        collapsed ? "justify-center px-2" : "gap-3 px-3"
      } ${active ? "bg-primary-50 text-primary" : "text-text-2 hover:bg-border/30 hover:text-text"}`}
    >
      {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />}
      <Icon size={17} aria-hidden="true" className="shrink-0" />
      {!collapsed && <span className="min-w-0 truncate">{navItem.label}</span>}
      {collapsed && (
        <span className="pointer-events-none absolute left-full z-50 ml-3 whitespace-nowrap rounded-md border border-border bg-surface px-2 py-1 text-xs font-medium text-text opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {navItem.label}
        </span>
      )}
    </Link>
  );
}

export function Sidebar({ role }: { role: UserRole | null }) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebarCollapse();
  const groups = visibleTeacherNavGroups(role);
  const accountItems = visibleTeacherAccountItems(role);

  return (
    <aside
      aria-label="Teacher navigation"
      className={`fixed inset-y-0 left-0 z-40 hidden flex-col border-r border-border bg-surface transition-[width] duration-200 md:flex ${collapsed ? "w-16" : "w-60"}`}
    >
      <div className="flex min-h-14 items-center justify-between border-b border-border px-3">
        <Link href="/dashboard" aria-label="TeachNexis dashboard" className={collapsed ? "mx-auto" : "min-w-0 flex-1"}>
          <Logo variant="dark" size="sm" iconOnly={collapsed} />
        </Link>
        <button
          type="button"
          onClick={toggle}
          className="ml-2 inline-flex size-9 shrink-0 items-center justify-center rounded-lg text-text-2 transition-colors hover:bg-border/30 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          aria-label={collapsed ? "Expand navigation" : "Collapse navigation"}
          aria-expanded={!collapsed}
        >
          {collapsed ? <PanelLeftOpen size={17} aria-hidden="true" /> : <PanelLeftClose size={17} aria-hidden="true" />}
        </button>
      </div>

      <nav className="tnx-scrollbar flex-1 overflow-y-auto overflow-x-hidden px-2 py-3">
        {collapsed ? (
          <div className="space-y-3">
            {groups.map((group) => (
              <div key={group.id} className="space-y-1 border-b border-border/70 pb-3 last:border-0">
                <span className="sr-only">{group.label}</span>
                {group.items.map((navItem) => <NavLink key={navItem.href} navItem={navItem} pathname={pathname} collapsed />)}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {groups.map((group) => {
              const active = group.items.some((navItem) => isTeacherRouteActive(pathname, navItem.href));
              if (group.collapsible) {
                return (
                  <details key={group.id} open={active || undefined} className="group/tools">
                    <summary className="flex min-h-9 cursor-pointer list-none items-center justify-between rounded-lg px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted transition-colors hover:bg-border/20 hover:text-text-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary [&::-webkit-details-marker]:hidden">
                      <span>{group.label}</span>
                      <ChevronDown size={14} aria-hidden="true" className="transition-transform group-open/tools:rotate-180" />
                    </summary>
                    <div className="mt-1 space-y-1">
                      {group.items.map((navItem) => <NavLink key={navItem.href} navItem={navItem} pathname={pathname} collapsed={false} />)}
                    </div>
                  </details>
                );
              }

              return (
                <section key={group.id} aria-labelledby={`teacher-nav-${group.id}`}>
                  <h2 id={`teacher-nav-${group.id}`} className="mb-1 px-3 text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
                    {group.label}
                  </h2>
                  <div className="space-y-1">
                    {group.items.map((navItem) => <NavLink key={navItem.href} navItem={navItem} pathname={pathname} collapsed={false} />)}
                  </div>
                </section>
              );
            })}
          </div>
        )}
      </nav>

      <div className="border-t border-border p-2">
        {accountItems.map((navItem) => <NavLink key={navItem.href} navItem={navItem} pathname={pathname} collapsed={collapsed} />)}
      </div>
    </aside>
  );
}
