"use client";

import { UserButton } from "@clerk/nextjs";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

const pageTitles: Record<string, string> = {
  "/dashboard": "Dashboard",
  "/classes": "Classes",
  "/students": "Students",
  "/lessons": "Lessons",
  "/homework": "Homework",
  "/scores": "Scores",
  "/exams": "Exams",
  "/library": "Library",
  "/analytics": "Analytics",
  "/settings": "Settings",
};

function getTitle(pathname: string): string {
  for (const [key, title] of Object.entries(pageTitles)) {
    if (pathname === key || pathname.startsWith(key + "/")) return title;
  }
  return "TeachFlow OS";
}

export function Header() {
  const pathname = usePathname();
  const title = getTitle(pathname);

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6">
      <h2 className="text-base font-semibold text-text">{title}</h2>
      <div className="flex items-center gap-3">
        <button
          className="p-2 rounded-lg text-muted hover:text-text hover:bg-gray-50 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
        <UserButton afterSignOutUrl="/sign-in" />
      </div>
    </header>
  );
}
