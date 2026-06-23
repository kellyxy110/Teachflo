import Link from "next/link";
import { GraduationCap, BookOpen } from "lucide-react";
import { safeAuth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";

export default async function RoleSelectPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/sign-in");

  const teacher = await db.teacher.findUnique({ where: { clerkId: userId } });
  if (teacher) redirect("/dashboard");

  const student = await db.student.findUnique({ where: { clerkId: userId } });
  if (student) redirect("/s/dashboard");

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="max-w-lg w-full space-y-8 text-center">
        <div>
          <h1 className="text-3xl font-black text-text">Welcome to TeachFlow OS</h1>
          <p className="text-sm text-text-2 mt-2">How will you be using the platform?</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Link
            href="/onboarding"
            className="group p-6 rounded-2xl bg-surface border border-border hover:border-primary/40 hover:shadow-lg transition-all text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <BookOpen size={24} className="text-primary" />
            </div>
            <h2 className="text-lg font-bold text-text mb-1">I&apos;m a Teacher</h2>
            <p className="text-xs text-text-2">Create lessons, exams, manage classes and students</p>
          </Link>

          <Link
            href="/student-onboarding"
            className="group p-6 rounded-2xl bg-surface border border-border hover:border-green-500/40 hover:shadow-lg transition-all text-center"
          >
            <div className="w-14 h-14 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
              <GraduationCap size={24} className="text-green-500" />
            </div>
            <h2 className="text-lg font-bold text-text mb-1">I&apos;m a Student</h2>
            <p className="text-xs text-text-2">Practice exams, study with AI, track your scores</p>
          </Link>
        </div>
      </div>
    </div>
  );
}
