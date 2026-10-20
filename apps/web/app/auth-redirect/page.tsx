import { redirect } from "next/navigation";
import { safeAuth, getCurrentTeacher, getCurrentStudent } from "@/lib/auth";

export const dynamic = "force-dynamic";

/**
 * Resolve account records before redirecting. Next.js redirect() throws a
 * control-flow signal, so it must never run inside a catch-all try/catch.
 */
export default async function AuthRedirectPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/sign-in");

  const [teacher, student] = await Promise.all([
    getCurrentTeacher(),
    getCurrentStudent(),
  ]);

  if (teacher) redirect("/dashboard");
  if (student) redirect("/s/dashboard");
  redirect("/choose-role");
}
