"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, Sparkles, Code2,
  ClipboardList, Gamepad2, Settings,
} from "lucide-react";

const navItems = [
  { href: "/s/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/s/exams", label: "Practice Exams", icon: FileText },
  { href: "/s/study-buddy", label: "Study Buddy", icon: Sparkles },
  { href: "/s/code-lab", label: "Code Lab", icon: Code2 },
  { href: "/s/scores", label: "My Scores", icon: ClipboardList },
  { href: "/s/practice-arena", label: "Practice Arena", icon: Gamepad2 },
];

const bottomItems = [
  { href: "/settings", label: "Settings", icon: Settings },
];

export function StudentSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 h-full w-56 bg-surface border-r border-border flex flex-col z-40 transition-colors duration-200">
      <div className="px-4 py-5 border-b border-border">
        <h1 className="font-bold text-text text-lg leading-tight">TeachFlow OS</h1>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-primary mt-0.5">Student Portal</p>
      </div>

      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-text-2 hover:bg-border/20 hover:text-text"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-3 border-t border-border">
        {bottomItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                active
                  ? "bg-primary/10 text-primary"
                  : "text-text-2 hover:bg-border/20 hover:text-text"
              }`}
            >
              <Icon size={18} />
              {label}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
