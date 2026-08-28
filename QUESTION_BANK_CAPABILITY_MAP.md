# TeachNexis Question Bank Capability Map

## Scope

F4 audit of the existing question, exam, AI-generation, and student-delivery surfaces. This document records current capability without changing schema or business behavior.

## Current routes and components

| Surface | Route/component | Status | Notes |
|---|---|---|---|
| Exam list | `app/(dashboard)/exams/page.tsx`, `ExamsListClient.tsx` | IMPLEMENTED | Lists teacher-owned exams and question counts. |
| Manual question creation | `app/(dashboard)/exams/questions/new/QuestionBuilderClient.tsx` | IMPLEMENTED | Creates a question within an exam; supports MCQ, short answer, essay, structured and calculation types. |
| AI generation | `app/(dashboard)/exams/generate-ai/GenerateAIClient.tsx`, `actions/exams.ts` | IMPLEMENTED/PARTIAL | Generates exam sections and persists reviewed output through exam actions; no standalone reusable-bank workflow. |
| Spreadsheet import | `app/(dashboard)/exams/import/ExcelImportClient.tsx` | IMPLEMENTED | Bulk imports questions into an existing exam (up to 200). |
| Exam/question review | `app/(dashboard)/exams/[examId]/ExamDetailClient.tsx` | IMPLEMENTED | Preview, trust report, export, and exam-level actions. |
| Student delivery | `app/(student)/s/exams/[examId]/*` and `actions/exam-v2.ts` | IMPLEMENTED | Attempts, responses, grading, and results are connected to exams. |
| Standalone Question Bank route | `/question-bank` or `/questions` | NOT FOUND | Navigation should not expose a dead destination in F4. |

## Model capability

`Question` is exam-owned (`examId`) and currently supports section, number, five option fields, correct option, stem/question text, mark scheme, solution, explanation, distractors, common mistakes, exam tip, curriculum reference, difficulty, Bloom level, skill/topic/subtopic tags, source, estimated time, related chunks, responses, and tags.

Currently supported: subject/class/topic through the parent `Exam`; question type; MCQ/options; answer and explanation; solution/mark scheme; difficulty; marks indirectly through exam/question sections; source and curriculum reference; tags; estimated time; student responses.

Derivable: usage count (query response/assessment relations), exam body and term (parent exam where populated), learning objective (skill/topic tags), provenance (questionSource and related chunks), review trust signals (the existing trust report).

Missing or constrained: standalone reusable ownership, explicit subtopic/curriculum hierarchy, year/examination body as first-class question metadata, media/diagram/equation attachments, fill-gap/matching/multi-select/true-false types, versioning, moderation state, semantic duplicate identity, and independent question-to-many-assessment reuse.

Future schema candidates (not implemented): a reusable question bank owner/scope, normalized curriculum references, typed options/answer payload, media assets, review/provenance records, versions, similarity fingerprints, and assessment usage join records.

## Assessment integration map

Current flow is `generate or manually create/import → Exam.questions → teacher exam review/export → student ExamAttempt → responses/results → analytics/mistake intelligence`. Assignments, quizzes, and revision surfaces consume related flows but there is no single Question Bank selection step. Consolidation is deferred because it would alter assessment workflows.

## AI contract audit

The provider abstraction and exam-v2 generator produce structured questions with validation and trust reporting. The safe target remains `AI generates → teacher reviews/edits → teacher approves → exam/content is persisted`. F4 makes no backend change; a future review state should be explicit before reusable-bank publication.

## Curriculum readiness

Nigerian exam language (WAEC/JAMB/JUPEB) appears in prompts, metadata, and product copy, while the current model remains string-based and can represent other curricula. WAEC/NECO/JAMB alignment is therefore partial: references can be stored, but there is no authoritative curriculum tree, examination-body taxonomy, or verified mapping pipeline.

## Question types and subject readiness

The authoritative Prisma `QuestionType` values are `MCQ`, `SHORT_ANSWER`, `ESSAY`, `STRUCTURED`, and `CALCULATION`. `FORMULA_SHEET`, `TEACHER_NOTES`, and `AI_NOTES` are `LibraryCategory` values, not question types. Mathematics/physics/chemistry notation is supported through existing rendering/content fields, but interactive graphs, geometry, chemical structures, labelled biology diagrams, maps, and richer response types require a later content engine.

## Scalability and duplicate risks

The current exam-owned model and client presentation are not a large-bank workspace: filtering/search, pagination/virtualization, reusable selection, and semantic duplicate detection are incomplete. A future Question Content Engine should add generation batches, exact/near/semantic fingerprints, curriculum/difficulty quotas, provenance, teacher moderation, versioning, quality scoring, and usage analytics. Existing AI/router and trust-report seams are integration points; no embedding or vector infrastructure is added in F4.

## F4 decision

Because no standalone Question Bank route exists, F4 does not create dead controls or a second workflow. The safe next step is a reviewed workspace phase that defines reusable-question ownership and selection contracts before any schema or bulk-content work.
