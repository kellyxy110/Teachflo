"use client";

import { createContext, useContext, useState, useEffect, useCallback } from "react";

type Ctx = { collapsed: boolean; toggle: () => void };
const SidebarCtx = createContext<Ctx>({ collapsed: false, toggle: () => {} });

export function SidebarCollapseProvider({ children }: { children: React.ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("sidebar-collapsed");
    if (stored === "true") setCollapsed(true);
    setMounted(true);
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      localStorage.setItem("sidebar-collapsed", String(next));
      return next;
    });
  }, []);

  if (!mounted) return <>{children}</>;
  return <SidebarCtx value={{ collapsed, toggle }}>{children}</SidebarCtx>;
}

export const useSidebarCollapse = () => useContext(SidebarCtx);
