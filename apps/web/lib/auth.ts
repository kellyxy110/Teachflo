import { redirect } from "next/navigation";
import { db } from "./db";

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

export async function getCurrentTeacher() {
  if (!CLERK_KEY) redirect("/setup");

  const { auth } = await import("@clerk/nextjs/server");
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
