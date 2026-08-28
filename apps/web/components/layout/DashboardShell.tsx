"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { MobileMoreSheet } from "./MobileMoreSheet";
import { useSidebarCollapse } from "./SidebarCollapseContext";
import type { UserRole } from "@/lib/roles";

export function DashboardShell({ children, role }: { children: React.ReactNode; role: UserRole | null }) {
  const { collapsed } = useSidebarCollapse();

  return (
    <div className="teacher-dash flex h-screen bg-bg transition-colors duration-200">
      <Sidebar role={role} />
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ml-0 ${
          collapsed ? "md:ml-16" : "md:ml-56"
        }`}
      >
        <Header />
        <main id="teacher-shell-content" className="flex-1 overflow-y-auto overflow-x-hidden p-4 pb-[calc(5rem+env(safe-area-inset-bottom,0px))] md:p-6">
          {children}
        </main>
      </div>
      <BottomNav />
      <MobileMoreSheet role={role} />
    </div>
  );
}
