import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudentSidebar } from "@/components/layout/StudentSidebar";
import { StudentHeader } from "@/components/layout/StudentHeader";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await safeAuth();
  if (!userId) redirect("/sign-in");

  const student = await db.student.findUnique({ where: { clerkId: userId } });
  if (!student) redirect("/student-onboarding");

  return (
    <div className="flex h-screen bg-bg transition-colors duration-200">
      <StudentSidebar />
      <div className="flex-1 flex flex-col ml-56 overflow-hidden">
        <StudentHeader />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
