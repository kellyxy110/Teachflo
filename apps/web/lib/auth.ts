import { redirect } from "next/navigation";
import { db } from "./db";
import { getRoleFromMetadata, type UserRole, type Permission, can } from "./roles";
import { authService, hasTestAuthOverride } from "./auth/service";

const AUTH_READY =
  process.env.AUTH_PROVIDER === "supabase"
    ? Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)
    : Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// ─── Auth service wrappers ────────────────────────────────────────────────────
// All auth goes through authService — never import @clerk/nextjs directly
// outside lib/auth/adapters/clerk.ts.

export async function safeAuth() {
  if (!AUTH_READY && !hasTestAuthOverride()) redirect("/setup");
  return authService.getSession();
}

export async function safeCurrentUser() {
  if (!AUTH_READY) return null;
  return authService.getCurrentUser();
}

// ─── Teacher auth ─────────────────────────────────────────────────────────────

export async function getCurrentTeacher() {
  const { userId, provider } = await safeAuth();
  if (!userId) redirect("/sign-in");

  const identity = provider
    ? await db.authIdentity.findUnique({
        where: { provider_providerUserId: { provider: provider === "supabase" ? "SUPABASE" : "CLERK", providerUserId: userId } },
        include: { teacher: { include: { school: true } } },
      })
    : null;
  const teacher = identity?.teacher ?? await db.teacher.findUnique({ where: { clerkId: userId }, include: { school: true } });

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
  const { userId, provider } = await safeAuth();
  if (!userId) redirect("/sign-in");

  const identity = provider
    ? await db.authIdentity.findUnique({
        where: { provider_providerUserId: { provider: provider === "supabase" ? "SUPABASE" : "CLERK", providerUserId: userId } },
        include: { student: { include: { school: true, class: true } } },
      })
    : null;
  const student = identity?.student ?? await db.student.findUnique({ where: { clerkId: userId }, include: { school: true, class: true } });

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
