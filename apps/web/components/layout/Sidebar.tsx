"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMobileNav } from "./MobileNavContext";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  ClipboardList,
  BarChart2,
  FileText,
  Library,
  Settings,
  PenSquare,
  Sparkles,
  Brain,
  FlaskConical,
  Code2,
  Upload,
  TestTube2,
  ClipboardCheck,
  HeartPulse,
  Award,
  X,
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
  { href: "/import", label: "Smart Import", icon: Upload },
  { href: "/beta", label: "Beta Hub", icon: TestTube2 },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { isOpen, close } = useMobileNav();

  return (
    <>
      {/* Backdrop — mobile only */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm md:hidden"
          onClick={close}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed left-0 top-0 h-full w-64 bg-surface border-r border-border
          flex flex-col z-50 transition-transform duration-300 ease-out
          md:w-56 md:translate-x-0 md:transition-none
          ${isOpen ? "translate-x-0" : "-translate-x-full"}
        `}
      >
        {/* Logo + close */}
        <div className="px-4 py-5 border-b border-border flex items-center justify-between">
          <div>
            <h1 className="font-bold text-text text-lg leading-tight">TeachFlow OS</h1>
            <p className="text-xs text-muted mt-0.5">School Management</p>
          </div>
          <button
            onClick={close}
            className="p-1.5 rounded-lg text-muted hover:text-text hover:bg-border/20 transition-colors md:hidden"
            aria-label="Close menu"
          >
            <X size={18} />
          </button>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${
                    active
                      ? "bg-primary-50 text-primary border-l-2 border-primary -ml-[2px] pl-[14px]"
                      : "text-text-2 hover:bg-border/20 hover:text-text"
                  }
                `}
              >
                <Icon size={16} className="shrink-0" />
                {label}
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
                className={`
                  flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium
                  transition-colors duration-150
                  ${
                    active
                      ? "bg-primary-50 text-primary"
                      : "text-text-2 hover:bg-border/20 hover:text-text"
                  }
                `}
              >
                <Icon size={16} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </div>
      </aside>
    </>
  );
}
