# TeachNexis Identity Service — Architecture Reference

**Version:** 1.0  
**Status:** Phase 1 Engineering Reference  
**Date:** 2026-07-04  
**Author:** TeachNexis Platform Architecture  
**Replaces:** `docs/service-interfaces/identity-service.md` (interface sketch only)

---

## Table of Contents

1. [Responsibilities and Boundaries](#1-responsibilities-and-boundaries)
2. [Internal Modules](#2-internal-modules)
3. [Provider Interface](#3-provider-interface)
4. [TeachNexis Session Object](#4-teachnexis-session-object)
5. [RBAC Design](#5-rbac-design)
6. [Multi-School Tenancy](#6-multi-school-tenancy)
7. [Student PIN Login Flow](#7-student-pin-login-flow)
8. [Parent Account Flow](#8-parent-account-flow)
9. [Teacher Onboarding Flow](#9-teacher-onboarding-flow)
10. [JWT Strategy](#10-jwt-strategy)
11. [Organization Management API](#11-organization-management-api)
12. [Middleware Implementation](#12-middleware-implementation)
13. [Logto Migration Plan](#13-logto-migration-plan)
14. [Security Model](#14-security-model)
15. [Privacy Model — NDPR Compliance](#15-privacy-model--ndpr-compliance)
16. [Testing Strategy](#16-testing-strategy)
17. [Monitoring](#17-monitoring)
18. [Phase 1 Implementation Checklist](#18-phase-1-implementation-checklist)

---

## 1. Responsibilities and Boundaries

### What the Identity Service Owns

The Identity Service is the single source of truth for **who a user is** and **what they are allowed to do**. It owns:

- **Authentication state**: issuing, validating, and invalidating sessions for all actor types (teacher, student, parent, admin)
- **Session construction**: building the canonical `TeachNexisSession` from provider tokens (Clerk JWT claims) or native credentials (student PIN JWT)
- **Role and permission enforcement**: the `ROLE_PERMISSIONS` matrix, `can()` checks, `requirePermission()` guards
- **Multi-school membership**: which schools a user belongs to, what their role is at each school, and which school their current session is bound to
- **Organization lifecycle**: creating a school-as-organization in the provider, adding members, assigning roles, removing users
- **Student PIN credentials**: generating, hashing, storing, and validating student PINs and school-issued student codes
- **Parent phone OTP**: initiating OTP via Africa's Talking / Termii, validating OTP, establishing parent sessions
- **Onboarding flows**: teacher first-login state machine, student first-login state machine, PIN change on first use
- **JWT issuance for native sessions**: RS256-signed JWTs for student and parent sessions that bypass the Clerk token path
- **Audit log for auth events**: login, logout, role change, PIN reset, failed attempt, session invalidation
- **Brute-force and rate-limit state**: failed attempt counters and lockout timers for both Clerk-backed and PIN-backed actors

### What the Identity Service Does NOT Own

These concerns live elsewhere. The Identity Service may **read** some of this data for session construction but must not own or mutate it:

| Concern | Owned By |
|---|---|
| Teacher profile data (name, subjects, TRCN number, bio) | `Teacher` DB record — DB layer |
| Student academic record (scores, exam attempts, class assignment) | `Student` DB record — DB layer |
| School configuration (name, plan, features, LGA, logo) | `School` DB record — school admin service |
| Billing and subscription state | Billing service (future) |
| Parent-student relationships for data access | Relationship table read by Identity Service for session scope, owned by DB layer |
| Lesson, exam, and curriculum data | Domain services |
| AI model routing and usage quotas | AI Router service |
| Notification delivery | Notification service |

**Hard boundary**: no route outside `lib/auth/` and `middleware.ts` should import from `@clerk/nextjs`, `@clerk/nextjs/server`, or any future provider SDK. All auth imports come from `@/lib/auth` or `@/lib/auth/service`.

---

## 2. Internal Modules

The Identity Service is a logical service, not a separate process. In Phase 1 it lives in `apps/web/lib/auth/`. Its internal structure:

```
lib/auth/
├── service.ts               ← entry point; exports identityService singleton
├── types.ts                 ← all shared types and enums
├── adapters/
│   ├── clerk.ts             ← ClerkAdapter (current)
│   └── logto.ts             ← LogtoAdapter (future stub)
├── modules/
│   ├── student-auth.ts      ← StudentAuthModule
│   ├── parent-auth.ts       ← ParentAuthModule
│   ├── session.ts           ← SessionModule
│   ├── rbac.ts              ← RBACModule
│   ├── organization.ts      ← OrganizationModule
│   └── onboarding.ts        ← OnboardingModule
└── middleware-helpers.ts    ← pure functions used by middleware.ts
```

### 2.1 ClerkAdapter

**Purpose**: implements the `IdentityProvider` interface using the Clerk SDK. This is the only file allowed to import from `@clerk/nextjs/server` or use `clerkClient()`.

**Key functions**:

```typescript
class ClerkAdapter implements IdentityProvider {
  // Reads Clerk JWT from the request, returns raw provider claims
  async getProviderSession(): Promise<RawProviderSession | null>

  // Calls Clerk API to fetch full user object
  async getProviderUser(providerUserId: string): Promise<RawProviderUser | null>

  // Writes schoolId, role, actorId, schoolCode into Clerk publicMetadata
  async setUserMetadata(providerUserId: string, metadata: ClerkMetadata): Promise<void>

  // Creates an Organization in Clerk (maps to a School)
  async createOrganization(params: CreateOrgParams): Promise<RawOrganization>

  // Adds a Clerk user to an Organization with a role slug
  async addMember(orgId: string, providerUserId: string, role: string): Promise<void>

  // Updates Clerk Organization membership role
  async assignRole(orgId: string, providerUserId: string, role: string): Promise<void>

  // Removes a user from an Organization (does not delete user account)
  async removeMember(orgId: string, providerUserId: string): Promise<void>

  // Deletes (or deactivates) a user account in Clerk
  async removeUser(providerUserId: string): Promise<void>
}
```

**Reads**: Clerk JWT from cookies (via `auth()` from `@clerk/nextjs/server`), Clerk REST API for user metadata.  
**Writes**: Clerk `publicMetadata` via `clerkClient().users.updateUserMetadata()`, Clerk Organizations via `clerkClient().organizations.*`.

### 2.2 LogtoAdapter

**Purpose**: future implementation of `IdentityProvider` using Logto's Node SDK and OIDC endpoints. Not built in Phase 1 but the interface contract is defined so it can be scaffolded without touching any caller code.

**Structure** (stub for Phase 3):

```typescript
class LogtoAdapter implements IdentityProvider {
  private client: LogtoClient  // @logto/node SDK client

  async getProviderSession(): Promise<RawProviderSession | null> {
    // Validate Logto OIDC access token from Authorization header or cookie
    // Extract sub, org_id, roles[] from token claims
  }

  async getProviderUser(providerUserId: string): Promise<RawProviderUser | null> {
    // GET /api/users/:id from Logto Management API
    // Map Logto user object to RawProviderUser
  }

  async setUserMetadata(providerUserId: string, metadata: LogtoMetadata): Promise<void> {
    // PATCH /api/users/:id/custom-data via Logto Management API
    // schoolId, role, actorId live in customData
  }

  async createOrganization(params: CreateOrgParams): Promise<RawOrganization> {
    // POST /api/organizations via Logto Management API
  }

  async addMember(orgId: string, providerUserId: string, role: string): Promise<void> {
    // PUT /api/organizations/:id/users
  }

  async assignRole(orgId: string, providerUserId: string, role: string): Promise<void> {
    // PUT /api/organizations/:id/users/:userId/roles
  }

  async removeMember(orgId: string, providerUserId: string): Promise<void> {
    // DELETE /api/organizations/:id/users/:userId
  }

  async removeUser(providerUserId: string): Promise<void> {
    // DELETE /api/users/:id
  }
}
```

**Key difference from ClerkAdapter**: Logto stores `schoolId` and `role` in `customData` and `organization.roles`, not `publicMetadata`. The `SessionModule` must handle both claim shapes through a normalization step.

### 2.3 StudentAuthModule

**Purpose**: handles the complete PIN-based authentication lifecycle for students. Entirely native to TeachNexis — Clerk and Logto are not involved.

**Key functions**:

```typescript
module StudentAuthModule {
  // Called by teacher/admin when creating a student account
  // Returns { studentCode, pin } where pin is shown once, then discarded
  async createStudentCredentials(params: {
    studentId: string     // DB Student.id
    schoolCode: string
    schoolId: string
    yearEnrolled: number
  }): Promise<{ studentCode: string; pin: string }>

  // Validates studentCode + PIN + schoolCode at /student-login
  // Returns a signed JWT string or throws AuthError
  async authenticateStudent(params: {
    studentCode: string
    pin: string
    schoolCode: string
  }): Promise<string>   // returns signed JWT

  // Verifies a student JWT and returns the session
  // Used by middleware and API routes for student-originated requests
  async verifyStudentToken(token: string): Promise<TeachNexisSession | null>

  // Teacher-initiated PIN reset — generates and returns new PIN, invalidates old
  async resetStudentPin(params: {
    studentId: string
    initiatedByTeacherId: string
    schoolId: string
  }): Promise<{ newPin: string }>

  // Checks if a studentCode exists and belongs to the given school
  async resolveStudentCode(studentCode: string, schoolCode: string): Promise<Student | null>

  // Marks a student session as requiring PIN change on next login
  async requirePinChange(studentId: string): Promise<void>
}
```

**Reads**: `StudentCredential` table (studentCode, pinHash, schoolId, studentId, requiresPinChange, failedAttempts, lockedUntil).  
**Writes**: `StudentCredential` table on create/reset; `AuthEvent` table on every login attempt; `Student.isActive` on lockout escalation.

**PIN storage table** (extend Prisma schema):

```prisma
model StudentCredential {
  id               String    @id @default(cuid())
  studentId        String    @unique
  student          Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)
  studentCode      String    @unique
  schoolId         String
  pinHash          String    // bcrypt, cost 12
  requiresPinChange Boolean  @default(true)
  failedAttempts   Int       @default(0)
  lockedUntil      DateTime?
  lastLoginAt      DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  @@index([schoolId])
  @@index([studentCode])
  @@map("student_credentials")
}
```

### 2.4 ParentAuthModule

**Purpose**: manages phone OTP registration and authentication for parents. Does not use Clerk for session issuance — TeachNexis issues a native JWT on successful OTP validation.

**Key functions**:

```typescript
module ParentAuthModule {
  // Sends OTP to phone number; stores hash of OTP + expiry
  async initiateOtp(phone: string): Promise<{ requestId: string }>

  // Validates OTP; creates or retrieves Parent record; returns signed JWT
  async verifyOtp(params: {
    phone: string
    otp: string
    requestId: string
  }): Promise<{ token: string; isNew: boolean }>

  // Links a parent to a student (creates ParentStudent join record)
  async linkStudentToParent(params: {
    parentId: string
    studentCode: string
    schoolCode: string
  }): Promise<void>

  // Verifies a parent JWT and returns the session
  async verifyParentToken(token: string): Promise<TeachNexisSession | null>

  // Returns list of students visible to the parent in this session
  async getParentScope(parentId: string): Promise<{ studentId: string; schoolId: string }[]>
}
```

**Reads**: `OtpRequest` table (phone hash, OTP hash, expiry, requestId); `Parent` table; `ParentStudent` join table.  
**Writes**: `OtpRequest` table on initiate/verify; `Parent` table on first login; `ParentStudent` on link; `AuthEvent` on all attempts.

**OTP storage** (never store plain OTP):

```prisma
model OtpRequest {
  id          String   @id @default(cuid())
  phoneHash   String   // SHA-256 of normalized phone number
  otpHash     String   // bcrypt hash of the 6-digit OTP
  requestId   String   @unique @default(cuid())
  expiresAt   DateTime
  verified    Boolean  @default(false)
  attempts    Int      @default(0)
  createdAt   DateTime @default(now())

  @@index([phoneHash])
  @@map("otp_requests")
}
```

### 2.5 SessionModule

**Purpose**: constructs and validates `TeachNexisSession` objects from multiple token sources. Acts as the normalization layer between raw provider claims (Clerk JWT, Logto token, student JWT, parent JWT) and the canonical session shape.

**Key functions**:

```typescript
module SessionModule {
  // Determines token type from request (Clerk cookie vs Authorization Bearer)
  // then dispatches to the correct validator
  async resolveSession(request: Request): Promise<TeachNexisSession | null>

  // Builds TeachNexisSession from Clerk session claims
  // No DB query — all data comes from JWT publicMetadata claims
  buildFromClerkClaims(
    clerkUserId: string,
    claims: ClerkSessionClaims
  ): TeachNexisSession

  // Builds TeachNexisSession from a verified student JWT payload
  buildFromStudentPayload(payload: StudentJwtPayload): TeachNexisSession

  // Builds TeachNexisSession from a verified parent JWT payload
  buildFromParentPayload(payload: ParentJwtPayload): TeachNexisSession

  // Validates a TeachNexis-signed JWT (RS256) — used for student and parent tokens
  verifyNativeJwt(token: string): Promise<StudentJwtPayload | ParentJwtPayload | null>

  // Reads session from Next.js request context (set by middleware)
  // Zero latency — reads from request headers, never calls provider API
  getFromContext(request: Request): TeachNexisSession | null

  // Returns null if session is expired; refreshes if within refresh window
  async refreshIfNeeded(session: TeachNexisSession): Promise<TeachNexisSession | null>
}
```

**Reads**: JWT from `__session` cookie (Clerk) or `Authorization: Bearer` header (student/parent); environment variables `TEACHNEXIS_JWT_PUBLIC_KEY`.  
**Writes**: nothing — SessionModule is read-only. It never mutates DB state.

### 2.6 RBACModule

**Purpose**: permission matrix definition, role-to-permission resolution, and enforcement helpers. This is a pure computation module — no I/O.

**Key functions**:

```typescript
module RBACModule {
  // Returns true if the session's role grants the permission
  can(session: TeachNexisSession, permission: Permission): boolean

  // Throws PermissionError (HTTP 403) if permission not held
  requirePermission(session: TeachNexisSession, permission: Permission): void

  // Returns true if role is in the list
  hasRole(session: TeachNexisSession, ...roles: TeachNexisRole[]): boolean

  // Throws PermissionError if role not in list
  requireRole(session: TeachNexisSession, ...roles: TeachNexisRole[]): void

  // Returns the full permission set for a role
  permissionsFor(role: TeachNexisRole): Permission[]

  // Validates that a claimed permissions array matches the role's allowed set
  // Used during JWT validation to detect tampered permission claims
  validatePermissionClaims(role: TeachNexisRole, claimed: Permission[]): boolean
}
```

**Reads**: `ROLE_PERMISSIONS` constant (compile-time, no I/O).  
**Writes**: nothing.

### 2.7 OrganizationModule

**Purpose**: manages school-as-organization operations in the auth provider and keeps the `School` DB record synchronized.

**Key functions**:

```typescript
module OrganizationModule {
  // Creates an org in Clerk + School record in DB
  // Returns schoolCode (e.g., "GCS-LAG-001")
  async provisionSchool(params: {
    name: string
    state: string
    lga: string
    plan: Plan
    adminProviderUserId: string
  }): Promise<{ schoolId: string; schoolCode: string; orgId: string }>

  // Adds a teacher to a school; sets role in Clerk org + DB Teacher record
  async addTeacherToSchool(params: {
    schoolId: string
    providerUserId: string
    role: TeacherRole
  }): Promise<void>

  // Changes a member's role in both Clerk org and DB
  async changeTeacherRole(params: {
    schoolId: string
    teacherId: string
    newRole: TeacherRole
    changedByAdminId: string
  }): Promise<void>

  // Deactivates a teacher: removes from Clerk org, sets Teacher.isActive=false
  // Does NOT delete the Clerk user account
  async deactivateTeacher(params: {
    schoolId: string
    teacherId: string
    deactivatedByAdminId: string
  }): Promise<void>

  // Generates N student codes + PINs for bulk import
  async bulkGenerateStudentCodes(params: {
    schoolId: string
    count: number
    yearEnrolled: number
  }): Promise<{ studentCode: string; pin: string }[]>

  // Generates a one-time teacher invite code (stored in DB, expires 48h)
  async generateTeacherInviteCode(params: {
    schoolId: string
    role: TeacherRole
    generatedByAdminId: string
  }): Promise<{ code: string; expiresAt: Date }>

  // Returns paginated auth event log for a school
  async getAuditLog(params: {
    schoolId: string
    page: number
    pageSize: number
    eventTypes?: AuthEventType[]
  }): Promise<{ events: AuthEvent[]; total: number }>
}
```

**Reads**: `School` table, `Teacher` table, `TeacherInvite` table, Clerk Organization API.  
**Writes**: `School` table, `Teacher` table, `TeacherInvite` table, `StudentCredential` table, `AuthEvent` table; Clerk Organization and membership APIs.

### 2.8 OnboardingModule

**Purpose**: manages the state machine for first-login flows. A teacher who has signed up with Clerk but has no `Teacher` DB record is in `onboarding` state — the module tracks where they are in the process.

**Key functions**:

```typescript
module OnboardingModule {
  // Determines the onboarding state for a Clerk user
  async getTeacherOnboardingState(clerkUserId: string): Promise<
    | { state: "complete"; teacherId: string; schoolId: string }
    | { state: "pending_school"; teacherId: null }
    | { state: "pending_approval"; inviteCode: string; schoolId: string }
    | { state: "no_record" }
  >

  // Creates Teacher DB record after Clerk signup webhook
  async createTeacherRecord(params: {
    clerkUserId: string
    email: string
    firstName: string
    lastName: string
  }): Promise<{ teacherId: string }>

  // Consumes an invite code: links teacher to school, sets role, updates Clerk metadata
  async consumeTeacherInvite(params: {
    clerkUserId: string
    inviteCode: string
  }): Promise<{ schoolId: string; role: TeacherRole }>

  // Completes teacher onboarding: writes schoolId + role to Clerk publicMetadata
  async completeTeacherOnboarding(params: {
    clerkUserId: string
    teacherId: string
    schoolId: string
    role: TeacherRole
  }): Promise<void>

  // Student first-login: forces PIN change on first use
  async getStudentOnboardingState(studentCode: string): Promise<
    | { state: "requires_pin_change" }
    | { state: "complete" }
  >

  // Commits a new PIN chosen by student on first login
  async completeStudentPinChange(params: {
    studentCode: string
    currentPin: string      // the system-generated PIN
    newPin: string
    confirmPin: string
  }): Promise<void>
}
```

**Reads**: `Teacher` table, `TeacherInvite` table, `StudentCredential.requiresPinChange`.  
**Writes**: `Teacher` table, `TeacherInvite.usedAt`, Clerk `publicMetadata` via ClerkAdapter, `StudentCredential.pinHash` and `requiresPinChange`.

---

## 3. Provider Interface

This is the contract. `ClerkAdapter` and `LogtoAdapter` both implement it. When you swap providers, you change which class is instantiated in `lib/auth/service.ts` — nothing else changes.

```typescript
// lib/auth/types.ts

// ─── Raw provider types ───────────────────────────────────────────────────────
// These are the normalized shapes returned by any provider adapter.
// Callers never see Clerk-specific or Logto-specific objects.

export interface RawProviderSession {
  providerUserId: string
  sessionId: string
  claims: Record<string, unknown>   // raw JWT claims (publicMetadata for Clerk)
  expiresAt: Date
}

export interface RawProviderUser {
  providerUserId: string
  email: string | null
  firstName: string | null
  lastName: string | null
  imageUrl: string | null
  metadata: Record<string, unknown>  // publicMetadata (Clerk) or customData (Logto)
}

export interface RawOrganization {
  orgId: string          // provider-internal org ID
  name: string
  slug: string
  metadata: Record<string, unknown>
}

export interface CreateOrgParams {
  name: string
  slug: string           // must be globally unique in provider
  metadata?: Record<string, unknown>
}

// ─── The provider contract ────────────────────────────────────────────────────

export interface IdentityProvider {
  /**
   * Extract and validate the provider's session token from the current request.
   * Returns null if no valid token is present (not authenticated).
   * Must not throw on missing token — throw only on malformed/expired tokens.
   */
  getProviderSession(): Promise<RawProviderSession | null>

  /**
   * Fetch the full user object from the provider's API.
   * Returns null if no user with this ID exists.
   * This hits the provider's REST API — call sparingly (use claims for hot paths).
   */
  getProviderUser(providerUserId: string): Promise<RawProviderUser | null>

  /**
   * Write metadata to the provider's user record.
   * For Clerk: updates publicMetadata (included in JWT claims on next session).
   * For Logto: updates customData (included in token on next refresh).
   * This is how schoolId, role, actorId are pushed into JWT claims.
   */
  setUserMetadata(
    providerUserId: string,
    metadata: Record<string, unknown>
  ): Promise<void>

  /**
   * Create a new organization in the provider (maps to a School in TeachNexis).
   * Returns the raw organization object including the provider-internal orgId.
   */
  createOrganization(params: CreateOrgParams): Promise<RawOrganization>

  /**
   * Add a user to an organization with a named role.
   * Role names are provider-specific slugs (e.g., "org:teacher", "org:admin").
   * Idempotent: adding an existing member must not throw.
   */
  addMember(orgId: string, providerUserId: string, role: string): Promise<void>

  /**
   * Change an existing member's role within an organization.
   * Must not create a duplicate membership.
   */
  assignRole(orgId: string, providerUserId: string, role: string): Promise<void>

  /**
   * Remove a user from an organization.
   * Does NOT delete the user's account — only removes school membership.
   * Idempotent: removing a non-member must not throw.
   */
  removeMember(orgId: string, providerUserId: string): Promise<void>

  /**
   * Permanently delete (or suspend) a user account in the provider.
   * Called only when a user explicitly requests account deletion.
   * Not called for school deactivation (use removeMember instead).
   */
  removeUser(providerUserId: string): Promise<void>

  /**
   * Resolve a provider user ID into a partial TeachNexis session.
   * Used by webhook handlers that receive a Clerk userId but need session data.
   * Returns null if the user has not completed onboarding (no schoolId in metadata).
   */
  resolveProviderUser(providerUserId: string): Promise<Partial<TeachNexisSession> | null>

  /**
   * Sync the provider's user data into TeachNexis DB.
   * Called after user.updated webhook events to keep DB in sync with provider.
   */
  syncUser(providerUserId: string): Promise<void>
}
```

**How the swap works**: `lib/auth/service.ts` exports `identityProvider`:

```typescript
// lib/auth/service.ts

import { ClerkAdapter } from "./adapters/clerk"
// import { LogtoAdapter } from "./adapters/logto"  // ← uncomment for migration

export const identityProvider: IdentityProvider = new ClerkAdapter()
// export const identityProvider: IdentityProvider = new LogtoAdapter()  // ← migration cutover
```

Every other module imports `identityProvider` from `lib/auth/service.ts`. The migration is a one-line change in one file.

---

## 4. TeachNexis Session Object

### Canonical Shape

```typescript
// lib/auth/types.ts

export type TeachNexisRole =
  | "TEACHER"
  | "FORM_TEACHER"
  | "HOD"
  | "VICE_PRINCIPAL"
  | "PRINCIPAL"
  | "STUDENT"
  | "PARENT"
  | "ADMIN"
  | "SUPER_ADMIN"

export type ActorType = "teacher" | "student" | "parent" | "admin"

export interface TeachNexisSession {
  // Identity
  userId: string            // TeachNexis-internal user ID.
                            // For Clerk-backed: Teacher.id or Student.id from DB.
                            // For native tokens: same DB ID.
  providerUserId: string    // Clerk userId / Logto sub.
                            // Used when calling provider APIs. Empty string for
                            // student and parent native sessions.
  email?: string            // Present for teacher/admin. Absent for student/parent.

  // Authorization
  role: TeachNexisRole
  permissions: Permission[] // Derived from role via ROLE_PERMISSIONS.
                            // Embedded in JWT claims. Validated against role matrix
                            // on every session construction to catch tampering.

  // School scope — every session is bound to exactly one school
  schoolId: string          // UUID — primary key of School record
  schoolCode: string        // Human-readable short code e.g. "GCS-LAG-001"

  // Actor reference — links session to the domain entity
  actorId: string           // Teacher.id / Student.id / Parent.id
  actorType: ActorType

  // Session metadata
  sessionId: string         // Provider session ID or TeachNexis JWT jti
  expiresAt: Date
  issuedAt: Date
  tokenType: "clerk" | "student_pin" | "parent_otp"
}
```

### Construction from Clerk JWT Claims

Clerk's `sessionClaims` include `publicMetadata` when the session token is issued. The metadata is set by `ClerkAdapter.setUserMetadata()` during teacher onboarding. The `SessionModule.buildFromClerkClaims()` function maps claims to session:

```typescript
// lib/auth/modules/session.ts

function buildFromClerkClaims(
  clerkUserId: string,
  claims: Record<string, unknown>
): TeachNexisSession {
  const meta = (claims?.publicMetadata ?? {}) as ClerkPublicMetadata

  // Type-guard and validate all fields
  const role = assertValidRole(meta.role)
  const permissions = RBACModule.permissionsFor(role)

  // Validate claimed permissions match the role — detect tampering
  if (meta.permissions && !RBACModule.validatePermissionClaims(role, meta.permissions)) {
    throw new AuthError("INVALID_CLAIMS", "Permission claims do not match role")
  }

  if (!meta.schoolId) {
    throw new AuthError("INCOMPLETE_ONBOARDING", "Session has no schoolId")
  }

  return {
    userId: meta.teacherId ?? meta.actorId,   // DB actor ID stored in metadata
    providerUserId: clerkUserId,
    email: meta.email,
    role,
    permissions,
    schoolId: meta.schoolId,
    schoolCode: meta.schoolCode,
    actorId: meta.actorId,
    actorType: actorTypeFromRole(role),
    sessionId: claims.sid as string,
    expiresAt: new Date((claims.exp as number) * 1000),
    issuedAt: new Date((claims.iat as number) * 1000),
    tokenType: "clerk",
  }
}
```

### Fields Written to Clerk publicMetadata

These fields are set by `OnboardingModule.completeTeacherOnboarding()` and are available in JWT claims without a DB query:

```typescript
interface ClerkPublicMetadata {
  role: TeachNexisRole        // "TEACHER", "HOD", etc.
  schoolId: string            // UUID
  schoolCode: string          // "GCS-LAG-001"
  actorId: string             // Teacher.id from DB
  email: string               // Denormalized for convenience
  // permissions intentionally NOT stored in metadata — derived from role at session build time
}
```

Permissions are **not** stored in `publicMetadata` because they would become stale when the role changes. They are always derived from `ROLE_PERMISSIONS[role]` at session construction time.

### How Middleware Reads the Session Without a DB Roundtrip

The middleware calls `SessionModule.resolveSession(request)`. For Clerk-backed teachers:
1. Clerk's `auth()` helper validates the JWT signature using Clerk's public key (cached per deployment)
2. `sessionClaims.publicMetadata` contains `schoolId`, `role`, `actorId` — all written at onboarding
3. `buildFromClerkClaims()` assembles the full `TeachNexisSession`
4. Session is attached to `request.headers` as a Base64-encoded JSON string (key: `x-teachnexis-session`)
5. Server components and API routes call `SessionModule.getFromContext(request)` to decode it

Zero DB queries on the hot path for teacher sessions.

For student sessions the middleware reads the `Authorization: Bearer <token>` header, verifies the RS256 signature, and assembles the session from the JWT payload — also zero DB queries.

---

## 5. RBAC Design

### Role Taxonomy

| Role | Description | Scope |
|---|---|---|
| `TEACHER` | Classroom teacher | Own lessons, exams, classes assigned to them |
| `FORM_TEACHER` | Class guardian + teacher | Own classes + form-class reports |
| `HOD` | Head of Department | Department-wide lesson/exam oversight |
| `VICE_PRINCIPAL` | Deputy school leader | School-wide academic visibility |
| `PRINCIPAL` | School head | All academic + school admin |
| `STUDENT` | Enrolled student | Own records only |
| `PARENT` | Guardian | Own children's records only |
| `ADMIN` | School administrator | School config + all teachers |
| `SUPER_ADMIN` | TeachNexis staff | All schools, all data |

### Permission Set

| Permission | Description |
|---|---|
| `lesson:create` | Create new lesson notes |
| `lesson:read` | View lesson notes |
| `lesson:update` | Edit own lesson notes |
| `lesson:delete` | Delete lesson notes |
| `lesson:approve` | Approve lesson notes (HOD and above) |
| `exam:create` | Create exam or CBT |
| `exam:read` | View exam content |
| `exam:grade` | Grade/score student submissions |
| `exam:delete` | Delete exams |
| `student:read` | View student profiles |
| `student:grade` | Enter scores for students |
| `student:report` | Generate student report cards |
| `student:manage` | Create/deactivate student accounts |
| `attendance:mark` | Record daily attendance |
| `attendance:read` | View attendance records |
| `knowledge:ingest` | Upload documents to school knowledge base |
| `knowledge:read` | Query knowledge base (RAG) |
| `ai:generate` | Invoke AI generation features |
| `ai:admin` | Manage AI model settings and quotas |
| `school:admin` | Access school admin panel |
| `school:config` | Modify school settings (name, logo, plan) |
| `school:billing` | View/modify billing (future) |
| `user:invite` | Generate teacher invite codes |
| `user:deactivate` | Deactivate teacher accounts |
| `audit:read` | View auth event audit log |

### Permission Matrix

| Permission | TEACHER | FORM_TEACHER | HOD | VICE_PRINCIPAL | PRINCIPAL | STUDENT | PARENT | ADMIN | SUPER_ADMIN |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| `lesson:create` | Y | Y | Y | Y | Y | | | Y | Y |
| `lesson:read` | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| `lesson:update` | Y | Y | Y | Y | Y | | | Y | Y |
| `lesson:delete` | | | Y | Y | Y | | | Y | Y |
| `lesson:approve` | | | Y | Y | Y | | | | Y |
| `exam:create` | Y | Y | Y | Y | Y | | | Y | Y |
| `exam:read` | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| `exam:grade` | Y | Y | Y | Y | Y | | | Y | Y |
| `exam:delete` | | | Y | Y | Y | | | Y | Y |
| `student:read` | Y | Y | Y | Y | Y | | | Y | Y |
| `student:grade` | Y | Y | Y | Y | Y | | | Y | Y |
| `student:report` | | Y | Y | Y | Y | | | Y | Y |
| `student:manage` | | | | | Y | | | Y | Y |
| `attendance:mark` | Y | Y | Y | Y | Y | | | Y | Y |
| `attendance:read` | Y | Y | Y | Y | Y | | Y | Y | Y |
| `knowledge:ingest` | Y | Y | Y | Y | Y | | | Y | Y |
| `knowledge:read` | Y | Y | Y | Y | Y | Y | Y | Y | Y |
| `ai:generate` | Y | Y | Y | Y | Y | | | Y | Y |
| `ai:admin` | | | | | Y | | | Y | Y |
| `school:admin` | | | | Y | Y | | | Y | Y |
| `school:config` | | | | | Y | | | Y | Y |
| `school:billing` | | | | | | | | | Y |
| `user:invite` | | | | Y | Y | | | Y | Y |
| `user:deactivate` | | | | | Y | | | Y | Y |
| `audit:read` | | | | Y | Y | | | Y | Y |

### Permissions in JWT Claims

Permissions are **not** stored in JWT claims. The `ROLE_PERMISSIONS` lookup is constant and deterministic — there is no reason to serialize 20+ strings into every JWT. The session construction path is:

1. Extract `role` from JWT claims
2. Call `RBACModule.permissionsFor(role)` — a constant-time array lookup
3. Assign to `TeachNexisSession.permissions`

This means permission changes take effect at the next JWT refresh (7 days for teachers) unless the session is explicitly invalidated. For immediate revocation (e.g., HOD demoted to TEACHER), update `Clerk publicMetadata.role` and call `clerkClient().sessions.revokeSession()` for all active sessions of that user. On next login the new role is embedded in the token.

### Middleware Permission Enforcement at the Edge

The middleware runs before any server component or API route. It reads `x-teachnexis-session` from headers (set earlier in the middleware chain by the session resolver), parses the session, and enforces route-level permission gates. No DB query. No provider API call.

```typescript
// middleware-helpers.ts

export function enforceRoutePermission(
  session: TeachNexisSession | null,
  pathname: string
): "allow" | "redirect" | "forbidden" {
  const gate = ROUTE_PERMISSION_GATES.find(g => pathname.startsWith(g.prefix))
  if (!gate) return "allow"                          // no gate = public or post-auth UI
  if (!session) return "redirect"                    // not logged in → sign-in
  if (!RBACModule.can(session, gate.permission)) return "forbidden"
  return "allow"
}

const ROUTE_PERMISSION_GATES: RouteGate[] = [
  { prefix: "/admin",           permission: "school:admin" },
  { prefix: "/lessons/new",     permission: "lesson:create" },
  { prefix: "/exams/grade",     permission: "exam:grade" },
  { prefix: "/students/manage", permission: "student:manage" },
  { prefix: "/knowledge/ingest", permission: "knowledge:ingest" },
  { prefix: "/settings/school", permission: "school:config" },
  { prefix: "/audit",           permission: "audit:read" },
]
```

---

## 6. Multi-School Tenancy

### The Core Constraint

Every `TeachNexisSession` has exactly one `schoolId`. A teacher who works at two schools has two distinct identities in TeachNexis — two `Teacher` DB records, two school memberships, two roles. They log in and explicitly select which school's context they are entering.

A `SUPER_ADMIN` session is the only session not bound to a schoolId. SUPER_ADMIN routes are segregated to `/platform/*` and require `tokenType === "clerk"` (never a native student or parent token).

### School Code System

School codes are unique, human-readable identifiers assigned at school provisioning time:

```
Format: {ABBREVIATION}-{STATE_CODE}-{SEQ}
Examples:
  GCS-LAG-001   → Government College, Lagos, school #1 in Lagos
  KGS-ABJ-002   → Kings Global School, Abuja, school #2 in Abuja
  APHS-OND-001  → Apostolic Primary/High School, Ondo

Rules:
- ABBREVIATION: 2–5 uppercase letters, derived from school name
- STATE_CODE: 3-letter Nigerian state abbreviation (LAG, ABJ, KAN, OND, etc.)
- SEQ: zero-padded 3-digit sequential counter per state
- Total length: 8–12 characters
- Globally unique across TeachNexis
```

School codes are stored in `School.code` (unique index) and embedded in every student code and session.

### How a Supply Teacher Accesses Multiple Schools

1. Supply teacher signs up once with Clerk — one Clerk user account, one email
2. School A admin invites them → `Teacher` record created with `schoolId = A`, role set in Clerk publicMetadata
3. School B admin invites them → a second `Teacher` record created with `schoolId = B`
4. Teacher has two `Teacher` DB rows linked to the same `clerkId`
5. Clerk publicMetadata stores **an array** of school memberships:

```typescript
// Clerk publicMetadata shape for multi-school teacher
interface ClerkPublicMetadataMultiSchool {
  schools: Array<{
    schoolId: string
    schoolCode: string
    role: TeachNexisRole
    actorId: string        // Teacher.id for this school
  }>
  activeSchoolId: string   // the currently selected school
}
```

6. On login, if `schools.length > 1`, the app renders a school selector
7. After selection, the teacher's session is re-issued with the selected school's `schoolId` bound into it
8. For the school context to change mid-session, the teacher visits `/choose-school` and re-authenticates

### Cross-School Access Prevention — Defense in Depth

**Layer 1: Middleware** — The session's `schoolId` is validated against the requested resource's school context. Any route that accepts a `schoolId` parameter (or derives it from the URL) is checked against `session.schoolId` in middleware. Mismatch → 403.

**Layer 2: DB Query Scoping** — Every Prisma query that touches school-scoped data includes a `schoolId` filter:

```typescript
// Every teacher data query includes schoolId from session — not from query params
const lessons = await db.lesson.findMany({
  where: {
    schoolId: session.schoolId,    // ← always from the verified session
    teacherId: session.actorId,    // ← always from the verified session
  }
})
```

The DB pattern is enforced by a lint rule (custom ESLint rule) that flags any `db.*` call that touches a school-scoped model without a `schoolId` in the `where` clause. This prevents accidental omission.

**Layer 3: DB-level Row Security** — PostgreSQL Row Level Security (RLS) is configured on all school-scoped tables. The DB connection is initialized per-request with `SET app.school_id = '<session.schoolId>'`, and RLS policies enforce that every SELECT/INSERT/UPDATE/DELETE on school-scoped tables filters by `app.school_id`. This is the last line of defense if application code bypasses Layers 1 and 2.

```sql
-- Example RLS policy (applied to teachers, lessons, exams, students, etc.)
CREATE POLICY school_isolation ON teachers
  USING (school_id = current_setting('app.school_id')::text);

ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
```

---

## 7. Student PIN Login Flow

### Complete Flow

```
Teacher/Admin creates student account in admin panel
         │
         ▼
POST /api/admin/students/create
├─→ requirePermission("student:manage")
├─→ DB: Student record created (firstName, lastName, classId, schoolId)
├─→ StudentAuthModule.createStudentCredentials({
│       studentId, schoolCode, schoolId, yearEnrolled
│   })
│   ├─ Generate studentCode: "{SCHOOL_CODE}-{YEAR}-{SEQ}"
│   │   e.g. "GCS-LAG-001-2025-042"
│   │   SEQ = next available 3-digit number for this school in this year
│   ├─ Generate 4-digit PIN: crypto.randomInt(1000, 9999).toString()
│   ├─ Hash PIN: bcrypt.hash(pin, 12)
│   ├─ DB: StudentCredential created {
│   │       studentCode, pinHash, schoolId, studentId,
│   │       requiresPinChange: true, failedAttempts: 0
│   │   }
│   └─ Return { studentCode, pin } — pin shown ONCE to teacher, never stored plain
│
└─→ Teacher writes studentCode + PIN on school-issued slip for student
```

```
Student presents at /student-login
         │
         ▼
POST /api/auth/student/login  { studentCode, pin, schoolCode }
         │
         ├─ Rate limit check: max 10 req/min from same IP
         │
         ├─ StudentAuthModule.authenticateStudent({ studentCode, pin, schoolCode })
         │
         ├─ Resolve student:
         │   DB: StudentCredential.findUnique({ where: { studentCode } })
         │   if not found → AuthError("INVALID_CREDENTIALS")  [generic, no hint]
         │   if credential.schoolId !== resolved schoolCode school → AuthError("INVALID_CREDENTIALS")
         │
         ├─ Lockout check:
         │   if credential.lockedUntil && credential.lockedUntil > now()
         │     → AuthError("ACCOUNT_LOCKED", { lockedUntil })
         │
         ├─ PIN validation:
         │   bcrypt.compare(pin, credential.pinHash)
         │   if false:
         │     DB: increment failedAttempts
         │     if failedAttempts >= 3:
         │       DB: set lockedUntil = now() + 15 min
         │       DB: AuthEvent { type: "STUDENT_LOCKED_OUT", studentId }
         │     → AuthError("INVALID_CREDENTIALS")
         │   if true:
         │     DB: reset failedAttempts = 0, lockedUntil = null, lastLoginAt = now()
         │
         ├─ Check requiresPinChange:
         │   if true → issue short-lived pin-change token (15 min, scope: pin_change_only)
         │             redirect to /student-login/change-pin
         │
         ├─ Issue TeachNexis-signed JWT:
         │   payload = {
         │     sub: student.id,
         │     jti: crypto.randomUUID(),
         │     schoolId: credential.schoolId,
         │     schoolCode: schoolCode,
         │     role: "STUDENT",
         │     actorType: "student",
         │     iat: now(),
         │     exp: now() + 24h
         │   }
         │   token = jwt.sign(payload, TEACHNEXIS_JWT_PRIVATE_KEY, { algorithm: "RS256" })
         │
         ├─ DB: AuthEvent { type: "STUDENT_LOGIN", studentId, schoolId, ip, ua }
         │
         └─ Response: { token }  ← client stores in memory or secure cookie
```

### studentCode Format

```
{SCHOOL_CODE}-{YEAR_SHORT}-{SEQ}

SCHOOL_CODE = School.code                    e.g. "GCS-LAG-001"
YEAR_SHORT  = 2-digit enrolment year         e.g. "25" (2025)
SEQ         = 3-digit zero-padded sequential  e.g. "042" (42nd student this year)

Full example: GCS-LAG-001-25-042
```

Sequential numbering is maintained per `(schoolId, yearEnrolled)` pair using a DB counter in `SchoolYearCounter` table (atomic increment with `FOR UPDATE`).

### PIN Reset Flow (Teacher-Initiated Only)

Students cannot reset their own PIN. This is intentional — it prevents social engineering ("my friend forgot their PIN, can you reset it?"). Only teachers with `student:manage` permission can initiate a reset.

```
Teacher clicks "Reset PIN" in student management panel
         │
         ▼
POST /api/admin/students/{studentId}/reset-pin
├─→ requirePermission("student:manage")
├─→ Verify session.schoolId === student.schoolId  (cross-school guard)
├─→ Generate new 4-digit PIN: crypto.randomInt(1000, 9999).toString()
├─→ bcrypt.hash(newPin, 12)
├─→ DB: StudentCredential.update({
│       pinHash: newHash,
│       requiresPinChange: true,
│       failedAttempts: 0,
│       lockedUntil: null
│   })
├─→ DB: AuthEvent { type: "STUDENT_PIN_RESET", studentId, initiatedByTeacherId }
└─→ Response: { newPin }  ← shown once to teacher to hand to student
```

---

## 8. Parent Account Flow

### Phone Registration and OTP

Nigeria's phone number format: `+234XXXXXXXXXX`. Normalize all phone numbers to E.164 on input.

```
Parent visits /parent-login → enters phone number
         │
         ▼
POST /api/auth/parent/otp/initiate  { phone: "+2348012345678" }
         │
         ├─ Rate limit: max 3 OTP requests per phone per hour
         │
         ├─ Normalize phone to E.164 format
         ├─ phoneHash = SHA-256(normalizedPhone)  ← never store plain phone
         │
         ├─ Generate 6-digit OTP: crypto.randomInt(100000, 999999).toString()
         ├─ otpHash = bcrypt.hash(otp, 10)  ← cost 10 (OTP is short-lived)
         │
         ├─ DB: OtpRequest.create({
         │       phoneHash,
         │       otpHash,
         │       requestId: crypto.randomUUID(),
         │       expiresAt: now() + 10 min,
         │       verified: false,
         │       attempts: 0
         │   })
         │
         ├─ Send OTP via Africa's Talking (primary) or Termii (fallback):
         │   "Your TeachNexis code is {otp}. Valid for 10 minutes. Do not share."
         │
         └─ Response: { requestId }
```

```
Parent enters OTP
         │
         ▼
POST /api/auth/parent/otp/verify  { phone, otp, requestId }
         │
         ├─ phoneHash = SHA-256(normalizedPhone)
         ├─ DB: OtpRequest.findUnique({ where: { requestId } })
         │   Validate: requestId matches, not expired, not already verified, attempts < 5
         │   if invalid → AuthError("INVALID_OTP")
         │
         ├─ bcrypt.compare(otp, otpRequest.otpHash)
         │   if false: increment attempts; if attempts >= 5 mark as exhausted → error
         │
         ├─ Mark OtpRequest.verified = true
         │
         ├─ DB: Parent.upsert({ where: { phoneHash }, create: { phoneHash, schoolIds: [] } })
         │   Note: phoneHash is the stable identifier for parents, never store plain phone
         │
         ├─ Issue TeachNexis-signed JWT (RS256, 30-day lifetime for parents):
         │   payload = {
         │     sub: parent.id,
         │     jti: crypto.randomUUID(),
         │     role: "PARENT",
         │     actorType: "parent",
         │     studentIds: parent.studentLinks.map(l => l.studentId),
         │     schoolIds: parent.studentLinks.map(l => l.schoolId),
         │     iat: now(),
         │     exp: now() + 30d
         │   }
         │
         └─ Response: { token, isNew: boolean }
```

### Linking Parent to Student

After first login, parent must link to at least one student:

```
POST /api/auth/parent/link-student  { studentCode, schoolCode }
─→ requireParentSession()
─→ Resolve student from studentCode + schoolCode (same as student login resolver)
─→ Verify student is not already linked to this parent
─→ DB: ParentStudent.create({ parentId, studentId, schoolId })
─→ Reissue parent JWT with updated studentIds[] and schoolIds[] claims
─→ DB: AuthEvent { type: "PARENT_LINKED_STUDENT", parentId, studentId }
```

### Parent Session Scope

A parent session includes `studentIds: string[]` and `schoolIds: string[]` in its JWT claims. When a parent calls any API endpoint:
- The endpoint verifies the student being requested is in `session.studentIds`
- If accessing data across schools, the `schoolId` of the requested resource must be in `session.schoolIds`
- Parents cannot see another child's data — the `studentIds` claim enforces this at the session level, not just at the query level

```prisma
model Parent {
  id          String         @id @default(cuid())
  phoneHash   String         @unique  // SHA-256 of normalized E.164 phone
  isActive    Boolean        @default(true)
  createdAt   DateTime       @default(now())
  updatedAt   DateTime       @updatedAt
  studentLinks ParentStudent[]
  @@map("parents")
}

model ParentStudent {
  id        String  @id @default(cuid())
  parentId  String
  studentId String
  schoolId  String
  parent    Parent  @relation(fields: [parentId], references: [id])
  student   Student @relation(fields: [studentId], references: [id])
  @@unique([parentId, studentId])
  @@index([studentId])
  @@map("parent_students")
}
```

### OTP Provider Routing

```typescript
// lib/auth/modules/parent-auth.ts

async function sendOtp(phone: string, otp: string): Promise<void> {
  try {
    await africasTalking.sendSms({
      to: [phone],
      message: `Your TeachNexis code is ${otp}. Valid for 10 minutes. Do not share.`,
      from: "TeachNexis",
    })
  } catch (primaryError) {
    // Fallback to Termii
    await termii.sendSms({
      to: phone,
      sms: `Your TeachNexis code is ${otp}. Valid for 10 minutes.`,
      type: "plain",
      channel: "generic",
    })
  }
}
```

---

## 9. Teacher Onboarding Flow

### Happy Path — Teacher Has Invite Code

```
Teacher visits /sign-up → completes Clerk sign-up (email/password or Google)
         │
         ▼
Clerk fires user.created webhook → POST /api/webhooks/clerk
├─ Verify Clerk webhook signature (svix)
├─ OnboardingModule.createTeacherRecord({
│     clerkUserId, email, firstName, lastName
│  })
│  └─ DB: Teacher.create({ clerkId, email, firstName, lastName, isActive: false })
│     isActive: false until school is assigned
│
└─ Response: 200 (webhook ack)

Teacher visits /onboarding → enters invite code
         │
         ▼
POST /api/onboarding/teacher/consume-invite  { inviteCode }
├─ requireClerkSession() [user must be authenticated, not necessarily onboarded]
├─ OnboardingModule.consumeTeacherInvite({ clerkUserId, inviteCode })
│  ├─ DB: TeacherInvite.findUnique({ where: { code: inviteCode } })
│  │   Validate: exists, not expired, not already used, usedAt IS NULL
│  ├─ DB: Teacher.update({ schoolId, role }) ← from TeacherInvite
│  ├─ DB: Teacher.update({ isActive: true })
│  ├─ DB: TeacherInvite.update({ usedAt: now(), usedByClerkId: clerkUserId })
│  ├─ OrganizationModule.addTeacherToSchool({ schoolId, providerUserId, role })
│  │   └─ ClerkAdapter.addMember(school.orgId, clerkUserId, roleSlug)
│  └─ OnboardingModule.completeTeacherOnboarding({
│         clerkUserId, teacherId, schoolId, role
│      })
│      └─ ClerkAdapter.setUserMetadata(clerkUserId, {
│             role, schoolId, schoolCode, actorId: teacherId, email
│         })
│
└─ Redirect to /dashboard
   Session now has schoolId + role from Clerk publicMetadata (next JWT refresh)
```

### Edge Case 1 — No Invite Code (Pending State)

Teacher signs up without an invite code. They enter the `PENDING_SCHOOL` onboarding state.

```
/onboarding page shows two options:
  A) "Enter invite code" → happy path above
  B) "Apply to join a school" → teacher submits school name/code
     → DB: SchoolApplication.create({ teacherId, schoolCode, status: "PENDING" })
     → Admin sees application in school admin panel
     → Admin approves → triggers same flow as invite code consumption
```

Teacher is blocked from `/dashboard` until onboarding is complete. Middleware checks for `INCOMPLETE_ONBOARDING` on the session and redirects to `/onboarding`.

### Edge Case 2 — Teacher Invited to Second School

Teacher already has `schoolId = A` in their Clerk metadata. Admin of school B generates an invite code.

```
Teacher logs in → goes to /onboarding → enters school B's invite code
         │
         ▼
OnboardingModule.consumeTeacherInvite detects: Teacher.clerkId already exists
├─ Create second Teacher record: Teacher.create({ clerkId, schoolId: B, ... })
│  (same clerkId, different schoolId — valid; @@unique([schoolId, email]) allows this)
├─ Update Clerk publicMetadata.schools[] to add school B entry:
│  {
│    schools: [
│      { schoolId: A, schoolCode: "GCS-LAG-001", role: "TEACHER", actorId: teacherIdA },
│      { schoolId: B, schoolCode: "KGS-ABJ-002", role: "HOD", actorId: teacherIdB }
│    ],
│    activeSchoolId: A   ← unchanged; user must explicitly switch
│  }
│
└─ Next login shows school selector if schools.length > 1
```

### Webhook to Metadata Latency

Clerk `publicMetadata` is written by the webhook handler. The webhook fires asynchronously after sign-up. There is a race condition: the teacher may load `/dashboard` before the metadata is written.

Mitigation: the `/onboarding` page is shown immediately after sign-up. The teacher cannot reach `/dashboard` until `OnboardingModule.completeTeacherOnboarding()` writes the metadata (which happens synchronously within the invite-code-consumption request, not the webhook). The webhook only creates the bare `Teacher` record — metadata is set by the deliberate invite flow.

---

## 10. JWT Strategy

### Clerk-Backed Teacher/Admin Sessions

Clerk issues JWTs containing `sessionClaims` which include `publicMetadata`. TeachNexis extends Clerk's JWT template to embed custom claims.

**Clerk JWT Template** (configured in Clerk Dashboard → JWT Templates → `teachnexis-session`):

```json
{
  "publicMetadata": "{{user.public_metadata}}",
  "schoolId": "{{user.public_metadata.schoolId}}",
  "role": "{{user.public_metadata.role}}",
  "actorId": "{{user.public_metadata.actorId}}",
  "schoolCode": "{{user.public_metadata.schoolCode}}"
}
```

Claims are available in `session.sessionClaims` from `auth()` in `@clerk/nextjs/server`.

**Token lifetime**: Clerk's default session lifetime is 7 days. Refresh happens automatically via Clerk's `<ClerkProvider>` which silently refreshes the token in the background.

**Algorithm**: RS256 — Clerk signs with their private key; TeachNexis verifies with Clerk's public JWKS endpoint (cached by Clerk SDK).

### Student and Parent Native JWTs

Students and parents bypass Clerk. TeachNexis issues its own JWTs.

**Key pair**:
- `TEACHNEXIS_JWT_PRIVATE_KEY`: RSA-2048 private key, PEM format, stored in environment variables (never committed to git)
- `TEACHNEXIS_JWT_PUBLIC_KEY`: RSA-2048 public key, PEM format, used for verification in middleware
- Key rotation: quarterly. On rotation, issue new keys; accept both old and new public keys for a 7-day overlap window, then decommission old key.

**Student JWT payload**:

```typescript
interface StudentJwtPayload {
  sub: string          // Student.id
  jti: string          // UUID — used for revocation lookup
  schoolId: string
  schoolCode: string
  role: "STUDENT"
  actorType: "student"
  tokenType: "student_pin"
  iat: number
  exp: number          // iat + 86400 (24 hours)
}
```

**Parent JWT payload**:

```typescript
interface ParentJwtPayload {
  sub: string          // Parent.id
  jti: string
  role: "PARENT"
  actorType: "parent"
  tokenType: "parent_otp"
  studentIds: string[]
  schoolIds: string[]
  iat: number
  exp: number          // iat + 2592000 (30 days)
}
```

**Token lifetimes**:

| Actor | Token Type | Lifetime | Refresh Strategy |
|---|---|---|---|
| Teacher / Admin | Clerk JWT | 7 days | Clerk auto-refresh via ClerkProvider |
| Student | TeachNexis RS256 | 24 hours | Re-login (PIN) required after expiry |
| Parent | TeachNexis RS256 | 30 days | Re-OTP after expiry |

**Token storage**:
- Clerk tokens: stored in `__session` and `__client_uat` cookies by Clerk SDK (httpOnly, Secure, SameSite=Lax)
- Student tokens: stored in `__tn_student_session` cookie (httpOnly, Secure, SameSite=Strict)
- Parent tokens: stored in `__tn_parent_session` cookie (httpOnly, Secure, SameSite=Strict)

**Signing**:

```typescript
import jwt from "jsonwebtoken"

function issueStudentToken(payload: Omit<StudentJwtPayload, "iat" | "exp">): string {
  return jwt.sign(payload, process.env.TEACHNEXIS_JWT_PRIVATE_KEY!, {
    algorithm: "RS256",
    expiresIn: "24h",
    issuer: "teachnexis.com",
    audience: "teachnexis-student",
  })
}

function verifyStudentToken(token: string): StudentJwtPayload {
  return jwt.verify(token, process.env.TEACHNEXIS_JWT_PUBLIC_KEY!, {
    algorithms: ["RS256"],
    issuer: "teachnexis.com",
    audience: "teachnexis-student",
  }) as StudentJwtPayload
}
```

---

## 11. Organization Management API

School admins access these through the admin panel at `/admin`. All endpoints require `school:admin` permission and enforce `session.schoolId` scoping.

### Endpoints

```
GET  /api/admin/school                 → school profile + plan + member count
PUT  /api/admin/school                 → update school name, logo (school:config)

GET  /api/admin/teachers               → paginated list of teachers with roles
POST /api/admin/teachers/invite        → generate teacher invite code
DELETE /api/admin/teachers/{id}        → deactivate teacher (keeps DB record)
PUT  /api/admin/teachers/{id}/role     → change teacher role

GET  /api/admin/students               → paginated student list
POST /api/admin/students               → create single student + credentials
POST /api/admin/students/bulk          → CSV bulk import → generate codes + PINs
GET  /api/admin/students/codes/export  → download CSV of studentCode + PIN (one-time)
POST /api/admin/students/{id}/reset-pin → reset PIN (returns new PIN)
DELETE /api/admin/students/{id}        → deactivate student

GET  /api/admin/audit                  → auth event log (audit:read permission)
```

### Bulk Student Import

```
POST /api/admin/students/bulk
Content-Type: multipart/form-data
Body: { csv: File }

CSV columns: firstName, lastName, classId, gender (optional), regNumber (optional)

Processing:
1. Parse CSV (max 500 rows per batch)
2. Validate all rows before any DB writes (fail fast)
3. For each row:
   a. DB: Student.create(...)
   b. StudentAuthModule.createStudentCredentials(...)
4. Collect all { studentCode, pin, firstName, lastName } results
5. Return downloadable CSV: studentCode, firstName, lastName, pin
   ← This CSV is the PIN distribution sheet. It is generated once and not stored.
6. DB: AuthEvent { type: "BULK_STUDENT_IMPORT", count, adminId }
```

### Teacher Invite Code Schema

```prisma
model TeacherInvite {
  id               String      @id @default(cuid())
  code             String      @unique @default(cuid())
  schoolId         String
  school           School      @relation(fields: [schoolId], references: [id])
  role             TeacherRole
  generatedById    String      // Teacher.id of admin who generated it
  expiresAt        DateTime    // now() + 48h
  usedAt           DateTime?
  usedByClerkId    String?
  createdAt        DateTime    @default(now())

  @@index([schoolId])
  @@index([code])
  @@map("teacher_invites")
}
```

### Audit Log Schema

```prisma
model AuthEvent {
  id          String        @id @default(cuid())
  schoolId    String?       // null for SUPER_ADMIN and platform events
  actorType   String        // "teacher" | "student" | "parent" | "admin" | "system"
  actorId     String?       // Teacher.id / Student.id / etc.
  eventType   AuthEventType
  metadata    Json?         // IP, UA, additional context
  createdAt   DateTime      @default(now())

  @@index([schoolId, createdAt])
  @@index([actorId])
  @@map("auth_events")
}

enum AuthEventType {
  TEACHER_LOGIN
  TEACHER_LOGOUT
  TEACHER_LOGIN_FAILED
  STUDENT_LOGIN
  STUDENT_LOGIN_FAILED
  STUDENT_LOCKED_OUT
  STUDENT_PIN_RESET
  STUDENT_PIN_CHANGED
  PARENT_OTP_INITIATED
  PARENT_OTP_VERIFIED
  PARENT_OTP_FAILED
  PARENT_LINKED_STUDENT
  ROLE_CHANGED
  TEACHER_DEACTIVATED
  TEACHER_REACTIVATED
  BULK_STUDENT_IMPORT
  SESSION_INVALIDATED
  PERMISSION_DENIED
}
```

---

## 12. Middleware Implementation

### File: `apps/web/middleware.ts`

```typescript
import { clerkMiddleware } from "@clerk/nextjs/server"
import { NextResponse, type NextRequest } from "next/server"
import { SessionModule } from "@/lib/auth/modules/session"
import { enforceRoutePermission } from "@/lib/auth/middleware-helpers"

// ─── Route classification ─────────────────────────────────────────────────────

const PUBLIC_PATHS = [
  "/",
  "/sign-in",
  "/sign-up",
  "/student-login",       // student PIN login
  "/parent-login",        // parent OTP login
  "/privacy",
  "/terms",
  "/api/auth/student",    // student login API routes
  "/api/auth/parent",     // parent OTP API routes
  "/api/webhooks",        // Clerk webhooks — verified by svix signature
]

const STUDENT_PATHS = ["/s/"]           // /s/* are student-only routes
const PARENT_PATHS = ["/p/"]            // /p/* are parent-only routes
const PLATFORM_PATHS = ["/platform/"]   // SUPER_ADMIN only

// ─── Middleware ───────────────────────────────────────────────────────────────

export default clerkMiddleware(async (clerkAuth, request: NextRequest) => {
  const pathname = request.nextUrl.pathname

  // 1. Always-public paths — no auth check
  if (PUBLIC_PATHS.some(p => pathname.startsWith(p) || pathname === p)) {
    return NextResponse.next()
  }

  // 2. Student-specific paths — expect student JWT in cookie, not Clerk JWT
  if (STUDENT_PATHS.some(p => pathname.startsWith(p))) {
    return handleStudentRoute(request, pathname)
  }

  // 3. Parent-specific paths — expect parent JWT in cookie
  if (PARENT_PATHS.some(p => pathname.startsWith(p))) {
    return handleParentRoute(request, pathname)
  }

  // 4. Clerk-backed paths (teachers, admins)
  return handleClerkRoute(clerkAuth, request, pathname)
})

// ─── Route handlers ───────────────────────────────────────────────────────────

async function handleClerkRoute(clerkAuth: any, request: NextRequest, pathname: string) {
  const { userId, sessionClaims } = await clerkAuth()

  if (!userId) {
    return NextResponse.redirect(new URL("/sign-in", request.url))
  }

  // Check for incomplete onboarding before building full session
  const meta = (sessionClaims?.publicMetadata ?? {}) as Record<string, unknown>
  if (!meta.schoolId && !pathname.startsWith("/onboarding") && !pathname.startsWith("/choose-role")) {
    return NextResponse.redirect(new URL("/onboarding", request.url))
  }

  // Build TeachNexisSession from Clerk claims — zero DB query
  const session = SessionModule.buildFromClerkClaims(userId, sessionClaims ?? {})

  // Platform routes require SUPER_ADMIN
  if (pathname.startsWith("/platform/") && session.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Route-level permission enforcement
  const decision = enforceRoutePermission(session, pathname)
  if (decision === "forbidden") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }

  // Attach session to request headers — read by server components via getFromContext()
  const response = NextResponse.next()
  response.headers.set(
    "x-teachnexis-session",
    Buffer.from(JSON.stringify(session)).toString("base64")
  )
  return response
}

async function handleStudentRoute(request: NextRequest, pathname: string) {
  const cookie = request.cookies.get("__tn_student_session")
  if (!cookie) {
    return NextResponse.redirect(new URL("/student-login", request.url))
  }

  const session = await SessionModule.verifyNativeJwt(cookie.value, "student")
  if (!session) {
    // Expired or invalid student token
    const response = NextResponse.redirect(new URL("/student-login", request.url))
    response.cookies.delete("__tn_student_session")
    return response
  }

  const response = NextResponse.next()
  response.headers.set(
    "x-teachnexis-session",
    Buffer.from(JSON.stringify(session)).toString("base64")
  )
  return response
}

async function handleParentRoute(request: NextRequest, pathname: string) {
  const cookie = request.cookies.get("__tn_parent_session")
  if (!cookie) {
    return NextResponse.redirect(new URL("/parent-login", request.url))
  }

  const session = await SessionModule.verifyNativeJwt(cookie.value, "parent")
  if (!session) {
    const response = NextResponse.redirect(new URL("/parent-login", request.url))
    response.cookies.delete("__tn_parent_session")
    return response
  }

  const response = NextResponse.next()
  response.headers.set(
    "x-teachnexis-session",
    Buffer.from(JSON.stringify(session)).toString("base64")
  )
  return response
}

// ─── Matcher ──────────────────────────────────────────────────────────────────

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public/).*)",
  ],
}
```

### How Server Components Read the Session

```typescript
// lib/auth/modules/session.ts

export function getFromContext(request?: Request): TeachNexisSession | null {
  // In Next.js App Router server components, use headers() from next/headers
  const { headers } = require("next/headers")
  const h = request ? new Headers(request.headers) : headers()
  const encoded = h.get("x-teachnexis-session")
  if (!encoded) return null
  try {
    return JSON.parse(Buffer.from(encoded, "base64").toString("utf-8"))
  } catch {
    return null
  }
}
```

### Student JWT Verification Difference

Clerk JWTs are verified using Clerk's public JWKS endpoint, fetched and cached by the Clerk SDK. Student JWTs are verified using the `TEACHNEXIS_JWT_PUBLIC_KEY` env var loaded at server startup. The middleware handles both paths:

- Clerk cookie present → `clerkMiddleware` handles it → `auth()` validates Clerk JWT
- `__tn_student_session` cookie present → `handleStudentRoute` → `jwt.verify()` with RS256 public key

The middleware runs both checks in sequence. If both cookies are present (shouldn't happen in practice), the student-path check takes precedence for student routes, and the Clerk check takes precedence for teacher routes.

---

## 13. Logto Migration Plan

### Migration Trigger Criteria

Initiate migration planning when **any** of the following are met:
- MAU exceeds 40,000 (Clerk's Pro tier limit becomes cost-prohibitive)
- NDPR enforcement or legal advice mandates Nigeria-hosted data residency for auth tokens
- Clerk pricing change makes unit economics unworkable
- A feature requirement (e.g., custom OIDC provider federation with state-level school systems) is blocked by Clerk

### Pre-Migration Requirements

Before migration begins:
- `LogtoAdapter` must pass all adapter unit tests (see Section 16)
- `LogtoAdapter` must produce a session object that passes `assertSessionShapeIdentical()` (test that both adapters produce the same `TeachNexisSession` shape for the same user)
- Migration tooling must be built and tested on a staging environment with a cloned production dataset

### Migration Steps

**Step 1: Build LogtoAdapter (2 weeks)**

Implement `LogtoAdapter` class in `lib/auth/adapters/logto.ts` implementing the `IdentityProvider` interface. No feature code changes. All tests pass with `LogtoAdapter` swapped in.

**Step 2: Dual-Write Shadow Mode (1 week per school batch)**

Configure both Clerk and Logto as active providers. In `lib/auth/service.ts`:

```typescript
export const identityProvider: IdentityProvider = new DualModeAdapter({
  primary: new ClerkAdapter(),
  shadow: new LogtoAdapter(),
  shadowMode: true,    // shadow = validate but don't serve sessions from Logto
})
```

`DualModeAdapter` sends every authentication request to both providers. Logto results are logged and compared to Clerk results but not served to clients. Discrepancies are flagged as migration issues.

**Step 3: Org-by-Org Migration**

For each school (org), in sequence:
1. Export all Clerk users in the school's org
2. Create equivalent Logto organization + members via Logto Management API
3. Re-link social identities (each Google-linked teacher requires a Logto social connector linkage — one API call per user to `POST /api/users/:id/identities`)
4. Validate session shape parity for 10 sample users
5. Set school flag `useLogto: true` in DB
6. `DualModeAdapter` serves Logto sessions for this school's users, falls back to Clerk on Logto error

**Step 4: Middleware Cutover**

After all schools migrated and shadow mode shows zero discrepancies for 48 hours:

```typescript
// lib/auth/service.ts — single line change
export const identityProvider: IdentityProvider = new LogtoAdapter()
```

Deploy. Clerk sessions remain valid for their remaining lifetime (up to 7 days). New logins issue Logto tokens.

**Step 5: Clerk Decommission**

After 8 days (all Clerk sessions expired):
- Remove `@clerk/nextjs` from `package.json`
- Remove `ClerkProvider` from `layout.tsx`
- Remove Clerk webhook route (or repurpose to Logto webhook)
- Archive `lib/auth/adapters/clerk.ts`

### Timeline Estimate

| Phase | Duration | Work |
|---|---|---|
| LogtoAdapter implementation | 2 weeks | Engineering |
| Shadow mode + validation | 1 week | Engineering + QA |
| Org migration (per 10 schools) | 1 week | Tooling run + validation |
| Middleware cutover | 1 day | Single deploy |
| Clerk decommission | 1 day | Cleanup deploy |
| **Total** | ~6 weeks + 1 week per 10 school cohorts | |

### Risks and Rollback

**Risk 1: Social identity re-linking failures**. Some teachers who signed up via Google may not complete re-linking. Mitigation: send email notification 2 weeks before migration, provide a self-service re-link flow.

**Rollback**: Revert `lib/auth/service.ts` to `new ClerkAdapter()` and redeploy. Since Clerk accounts are never deleted during migration, rollback is instantaneous. Student and parent sessions are unaffected (they use TeachNexis native JWTs throughout).

---

## 14. Security Model

### Brute-Force Protection

**Teacher/Admin (Clerk-backed)**:
- Clerk applies rate limiting on sign-in attempts natively (5 failed attempts → 15-min lockout)
- TeachNexis does not need to implement a separate lockout for Clerk-backed users
- Custom API routes that call Clerk user management are rate-limited at the Next.js edge using `lib/rate-limit.ts` (sliding window, Redis-backed or in-memory for Phase 1)

**Student PIN**:
- 3 failed PIN attempts → 15-minute lockout (`StudentCredential.lockedUntil`)
- After lockout expires, counter resets; 3 more failures → lockout again
- Teacher-initiated reset is the only unlock mechanism for PIN accounts
- On lockout: `AuthEvent { type: "STUDENT_LOCKED_OUT" }` is written and monitored

**Parent OTP**:
- 5 failed OTP entries → `OtpRequest` marked exhausted; new OTP must be requested
- Max 3 OTP requests per phone per hour (prevents SMS flooding)

### Session Invalidation

| Trigger | Action |
|---|---|
| School deactivated | All active sessions for school members invalidated via Clerk `revokeAllSessions` per user |
| Teacher deactivated | `clerkClient().users.banUser(clerkUserId)` + all sessions for that user revoked |
| Student PIN reset | `StudentCredential.requiresPinChange = true`; existing student JWT JTIs added to denylist (Redis, TTL = 24h) |
| Explicit logout | Clerk: `auth.signOut()`; student: cookie cleared + JTI added to denylist |

### JWT Rotation Strategy

- TeachNexis RSA key pair rotated quarterly
- New key pair generated and stored in env before rotation
- During transition: both old and new public keys are loaded; `jwt.verify()` tries new key first, falls back to old
- Old key removed from env after all student/parent JWTs issued with it have expired (max 30 days post-rotation)
- Key rotation is logged as `AuthEvent { type: "JWT_KEY_ROTATED" }` at the SUPER_ADMIN level

### Audit Log Coverage

Every auth event is written to `AuthEvent` table with actor, school, event type, IP, and user agent. Events written synchronously (within the auth request) — never fire-and-forget. The audit log cannot be deleted by school admins; only SUPER_ADMIN can query cross-school, and the table is excluded from right-to-erasure (retained for security compliance per NDPR).

### HTTPS and Cookie Security

```typescript
// Cookie options for all TeachNexis-issued session cookies
const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: "/",
  // maxAge is omitted — session cookies expire when the JWT inside expires
}
```

Clerk cookies are configured via Clerk Dashboard with the same options applied through Clerk's cookie management.

---

## 15. Privacy Model — NDPR Compliance

The Nigeria Data Protection Regulation (NDPR) governs personal data processing for Nigerian residents. TeachNexis processes personal data for minors (students under 18), which triggers heightened obligations.

### Data Minimization

| Actor | Personal Data Collected | Justification |
|---|---|---|
| Teacher | Email, name | Account identity; contractual necessity |
| Student | Name, class, PIN hash | Academic record; no email required |
| Parent | Phone hash (never plain) | Verification; no email required |
| Admin | Email, name | Account identity; contractual necessity |

### Hashing and Encryption

- **Student PINs**: bcrypt, cost factor 12. Plain PIN is generated, displayed once, then discarded. The hash is the only persistent representation.
- **Parent phone numbers**: SHA-256 of normalized E.164 number. The hash is stored as the stable identifier. Plain phone number exists only during OTP delivery (in-memory, not persisted). Telco SMS delivery logs are not controlled by TeachNexis.
- **OTP codes**: bcrypt, cost factor 10 (faster for short-lived codes). Destroyed after verification.

### Data Retention and Purging

| Data | Retention | Purge Mechanism |
|---|---|---|
| Auth event logs | 90 days | Cron job: `DELETE FROM auth_events WHERE created_at < now() - interval '90 days'` |
| Expired OTP requests | 24 hours | Cron job: `DELETE FROM otp_requests WHERE expires_at < now() - interval '24h'` |
| Deactivated student credentials | 1 year after deactivation | Cron job on Student.isActive=false |
| Teacher account data | 2 years after deactivation | Retained for gradebook integrity |

### Right to Erasure

On erasure request (submitted through `POST /api/privacy/erasure`):
- Teacher: Clerk account deleted, `Teacher` record anonymized (name → "Deleted User", email → null), auth events for this actor anonymized within 30 days
- Student: `StudentCredential` deleted immediately, `Student` record anonymized, scores retained with anonymized student reference (school's legitimate interest in academic records)
- Parent: `Parent.phoneHash` cleared, `ParentStudent` links deleted, auth events anonymized
- SUPER_ADMIN must approve erasure requests for teachers (school's interest in audit trail)

### Data Residency

Phase 1: Neon PostgreSQL (us-east-1) and Clerk (US-hosted). This is acceptable for Phase 1.

Phase 3 (if NDPR data residency becomes a hard requirement): migrate to a Nigeria-hosted PostgreSQL instance (e.g., Supabase Africa region when available, or a dedicated Nigerian VPS) and migrate auth to Logto (self-hosted on Nigeria infrastructure). This is a migration trigger as noted in Section 13.

---

## 16. Testing Strategy

### Unit Tests — Per Module

Each module in `lib/auth/modules/` has a corresponding test file in `__tests__/auth/modules/`. Tests use Jest, mock all DB calls with Prisma's `jest-mock-extended`, and mock all provider API calls.

**RBACModule tests** (pure computation, no mocks needed):
```typescript
describe("RBACModule", () => {
  it("HOD has lesson:delete permission", () => {
    expect(RBACModule.can(hodSession, "lesson:delete")).toBe(true)
  })
  it("TEACHER does not have lesson:delete permission", () => {
    expect(RBACModule.can(teacherSession, "lesson:delete")).toBe(false)
  })
  it("STUDENT has only lesson:read and knowledge:read", () => {
    expect(RBACModule.permissionsFor("STUDENT")).toEqual(["lesson:read", "knowledge:read"])
  })
  it("validatePermissionClaims rejects tampered permissions", () => {
    const tampered: Permission[] = [...RBACModule.permissionsFor("STUDENT"), "school:admin"]
    expect(RBACModule.validatePermissionClaims("STUDENT", tampered)).toBe(false)
  })
})
```

**StudentAuthModule tests**:
```typescript
describe("StudentAuthModule", () => {
  it("generateStudentCode produces correct format", () => {
    // GCS-LAG-001-25-001
    expect(StudentAuthModule.formatStudentCode("GCS-LAG-001", 2025, 1)).toBe("GCS-LAG-001-25-001")
  })
  it("authenticateStudent returns JWT on valid PIN", async () => {
    // mock DB returns credential with correct pinHash
  })
  it("authenticateStudent increments failedAttempts on wrong PIN", async () => {
    // mock bcrypt.compare returns false, verify DB update called
  })
  it("authenticateStudent locks account after 3 failures", async () => {
    // mock DB shows failedAttempts = 2, bcrypt fails → verify lockedUntil set
  })
  it("verifyStudentToken returns null for expired token", async () => {
    const expiredToken = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 1 }, privateKey, { algorithm: "RS256" })
    expect(await StudentAuthModule.verifyStudentToken(expiredToken)).toBeNull()
  })
})
```

### Integration Tests — Full Login → Session → Permission → DB Query

These tests run against a test database (Prisma `test` environment) and a real (but mocked) Clerk test environment.

```typescript
describe("Teacher login flow", () => {
  it("resolves session from Clerk JWT with school scope", async () => {
    // Arrange: mock Clerk auth() returns JWT with schoolId in publicMetadata
    // Act: call SessionModule.resolveSession(mockRequest)
    // Assert: session.schoolId === expected, session.role === "TEACHER"
  })

  it("teacher can only query their own school's lessons", async () => {
    // Arrange: teacher session with schoolId = "school-a"
    // Act: call GET /api/lessons with session
    // Assert: Prisma received where.schoolId = "school-a" exactly once
  })
})

describe("Student PIN login flow", () => {
  it("full login → session → attendance:mark fails", async () => {
    // Student session should not have attendance:mark permission
    const session = await StudentAuthModule.authenticateStudent(...)
    const parsedSession = await StudentAuthModule.verifyStudentToken(session)
    expect(RBACModule.can(parsedSession, "attendance:mark")).toBe(false)
  })
})
```

### Security Tests

```typescript
describe("Cross-school access prevention", () => {
  it("teacher from school A cannot read school B lessons", async () => {
    const response = await fetch("/api/lessons?schoolId=school-b", {
      headers: { "x-teachnexis-session": encodeSession(schoolATeacherSession) }
    })
    expect(response.status).toBe(403)
  })

  it("student cannot access admin routes", async () => {
    const response = await fetch("/api/admin/teachers", {
      headers: { "Cookie": `__tn_student_session=${validStudentToken}` }
    })
    expect(response.status).toBe(403)
  })
})

describe("Brute force protection", () => {
  it("student account locks after 3 failed PIN attempts", async () => {
    for (let i = 0; i < 3; i++) {
      await request("/api/auth/student/login").post({ studentCode, pin: "0000", schoolCode })
    }
    const response = await request("/api/auth/student/login").post({ studentCode, pin: correctPin, schoolCode })
    expect(response.status).toBe(423)  // Locked
    expect(response.body.error).toBe("ACCOUNT_LOCKED")
  })

  it("lockout fires at attempt 3, not attempt 4", async () => {
    // Attempt 3 (failedAttempts going from 2 → 3) triggers lockout
    // The correct PIN on attempt 3 still fails because lockout is set on any 3rd failure
  })
})
```

### Migration Tests — Adapter Shape Parity

```typescript
describe("LogtoAdapter produces identical session shape to ClerkAdapter", () => {
  const testUser = { providerUserId: "test-user", schoolId: "school-1", role: "TEACHER" }

  it("resolveProviderUser returns same shape from both adapters", async () => {
    const clerkSession = await new ClerkAdapter().resolveProviderUser(testUser.providerUserId)
    const logtoSession = await new LogtoAdapter().resolveProviderUser(testUser.providerUserId)
    assertSessionShapeIdentical(clerkSession!, logtoSession!)
  })
})

function assertSessionShapeIdentical(a: Partial<TeachNexisSession>, b: Partial<TeachNexisSession>) {
  expect(a.role).toBe(b.role)
  expect(a.schoolId).toBe(b.schoolId)
  expect(a.actorId).toBe(b.actorId)
  expect(a.permissions).toEqual(b.permissions)
  // providerUserId will differ — that's expected
}
```

---

## 17. Monitoring

### Metrics

All metrics are collected via `instrumentation.ts` (Sentry + custom telemetry). Metric names follow `teachnexis.auth.<event>`.

| Metric | Type | Description |
|---|---|---|
| `auth.login.success` | Counter | Successful logins, labelled by `actorType` (teacher/student/parent) |
| `auth.login.failure` | Counter | Failed login attempts, labelled by `actorType` and `reason` |
| `auth.session.validate.latency` | Histogram | Time to resolve and validate a session in middleware (p50, p95, p99) |
| `auth.pin.reset.count` | Counter | Student PIN resets per school per day |
| `auth.student.lockout.count` | Counter | Student account lockouts |
| `auth.clerk.api.error_rate` | Gauge | % of Clerk API calls returning errors |
| `auth.jwt.validation.error` | Counter | Invalid or expired JWT validation failures, by tokenType |
| `auth.otp.send.latency` | Histogram | OTP delivery latency (Africa's Talking / Termii) |
| `auth.otp.failure_rate` | Gauge | % of OTP verifications that fail |
| `auth.permission.denied` | Counter | Permission denied events, labelled by `permission` and `role` |

### Alert Thresholds

| Alert | Condition | Severity | Action |
|---|---|---|---|
| High login failure rate | `auth.login.failure` rate > 20% of total login attempts over 5 min | HIGH | Page on-call, check for credential stuffing |
| Clerk API degradation | `auth.clerk.api.error_rate` > 1% over 5 min | HIGH | Consider failing open with cached session or activating maintenance mode |
| Student lockout spike | `auth.student.lockout.count` > 10 in 1 hour for one school | MEDIUM | Alert school admin — potential PIN distribution issue or targeted attack |
| PIN reset spike | `auth.pin.reset.count` > 20 in 1 hour for one school | MEDIUM | Alert school admin — potential security event |
| JWT validation errors | `auth.jwt.validation.error` > 50 per min | HIGH | Potential key rotation issue or token forgery attempt |
| Session latency degradation | `auth.session.validate.latency` p95 > 200ms | MEDIUM | Investigate middleware or Clerk JWKS fetch latency |
| OTP delivery failure | `auth.otp.failure_rate` > 15% | HIGH | Switch to Termii fallback; alert infrastructure team |

### Operational Dashboards

A Grafana (or equivalent) dashboard surfaces:
- Login success/failure rate split by actorType — real-time (30s window)
- Session validation latency by percentile
- Active school count (schools with at least one login in last 24h)
- Student lockout heatmap by school
- Clerk API error rate over time with annotations for Clerk status incidents

---

## 18. Phase 1 Implementation Checklist

Phase 1 covers weeks 1–6 from project start. The goal is: teacher sessions work end-to-end with formal RBAC, student PIN login is functional, and middleware enforces permissions at the route level.

### Week 1 — Formalize the Provider Interface

- [ ] **Define `IdentityProvider` interface** in `lib/auth/types.ts` — the contract from Section 3. Commit and enforce via TypeScript strict mode.
- [ ] **Define `TeachNexisSession` type** in `lib/auth/types.ts` — replace all uses of raw `AuthSession` in the codebase.
- [ ] **Define `TeachNexisRole` enum and `Permission` type** — replace `UserRole` in `lib/roles.ts` with the authoritative types from Section 5.
- [ ] **Update `ROLE_PERMISSIONS` matrix** — align with the full permission set from Section 5. Replace the partial `PERMISSIONS` object in `lib/roles.ts`.
- [ ] **Audit all files importing from `@clerk/nextjs/server`** — any import outside `lib/auth/adapters/clerk.ts` is a violation. Fix each one.
- [ ] **Write `RBACModule`** — `can()`, `requirePermission()`, `hasRole()`, `requireRole()`, `permissionsFor()`. Unit tests must pass before Week 2.

### Week 2 — Complete ClerkAdapter and SessionModule

- [ ] **Expand `ClerkAdapter`** to implement the full `IdentityProvider` interface from Section 3. Add `createOrganization()`, `addMember()`, `assignRole()`, `removeMember()`, `removeUser()`, `resolveProviderUser()`, `syncUser()`.
- [ ] **Write `SessionModule`** — `buildFromClerkClaims()`, `getFromContext()`, `resolveSession()`. This is the critical zero-DB-query session construction path.
- [ ] **Update `lib/auth/service.ts`** to export `identityProvider` (the `IdentityProvider` singleton) alongside the existing `authService`. Begin migrating callers from `authService` to `identityProvider`.
- [ ] **Update `getCurrentTeacher()` and `requireTeacher()`** in `lib/auth.ts` to use `SessionModule.getFromContext()` instead of calling `safeAuth()` then doing a DB lookup.
- [ ] **Unit tests for ClerkAdapter** — mock Clerk SDK, verify all interface methods.
- [ ] **Unit tests for SessionModule** — verify session construction from mock JWT claims, verify context read.

### Week 3 — Middleware Enforcement

- [ ] **Rewrite `middleware.ts`** using the pattern from Section 12. Implement `handleClerkRoute()`, `handleStudentRoute()` (stub — no student JWT yet), `handleParentRoute()` (stub).
- [ ] **Implement `enforceRoutePermission()`** in `lib/auth/middleware-helpers.ts`. Define `ROUTE_PERMISSION_GATES` for all existing routes.
- [ ] **Attach session to request headers** (`x-teachnexis-session`) in middleware — switch all server components to read session from context, not from calling `auth()` directly.
- [ ] **Integration test**: teacher session → middleware → `x-teachnexis-session` header → server component reads session with zero DB calls. Measure and document baseline latency.
- [ ] **Add ESLint rule** flagging `db.*` calls on school-scoped models without `schoolId` in `where` clause.

### Week 4 — Student PIN Login

- [ ] **Add `StudentCredential` model to Prisma schema**. Write and apply migration.
- [ ] **Add `SchoolYearCounter` model** for sequential student code generation. Write and apply migration.
- [ ] **Add `AuthEvent` model**. Write and apply migration.
- [ ] **Write `StudentAuthModule`** — `createStudentCredentials()`, `authenticateStudent()`, `verifyStudentToken()`, `resetStudentPin()`, `resolveStudentCode()`, `requirePinChange()`.
- [ ] **Generate RS256 key pair** — store `TEACHNEXIS_JWT_PRIVATE_KEY` and `TEACHNEXIS_JWT_PUBLIC_KEY` in `.env.local` and Vercel environment variables.
- [ ] **Implement `POST /api/auth/student/login`** route.
- [ ] **Implement `POST /api/admin/students/reset-pin`** route.
- [ ] **Activate `handleStudentRoute()`** in middleware — verify student JWT, build session from payload.
- [ ] **Unit tests for `StudentAuthModule`** — PIN hashing, lockout logic, JWT issuance, JWT verification, PIN reset.
- [ ] **Security test**: 3 failed PINs → lockout. Correct PIN after lockout → 423 response.

### Week 5 — Organization Management and Onboarding Hardening

- [ ] **Write `OrganizationModule`** — `provisionSchool()`, `addTeacherToSchool()`, `changeTeacherRole()`, `deactivateTeacher()`, `bulkGenerateStudentCodes()`, `generateTeacherInviteCode()`, `getAuditLog()`.
- [ ] **Add `TeacherInvite` model** to Prisma schema. Write and apply migration.
- [ ] **Implement `POST /api/admin/teachers/invite`** — generate invite code.
- [ ] **Implement `POST /api/onboarding/teacher/consume-invite`** — consume invite code, complete onboarding.
- [ ] **Implement `POST /api/admin/students/bulk`** — CSV import with bulk credential generation.
- [ ] **Write `OnboardingModule`** — teacher state machine, student PIN-change flow.
- [ ] **Update `app/onboarding`** page to use `OnboardingModule.getTeacherOnboardingState()` for proper state routing.
- [ ] **Integration test**: new teacher signs up → webhook fires → `Teacher` record created → invite code consumed → session has `schoolId` and `role` → middleware allows `/dashboard`.

### Week 6 — Hardening, Audit, and Multi-School

- [ ] **Implement multi-school teacher session** — `publicMetadata.schools[]` array, school selector at `/choose-school`, session re-issue on school switch.
- [ ] **Implement `GET /api/admin/audit`** — paginated auth event log with filtering.
- [ ] **Add rate limiting** to all auth endpoints using `lib/rate-limit.ts` — student login (10 req/min per IP), OTP initiate (3 per phone per hour), invite code consume (5 per IP per hour).
- [ ] **Configure Sentry / telemetry** for all metrics from Section 17. Verify dashboards show real data.
- [ ] **Security review pass** — cross-school access tests, brute-force tests, JWT tampering tests (all from Section 16).
- [ ] **Stub `LogtoAdapter`** — class skeleton with all interface methods throwing `NotImplementedError`. This ensures the interface is complete and the file exists for Phase 3 developers to fill in.
- [ ] **Document `TEACHNEXIS_JWT_PRIVATE_KEY` rotation procedure** in `docs/operations/jwt-key-rotation.md`.
- [ ] **Verify NDPR compliance checklist**: student PINs never logged, parent phone never persisted plain, auth events purge cron scheduled, right-to-erasure endpoint exists (stub is acceptable for Phase 1).

---

*This document is the authoritative engineering reference for the TeachNexis Identity Service. Changes to the `IdentityProvider` interface, `TeachNexisSession` shape, `ROLE_PERMISSIONS` matrix, or student code format require updating this document in the same PR as the code change.*

```typescript
async function handleRequest(schoolId: string, adapter: IdentityProvider) {
  // Write to Clerk (primary)
  const primaryResult = await clerAdapter.createSession(req);
  // Mirror to Logto (shadow — errors logged but not surfaced to user)
  try { await logtoAdapter.mirrorSessionCreate(req); } catch(e) { log.warn("logto_shadow_fail", e); }
  return primaryResult;
}
```

Route 5% of read operations (session validation) to Logto in shadow mode. Verify session objects are identical using `assertSessionShapeIdentical()`. Run for 2 weeks minimum before proceeding.

**Step 3: Green/Blue School Rollout (4 weeks)**

Move schools from Clerk to Logto in batches of 20% per week:
- Week 1: 20% of schools (select low-traffic schools first)
- Week 2: 40% of schools
- Week 3: 60% of schools
- Week 4: 80% of schools

Rollout criteria: zero auth failures in previous batch for 72 hours. Rollback criteria: >0.5% auth failure rate in new batch (any 30-minute window).

**Step 4: Migrate Student PIN Sessions**

Student PIN sessions are self-managed (no Clerk dependency). Steps:
1. Confirm RS256 key pair is stored in Logto (or use TeachNexis internal KMS)
2. Update JWT verifier in `lib/auth/student-pin.ts` to use Logto JWKS endpoint
3. Existing student sessions survive — JWTs don't expire mid-session
4. Rotate RS256 key pair post-migration with 30-day grace period

**Step 5: Clerk Wind-Down (2 weeks)**

- Remove `ClerkAdapter` constructor calls from all non-test code
- Remove Clerk env vars from Vercel (but keep in secret backup for 90 days)
- Remove `@clerk/nextjs` and `@clerk/backend` from package.json
- Verify: `grep -r "clerk" apps/web/src --include="*.ts" --exclude-dir="*.test"` returns zero results

**Step 6: Logto Production Validation (1 week)**

- Run full auth smoke test suite (Section 16) against Logto
- Monitor login success rate, token issuance latency, and session refresh rate for 7 days
- Confirm NDPR audit trail is complete: all auth events logged with schoolId, userId, timestamp, IP

### Migration Timeline

| Week | Activity |
|---|---|
| 1–2 | Build and test `LogtoAdapter` |
| 3 | Deploy Logto to staging, run shadow mode, validate session shape parity |
| 4 | Migrate 20% of schools |
| 5 | Migrate 40% of schools |
| 6 | Migrate 60% of schools |
| 7 | Migrate 80% of schools + student PIN migration |
| 8 | Migrate 100% + begin Clerk wind-down |
| 9 | Complete Clerk removal, production validation |

### Rollback Strategy

If any batch migration fails:
1. Set `AUTH_PROVIDER=clerk` in environment — all new requests route to Clerk
2. Existing Logto sessions expire naturally (24h TTL) — users re-authenticate via Clerk
3. Data migrated to Logto remains for forensics; no data loss
4. Rollback does not require code deployment — only env var change

---

## 14. Security Model

### Token Issuance

| Token Type | Issuer | Algorithm | Lifetime | Stored Where |
|---|---|---|---|---|
| Teacher/Admin session | Clerk (Phase 1) / Logto (Phase 2+) | RS256 | 1 hour + 30-day refresh | HTTP-only cookie |
| Student PIN session | TeachNexis internal | RS256 | 8 hours (school day) | HTTP-only cookie |
| API service account | TeachNexis internal | RS256 | 15 minutes | Memory only |

### Threat Model

| Threat | Mitigation |
|---|---|
| Session token theft | HTTP-only, Secure, SameSite=Strict cookies; no JS access |
| PIN brute force | 5 failed attempts → 15-minute lockout per `studentCode` |
| JWT tampering | RS256 signature verification on every request; JWKS endpoint cached with 5-minute TTL |
| Cross-school data access | `schoolId` embedded in every JWT; enforced at API route and DB layer |
| Privilege escalation (student → teacher) | `role` claim in JWT; middleware rejects mismatched role for every protected route |
| Replay attack | JWT `jti` (JWT ID) stored in Redis with TTL; reused `jti` rejected |
| SSRF via OIDC discovery | Logto well-known endpoint URL is hard-coded — never user-controlled |

### Key Rotation

- RS256 key pair rotated every 90 days
- Old key retained for 30 days (to validate sessions issued before rotation)
- Key storage: Vercel Environment Variables (encrypted at rest); Logto internal KMS in Phase 2

---

## 15. Privacy Model (NDPR Compliance)

### Data Collected at Authentication

| Data Point | Purpose | Retention |
|---|---|---|
| Email address | Identity verification | Until account deletion |
| Hashed PIN | Student authentication | Until student account deletion |
| IP address (login events) | Fraud detection, NDPR audit | 90 days |
| Session token `jti` | Replay protection | 30 days (TTL in Redis) |
| Login timestamp | Audit trail | 1 year |
| Failed login count | Brute force protection | Reset on success; purged after 30 days |

### Right to Erasure

When `IdentityService.deleteUser()` is called:
1. Clerk: call `clerkClient.users.deleteUser(externalId)`
2. TeachNexis DB: delete `Teacher`, `Student`, `AdminUser` record (cascade handles related records)
3. Redis: delete all session keys matching `session:userId:*`
4. Audit log: retain identity-scrubbed record ("user deleted at [timestamp]") for 1 year per NDPR legal hold requirements
5. Do NOT delete Logto user in Phase 1 (Logto not yet active); in Phase 2, also call `logtoManagementApi.deleteUser()`

### Consent and Transparency

- Parents/guardians of students under 18 must provide consent before student account creation (captured in school onboarding flow, stored in `Student.consentTimestamp`)
- Privacy policy link displayed on every login screen
- Schools can export all data for a student via `IdentityService.exportStudentData()` (returns JSON of all auth events for that student)

---

## 16. Testing Strategy

### Unit Tests

**ClerkAdapter:**
- `signIn()` with valid email+password returns `TeachNexisSession` with correct `userId`, `schoolId`, `role`
- `signIn()` with invalid credentials throws `AuthenticationError`
- `verifyToken()` with expired JWT throws `TokenExpiredError`
- `verifyToken()` with tampered JWT throws `InvalidTokenError`
- `createUser()` creates Clerk user and TeachNexis DB record atomically (DB rollback on Clerk API failure)

**StudentPinAuth:**
- `authenticate()` with correct `studentCode` + `PIN` returns valid JWT
- `authenticate()` with wrong PIN increments `failedAttempts`
- `authenticate()` after 5 failures throws `AccountLockedError` with `retryAfter` timestamp
- `authenticate()` with locked account, after 15 minutes, succeeds with correct PIN
- JWT signed by `authenticate()` is verifiable with the RS256 public key
- JWT contains `schoolId`, `role: "student"`, `exp` (8h from issuance)

**IdentityService.getSession():**
- Returns session from cache if Redis hit
- Fetches from Clerk on Redis miss and caches result
- Returns `null` for missing/invalid token (never throws to middleware)

### Integration Tests

```typescript
it("teacher can log in and access a protected route", async () => {
  const { token } = await identityService.signIn({
    email: "teacher@test.school.ng",
    password: "TestPass123!",
    schoolId: testSchoolId,
  });

  const res = await fetch("/api/teacher/dashboard", {
    headers: { Cookie: `session=${token}` },
  });

  expect(res.status).toBe(200);
  const body = await res.json();
  expect(body.schoolId).toBe(testSchoolId);
});

it("student PIN login produces a valid session", async () => {
  const { token } = await studentPinAuth.authenticate({
    studentCode: "STU-2024-001",
    pin: "1234",
    schoolId: testSchoolId,
  });

  const session = await identityService.verifyStudentToken(token);
  expect(session.role).toBe("student");
  expect(session.schoolId).toBe(testSchoolId);
});
```

### Contract Tests (Adapter Parity)

```typescript
describe("Adapter contract: ClerkAdapter and LogtoAdapter produce identical session shapes", () => {
  const testCases = [teacherUser, adminUser, superadminUser];
  for (const user of testCases) {
    it(`${user.role}: both adapters return identical TeachNexisSession fields`, async () => {
      const clerkSession = await clerkAdapter.verifyToken(clerkTokenFor(user));
      const logtoSession = await logtoAdapter.verifyToken(logtoTokenFor(user));
      assertSessionShapeIdentical(clerkSession, logtoSession);
    });
  }
});
```

---

## 17. Monitoring

### Key Metrics

| Metric | Alert Threshold |
|---|---|
| `auth.login_success_rate` | < 99% over any 5-minute window |
| `auth.token_verify_latency_p95` | > 50ms |
| `auth.pin_lockout_rate` | > 2% of login attempts (spike detection) |
| `auth.session_cache_hit_rate` | < 90% (indicates Redis degradation) |
| `auth.failed_login_count` | > 100 per minute per school (brute force alert) |
| `auth.adapter_error_rate` | > 0.1% (Clerk or Logto API failures) |

### Dashboard Panels

1. **Login success rate**: success vs. failure by role (teacher, student, admin)
2. **Authentication latency**: p50/p95/p99 for `signIn()` and `verifyToken()`
3. **PIN lockout events**: count per school per day
4. **Session cache performance**: Redis hit rate, eviction rate
5. **Clerk API health**: response time, error rate (from Clerk's status webhook)
6. **Role distribution**: breakdown of active sessions by role

---

## Phase 1 Implementation Checklist

**Week 1 — Clerk Integration**
- [ ] Install `@clerk/nextjs`, `@clerk/backend`; add Clerk publishable key and secret key to Vercel env vars
- [ ] Implement `ClerkAdapter` class (`lib/auth/adapters/clerk.ts`) implementing `IdentityProvider` interface
- [ ] Implement `IdentityService` class (`lib/auth/service.ts`) wrapping ClerkAdapter
- [ ] Wire `identityService.getSession()` into Next.js middleware (`middleware.ts`) for all `(dashboard)` routes
- [ ] Add Redis session cache: `ioredis` client, 5-minute TTL on `verifyToken()` results
- [ ] Test: teacher sign-in → session cookie → `/dashboard` returns 200

**Week 2 — Student PIN System**
- [ ] Generate RS256 key pair; store private key in `AUTH_RS256_PRIVATE_KEY` env var, public key in `AUTH_RS256_PUBLIC_KEY`
- [ ] Implement `StudentPinAuth` class (`lib/auth/student-pin.ts`)
- [ ] Implement PIN hash with bcrypt (cost factor 12) on `Student.pinHash` column
- [ ] Implement brute-force lockout: `Student.failedPinAttempts`, `Student.pinLockedUntil`
- [ ] Implement `/api/auth/student-pin/login` route
- [ ] Implement `/api/auth/student-pin/set-pin` route (teacher-only — teachers set student PINs on first login)
- [ ] Test: student PIN login → JWT → `/student/dashboard` returns 200

**Week 3 — Role Enforcement**
- [ ] Implement role guards in middleware: `TEACHER_ROUTES`, `STUDENT_ROUTES`, `ADMIN_ROUTES` path sets
- [ ] Implement `assertRole(session, "teacher")` helper used in API routes
- [ ] Implement `IdentityService.createUser()` with Clerk + DB atomic creation
- [ ] Implement `IdentityService.deleteUser()` with Clerk + DB cascade deletion + Redis purge
- [ ] Test: student token attempting to access teacher route returns 403
- [ ] Test: teacher token attempting to access admin route returns 403

**Week 4 — LogtoAdapter Scaffold**
- [ ] Scaffold `LogtoAdapter` class (`lib/auth/adapters/logto.ts`) — interface-compliant but throws `NotImplementedError`
- [ ] Write contract tests: `assertSessionShapeIdentical()` helper
- [ ] Run contract tests against `ClerkAdapter` — all pass
- [ ] Document Logto self-hosted deployment prerequisites (Docker Compose, PostgreSQL, Redis)

**Week 5 — Security Hardening**
- [ ] Implement `jti` replay protection: store used JWTs in Redis with TTL matching JWT `exp`
- [ ] Implement JWT `iat` skew tolerance (allow ±30s for clock drift)
- [ ] Security test: replayed session token returns 401 on second use
- [ ] Security test: cross-school token (schoolId A token → schoolId B endpoint) returns 403
- [ ] Confirm all session cookies are `HttpOnly; Secure; SameSite=Strict`

**Week 6 — Monitoring and Hardening**
- [ ] Wire auth events to structured logging: `{ event, userId, schoolId, role, ip, timestamp }`
- [ ] Set up monitoring alerts: login success rate < 99%, PIN lockout rate spike, Redis cache miss spike
- [ ] Run load test: 500 concurrent session verifications → confirm p95 < 50ms with Redis cache
- [ ] NDPR documentation: write data processing record for authentication module
- [ ] Runbook: "How to unlock a student PIN account", "How to rotate RS256 keys", "How to disable a compromised teacher account"
