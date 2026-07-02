"use client";

import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { BottomNav } from "./BottomNav";
import { useSidebarCollapse } from "./SidebarCollapseContext";

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebarCollapse();

  return (
    <div className="teacher-dash flex h-screen bg-bg transition-colors duration-200">
      <Sidebar />
      <div
        className={`flex-1 flex flex-col overflow-hidden transition-all duration-300 ml-0 ${
          collapsed ? "md:ml-16" : "md:ml-56"
        }`}
      >
        <Header />
        <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
          {children}
        </main>
      </div>
      <BottomNav />
    </div>
  );
}
