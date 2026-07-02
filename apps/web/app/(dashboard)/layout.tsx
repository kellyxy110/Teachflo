import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth";
import { MobileNavProvider } from "@/components/layout/MobileNavContext";
import { SidebarCollapseProvider } from "@/components/layout/SidebarCollapseContext";
import { DashboardShell } from "@/components/layout/DashboardShell";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await safeAuth();
  if (!userId) redirect("/sign-in");

  const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
  if (meta?.role === "student") redirect("/s/dashboard");

  const teacher = await db.teacher.findUnique({ where: { clerkId: userId } });
  if (!teacher) {
    const student = await db.student.findUnique({ where: { clerkId: userId } });
    if (student) redirect("/s/dashboard");
    redirect("/role-select");
  }

  return (
    <MobileNavProvider>
      <SidebarCollapseProvider>
        <DashboardShell>{children}</DashboardShell>
      </SidebarCollapseProvider>
    </MobileNavProvider>
  );
}
