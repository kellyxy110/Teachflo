# TeachNexis Question Import Engine (QI-1)

Status: architecture and repository audit only. No importer, migration, seed, or Question/QuestionVersion change is proposed in QI-1.

## 1. Existing reusable infrastructure

The repository already has a review-first Phase 8 import flow: file analysis, bounded row/column validation, Zod request schemas, staging rows, authenticated school scoping, deterministic subject aliases, conflict records, job leases, retry-aware commits, transactional per-row writes, and cleanup harnesses. `apps/web/lib/services/import/validation.ts`, `stage.ts`, `commit.ts`, `resolve-student.ts`, and the `/api/import/*` routes are the primary reusable seams.

F6 supplies the canonical `Question`, `QuestionVersion`, `QuestionType`, ownership, archive/version pinning, and Question Bank → Assessment Builder path. F8 publication snapshots preserve historical versions. STEM-A2 supplies `MathText`, `StemMathEditor`, and KaTeX-compatible source preservation. Existing `safeAuth`/school checks remain the authorization boundary.

The current Phase 8 import is score/student-oriented, not question-oriented. It is adaptable at the job, staging, validation, fingerprint, lease, and cleanup layers, but its row schema and commit target must not be reused unchanged.

## 2. Proposed bounded pipeline

`UPLOAD → VALIDATE FILE → PARSE → DETECT/MAP → NORMALIZE → STAGE → VALIDATE → PREVIEW/REVIEW → APPROVE → CREATE QUESTION + IMMUTABLE QUESTIONVERSION`.

Only approved candidates create canonical questions. A refresh, retry, parser success, or AI suggestion can never publish content. Import jobs are school/teacher scoped; canonical persistence derives the authenticated teacher and school server-side.

Recommended job states are `UPLOADED`, `PARSING`, `STAGED`, `NEEDS_REVIEW`, `READY`, `COMMITTING`, `COMPLETED`, `FAILED`, `CANCELLED`, with optimistic revision/lease checks. Candidate states are `READY`, `NEEDS_REVIEW`, `ERROR`, `POSSIBLE_DUPLICATE`, `SKIPPED`, `APPROVED`, `REJECTED`, `COMMITTED`.

## 3. Format strategies

### DOCX

Use a bounded ZIP/package parser that reads paragraphs, headings, tables, numbering, runs, and relationships without executing macros, external links, or embedded objects. Detect question boundaries from numbering/headings and preserve source paragraph/table/page context. Recognize common option patterns (`A.`/`B.` etc.) and marks only when deterministic. OMML equations should normalize to canonical STEM source where conversion is lossless; otherwise retain the original run/XML evidence and mark `NEEDS_REVIEW`. Images/diagrams remain evidence attachments requiring review, not silently discarded content.

### CSV

Parse bounded UTF-8/UTF-16 text with header detection and explicit teacher column mapping. Support aliases for question, type, options, answer, marks, explanation, subject, topic, difficulty, and STEM format. Empty rows are skipped with evidence; unknown columns are retained as metadata. Ambiguous headers, answer labels, types, or math formats require confirmation.

### XLSX

Inspect workbook metadata and bounded sheet previews. Require teacher sheet selection when multiple sheets are present. Read displayed cell values without evaluating formulas; flag formula cells and external links. Reuse Phase 8 size/row/column limits and mapping UI patterns, but do not treat score-import fields as question fields.

## 4. Canonical candidate contract

The staged candidate should contain raw source location and a normalized payload:

`sourceFingerprint`, `sourceFormat`, `sourceLocation`, `rawEvidence`, `questionNumber`, `section`, `stem`, `questionType`, `options[]`, `correctAnswer`, `marks`, `explanation`, `mathFormat`, `subject`, `topic`, `difficulty`, `warnings[]`, `errors[]`, `stemConversionState`, `duplicateState`, `reviewRevision`, `teacherEdits`, and `approvalState`.

The canonical output remains the existing Question plus immutable QuestionVersion. Missing fields remain null/unknown; no inferred answer, marks, type, curriculum, or math meaning is silently invented.

## 5. STEM preservation

Preserve TeachNexis `$inline$` and `$$display$$` source. Deterministic conversions may cover plain Unicode superscripts/subscripts, common fraction forms, existing LaTeX, and lossless OMML. Ambiguous conversions remain raw evidence plus `NEEDS_REVIEW`. `MathText` renders read-only views; `StemMathEditor` is used for corrections. No chemistry engine, CAS, equivalence grader, or new math dependency is needed.

## 6. Review UX

The future Teacher flow is upload → file/sheet selection → column mapping → bounded preview → issue queue → candidate editor → approval. Each row shows source location/raw evidence beside normalized content, status, duplicate warnings, STEM conversion state, and teacher edits. Individual approval is default; bulk approval is limited to homogeneous, validated rows. Mobile uses stacked source/candidate panels and a filter drawer rather than a wide spreadsheet.

## 7. Duplicate and idempotency policy

Compute a binary source SHA-256. Candidate identity combines source fingerprint, source location, normalized stem/options/type, and source row/paragraph identity. A normalized-content fingerprint is a suggestion only. Existing Questions/QuestionVersions are never overwritten. Same-value retries resolve to the prior committed candidate; changed content creates a new reviewable candidate/version. Same stem with changed options/marks is a conflict, not an automatic merge.

## 8. QuestionVersion and Assessment integration

Approval creates a Question (owned by the authenticated school/teacher according to F6 rules) and one immutable QuestionVersion. Existing AssessmentPublication snapshots remain untouched. The new Question is immediately available through the existing Question Bank and Assessment Builder bridge; no imported-question subsystem is introduced.

Curriculum alignment is optional and separately reviewed. Filename, subject text, or AI suggestions cannot create F9 alignment automatically. Future alignment can target QuestionVersion and preserve F9 provenance.

## 9. AI boundary

Basic CSV/XLSX import is deterministic and has no AI dependency. AI may later suggest boundaries, types, answers, math conversion, duplicates, difficulty, or curriculum matches, but suggestions must be schema-validated, evidence-linked, confidence-separated from authority, and Teacher-confirmed. AI cannot approve, publish, or become grading authority.

## 10. Security and recovery

Validate extension, MIME/signature, byte size, decompression ratio, archive entries, parser time, text size, row/column counts, and candidate count. Reject macros, scripts, unsafe URLs, external workbook links, formula execution, and dangerous HTML. Use temporary storage with cleanup and rate limits. A failed row remains staged; a failed commit creates no partial QuestionVersion. Jobs are resumable with leases/revisions and cancellable before commit.

## 11. Scale

Synchronous parsing is appropriate for small files (roughly 10–100 questions). Larger files should be staged in bounded batches with paginated previews; 300–1000+ questions should use a background job/lease while keeping candidate queries bounded. The browser must never load an entire import or Question Bank.

## 12. Schema recommendation

`NO_CHANGE` for QI-1. Existing ImportJob/ImportStagingRow can prove the contract only if their JSON payloads and lifecycle are intentionally generalized. Before QI-2, inspect whether a source-format discriminator, candidate revision, approval actor/time, and canonical QuestionVersion linkage can be represented without ambiguity. If not, propose the smallest additive migration; do not alter F6/F8 history.

## 13. Likely implementation phases

1. QI-2: bounded file validation, parser adapters, and deterministic candidate contracts.
2. QI-3: question-specific staging/review and duplicate preview.
3. QI-4: authenticated approval and QuestionVersion commit transaction.
4. QI-5: Question Bank/Assessment Builder integration and STEM correction UX.
5. QI-6: optional AI suggestions, curriculum alignment review, and scale/background processing.

## 14. Files likely to change later

`apps/web/lib/services/import/*` (shared primitives only), new question-import services/routes, Zod schemas, a bounded Teacher review client, and existing Question Bank/Question Builder components. `packages/database/prisma/schema.prisma` should remain unchanged unless the QI-2 contract proves an additive audit/linkage field is necessary. Existing Question, QuestionVersion, AssessmentPublication, auth, and F9 services are not to be rewritten.

## 15. Acceptance criteria for QI-2+

- DOCX/CSV/XLSX files are validated and bounded.
- Raw evidence and source locations survive every transformation.
- Ambiguous type/answer/math mappings require Teacher review.
- No unapproved candidate creates a Question or QuestionVersion.
- Retries are idempotent and changed sources do not overwrite history.
- Existing F6 Question Bank, F6C bridge, F8 publication, and STEM-A2 rendering remain compatible.
- School/Teacher authorization is server-derived.
- Malicious archives, formulas, HTML, scripts, macros, and unsafe URLs are rejected.
- Import previews are paginated and usable on mobile.
