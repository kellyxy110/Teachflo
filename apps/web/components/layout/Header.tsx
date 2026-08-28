"use client";

import { usePathname } from "next/navigation";
import { Moon, Settings, Sun, UserCircle } from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { teacherRouteTitle } from "@/lib/navigation/teacher";
import { useTheme } from "./ThemeProvider";

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export function Header() {
  const pathname = usePathname();
  const title = teacherRouteTitle(pathname);
  const { theme, toggle } = useTheme();

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-border bg-surface px-4 transition-colors duration-200 md:px-6">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold text-text">{title}</h1>
        <span className="sr-only">Teacher workspace</span>
      </div>

      <div className="flex items-center gap-1.5 md:gap-2">
        <button
          type="button"
          onClick={toggle}
          aria-label={theme === "dark" ? "Use light theme" : "Use dark theme"}
          className="inline-flex size-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-border/30 hover:text-text focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
        >
          {theme === "dark" ? <Sun size={18} aria-hidden="true" /> : <Moon size={18} aria-hidden="true" />}
        </button>

        {CLERK_KEY && (
          <UserButton afterSignOutUrl="/sign-in">
            <UserButton.MenuItems>
              <UserButton.Link label="My Profile" labelIcon={<UserCircle size={15} />} href="/settings" />
              <UserButton.Link label="Settings" labelIcon={<Settings size={15} />} href="/settings" />
              <UserButton.Action label="manageAccount" />
              <UserButton.Action label="signOut" />
            </UserButton.MenuItems>
          </UserButton>
        )}
      </div>
    </header>
  );
}
