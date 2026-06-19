import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { StudyBuddyClient } from "@/components/study-buddy/StudyBuddyClient";

export const dynamic = "force-dynamic";

export default async function StudyBuddyPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/sign-in");

  const teacher = await db.teacher.findUnique({
    where: { clerkId: userId },
    select: { schoolId: true },
  });
  if (!teacher) redirect("/onboarding");

  const students = await db.student.findMany({
    where: { schoolId: teacher.schoolId, isActive: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      regNumber: true,
      class: { select: { name: true, level: true } },
    },
    orderBy: [{ class: { name: "asc" } }, { lastName: "asc" }],
  });

  return (
    <div className="h-[calc(100vh-4rem-3rem)] -m-6 flex flex-col">
      <StudyBuddyClient students={students} />
    </div>
  );
}
