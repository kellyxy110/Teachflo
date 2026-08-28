import { redirect } from "next/navigation";
import { getCurrentStudent } from "@/lib/auth";
import { StudentSidebar } from "@/components/layout/StudentSidebar";
import { StudentHeader } from "@/components/layout/StudentHeader";

export const dynamic = "force-dynamic";

export default async function StudentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const student = await getCurrentStudent();
  if (!student) redirect("/student-onboarding");

  return (
    <div className="flex h-screen bg-bg transition-colors duration-200">
      <StudentSidebar />
      <div className="flex-1 flex flex-col overflow-hidden md:ml-56">
        <StudentHeader />
        <main className="flex-1 overflow-y-auto p-4 pb-24 sm:p-6 sm:pb-24 md:pb-6">{children}</main>
      </div>
    </div>
  );
}
