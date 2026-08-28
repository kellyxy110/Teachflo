import { redirect } from "next/navigation";
import { safeAuth, getCurrentTeacher, getCurrentStudent } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AuthRedirectPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/sign-in");

  try {
    const [teacher, student] = await Promise.all([getCurrentTeacher(), getCurrentStudent()]);

    if (teacher) redirect("/dashboard");
    if (student) redirect("/s/dashboard");
  } catch {
    // DB unavailable — send to onboarding so users aren't blocked
    redirect("/choose-role");
  }

  redirect("/choose-role");
}
