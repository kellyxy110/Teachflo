/**
 * TeachFlow RBAC — roles live in Clerk publicMetadata so they're available
 * in middleware without a DB round-trip. The DB remains source of truth for
 * detailed profile data (Teacher, Student records).
 *
 * To add a new role: extend UserRole + add its permissions below.
 * To integrate Supabase: replace getRoleFromMetadata with a Supabase JWT claim reader.
 */

export type UserRole =
  | "teacher"
  | "student"
  | "parent"
  | "school_admin"
  | "super_admin";

// ─── Permission map ───────────────────────────────────────────────────────────
// Add permissions here — never hardcode role checks in feature code.
const PERMISSIONS = {
  // Lessons
  "lesson:create": ["teacher", "school_admin", "super_admin"],
  "lesson:read":   ["teacher", "student", "parent", "school_admin", "super_admin"],
  "lesson:delete": ["teacher", "school_admin", "super_admin"],

  // Exams
  "exam:create": ["teacher", "school_admin", "super_admin"],
  "exam:read":   ["teacher", "student", "parent", "school_admin", "super_admin"],
  "exam:delete": ["teacher", "school_admin", "super_admin"],

  // Scores
  "score:write": ["teacher", "school_admin", "super_admin"],
  "score:read":  ["teacher", "student", "parent", "school_admin", "super_admin"],

  // Homework
  "homework:create": ["teacher", "school_admin", "super_admin"],
  "homework:read":   ["teacher", "student", "parent", "school_admin", "super_admin"],

  // Students
  "student:manage": ["teacher", "school_admin", "super_admin"],
  "student:read":   ["teacher", "school_admin", "super_admin"],

  // School administration
  "school:manage": ["school_admin", "super_admin"],

  // Analytics
  "analytics:read": ["teacher", "school_admin", "super_admin"],
} as const;

export type Permission = keyof typeof PERMISSIONS;

// ─── Helpers ──────────────────────────────────────────────────────────────────

const VALID_ROLES: UserRole[] = [
  "teacher", "student", "parent", "school_admin", "super_admin",
];

export function getRoleFromMetadata(
  publicMetadata: Record<string, unknown>
): UserRole | null {
  const role = publicMetadata?.role;
  if (typeof role === "string" && VALID_ROLES.includes(role as UserRole)) {
    return role as UserRole;
  }
  return null;
}

export function getSchoolIdFromMetadata(
  publicMetadata: Record<string, unknown>
): string | null {
  const schoolId = publicMetadata?.schoolId;
  return typeof schoolId === "string" ? schoolId : null;
}

/** Check if a role has permission to do something. */
export function can(role: UserRole | null, permission: Permission): boolean {
  if (!role) return false;
  return (PERMISSIONS[permission] as readonly string[]).includes(role);
}

/** True when role is school_admin or super_admin. */
export function isAdmin(role: UserRole | null): boolean {
  return role === "school_admin" || role === "super_admin";
}
