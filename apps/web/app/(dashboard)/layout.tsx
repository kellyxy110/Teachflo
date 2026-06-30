import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { BottomNav } from "@/components/layout/BottomNav";
import { MobileNavProvider } from "@/components/layout/MobileNavContext";
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
      <div className="teacher-dash flex h-screen bg-bg transition-colors duration-200">
        <Sidebar />
        <div className="flex-1 flex flex-col ml-0 md:ml-56 overflow-hidden">
          <Header />
          <main className="flex-1 overflow-y-auto p-4 md:p-6 pb-20 md:pb-6">
            {children}
          </main>
        </div>
        <BottomNav />
      </div>
    </MobileNavProvider>
  );
}
