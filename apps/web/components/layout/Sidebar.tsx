"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  BookOpen,
  ClipboardList,
  BarChart2,
  FileText,
  Library,
  TrendingUp,
  Settings,
  User,
  PenSquare,
  Sparkles,
  Brain,
  FlaskConical,
} from "lucide-react";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/classes", label: "Classes", icon: GraduationCap },
  { href: "/students", label: "Students", icon: Users },
  { href: "/lessons", label: "Lessons", icon: BookOpen },
  { href: "/homework", label: "Homework", icon: PenSquare },
  { href: "/scores", label: "Scores", icon: ClipboardList },
  { href: "/exams", label: "Exams", icon: FileText },
  { href: "/library", label: "Library", icon: Library },
  { href: "/analytics", label: "Analytics", icon: TrendingUp },
  { href: "/study-buddy", label: "Study Buddy", icon: Sparkles },
  { href: "/knowledge-studio", label: "Knowledge Studio", icon: FlaskConical },
  { href: "/intelligence", label: "Intelligence", icon: Brain },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-surface border-r border-border flex flex-col z-40">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-border">
        <h1 className="font-bold text-text text-lg leading-tight">TeachFlow OS</h1>
        <p className="text-xs text-muted mt-0.5">School Management</p>
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
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${
                  active
                    ? "bg-primary-50 text-primary border-l-2 border-primary -ml-[2px] pl-[14px]"
                    : "text-text-2 hover:bg-gray-50 hover:text-text"
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
                flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium
                transition-colors duration-150
                ${
                  active
                    ? "bg-primary-50 text-primary"
                    : "text-text-2 hover:bg-gray-50 hover:text-text"
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
  );
}
