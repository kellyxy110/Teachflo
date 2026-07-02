"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMobileNav } from "./MobileNavContext";
import { useSidebarCollapse } from "./SidebarCollapseContext";
import { Logo } from "@/components/brand/Logo";
import {
  LayoutDashboard, GraduationCap, Users, BookOpen, ClipboardList,
  BarChart2, FileText, Library, Settings, PenSquare, Sparkles, Brain,
  FlaskConical, Code2, Upload, TestTube2, ClipboardCheck, HeartPulse,
  Award, Calculator, Activity, Atom, X, PanelLeftClose, PanelLeftOpen,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/classes", label: "Classes", icon: GraduationCap },
  { href: "/students", label: "Students", icon: Users },
  { href: "/lessons", label: "Lessons", icon: BookOpen },
  { href: "/homework", label: "Homework", icon: PenSquare },
  { href: "/attendance", label: "Attendance", icon: ClipboardCheck },
  { href: "/health", label: "Health Records", icon: HeartPulse },
  { href: "/scores", label: "Scores", icon: ClipboardList },
  { href: "/exams", label: "Exams", icon: FileText },
  { href: "/library", label: "Library", icon: Library },
  { href: "/report-cards", label: "Report Cards", icon: Award },
  { href: "/analytics", label: "Analytics", icon: BarChart2 },
  { href: "/study-buddy", label: "Study Buddy", icon: Sparkles },
  { href: "/knowledge-studio", label: "Knowledge Studio", icon: FlaskConical },
  { href: "/intelligence", label: "Intelligence", icon: Brain },
  { href: "/code-lab", label: "Code Lab", icon: Code2 },
  { href: "/math-workspace", label: "Math Workspace", icon: Calculator },
  { href: "/physics-lab", label: "Physics Lab", icon: Activity },
  { href: "/chem-lab", label: "Chemistry Lab", icon: Atom },
  { href: "/import", label: "Smart Import", icon: Upload },
  { href: "/beta", label: "Beta Hub", icon: TestTube2 },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useMobileNav();
  const { collapsed, toggle } = useSidebarCollapse();

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}

      <aside
        className={`
          fixed left-0 top-0 h-full bg-surface border-r border-border
          flex flex-col z-50 transition-all duration-300 ease-out
          ${collapsed ? "md:w-16" : "md:w-56"}
          w-64 ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
      >
        {/* Logo + collapse toggle */}
        <div className="px-3 py-4 border-b border-border flex items-center justify-between min-h-[57px]">
          {!collapsed && (
            <Link href="/dashboard" className="flex-1 min-w-0">
              <Logo variant="dark" size="sm" />
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" className="mx-auto">
              <Logo variant="dark" size="sm" iconOnly />
            </Link>
          )}

          {/* Desktop collapse toggle */}
          <button
            onClick={toggle}
            className="hidden md:flex items-center justify-center w-7 h-7 rounded-lg text-muted hover:text-text hover:bg-border/30 transition-colors shrink-0"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
          </button>

          {/* Mobile close */}
          <button
            onClick={close}
            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-border/20 transition-colors md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`
                  flex items-center gap-3 rounded-lg text-sm font-medium
                  transition-colors duration-150 group relative
                  ${collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5"}
                  ${active
                    ? "bg-primary-50 text-primary border-l-2 border-primary -ml-[2px] pl-[14px]"
                    : "text-text-2 hover:bg-border/20 hover:text-text"
                  }
                `}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span className="truncate">{label}</span>}

                {/* Tooltip when collapsed */}
                {collapsed && (
                  <span className="
                    absolute left-full ml-3 px-2 py-1 rounded-md text-xs font-medium
                    bg-popover text-text border border-border shadow-lg
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    whitespace-nowrap z-50 transition-opacity duration-150
                  ">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom nav */}
        <div className="px-2 py-3 border-t border-border space-y-0.5">
          {bottomItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                title={collapsed ? label : undefined}
                className={`
                  flex items-center gap-3 rounded-lg text-sm font-medium
                  transition-colors duration-150 group relative
                  ${collapsed ? "px-0 py-2.5 justify-center" : "px-3 py-2.5"}
                  ${active ? "bg-primary-50 text-primary" : "text-text-2 hover:bg-border/20 hover:text-text"}
                `}
              >
                <Icon size={16} className="shrink-0" />
                {!collapsed && <span>{label}</span>}
                {collapsed && (
                  <span className="
                    absolute left-full ml-3 px-2 py-1 rounded-md text-xs font-medium
                    bg-popover text-text border border-border shadow-lg
                    opacity-0 group-hover:opacity-100 pointer-events-none
                    whitespace-nowrap z-50 transition-opacity duration-150
                  ">
                    {label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
