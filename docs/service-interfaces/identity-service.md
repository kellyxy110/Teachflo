# TeachNexis Identity Service — Interface Design

**Service Name:** `TeachNexisIdentityService`  
**Capability Gap It Closes:** Multi-school authentication, role-based access, student/parent/teacher login  
**Current Backend:** Clerk (stay on Clerk; see Logto evaluation for migration analysis)  
**Owned By:** TeachNexis (interface is ours; Clerk is the current implementation)  
**Document:** 2026-07-04  

---

## Purpose

TeachNexis has multiple user types across multiple schools:

| Actor | Login Method | Roles |
|---|---|---|
| Teacher | Email + password / Google | TEACHER, FORM_TEACHER, HOD, VICE_PRINCIPAL, PRINCIPAL |
| Student | School-issued code + PIN | STUDENT |
| Parent | Phone + OTP or email | PARENT |
| School Admin | Email + MFA | ADMIN |
| TeachNexis Staff | SSO (internal) | SUPER_ADMIN |

The Identity Service owns all authentication and authorization. No feature route should import Clerk, Logto, or any auth SDK directly — only `TeachNexisIdentityService`. This means swapping auth providers (e.g., Clerk → Logto) requires changing one file, not dozens.

---

## Design Principles

1. **Provider-agnostic interface.** `getSession()` returns a TeachNexis session object — not a Clerk `userId`, not a Logto `sub`. Callers never see the underlying provider.
2. **School-scoped sessions.** Every session is bound to a `schoolId`. A user with accounts at two schools has two sessions.
3. **Role is in the session.** No database query needed to check if a user is a teacher or principal — the role is in the JWT claims, verified at the edge.
4. **Least privilege by default.** STUDENT sessions cannot call teacher-scoped routes. Middleware enforces this without any feature code checking roles.

---

## TypeScript Interface

```typescript
// ── Session types ─────────────────────────────────────────────────────────────

export type TeachNexisRole =
  | "TEACHER"
  | "FORM_TEACHER"
  | "HOD"
  | "VICE_PRINCIPAL"
  | "PRINCIPAL"
  | "STUDENT"
  | "PARENT"
  | "ADMIN"
  | "SUPER_ADMIN";

export interface TeachNexisSession {
  userId: string;           // TeachNexis-internal user ID (not provider ID)
  providerUserId: string;   // Clerk userId / Logto sub — for provider API calls
  email?: string;
  role: TeachNexisRole;
  schoolId: string;
  schoolCode: string;
  actorId: string;          // teacher.id / student.id / parent.id from DB
  actorType: "teacher" | "student" | "parent" | "admin";
  permissions: Permission[];
  sessionId: string;
  expiresAt: Date;
}

export type Permission =
  | "lesson:create"
  | "lesson:read"
  | "lesson:update"
  | "lesson:delete"
  | "exam:create"
  | "exam:grade"
  | "exam:read"
  | "student:read"
  | "student:grade"
  | "student:report"
  | "attendance:mark"
  | "attendance:read"
  | "school:admin"
  | "knowledge:ingest"
  | "knowledge:read"
  | "ai:generate"
  | "ai:admin";

// ── Permission matrix ─────────────────────────────────────────────────────────

export const ROLE_PERMISSIONS: Record<TeachNexisRole, Permission[]> = {
  TEACHER: [
    "lesson:create", "lesson:read", "lesson:update",
    "exam:create", "exam:read",
    "student:read", "student:grade", "student:report",
    "attendance:mark", "attendance:read",
    "knowledge:ingest", "knowledge:read",
    "ai:generate",
  ],
  FORM_TEACHER: [/* Teacher permissions + */ "student:report"],
  HOD: [/* Form Teacher permissions + */ "lesson:delete", "exam:grade"],
  VICE_PRINCIPAL: [/* HOD permissions + */ "school:admin"],
  PRINCIPAL: [/* All teacher permissions + */ "school:admin", "ai:admin"],
  STUDENT: ["lesson:read", "knowledge:read"],
  PARENT: ["student:read", "student:report", "attendance:read"],
  ADMIN: ["school:admin", "knowledge:ingest", "knowledge:read", "ai:admin"],
  SUPER_ADMIN: [], // All permissions — enforced separately
};

// ── Main service interface ────────────────────────────────────────────────────

export interface TeachNexisIdentityService {
  /**
   * Get the current session from the request context.
   * Returns null if unauthenticated — never redirects (that's middleware's job).
   */
  getSession(request?: Request): Promise<TeachNexisSession | null>;

  /**
   * Require a valid session. Throws if unauthenticated.
   * Use in server actions and API routes.
   */
  requireSession(request?: Request): Promise<TeachNexisSession>;

  /**
   * Require a specific role. Throws if user lacks the role.
   */
  requireRole(session: TeachNexisSession, role: TeachNexisRole | TeachNexisRole[]): void;

  /**
   * Check if session has a specific permission.
   */
  can(session: TeachNexisSession, permission: Permission): boolean;

  /**
   * Require a permission. Throws if lacking.
   */
  requirePermission(session: TeachNexisSession, permission: Permission): void;

  /**
   * Resolve a provider user ID to a TeachNexis session.
   * Used in webhooks (Clerk webhook → map to TeachNexis session).
   */
  resolveProviderUser(providerUserId: string): Promise<TeachNexisSession | null>;

  /**
   * Sync user metadata from provider to TeachNexis DB.
   * Called after provider webhook events (user.updated, session.created).
   */
  syncUser(providerUserId: string): Promise<void>;

  /**
   * Issue a short-lived student PIN token (for student login flows).
   */
  issueStudentToken(studentCode: string, pin: string, schoolCode: string): Promise<string>;

  /**
   * Validate a student PIN token.
   */
  validateStudentToken(token: string): Promise<TeachNexisSession | null>;
}
```

---

## Current Implementation: Clerk Adapter

```typescript
// lib/auth/adapters/clerk.ts — current implementation
import { auth, currentUser } from "@clerk/nextjs/server";
import type { TeachNexisIdentityService, TeachNexisSession } from "./types";

export const identityService: TeachNexisIdentityService = {
  async getSession() {
    const { userId, sessionClaims } = await auth();
    if (!userId) return null;
    return mapClerkSessionToTeachNexis(userId, sessionClaims);
  },
  // ... rest of implementation
};

function mapClerkSessionToTeachNexis(
  clerkUserId: string,
  claims: Record<string, unknown>
): TeachNexisSession {
  // Map Clerk publicMetadata → TeachNexis session shape
  const meta = (claims?.publicMetadata ?? {}) as Record<string, unknown>;
  return {
    userId: clerkUserId,           // Use Clerk ID as internal ID until we have our own
    providerUserId: clerkUserId,
    role: (meta.role as TeachNexisRole) ?? "TEACHER",
    schoolId: meta.schoolId as string,
    schoolCode: meta.schoolCode as string,
    actorId: meta.teacherId as string,
    actorType: "teacher",
    permissions: ROLE_PERMISSIONS[meta.role as TeachNexisRole] ?? [],
    sessionId: clerkUserId,
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
  };
}
```

If TeachNexis migrates to Logto or a custom identity system, only this adapter file changes. All calling code stays identical.

---

## Middleware (Current)

```typescript
// middleware.ts — enforces auth at the edge, role-based routing
export default clerkMiddleware(async (auth, request) => {
  const publicPaths = ["/sign-in", "/sign-up", "/onboarding", "/api/webhooks"];
  if (publicPaths.some((p) => request.nextUrl.pathname.startsWith(p))) return;

  const { userId } = await auth();
  if (!userId) return NextResponse.redirect(new URL("/sign-in", request.url));

  // Role-based route protection
  if (request.nextUrl.pathname.startsWith("/admin")) {
    const session = await identityService.getSession();
    if (!identityService.can(session!, "school:admin")) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }
});
```

---

## Logto Migration Path (Future)

Based on Logto evaluation (see `docs/repo-evaluations/logto.md`):

**Recommendation:** Stay on Clerk for Phase 1-2. Plan Logto migration for Phase 3 when multi-school tenancy requirements grow beyond Clerk's free tier limits.

Migration when needed:
1. Build `LogtoAdapter` implementing `TeachNexisIdentityService`
2. Run Clerk and Logto in parallel (shadow mode) — Logto verifies against Clerk tokens
3. Migrate user accounts in batches by school
4. Cut over middleware to use `LogtoAdapter`
5. Decommission Clerk

**Total migration risk:** Medium. The interface abstraction makes step 4 a single line change.

---

## Student Login Flow (School-Issued Credentials)

Students in Nigerian secondary schools typically don't have email addresses. TeachNexis needs a PIN-based login flow for students:

```
Teacher creates student account → system generates studentCode (e.g., "GCS-2024-001")
Student receives studentCode + 4-digit PIN from school office
Student logs in at /student-login → enters code + PIN
TeachNexis Identity Service issues a JWT → session created
```

This flow bypasses Clerk entirely — it's handled by `issueStudentToken()` and `validateStudentToken()` in the Identity Service.

---

## Phase 1 Implementation Plan

| Task | Status | Notes |
|---|---|---|
| Clerk adapter (`lib/auth/adapters/clerk.ts`) | Exists (partial) | Wrap fully into IdentityService interface |
| `requireSession()` / `requireRole()` / `can()` | Exists in `lib/auth.ts` | Refactor to IdentityService methods |
| Student PIN login flow | Not built | Priority for student-facing features |
| Parent OTP login | Not built | Phase 2 |
| `TeachNexisSession` type | Not formalized | Define and enforce across all routes |

---

## Security Requirements

- [ ] JWT tokens are short-lived (7 days max for teachers, 24 hours for students)
- [ ] Session cookies are `httpOnly`, `Secure`, `SameSite=Strict`
- [ ] Student PIN hashed with bcrypt (never stored plain)
- [ ] All auth failures return generic 401 (no provider-specific error messages)
- [ ] Rate limiting on login endpoints (max 5 attempts per IP per 15 minutes)
- [ ] Session invalidation on school account deletion
- [ ] Audit log on all permission-denied events
