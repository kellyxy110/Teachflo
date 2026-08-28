# F8 Assessment Lifecycle Migration Plan

## F8B implementation status

The additive schema proposal is represented by `packages/database/prisma/migrations/f8b_assessment_lifecycle.sql` (prepared only; not applied while the Development database is not yet baselined for Prisma Migrate). It adds the `AssessmentLifecycle`, release-policy and grading enums, Exam authoring/lifecycle fields, immutable `AssessmentPublication` and `AssessmentPublicationItem` records, and optional publication/deadline bindings on attempts and responses. No destructive operation is included. The Development-only compatibility backfill is `apps/web/scripts/f8b-lifecycle-backfill.ts`; it creates missing initial QuestionVersion rows idempotently and deliberately does not manufacture unknown publication history for legacy attempts.

## Status

**PROPOSED ONLY — NOT APPLIED.** This plan creates no migration file and executes no SQL. Development and protected databases are untouched.

## Approved target for implementation review

Use the phased hybrid in `ASSESSMENT_LIFECYCLE_CONTRACT.md`:

- keep `Exam` as the current editable assessment aggregate;
- keep F6 `Question`, `QuestionVersion`, and `AssessmentItem` invariants;
- add minimal lifecycle/settings to the draft;
- create immutable `AssessmentPublication` and publication items;
- bind new attempts to publications;
- preserve legacy attempt/response relations during dual read;
- defer Homework/Assignment unification.

## Phase 0 — pre-migration evidence

1. Prove the target is `wxgnufdacfncwxbedzap` and not `cnodlvmgdueykdriiati`.
2. Record counts for Exam, Question, QuestionVersion, AssessmentItem, ExamAttempt, and QuestionResponse.
3. Record counts by school and attempt status.
4. Identify Exams with attempts, direct legacy questions, reusable items, missing duration, and mismatched class ownership.
5. Verify current migration reconstruction and create rollback evidence.

Rollback checkpoint: stop before schema application if target identity, backup/reconstruction, relation counts, or school ownership cannot be proven.

## Phase 1 — additive schema

Add reviewed enums/columns/models only:

- authoring lifecycle and draft revision on Exam;
- instructions, scheduling, timezone, and minimum release/grading settings;
- immutable AssessmentPublication;
- immutable AssessmentPublicationItem;
- nullable publication/deadline/delivery fields on ExamAttempt;
- nullable publication-item reference on QuestionResponse;
- indexes and Restrict foreign keys.

Keep every current column, ID, unique constraint, and FK. Do not alter QuestionResponse.questionId, AssessmentItem pinning, or the current `(studentId, examId)` one-attempt rule in the first migration.

Rollback checkpoint: migration must contain no destructive operation or cascade capable of deleting questions, versions, items, attempts, or responses.

## Phase 2 — legacy assessment backfill

1. Backfill every existing Exam as `DRAFT` by default.
2. Classify Exams with attempts as historical legacy assessments; do not expose them as newly publishable drafts.
3. For each Exam with attempts, create one historical publication revision using existing Exam metadata, ordered Questions/AssessmentItems, pinned QuestionVersions, marks, and safe default policies.
4. Backfill each attempt's `publicationId` to that historical publication.
5. Backfill response publication-item identity only when the mapping is unambiguous; retain canonical questionId regardless.
6. Preserve existing results visibility behavior for legacy attempts through an explicit legacy compatibility policy, not a silent global default change.
7. Make the backfill idempotent using `(examId, version)` and `(publicationId, order/questionId)` uniqueness.

Backfill blockers:

- ambiguous duplicate question use;
- missing version/snapshot required for historical grading;
- cross-school relation mismatch;
- response question absent from its assessment;
- count or marks mismatch.

Rollback checkpoint: abort feature activation on any count, FK, ownership, ordering, marks, answer, or grading mismatch. Additive records may be removed only by a reviewed rollback script while legacy reads remain authoritative.

## Phase 3 — dual-read compatibility

1. Teacher builder continues to read/write current Exam and AssessmentItem draft data.
2. Student delivery reads publication data when `attempt.publicationId` exists.
3. Legacy attempts without a publication continue through the verified legacy path.
4. Compare historical rendering and grading outputs between legacy and publication projections.
5. Add telemetry for fallback reads, blocked eligibility, stale draft conflicts, and schedule denials without logging answers or secrets.

Rollback checkpoint: feature flag publication reads and revert to legacy delivery if parity fails. Never delete publication evidence as part of a runtime rollback.

## Phase 4 — builder persistence cutover

Implement server-authoritative mutations in small reviewed steps:

1. Save Draft with Zod validation and optimistic revision.
2. Update supported settings without exposing unsupported toggles.
3. Validate readiness server-side.
4. Publish atomically and idempotently.
5. Archive/restrict deletion.
6. Copy Assessment with exact semantics from the contract.

All mutations derive teacher/school authorization from the session and reject client ownership fields.

Rollback checkpoint: retain draft-only behavior and hide Publish if publication mutation or validation parity fails.

## Phase 5 — student delivery cutover

1. Filter lists to published, eligible, available publications.
2. Enforce the same rules on direct navigation and attempt creation.
3. Create/resume attempts idempotently against one publication.
4. Persist deadline and delivery snapshot.
5. Validate every response against delivered publication items.
6. Make submit atomic/idempotent and enforce result/answer release policy.
7. Lock publication after first attempt.

Rollback checkpoint: stop new publication-backed starts if delivery integrity fails; allow existing attempts to finish against their pinned publication. Never repoint an in-progress attempt.

## Phase 6 — legacy cleanup (later authorization required)

Only after production evidence and explicit review:

- require publicationId for new attempts;
- require publicationItemId for new responses where applicable;
- retire fallback reads;
- consider shared lifecycle adoption for Homework/Assignment;
- consider multiple attempts, accommodations, randomization, and notification workers.

Do not remove legacy Exam/Question/Response identity merely to make the schema look unified.

## Proposed migration inventory

Exact SQL is deferred to F8B.

| Category | Proposed |
|---|---|
| Enums | AssessmentLifecycle, ResultReleasePolicy, AnswerReleasePolicy, AssessmentGradingMode |
| Exam columns | lifecycle, instructions, opensAt, closesAt, timezone, release/grading settings, pass mark, supported shuffle/navigation flags, draftRevision, publishedAt, archivedAt, currentPublicationId |
| New models | AssessmentPublication, AssessmentPublicationItem |
| ExamAttempt columns | publicationId nullable, deadlineAt nullable, deliverySnapshot nullable, submission revision/idempotency field |
| QuestionResponse columns | publicationItemId nullable |
| Uniques | publication `(examId, version)`; publication-item `(publicationId, order)` and `(publicationId, questionId)` |
| Indexes | school/lifecycle; class/lifecycle/time; publication/exam/time; attempt/publication; response/publication item |
| Deletion actions | Restrict for publication/history relations |
| Destructive operations | NONE |

## Reconstruction and count verification

Before and after migration verify:

- Exam count preserved;
- Question and QuestionVersion counts preserved;
- AssessmentItem count preserved;
- ExamAttempt and QuestionResponse counts preserved;
- every migrated attempt resolves one publication;
- every response remains linked to its canonical Question;
- publication item order and effective marks equal the source assessment;
- schoolId/teacherId attribution matches the source Exam;
- existing percentage/grade outputs do not change.

## Security verification

- unauthenticated draft/read/publish denied;
- Teacher A cannot access School B draft/publication;
- client schoolId/teacherId ignored or rejected;
- student cannot see DRAFT/ARCHIVED/out-of-window work;
- same-school but wrong-class student denied by list, direct route, and mutation;
- attempt cannot reference another school's publication;
- response cannot reference an undelivered publication item;
- publication/release actions are audited and server-authorized.

## Behavioral test matrix

### Draft and concurrency

- create draft;
- edit each supported field;
- explicit save state;
- stale revision conflict;
- retry/idempotency;
- duplicate assessment reset semantics.

### Publish and lifecycle

- valid publish;
- repeated publish retry returns same publication;
- each hard validation blocker;
- schedule before/open/close boundary using server clock;
- archive draft/published/used assessment;
- delete unused draft;
- delete used assessment restricted.

### Content/history

- reusable version pinning;
- marks/order/section preservation;
- first-attempt lock;
- edit draft after historical publication creates new revision;
- completed attempt unchanged;
- question replacement after attempt denied;
- legacy rendering parity.

### Attempts/delivery

- eligible student start;
- same-school wrong-class denial;
- unpublished denial;
- resume after reload/session refresh;
- persisted deadline and close-time minimum;
- expired/closed start denial;
- response limited to delivered items;
- duplicate response/submission safety;
- session expiry with safe re-auth/resume;
- manual/mixed grading and release policies.

### Regression

- F6B/F6C reusable-question harnesses;
- existing adaptive and standard attempt paths;
- DB/route/commit/SchoolCube Phase 8 harnesses;
- Prisma validate/generate and fresh reconstruction;
- TypeScript, touched lint, production build, diff check.

## Implementation stop conditions

Stop F8B rather than improvise if:

- existing attempt/question history cannot map unambiguously;
- a required migration is destructive;
- current grading changes under publication projection;
- school/class eligibility rules remain unclear;
- multiple-attempt semantics are required immediately;
- Production/protected target identity cannot be excluded;
- Phase 8 or Score/TAVG behavior changes.
