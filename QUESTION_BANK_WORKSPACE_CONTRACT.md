# TeachNexis Reusable Question & Assessment Bridge Contract (F6A)

## Status

This is an architecture contract only. No Prisma schema, SQL, migration, or assessment runtime was changed.

## Authoritative distinction

- **Question:** educational content that should be reusable; today it is still required to belong to an `Exam`.
- **Question Bank:** school-authorized discovery and reuse surface; `/question-bank` is currently transitional over Exam records.
- **Assessment:** current delivery container is `Exam`; Quiz/Assignment/Practice/Revision are separate product concepts, not separate Prisma models in the inspected schema.
- **AssessmentItem:** future relationship configuring a reusable question for one assessment.
- **AI question:** generated content that must remain draft/review until teacher approval.

## Current evidence

`Exam.questions` is one-to-many and `Question.examId` is required. `QuestionResponse` references `Question` directly and is unique per `(attemptId, questionId)`. `ExamAttempt` references `Exam` and cascades responses when an attempt is deleted. Deleting an Exam cascades Questions; deleting a Question is restricted by the response relation. There is no Question version, lifecycle, owner, visibility, reusable assessment join, or question-level school FK; school scope is inherited through Exam.

The current Prisma schema is authoritative: `QuestionType` contains `MCQ`, `SHORT_ANSWER`, `ESSAY`, `STRUCTURED`, and `CALCULATION`. `FORMULA_SHEET`, `TEACHER_NOTES`, and `AI_NOTES` belong to `LibraryCategory` and must not be treated as question types. F6B.2 reconciled the earlier documentation mismatch without changing either enum.

## Recommended target: HYBRID (version + assessment snapshot)

Introduce a reusable Question identity and immutable QuestionVersion. An AssessmentItem references the selected version and stores assessment-specific configuration/snapshot fields. Draft edits create a new version; published/completed assessments continue to render and grade the pinned version. This protects historical attempts while allowing a teacher to correct a reusable question for future use.

Option A (snapshot-only) has lower migration effort but duplicates content and makes reusable edits harder to audit. Option B (versioned Question + AssessmentItem) provides stronger provenance and historical integrity at higher complexity. The recommended hybrid keeps versions canonical and snapshots the version/configuration at publication.

## Ownership and visibility

Every reusable question must resolve school scope server-side. Recommended visibility is `PRIVATE` (teacher), `SCHOOL`, or explicit `SYSTEM`; cross-school reads are denied unless content is explicitly system/global. `createdByTeacherId` and `schoolId` are authoritative database relations, never client input.

## Proposed lifecycle and provenance

Use one lifecycle status (`DRAFT`, `REVIEW`, `APPROVED`, `ARCHIVED`) plus separate source/provenance fields (`TEACHER`, `AI`, `IMPORTED`, `PAST_QUESTION`, `SYSTEM`). AI output enters DRAFT/REVIEW. Optional provenance records may retain provider/model, generated/imported time, reviewer, exam body/year/paper/question number, and source reference; secrets and raw prompts are not required.

## AssessmentItem field classification

`assessmentId` REQUIRED_NOW; `questionId` REQUIRED_NOW; pinned `questionVersionId` REQUIRED_NOW; `order` REQUIRED_NOW; `marksOverride` REQUIRED_NOW; `section` REQUIRED_NOW for current exam compatibility. `required/optional`, assessment-specific instructions, option/question randomization metadata are USEFUL_LATER. A second free-form question payload is UNNECESSARY when it duplicates the pinned version.

Question stores recommended/default marks; AssessmentItem stores per-assessment override. Answer rules and max marks must be pinned with the version/configuration so grading remains deterministic after later edits.

## Curriculum and scale

Prefer references to canonical Curriculum Graph nodes, with denormalized search facets only when justified. Target hierarchy is country → curriculum → level → class → subject → term → topic → subtopic → objective. Server-side search/filtering, stable ordering, cursor pagination, and indexes on school/visibility/subject/class/topic/type/status/source are required for 10K–1M records. Do not load the bank into browser memory.

## Deletion, reuse, duplicate, and quality rules

Reuse keeps the same question/version identity. Duplicate creates a new editable identity. Variant is a new pedagogical item. Unused drafts may be deleted; published/used questions are archived/restricted, never hard-deleted when historical items or responses depend on them. Future duplicate states are exact, near, semantic, and variant. Future quality dimensions include correctness, alignment, difficulty confidence, ambiguity, explanation quality, provenance confidence, review state, and usage outcomes.

## Migration invariants and test contract

Existing Question IDs should remain canonical. Backfill one reusable identity and one pinned version per existing Question, then create one AssessmentItem per existing Exam→Question edge while preserving order, answers, marks, grading, AI metadata, and response FKs. No attempt or response may be orphaned; completed assessments are immutable. The future harness must cover legacy reads, reuse across two assessments, marks overrides, edit-after-attempt immutability, archive/delete restriction, cross-school denial, AI draft→approval, duplicate identity, backfill counts, rollback, and retry/idempotency.

## Explicit deferrals

No schema implementation, migration, bulk AI generation, embeddings, curriculum ingestion, automatic approval, assessment backend rewrite, auth change, or database test is part of F6A.
