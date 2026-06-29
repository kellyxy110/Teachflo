# Contract: Security Domain

## Purpose
Enforce authentication, multi-tenant data isolation, and input validation across the entire TeachNexis platform. Every request that touches tenant data must pass through this domain's contracts before any business logic executes.

## Responsibilities

**Owns:**
- Session authentication via Clerk v6
- School-level identity establishment (`schoolId`, `teacher`)
- Multi-tenant data isolation enforcement
- Input validation standards
- Audit trail for sensitive operations (future)

**Does NOT own:**
- Business logic of any application domain
- UI rendering or user-facing error messages
- Data encryption at rest (handled by Supabase/PostgreSQL)

## Inputs

### requireSchool() — implicit
| Input | Source | Validation |
|---|---|---|
| Clerk session token | HTTP request context | Verified by Clerk middleware |
| schoolId | Clerk user metadata | Must be present and non-empty |

## Outputs

### requireSchool()
| Field | Type | Guarantee |
|---|---|---|
| schoolId | string | Always present; never null; belongs to authenticated user |
| teacher | { id, firstName, lastName, email } | Always present |

Throws immediately if session is invalid, expired, or schoolId is missing. Never returns partial context.

## Dependencies
- Clerk v6 (external authentication provider)
- `proxy.ts` middleware (Clerk session validation on all non-public routes)
- Supabase (schoolId stored in user metadata)

## Events Produced
| Event | Payload | Trigger |
|---|---|---|
| `auth.session.established` | `{ schoolId, teacherId, timestamp }` | On successful requireSchool() resolution |
| `auth.violation.detected` | `{ route, schoolId, resourceId, timestamp }` | When IDOR attempt detected (resource ownership mismatch) |

## Events Consumed
None.

## Quality Guarantees

**Authentication:**
- Every server action that calls `requireSchool()` is guaranteed to have a valid, non-expired session before any business logic runs.
- `schoolId` returned is cryptographically bound to the authenticated session — it cannot be spoofed by user input.

**Data Isolation:**
- Any data returned by a server action that has called `requireSchool()` and applied the schoolId filter is guaranteed to belong to that school only.
- Resource ID validation pattern: every query uses `{ id: resourceId, schoolId }` — a resource that exists in another school returns null, indistinguishable from a missing resource.

**Input Validation:**
- Date strings: validated against `/^\d{4}-\d{2}-\d{2}$/` before use.
- Enum values: validated against a known Set before database write.
- Array lengths: capped per context (attendance: 500, bulk import: 200, clinic visits: 200).
- Text fields: capped at 500 characters unless a specific context justifies a higher limit.
- IDs from user input: existence verified against `schoolId` before any read or write.

## Failure Behaviour
- Unauthenticated request: `requireSchool()` throws immediately. Error propagates as 401 to client.
- Missing schoolId in session: throws immediately. Indicates incomplete onboarding, not a security violation.
- Resource belonging to different school: returns null or throws "not found". Never reveals cross-tenant existence.
- Invalid input (date, enum, length): throws descriptive error naming the field and the constraint violated.

## Extension Points
- `auth.violation.detected` event may be consumed by a future Security Audit Log module.
- Rate limiting may be layered onto `requireSchool()` without changing the contract.
- Role-based access (Admin vs. Teacher vs. Student) may be added to the returned context without breaking existing callers.
