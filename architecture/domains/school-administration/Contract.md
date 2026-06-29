# Contract: School Administration

## Purpose
Manage school-level configuration, teacher accounts, class structures, and student enrolment — the foundation every other capability builds on.

## Responsibilities

**Owns:**
- School record creation and profile configuration
- Teacher identity and onboarding state
- Class creation, naming, and structure
- Student enrolment, deactivation, and core profile
- School subscription tier metadata

**Does NOT own:**
- Authentication (owned by Clerk + Platform contract)
- Attendance records (owned by Classroom Management)
- Assessment content (owned by Assessment & Learning)
- AI model selection or content generation

## Inputs

| Field | Type | Required | Validation |
|---|---|---|---|
| schoolId | string | yes | Must match authenticated session — never user-supplied |
| teacherId | string | yes | Must belong to the authenticated schoolId |
| className | string | yes (class ops) | 1–100 characters; unique within school |
| classLevel | ClassLevel | yes (class ops) | `JS1 \| JS2 \| JS3 \| SS1 \| SS2 \| SS3` |
| studentFirstName | string | yes (student ops) | 1–100 characters |
| studentLastName | string | yes (student ops) | 1–100 characters |
| studentRegNumber | string | no | Unique within school if provided |
| studentGender | `"MALE" \| "FEMALE"` | no | Enum, defaults to MALE if omitted |

## Outputs

| Field | Type | Guarantee |
|---|---|---|
| school | School | Always includes `id`, `name`, subscription tier |
| teacher | Teacher | Always includes `id`, `firstName`, `lastName`, `schoolId` |
| classes | Class[] | Always scoped to `schoolId`; ordered by name asc |
| students | Student[] | Always scoped to `schoolId + classId`; active-only by default |

## Dependencies

| Capability | ID | Nature of Dependency |
|---|---|---|
| Authentication | Platform | `requireSchool()` provides `schoolId` + `teacher` context |
| Data Isolation | Platform | Every query must include `schoolId` in the `where` clause |

## Events Produced

| Event | Payload | Trigger |
|---|---|---|
| `school.class.created` | `{ classId, schoolId, name, level }` | On new class creation |
| `school.student.enrolled` | `{ studentId, schoolId, classId }` | On student enrolment |
| `school.student.deactivated` | `{ studentId, schoolId, classId }` | On student soft-deletion |

## Events Consumed

None currently. School Administration does not subscribe to domain events.

## Quality Guarantees

- All returned records are guaranteed to belong to the authenticated school.
- Student queries always filter by `isActive: true` unless explicitly requested otherwise.
- Class names are unique within a school — enforced at DB level.
- Student registration numbers are unique within a school when provided.
- Deactivation is always soft-delete only (`isActive = false`) — data is never permanently deleted.
- Cross-school data leakage is architecturally prevented: `schoolId` is never derived from user-supplied input.

## Failure Behaviour

| Failure Scenario | Behaviour |
|---|---|
| School not found for authenticated teacher | `requireSchool()` throws — propagates as 401 to client |
| Class name already exists in school | Throws `"Class name already exists"` — 409 from caller |
| Student not found | Throws `"Student not found"` — never reveals cross-school existence |
| Registration number conflict | Throws `"Registration number already in use in this school"` |
| Class not found | Throws `"Class not found"` — 404 from caller |

## Extension Points

- A future parent portal may consume `school.student.enrolled` to provision parent accounts automatically.
- A future multi-school admin role may extend this contract's authorisation model without changing its outputs.
- A future analytics capability may read class and student structures via this contract's output types.
