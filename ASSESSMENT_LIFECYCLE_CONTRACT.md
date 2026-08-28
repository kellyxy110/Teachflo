# TeachNexis Assessment Lifecycle Contract (F8A)

## Status and boundary

This document is architecture-only. It does not change Prisma, SQL, server actions, authentication, attempts, grading, QuestionVersion, AssessmentItem, Phase 8 imports, or any database.

The current question-bearing delivery container is `Exam`. `Homework` is a separate assignment-like model without questions, attempts, or grading relations. Quiz, class-test, continuous-assessment, examination, practice, diagnostic, and adaptive concepts are currently split across `ExamType`, `ExamMode`, routes, and product wording rather than represented by one coherent assessment domain.

## Current relationship graph

```text
School
├── Teacher
├── Class
├── Exam
│   ├── legacy Question[]
│   │   ├── QuestionVersion[]
│   │   └── QuestionResponse[]
│   ├── AssessmentItem[]
│   │   ├── Question
│   │   └── pinned QuestionVersion
│   └── ExamAttempt[]
│       ├── Student
│       └── QuestionResponse[]
└── Homework[] (separate; no Question/Attempt bridge)
```

Current ownership and authorization are school-scoped through `Exam.schoolId` and `Exam.teacherId`. F6C resolves both from the authenticated server actor and denies content mutation once any `ExamAttempt` exists.

## Current assessment capability map

| Capability | Current evidence | Classification |
|---|---|---|
| Question-bearing container | `Exam` | PERSISTED |
| Assignment-like work | `Homework` | SEPARATE MODEL |
| Quiz | No model/type; may be described as `SCHOOL_TEST` | PARTIAL |
| Class test / continuous assessment | `SCHOOL_TEST` is the nearest type but does not distinguish them | PARTIAL |
| Examination | `SCHOOL_EXAM`, mock/prep variants | SUPPORTED |
| Practice | `ExamMode.PRACTICE` | SUPPORTED AS MODE |
| Diagnostic/adaptive | `ExamMode.DIAGNOSTIC` / `ADAPTIVE` and Exam V2 actions | SUPPORTED, SPECIALIZED |
| Draft/publish lifecycle | No `Exam` lifecycle field | NOT IMPLEMENTED |
| Student availability | All same-school/class exams are listed | UNSAFE / NOT IMPLEMENTED |
| Duration | `Exam.duration` | PERSISTED, NOT SERVER-ENFORCED |
| Schedule | None | NOT IMPLEMENTED |
| Attempts allowed | `(studentId, examId)` unique | DERIVED AS EXACTLY ONE |
| Resume | Existing `IN_PROGRESS` attempt is reopened | PARTIAL |
| Submission | `IN_PROGRESS -> SUBMITTED`; `GRADED` exists | PERSISTED |
| Randomization | None; export formats contain unrelated flags | NOT IMPLEMENTED |
| Result release policy | Results shown immediately after submission | IMPLICIT / NOT CONFIGURABLE |
| Answer release policy | Correct answer/explanation returned after each response in Exam V2 | IMPLICIT / UNSAFE FOR HIGH-STAKES USE |
| Publication/history snapshot | QuestionVersion/AssessmentItem snapshot only | PARTIAL |
| Concurrency | `updatedAt` exists; no version check | LAST WRITE WINS |
| Autosave | None | NOT IMPLEMENTED |

## Recommended architecture: phased hybrid

Retain `Exam` as the current assessment aggregate and apply one shared lifecycle contract to it first. Do not force `Homework` or future assignments into `Exam` during the initial lifecycle migration. Add immutable `AssessmentPublication` revisions for student delivery and bind every new `ExamAttempt` to the exact publication delivered.

This is a **PHASED HYBRID**:

1. `Exam` remains the editable teacher-owned aggregate.
2. `AssessmentItem` remains the reusable-question configuration in the draft.
3. Publishing creates an immutable `AssessmentPublication` plus ordered publication items.
4. `ExamAttempt` references one publication and stores the actual delivery state needed to reconstruct randomization and deadlines.
5. `QuestionResponse` keeps its canonical `questionId` and gains an optional publication-item reference during transition.
6. Homework/assignment adopts the shared lifecycle only after its own submission and grading contract exists.

## Lifecycle model

Persist only authoring states that cannot be derived safely:

```text
DRAFT -> PUBLISHED -> ARCHIVED
   ^         |
   └---------┘ only through explicit new-revision/unpublish rules before attempts
```

Delivery phases are derived from the current server time and the active publication:

- `SCHEDULED`: published and `opensAt` is in the future.
- `ACTIVE`: published, open, and not closed.
- `CLOSED`: published and `closesAt` has passed or manually closed.
- `COMPLETED`: reporting concept, not an assessment authoring state; individual attempts are submitted/graded.

Avoid persisting both `PUBLISHED` and `ACTIVE/SCHEDULED/CLOSED`, because redundant status and time fields can drift.

### State contract

| State/phase | Entry | Teacher actions | Student visibility | Exit |
|---|---|---|---|---|
| DRAFT | Create or explicitly return an unused publication to draft | Edit details, questions, versions, marks, order, instructions, duration, schedule, supported settings | Hidden | Publish after validation |
| SCHEDULED (derived) | Published with future `opensAt` | View; before first attempt create a replacement publication or return to draft according to policy | Visible as upcoming only if product chooses | Server time reaches `opensAt`, close, archive, or replace publication |
| ACTIVE (derived) | Published and within availability window | No in-place content mutation; administrative intervention only | Eligible students may start/resume | `closesAt`, manual close, archive |
| CLOSED (derived) | Close time/manual close | Grade, release results, archive; no new attempts | Existing attempts/results only | Archive or explicit audited extension policy |
| ARCHIVED | Teacher/admin archives a non-draft historical record | Read/report only | Hidden from new work; historical access according to release rules | No normal exit |

## Draft editability

While DRAFT and with no attempts, teachers may edit:

- title, topic, class, subject, assessment type/mode;
- student-facing instructions;
- duration and schedule;
- reusable questions, pinned versions, marks, section, and order;
- supported delivery/result settings;
- AI-generated content only after explicit review/approval.

School and teacher ownership remain server-derived. Changing class/subject must not re-scope the school or bypass question authorization.

## Publish contract

Publish is an atomic server operation, not a cosmetic status change. It must:

1. resolve the authenticated teacher and school;
2. lock the draft using optimistic concurrency;
3. run authoritative validation;
4. verify every question/version is accessible and approved;
5. calculate total marks from assessment-specific configuration;
6. create an immutable publication revision and ordered publication items;
7. snapshot instructions, duration, schedule, settings, marks, answer/grading rules, and pinned QuestionVersions;
8. record publisher and publication time;
9. set the active publication in the same transaction;
10. expose it only to eligible students and only during the derived availability phase.

Publishing must be idempotent for one draft revision. A repeated request with the same idempotency/revision token returns the existing publication rather than creating a second active revision.

## Publication validation

### Hard blockers

- no questions;
- total marks missing, invalid, or zero;
- duplicate or invalid item order;
- inaccessible, archived, or missing Question/QuestionVersion;
- required auto-graded question lacks a valid answer rule;
- AI-origin question not teacher-approved;
- duration non-positive when timed mode is enabled;
- invalid schedule (`closesAt <= opensAt` or close before server now for a new publication);
- missing required school/class/subject/teacher ownership;
- stale draft revision/concurrent edit.

### Warnings

- manually graded question without a detailed mark scheme;
- no explanation/solution;
- unusually high/low total marks or duration;
- schedule close earlier than duration for students starting near the end;
- mixed question types without clear teacher instructions.

### Information

- number of questions by type/section;
- total marks and recommended duration;
- reusable versus legacy question count;
- result/answer release policy summary.

## Post-publish editing

Recommendation: **versioned publication**.

- Never edit an immutable publication in place.
- Before the first attempt, a teacher may return to DRAFT or create and activate a new publication revision. The old revision remains auditable.
- After the first attempt, content and fairness-sensitive delivery settings are immutable. Corrections require a new assessment/publication, with explicit cancellation/remediation for affected students.
- Administrative metadata that does not affect what students received may be changed on the parent `Exam` (for example internal labels). Student-visible content should remain publication data.

This provides more flexibility than immediate permanent locking while preventing completed or in-progress attempts from changing underneath students.

## First-attempt lock

The first successfully created attempt locks the active publication.

### Content immutable

- question set and pinned QuestionVersions;
- order and sections;
- options/answer keys/mark schemes;
- assessment-specific marks and total marks;
- student instructions;
- duration and navigation/randomization rules;
- grading mode, pass threshold, result policy, and answer policy.

### Delivery settings

Initially immutable after first attempt. A future audited accommodation model may allow per-student extensions. A global close-time extension may later be allowed, but shortening an active window or reducing duration is unsafe.

### Administrative metadata

Internal tags/notes and archive state may remain mutable when they cannot alter student delivery or reporting. Every consequential override requires an audit record.

## Settings contract

| Setting | Current | First lifecycle version | Later |
|---|---|---|---|
| Duration | Persisted on `Exam`; not enforced | Persist and snapshot; server computes attempt deadline | Per-student accommodation |
| Opens/closes | Missing | Add nullable UTC instants | Recurrence not needed |
| Timezone | Missing | Store IANA zone used for teacher display; instants remain UTC | School default inheritance |
| Attempts allowed | One via unique constraint | Keep one in first version | Multiple attempts needs new uniqueness/model semantics |
| Late submissions | Missing | Not supported initially; deny starts after close and submit by server deadline | Grace policy later |
| Shuffle questions/options | Missing | Default false; add only with delivered-order snapshot | Pools/random subsets later |
| Auto-submit | Missing | Server deadline defines expiry; client may request submit but server finalizes | Background finalizer later |
| Result visibility | Immediate implicit | `AFTER_TEACHER_RELEASE` default; optional `AFTER_SUBMISSION` for practice | After-close policy |
| Answer visibility | Immediate in V2 | `NEVER` default for high stakes; optional after release | Separate explanation/feedback controls |
| Feedback timing | Implicit immediate | Tie to explicit release policy | Per-item feedback later |
| Pass mark | Missing | Optional percentage snapshot | Grading-band policy later |
| Grading mode | Mixed implicit | `AUTO`, `MANUAL`, `MIXED` | Rubric engine later |
| Navigation/backtracking | Client behavior only | Explicit minimal setting if player supports it | Section policies later |
| Calculator/attachments | Missing | Defer | Capability policy later |

Do not expose settings until server delivery honors them.

## Time, duration, and server authority

- Persist timestamps as UTC; retain an IANA timezone (for example `Africa/Lagos`) for teacher input/display.
- The server, not the browser clock, determines availability and deadlines.
- `AssessmentPublication.durationMinutes` is the allowed elapsed time.
- `ExamAttempt.deadlineAt = min(startedAt + duration, publication.closesAt)` when a close exists.
- Resuming uses the persisted deadline; reload never resets time.
- The current per-question browser timer is analytics only and must not be interpreted as enforcement.
- Starting is denied before open, after close, for an ineligible student, or after attempt allowance is exhausted.
- Submission is idempotent. At/after deadline, the server transitions the attempt exactly once to an expired/submitted terminal state according to the reviewed grading policy.

## Attempt contract

1. Resolve the student and school server-side.
2. Load the active immutable publication.
3. Verify class/target eligibility and availability.
4. Idempotently create or return the allowed attempt.
5. Persist `publicationId`, `startedAt`, `deadlineAt`, and a delivery snapshot/randomization seed.
6. Resume the same `IN_PROGRESS` attempt until terminal.
7. Accept responses only for publication items delivered to that attempt.
8. Submit atomically with deterministic grading inputs.
9. Treat repeated submission as the same terminal result.

Initial attempt states may retain `IN_PROGRESS`, `SUBMITTED`, and `GRADED`. A later implementation review should decide whether `EXPIRED`, `ABANDONED`, or `CANCELLED` are operationally required rather than adding them speculatively.

## Randomization and reconstruction

Randomization is deferred, but the architecture must support it. A future attempt stores the actual delivered question order, option order, selected publication items, and seed/algorithm version. Recomputing later from mutable source data is not sufficient evidence.

## Marks and grading invariants

- `Question.defaultMarks` remains a recommendation.
- `AssessmentItem.marksOverride` remains draft assessment configuration.
- Publication items freeze effective marks and answer/grading rules.
- Responses reference the delivered publication item during the new path and preserve canonical `questionId` for analytics/compatibility.
- Partial credit is permitted only through an explicit grading rule or manual mark bounded by the publication item's maximum.
- Total marks are derived from immutable publication items, not trusted from the client.
- Percentage/grade calculations use frozen attempt/publication data and a documented rounding rule.
- `ExamAttempt` scores are learning/assessment-delivery outcomes; they do not silently overwrite the separate school `Score.total`/TAVG results domain.

## Result and answer visibility

Keep independent policies:

- score/result visibility;
- correct-answer visibility;
- explanation/solution visibility;
- teacher feedback visibility.

Minimum safe first version:

- high-stakes assessments default to teacher-released scores and no answers until release;
- practice may explicitly allow immediate score, answers, and explanations;
- manual/mixed grading never claims a final result before grading completes;
- release actions are server-authorized and auditable.

## AI content

AI provenance and lifecycle remain separate. Publication requires the pinned QuestionVersion's canonical Question to be teacher-approved. Generation alone never satisfies the publication gate. The publication records the approved version; later AI regeneration creates another draft version and cannot alter published history.

## Assessment and attempt snapshots

Recommendation: **HYBRID**.

- `QuestionVersion` preserves canonical question content.
- `AssessmentPublication` freezes assessment-level metadata/settings.
- `AssessmentPublicationItem` freezes ordered question-version, marks, section, and grading snapshot.
- `ExamAttempt` references a publication and stores only attempt-specific delivery facts such as deadline and randomized order.

This avoids one giant duplicated payload while making the exact student experience reconstructible.

## Concurrency and autosave

Use optimistic concurrency on drafts: the client submits `updatedAt` or a monotonic `revision`; the server update succeeds only if it still matches. On conflict, return a clear reload/compare response. Advisory locks are unnecessary for ordinary form editing.

Autosave is **DEFERRED** for the first persistence cutover. Start with explicit `Save Draft`, dirty-state indication, and navigation warning. Autosave may follow once field-level mutations, conflict recovery, offline semantics, and error telemetry are proven.

## Delete, archive, and duplicate

- Unpublished draft with no attempts/publications: deletable after explicit confirmation.
- Published assessment: archive; never cascade historical publications.
- Any assessment with attempts: deletion restricted; archive only.
- Attempts/responses/publications use `Restrict` from the assessment side; deleting an attempt remains a separately authorized retention decision.

Copy Assessment creates a new DRAFT in the same authorized school, attributes it to the current teacher, reuses canonical Questions, pins the original versions by default for faithful copying, copies marks/order/instructions/settings, clears schedule/publication/attempts/results, and obtains a new ID. The teacher may deliberately upgrade question versions before publishing.

## Authorization invariants

- Assessment school and teacher are resolved server-side.
- Only an authorized teacher in the school may create/edit/publish/archive.
- Students cannot mutate assessment/publication content.
- Students cannot discover or start DRAFT/ARCHIVED/closed assessments.
- Same-school membership alone is insufficient: class/target eligibility is checked server-side.
- Client-supplied `schoolId`, `teacherId`, status, publication version, totals, and eligibility have no authority.
- Cross-school Question, AssessmentItem, publication, attempt, and response access is denied.

The current student detail route checks school but not class eligibility when opened directly; the implementation phase must close that delivery seam before publish is enabled.

## Student delivery contract

```text
Active AssessmentPublication
-> server eligibility + availability
-> idempotent ExamAttempt(publicationId, deadlineAt, deliverySnapshot)
-> publication items
-> validated responses
-> idempotent submit
-> auto/manual grading
-> controlled result/answer release
```

Missing seams include publication filtering, direct-route class eligibility, server duration enforcement, attempt-to-publication identity, deterministic delivery order, release policy, and atomic/idempotent response submission.

## Mobile authoring

Recommendation: **LIMITED BUT FUNCTIONAL**. Mobile supports details, settings review, question selection, marks edits, readiness review, and explicit save/publish confirmation. Dense bulk reordering, long-form question authoring, advanced schedule management, and large assessment review should provide a clear desktop recommendation rather than squeezing the desktop workspace into 320px.

## Notification integration points

Future domain events: publication created, opening soon, closing soon, student submitted, manual grading required, and results released. Emit events after committed state transitions; notifications must not be the source of truth for availability or status.

## Schema gap analysis

| Capability | Classification |
|---|---|
| Exam identity, school, teacher, class, core metadata | ALREADY SUPPORTED |
| Reusable questions, versions, marks, order | ALREADY SUPPORTED |
| Authoring lifecycle | NEEDS ENUM + COLUMN |
| Instructions | NEEDS COLUMN |
| Open/close/timezone | NEEDS COLUMNS |
| Result/answer policy | NEEDS ENUMS + COLUMNS |
| Grading/navigation/shuffle settings | NEEDS ENUM/COLUMNS; some DEFER |
| Immutable publication | NEEDS MODEL |
| Immutable publication items | NEEDS MODEL |
| Attempt publication/deadline/delivery facts | NEEDS COLUMNS |
| Response-to-delivered-item evidence | NEEDS NULLABLE FK, then backfill/cutover |
| Derived SCHEDULED/ACTIVE/CLOSED phase | CAN BE DERIVED |
| Multiple attempts | DEFER; current unique constraint enforces one |
| Per-student accommodations | DEFER / NEEDS MODEL LATER |
| Audit trail for lifecycle transitions | NEEDS MODEL or existing audit integration review |

## Schema options

### Option A: minimal fields on Exam

Add lifecycle/settings columns directly to `Exam`; continue attempts against `Exam` and rely on pinned QuestionVersions/AssessmentItems.

Advantages: smallest migration, simplest queries, fastest delivery.

Risks: assessment metadata/settings remain mutable around historical attempts; no exact publication identity; weak support for corrections, scheduled revisions, and trustworthy rendering.

### Option B: full Assessment + AssessmentVersion replacement

Introduce a new unified `Assessment`, `AssessmentVersion`, delivery-item graph, and migrate Exam/Homework workflows.

Advantages: clean long-term domain, strong versioning, broad future flexibility.

Risks: high migration and authorization risk, ID churn, grading/player rewrite, and unnecessary coupling to incomplete assignment/practice models.

### Option C: phased hybrid (recommended)

Keep `Exam`; add minimal draft lifecycle/settings plus immutable `AssessmentPublication` and publication items; make attempts reference a publication. Adopt the shared lifecycle for other containers later.

Advantages: preserves existing IDs and F6 relations, protects history, supports publish UX, and avoids premature backend unification.

Costs: temporary dual-read and a deliberate later consolidation phase.

## Proposed Prisma diff — PROPOSED ONLY, NOT APPLIED

Names and nullable transitions require F8B review.

```prisma
enum AssessmentLifecycle {
  DRAFT
  PUBLISHED
  ARCHIVED
}

enum ResultReleasePolicy {
  AFTER_SUBMISSION
  AFTER_CLOSE
  AFTER_TEACHER_RELEASE
}

enum AnswerReleasePolicy {
  NEVER
  AFTER_SUBMISSION
  AFTER_CLOSE
  AFTER_TEACHER_RELEASE
}

enum AssessmentGradingMode {
  AUTO
  MANUAL
  MIXED
}

model Exam {
  // existing fields remain
  lifecycle              AssessmentLifecycle @default(DRAFT)
  instructions           String?
  opensAt                DateTime?
  closesAt               DateTime?
  timezone               String?
  resultReleasePolicy    ResultReleasePolicy @default(AFTER_TEACHER_RELEASE)
  answerReleasePolicy    AnswerReleasePolicy @default(NEVER)
  gradingMode            AssessmentGradingMode @default(MIXED)
  passMarkPercent        Float?
  shuffleQuestions       Boolean @default(false)
  shuffleOptions         Boolean @default(false)
  allowBacktracking      Boolean @default(true)
  draftRevision          Int @default(1)
  publishedAt            DateTime?
  archivedAt             DateTime?
  currentPublicationId   String? @unique
  currentPublication     AssessmentPublication? @relation("CurrentAssessmentPublication", fields: [currentPublicationId], references: [id], onDelete: Restrict)
  publications           AssessmentPublication[] @relation("AssessmentPublications")

  @@index([schoolId, lifecycle])
  @@index([classId, lifecycle, opensAt, closesAt])
}

model AssessmentPublication {
  id                    String @id @default(cuid())
  examId                String
  version               Int
  publishedByTeacherId  String
  title                 String
  subject               String
  topic                 String
  classLevel            ClassLevel
  instructions          String?
  durationMinutes       Int?
  opensAt               DateTime?
  closesAt              DateTime?
  timezone              String?
  resultReleasePolicy   ResultReleasePolicy
  answerReleasePolicy   AnswerReleasePolicy
  gradingMode           AssessmentGradingMode
  passMarkPercent       Float?
  settingsSnapshot      Json
  contentHash           String
  publishedAt           DateTime @default(now())
  exam                  Exam @relation("AssessmentPublications", fields: [examId], references: [id], onDelete: Restrict)
  currentFor             Exam? @relation("CurrentAssessmentPublication")
  publisher              Teacher @relation(fields: [publishedByTeacherId], references: [id], onDelete: Restrict)
  items                  AssessmentPublicationItem[]
  attempts               ExamAttempt[]

  @@unique([examId, version])
  @@index([examId, publishedAt])
}

model AssessmentPublicationItem {
  id                 String @id @default(cuid())
  publicationId      String
  assessmentItemId   String?
  questionId         String
  questionVersionId  String
  order              Int
  section            Section
  maxMarks           Float
  snapshot           Json
  publication        AssessmentPublication @relation(fields: [publicationId], references: [id], onDelete: Restrict)
  assessmentItem     AssessmentItem? @relation(fields: [assessmentItemId], references: [id], onDelete: Restrict)
  question           Question @relation(fields: [questionId], references: [id], onDelete: Restrict)
  questionVersion    QuestionVersion @relation(fields: [questionVersionId], references: [id], onDelete: Restrict)
  responses          QuestionResponse[]

  @@unique([publicationId, order])
  @@unique([publicationId, questionId])
  @@index([questionVersionId])
}

model ExamAttempt {
  // existing fields remain
  publicationId      String?
  publication        AssessmentPublication? @relation(fields: [publicationId], references: [id], onDelete: Restrict)
  deadlineAt         DateTime?
  deliverySnapshot   Json?
  submittedRevision  Int @default(0)

  @@index([publicationId])
}

model QuestionResponse {
  // existing questionId remains
  publicationItemId  String?
  publicationItem    AssessmentPublicationItem? @relation(fields: [publicationItemId], references: [id], onDelete: Restrict)

  @@index([publicationItemId])
}
```

The implementation review must resolve the temporary circular current-publication relation cleanly, confirm Prisma relation names, decide whether `settingsSnapshot` duplicates enough explicit columns to justify itself, and add reverse relation fields required by Prisma. No cascade may remove publications, attempts, responses, or pinned versions.

## Required F8B test matrix

- draft create and edit with optimistic revision;
- stale concurrent edit denial;
- valid publish and idempotent publish retry;
- invalid publish for each hard blocker;
- scheduled/pre-start denial;
- active eligible-student access;
- direct-route class/target denial;
- post-close new-attempt denial;
- duration deadline persisted and reload-safe;
- first-attempt content/settings lock;
- publication revision before first attempt;
- completed-attempt historical rendering after draft edits;
- effective marks/order/version preservation;
- question replacement restriction;
- copy assessment semantics;
- draft delete, used assessment delete restriction, archive;
- unauthorized teacher and cross-school denial;
- unpublished student denial;
- attempt idempotency and duplicate submission;
- expired session during attempt with safe resume/re-auth;
- result/answer release policies;
- manual/mixed grading completion;
- randomization reconstruction when later enabled;
- migration/backfill counts and rollback.

## Data invariants

- no Exam, Question, QuestionVersion, AssessmentItem, Attempt, or Response is lost;
- existing IDs and response FKs remain valid;
- order, section, marks, answers, and grading remain unchanged for existing attempts;
- completed/in-progress history renders from immutable evidence;
- active publication is deterministic and school-scoped;
- server time controls schedule/deadlines;
- student eligibility is server-authoritative;
- publish and submit are idempotent;
- teacher attribution and school isolation remain intact;
- ExamAttempt outcomes remain separate from school Score/TAVG authority.

## UI reference implications

- Publish uses a consequential confirmation dialog with a validation summary and explicit Cancel/Publish actions.
- Settings use grouped fieldsets/progressive disclosure, not a wall of toggles.
- Status presentation separates persisted authoring state from derived delivery phase.
- Scheduling fields show the school/user timezone while explaining that server time is authoritative.
- Save Draft exposes dirty/saving/error states only when backed by real mutations.
- Mobile uses stacked sections or a drawer for secondary settings; readiness and publish actions remain reachable without obscuring content.
- Destructive archive/delete actions remain visually and semantically distinct.
