import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
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
    <div className="flex h-screen bg-bg transition-colors duration-200">
      <Sidebar />
      <div className="flex-1 flex flex-col ml-56 overflow-hidden">
        <Header />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
