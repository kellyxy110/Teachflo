import { auth, currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { db } from "./db";

export async function getCurrentTeacher() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const teacher = await db.teacher.findUnique({
    where: { clerkId: userId },
    include: { school: true },
  });

  return teacher;
}

export async function requireTeacher() {
  const teacher = await getCurrentTeacher();
  if (!teacher) redirect("/onboarding");
  return teacher;
}

export async function requireSchool() {
  const teacher = await requireTeacher();
  return { teacher, schoolId: teacher.schoolId, school: teacher.school };
}
