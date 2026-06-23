import { redirect } from "next/navigation";
import { db } from "./db";
import { getRoleFromMetadata, type UserRole, type Permission, can } from "./roles";

const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

// ─── Safe Clerk wrappers ──────────────────────────────────────────────────────
// Redirect to /setup when env vars are not configured instead of crashing.

export async function safeAuth() {
  if (!CLERK_KEY) redirect("/setup");
  const { auth } = await import("@clerk/nextjs/server");
  return auth();
}

export async function safeCurrentUser() {
  if (!CLERK_KEY) return null;
  const { currentUser } = await import("@clerk/nextjs/server");
  return currentUser();
}

// ─── Teacher auth ─────────────────────────────────────────────────────────────

export async function getCurrentTeacher() {
  const { userId } = await safeAuth();
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

// ─── Student auth ────────────────────────────────────────────────────────────

export async function getCurrentStudent() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/sign-in");

  const student = await db.student.findUnique({
    where: { clerkId: userId },
    include: { school: true, class: true },
  });

  return student;
}

export async function requireStudent() {
  const student = await getCurrentStudent();
  if (!student) redirect("/student-onboarding");
  return student;
}

// ─── Role-based access control ────────────────────────────────────────────────
// Reads role from Clerk publicMetadata — no DB query needed.

export async function getCurrentRole(): Promise<UserRole | null> {
  const { userId, sessionClaims } = await safeAuth();
  if (!userId) return null;
  const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>;
  return getRoleFromMetadata(meta);
}

/** Redirect to /dashboard if the current user lacks the required permission. */
export async function requirePermission(permission: Permission) {
  const role = await getCurrentRole();
  if (!can(role, permission)) redirect("/dashboard");
}
