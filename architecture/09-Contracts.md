# TeachNexis — Contracts

## What a Contract Is

A contract is the formal agreement between a capability and everything that depends on it. It defines what a domain or module promises — not how it delivers that promise.

The orchestration layer reads contracts, not implementations. Any capability whose implementation changes but whose contract remains stable does not require changes in dependent systems. This is the foundation of composable architecture.

**Rule:** A contract is a promise. Breaking a contract is an architectural defect, not an implementation detail.

---

## Contract Standard

Every Domain and every Module must declare a contract using this structure:

```markdown
## Contract: [Capability Name]

### Purpose
One sentence. What this capability exists to do.

### Responsibilities
Bulleted list. What this capability owns and is accountable for.
What it does NOT own (equally important).

### Inputs
| Field | Type | Required | Validation |
|---|---|---|---|
| fieldName | type | yes/no | rule |

### Outputs
| Field | Type | Guarantee |
|---|---|---|
| fieldName | type | always / conditionally / never null |

### Dependencies
Capabilities this contract depends on (by name, not by implementation).
Must not create circular dependencies.

### Events Produced
| Event | Payload | Trigger |
|---|---|---|
| event.name | { field: type } | When this happens |

### Events Consumed
| Event | Source | Action Taken |
|---|---|---|
| event.name | Producer capability | What this module does on receipt |

### Quality Guarantees
What callers can rely on about the quality of outputs.
Example: "Generated content will never truncate mid-sentence."
Example: "All returned student records belong to the requesting school."

### Failure Behaviour
What happens when this capability fails.
- Does it throw? Return null? Return a typed error?
- Does it retry internally or surface the error immediately?
- What is the caller's responsibility on failure?

### Extension Points
Where future capabilities may hook in without requiring contract changes.
Example: "A translation module may consume `topic.content.generated` without changes to this contract."
```

---

## Platform-Level Contracts

The following contracts govern platform-wide behaviour and apply to all modules.

---

### Contract: Authentication & Authorisation

**Purpose:** Confirm the identity of every request and enforce school-level data isolation.

**Responsibilities:**
- Establish authenticated context for every server action
- Provide `schoolId`, `teacher` identity to all callers
- Reject unauthenticated requests before any data access

**Inputs:**
- Implicit: Clerk session token from request context

**Outputs:**
| Field | Type | Guarantee |
|---|---|---|
| schoolId | string | Always present; never null |
| teacher | Teacher object | Always present; includes id, firstName, lastName |

**Failure Behaviour:** Throws an authentication error. The calling action is responsible for not catching this error silently — it must propagate to the client as a 401/403 response.

**Quality Guarantee:** Any data returned by a server action that has called `requireSchool()` is guaranteed to belong to the authenticated school. Cross-school data leakage is a contract violation.

---

### Contract: Data Isolation

**Purpose:** Ensure all data access is scoped to the authenticated school.

**Rule:** Every Prisma query that touches tenant data must include `schoolId` in the `where` clause.

**Validation Pattern:**
```
1. requireSchool() → get schoolId
2. Load resource with { id: resourceId, schoolId }
3. If null → throw "Not found" (never expose whether resource exists in another school)
4. Proceed with operation
```

**Failure Behaviour:** Return "not found" regardless of whether the resource exists in another school. Never reveal cross-tenant existence.

---

### Contract: Input Validation

**Purpose:** Ensure all user-controlled input is validated before reaching business logic or the database.

**Standard Rules:**
| Input Type | Validation |
|---|---|
| Date | `/^\d{4}-\d{2}-\d{2}$/` regex |
| Enum values | Validated against known set (`Set<string>`) |
| Text fields | Length capped (default 500 chars unless specified) |
| Array inputs | Length capped (default limit per context) |
| IDs | Existence validated against schoolId before use |
| Numbers | Range checked; non-negative unless explicitly specified |

**Failure Behaviour:** Throw a descriptive error with the field name and constraint violated. Never silently truncate or coerce invalid input.

---

## Domain Contracts (Summaries)

Full contracts live in each domain's `Contract.md` file. Summaries here for cross-domain reference.

---

### Domain: Curriculum & Content Intelligence

**Promises:**
- Returns curriculum metadata for any valid Subject + Class + Term + Topic combination
- Returns complete Knowledge Package for any generated topic
- All content is aligned to NERDC curriculum standards
- All returned content belongs to the requesting school

**Does NOT own:** Assessment question generation, AI model selection, student progress data

**Key Events Produced:** `topic.content.generated`, `topic.content.updated`

---

### Domain: Assessment & Learning Intelligence

**Promises:**
- Returns validated question banks for any exam owned by the requesting school
- Returns report card data with accurate ordinal ranking for any class + term + session
- All assessment items are owned by and isolated to the requesting school
- Bulk imports are capped at 200 questions per operation

**Does NOT own:** Curriculum content, AI model routing, student attendance

**Key Events Produced:** `exam.questions.generated`, `scores.updated`

---

### Domain: AI Infrastructure & Orchestration

**Promises:**
- Routes AI calls to the appropriate model based on content type
- Activates fallback chain if primary model is unavailable
- Returns typed, validated AI outputs — never raw model responses
- Respects cost constraints (free tier preference)

**Does NOT own:** Educational content structure, database persistence, UI rendering

**Key Events Produced:** `ai.content.ready`, `ai.generation.failed`

---

### Domain: Classroom Management

**Promises:**
- Attendance records are always scoped to the authenticated school and class
- Student IDs in attendance operations are validated against schoolId before write
- Health records belong exclusively to the student's school
- Clinic visit history is capped at 200 entries per student

**Does NOT own:** Curriculum content, assessment generation, school administration

**Key Events Produced:** `attendance.saved`, `student.flagged.absent`, `health.record.updated`

---

## Contract Compliance Checklist

Used during Architecture & Capability Audit to assess whether an existing capability has an implied contract that is ready to be formalised:

| Question | Pass Criteria |
|---|---|
| Does it satisfy its intended responsibility? | Clear, bounded purpose with no scope creep |
| Does it expose a clear contract? | Inputs, outputs, and failure behaviour are predictable |
| Can another capability depend on it safely? | No hidden side effects; outputs are stable |
| Is it reusable? | Not coupled to a specific caller or UI context |
| Is it independently testable? | Can be tested without spinning up the full platform |
| Is it AI-ready? | Can be called by an AI agent with typed inputs/outputs |
| Is it orchestration-ready? | Produces or consumes events; not tightly coupled to HTTP request cycle |

A capability scoring "Pass" on all 7 questions is **orchestration-ready**.
A capability scoring 5–6 "Pass" needs **upgrade** to reach orchestration readiness.
A capability scoring below 5 needs **refactor or replace**.

---

## Contract Registry

All formalised contracts are listed here for cross-domain navigation.

| Contract | Domain | File | Status |
|---|---|---|---|
| Authentication & Authorisation | Platform | `09-Contracts.md` | Defined |
| Data Isolation | Platform | `09-Contracts.md` | Defined |
| Input Validation | Platform | `09-Contracts.md` | Defined |
| Curriculum & Content Intelligence | Foundation | `domains/curriculum-intelligence/Contract.md` | Pending |
| Assessment & Learning Intelligence | Foundation | `domains/assessment-learning/Contract.md` | Pending |
| AI Infrastructure & Orchestration | Foundation | `domains/ai-infrastructure/Contract.md` | Pending |
| Classroom Management | Application | `domains/classroom-management/Contract.md` | Pending |
| Learning Studios | Application | `domains/learning-studios/Contract.md` | Future |
| School Administration | Application | `domains/school-administration/Contract.md` | Pending |
