"use client";

import { usePathname } from "next/navigation";
import { Bell, Sun, Moon, UserCircle, Settings } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { useTheme } from "./ThemeProvider";

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

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
  "/knowledge-studio": "Knowledge Studio",
  "/intelligence": "Intelligence",
  "/code-lab": "Code Lab",
  "/import": "Smart Import",
  "/beta": "Beta Testing Hub",
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
  const { theme, toggle } = useTheme();

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-6 shrink-0 transition-colors duration-200">
      <h2 className="text-base font-semibold text-text">{title}</h2>
      <div className="flex items-center gap-2">
        <button
          className="p-2 rounded-lg text-muted hover:text-text hover:bg-border/20 transition-colors"
          aria-label="Notifications"
        >
          <Bell size={18} />
        </button>

        <button
          onClick={toggle}
          aria-label="Toggle theme"
          className="p-2 rounded-lg text-muted hover:text-text hover:bg-border/20 transition-colors"
        >
          {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {CLERK_KEY && (
          <UserButton afterSignOutUrl="/sign-in">
            <UserButton.MenuItems>
              <UserButton.Link
                label="My Profile"
                labelIcon={<UserCircle size={15} />}
                href="/settings"
              />
              <UserButton.Link
                label="Settings"
                labelIcon={<Settings size={15} />}
                href="/settings"
              />
              <UserButton.Action label="manageAccount" />
              <UserButton.Action label="signOut" />
            </UserButton.MenuItems>
          </UserButton>
        )}
      </div>
    </header>
  );
}
