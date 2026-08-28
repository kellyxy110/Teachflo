# F6 Reusable Question Migration Plan

This plan is proposed only; it has not been applied.

## Authoritative enum boundary

Reusable-question persistence uses the existing Prisma `QuestionType` values only: `MCQ`, `SHORT_ANSWER`, `ESSAY`, `STRUCTURED`, and `CALCULATION`. `FORMULA_SHEET`, `TEACHER_NOTES`, and `AI_NOTES` are `LibraryCategory` values. F6 does not add, remove, or reinterpret either enum.

## Phase 1 — additive schema

Add reusable Question identity/ownership, QuestionVersion, AssessmentItem, lifecycle/source enums, and explicit relations. Keep existing `Exam.questions`, `Question.examId`, Question IDs, response FKs, and legacy reads intact. Add uniqueness for `(assessmentId, questionId/version)` as appropriate and indexes for school/visibility/search facets. Use RESTRICT/ARCHIVE semantics for published content; avoid cascades that can erase historical evidence.

## Phase 2 — backfill

For every existing Question, create one identity and initial immutable version; for every Exam→Question edge create one AssessmentItem preserving order, section, marks, answer/options, and metadata. Verify counts, response reachability, school scope, and grading totals before enabling reads.

## Phase 3 — dual-read compatibility

Read AssessmentItem/version for new paths, fall back to legacy Exam→Question for old paths. Dual-write only inside reviewed transactions. Compare rendered content and grading outputs for sampled existing attempts.

## Phase 4 — Assessment Builder cutover

Allow selection of approved reusable questions, configure assessment-specific marks/order/section, pin version at publish, and preserve existing Exam APIs until parity is proven. Add server-side search/filter/pagination.

## Phase 5 — legacy relation deprecation

After verified parity, stop new writes to direct exam ownership while retaining legacy columns/reads for rollback. Keep response FKs stable unless a separate reviewed migration proves necessity.

## Phase 6 — later cleanup

Only after production evidence and an explicit migration review may legacy ownership be removed. Historical snapshots, versions, provenance, and archive records must remain queryable.

## Rollback checkpoints

1. Abort before schema migration if target/backup verification fails.
2. Abort backfill on any count, FK, scope, or grading mismatch.
3. Keep feature flag on legacy reads during dual-read comparison.
4. Revert builder writes to legacy path if parity fails.
5. Never delete legacy IDs or response references as a rollback shortcut.

## Proposed Prisma diff (PROPOSED ONLY)

```prisma
enum QuestionLifecycle { DRAFT REVIEW APPROVED ARCHIVED }
enum QuestionSource { TEACHER AI IMPORTED PAST_QUESTION SYSTEM }
enum QuestionVisibility { PRIVATE SCHOOL SYSTEM }

model ReusableQuestion {
  id String @id @default(cuid())
  schoolId String?
  createdByTeacherId String?
  visibility QuestionVisibility @default(PRIVATE)
  lifecycle QuestionLifecycle @default(DRAFT)
  source QuestionSource
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  versions QuestionVersion[]
  items AssessmentItem[]
  @@index([schoolId, visibility, lifecycle])
}

model QuestionVersion {
  id String @id @default(cuid())
  reusableQuestionId String
  version Int
  payload Json
  recommendedMarks Float?
  createdAt DateTime @default(now())
  question ReusableQuestion @relation(fields: [reusableQuestionId], references: [id], onDelete: Restrict)
  items AssessmentItem[]
  @@unique([reusableQuestionId, version])
}

model AssessmentItem {
  id String @id @default(cuid())
  examId String
  reusableQuestionId String
  questionVersionId String
  order Int
  section Section
  marksOverride Float?
  snapshot Json?
  exam Exam @relation(fields: [examId], references: [id], onDelete: Restrict)
  question ReusableQuestion @relation(fields: [reusableQuestionId], references: [id], onDelete: Restrict)
  version QuestionVersion @relation(fields: [questionVersionId], references: [id], onDelete: Restrict)
  @@unique([examId, order])
  @@index([examId])
  @@index([reusableQuestionId])
}
```

The payload shape and exact relation names require implementation-phase review; this diff is not authoritative schema and is not applied.
