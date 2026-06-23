"use client";

import { usePathname } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useTheme } from "./ThemeProvider";

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

const pageTitles: Record<string, string> = {
  "/s/dashboard": "Dashboard",
  "/s/exams": "Practice Exams",
  "/s/study-buddy": "Study Buddy",
  "/s/code-lab": "Code Lab",
  "/s/scores": "My Scores",
  "/s/practice-arena": "Practice Arena",
};

function getTitle(pathname: string): string {
  for (const [key, title] of Object.entries(pageTitles)) {
    if (pathname === key || pathname.startsWith(key + "/")) return title;
  }
  return "Student Portal";
}

export function StudentHeader() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();

  return (
    <header className="h-14 border-b border-border bg-surface flex items-center justify-between px-6 transition-colors duration-200">
      <h2 className="text-sm font-semibold text-text">{getTitle(pathname)}</h2>
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="p-2 rounded-lg text-text-2 hover:bg-bg transition-colors"
          aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>
        {CLERK_KEY && <UserButton afterSignOutUrl="/" />}
      </div>
    </header>
  );
}
