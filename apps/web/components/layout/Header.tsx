"use client";

import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";

// Lazy-load Clerk components so the Header doesn't crash when
// NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY is absent (e.g. /setup page).
const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

let UserButton: React.ComponentType<{ afterSignOutUrl?: string }> | null = null;
if (CLERK_KEY) {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  UserButton = require("@clerk/nextjs").UserButton;
}

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
  "/study-buddy": "Study Buddy",
  "/intelligence": "Intelligence",
  "/onboarding": "Setup",
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
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0">
      <h2 className="text-base font-semibold text-text">{title}</h2>
      <div className="flex items-center gap-3">
        <button
          className="p-2 rounded-lg text-muted hover:text-text hover:bg-bg transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>
        {UserButton && <UserButton afterSignOutUrl="/sign-in" />}
      </div>
    </header>
  );
}
