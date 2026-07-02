import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AuthRedirectPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/sign-in");

  try {
    const [teacher, student] = await Promise.all([
      db.teacher.findUnique({ where: { clerkId: userId }, select: { id: true } }),
      db.student.findUnique({ where: { clerkId: userId }, select: { id: true } }),
    ]);

    if (teacher) redirect("/dashboard");
    if (student) redirect("/s/dashboard");
  } catch {
    // DB unavailable — send to onboarding so users aren't blocked
    redirect("/choose-role");
  }

  redirect("/choose-role");
}
