# TASKS.md — Import Architecture Decisions & Open Work

This file exists so a future Claude/Codex session doesn't rediscover these
decisions from scratch. It's a decision log for the **import subsystem**
(Score Import + Student Hub / Smart Import), not a general roadmap — see
`README.md` for the product roadmap.

Written after two passes: (1) SchoolCube import forensic audit + Score Import
forensic pass, (2) Import Identity & Data Integrity Reconciliation.

> **Audit status — 2026-08-24:** This is an uncommitted implementation
> handoff, not a release approval. Static validation passes (`tsc`, ESLint,
> Prisma schema validation, Prisma client generation, and `git diff --check`),
> but no automated import tests or real-file/browser tests exist. The configured
> database endpoint is unreachable, so no database status or application check
> has run. Remediation code now persists `rawFullName` without overwriting an
> existing audit baseline, requires explicit confirmation for an interpreted
> full-name column and changed subject aliases, and restricts synchronous OCR to
> a teacher context with signature/size checks. These are **CODE COMPLETE /
> STATICALLY VERIFIED**, not feature-complete: migration application, real-file,
> browser, and deployment verification remain pending.

---

## 1. Two importers exist, on purpose (for now)

- `apps/web/app/(dashboard)/import` + `apps/web/app/api/import/{analyze,execute}` —
  the older, simpler "Score Import." Direct-to-production writes, no staging/preview-diff.
- `apps/web/app/(dashboard)/student-hub/import` + `apps/web/app/api/student-hub/*` —
  the newer "Smart Import Engine." Full staging pipeline (`ImportJob` →
  `ImportStagingRow` → conflict resolution → commit), portal connectors,
  sync history.

They are **not fully independent**: both call `/api/import/analyze` for
AI-assisted column mapping, and (as of this pass) both call the same shared
identity/name/subject modules under `apps/web/lib/services/import/`. Full
consolidation into one pipeline was explicitly out of scope for these passes
("do not remove working functionality") — the shared modules are the
intended convergence point. See §6.

## 2. Canonical student identity (`lib/services/import/resolve-student.ts`)

**Decision**: a student's identity must not depend on their current class,
because `Class` rows are recreated every academic session
(`@@unique([schoolId, name, session])`) and `Student.classId` is a single,
mutable, current-only pointer — there is no enrollment history model.

Resolution order (used by both importers via `resolveStudentIdentity()`):
1. `regNumber` match (`schoolId + regNumber`) — authoritative when present.
2. Exact name match **within the target class** — preferred for re-importing/
   correcting the same class's own roster.
3. Exact name match **anywhere in the school** — catches promotion/session
   rollover. If more than one candidate exists, this is **ambiguous** and is
   surfaced as a `CONFLICT` row (`conflictData.reason === "AMBIGUOUS_NAME"`)
   rather than silently picked. `commit.ts` explicitly refuses to auto-resolve
   these via the generic MERGE/REPLACE/KEEP_EXISTING picker — it pushes an
   error and leaves the row uncommitted/retriable until a regNumber is added.

**Deferred, not built**: a real `StudentEnrollment` (student × class × session)
history table is the correct long-term fix — additive, non-destructive,
would let `classId` become a derived "current" pointer. Not built this pass
because it's a product-wide commitment (report cards, analytics, promotion
flows all assume a single current class) that deserves its own explicit
go-ahead, not a decision folded into an import bug fix. **Recommended next
structural step** — see §7.

## 3. Full-name splitting (`lib/services/import/name-format.ts`)

**Decision**: a mapped "Full Name" column is never silently split on a
hardcoded assumption. Both importers now show a **Surname First / Surname
Last / Keep Whole** selector with a live preview against sample rows in the
mapping step; the teacher confirms before staging/import.

- Default suggestion: `SURNAME_FIRST` (matches this app's existing "Surname"/
  "Other Names" convention; preserves the pre-existing behavior for anyone
  already relying on it — it's just no longer invisible).
- `Student.rawFullName` (new nullable column) preserves the first imported
  original un-split string for audit; later imports fill it only when absent.
  This is **CODE COMPLETE / STATICALLY VERIFIED** and **DATABASE APPLICATION
  PENDING**.
- **Honesty note**: "Keep Whole" does not yet mean true non-destructive
  storage everywhere — a best-effort split still populates the required
  `firstName`/`lastName` fields, clearly labeled as such in the UI. Full
  no-split support would require touching every consumer of those fields
  across the app (report cards, sorting, etc.) — explicitly out of scope.

## 4. Subject Registry (`lib/services/import/subject-normalize.ts`)

**Decision**: `Score.subject` (and 9 other free-text subject fields across
the schema — `Teacher.subjects`, `Lesson`, `Exam`, `Question`/`QuestionTag`,
`Document`, `MistakePattern`, `CurriculumPlan`, `CurriculumNode`,
`AnalyticsSnapshot`) stay free-text `String`. Converting all of them to a
real FK would be a large, invasive migration — explicitly out of scope.
Instead: an **alias/normalization layer** that suggests a canonical value,
which the teacher confirms before it's written into the same `subject`
column everywhere.

- New `SubjectAlias` model: school-scoped (`schoolId` required, not
  nullable — a nullable-schoolId "global" design would silently allow
  duplicate rows since Postgres treats `NULL ≠ NULL` in unique constraints).
- A small in-code synonym table (Maths/Math/Further Maths/etc., Nigerian-
  curriculum-specific) is the first suggestion layer; a school's own
  confirmed choices override it and are reused on every future import
  (`POST /api/subjects/suggest`, confirmed via `learnSubjectAlias()`).
- Historical scores are **not** retroactively merged — that's a separate,
  riskier decision, not made here.

## 5. Pending migration — do NOT run without a real DATABASE_URL

Two migrations are queued but **not pushed**, per explicit instruction not to
fabricate or replace `DATABASE_URL`:

1. `IntegrationRequest` model (from the SchoolCube forensic pass — persists
   "Request API" submissions instead of only `console.log`).
2. `SubjectAlias` model + `Student.rawFullName String?` (from this pass).

Both are purely additive (new table / new nullable column) — no destructive
changes, no data loss risk. `packages/database/.env`'s `DATABASE_URL`
previously returned a pooler tenant-not-found error. After the reported
Supabase restore, its pooler hostname resolves and accepts TCP connections,
but Prisma still returns `P1001`; the dashboard project reference has not been
independently matched to the local reference. Treat the database as
**unreachable/unsafe** until that match and a successful authenticated
read-only Prisma query are demonstrated. `apps/web/.env.local`'s
`DATABASE_URL` is empty. The Vercel project (`teachnexis`, scope
`kellyxys-projects`) has no `DATABASE_URL` in its `development` environment.
It does have separate encrypted `DATABASE_URL` entries for `preview` and
`production`; their values and Supabase project references are intentionally
not stored in the repository. Preview is therefore only an **unverified
candidate**, not an approved verification target, until its owner confirms
that its Supabase project is non-production and differs from production.

**Do not default to `db:push` merely because a working `DATABASE_URL` becomes
available.** Repository standards specify manual, reviewed Supabase SQL
migrations, while this repository currently has SQL migration files rather
than Prisma migration history. First create and review an additive SQL migration
for these three changes, then apply it to an explicitly selected development or
staging database. `db:push` remains a development-only option after that review.
`phase8_import_reconciliation.sql` is **APPLIED + DEVELOPMENT VERIFIED** on
the explicitly approved non-production database. Overall baseline
reconciliation and import runtime verification remain pending.
It also adds the `COMMITTING` import-job state used by the bounded commit lease.

(`prisma generate` has already been run locally against the updated schema —
safe, client-only, no DB write — so the app typechecks today even though the
DB itself doesn't have these tables yet. Code that reads/writes
`SubjectAlias`, `IntegrationRequest`, or `Student.rawFullName` will fail at
runtime until the reviewed migration is applied.)

To resume safely, the Supabase/Vercel owner must identify or create a
development, staging, or preview Supabase project; confirm its project
reference differs from production; and provide/authorize its pooler connection
for the ignored local database environment. Do not retrieve or use the
production connection merely to unblock verification.

## 6. Files added/changed this pass

New shared modules (`apps/web/lib/services/import/`):
- `resolve-student.ts` — canonical identity resolution.
- `name-format.ts` — full-name split, client-safe (no `db` import).
- `subject-normalize-shared.ts` — client-safe pieces (`normalizeKey`, types).
- `subject-normalize.ts` — server-only suggestion/learning logic, re-exports
  the shared pieces.

New API route: `apps/web/app/api/subjects/suggest/route.ts`.

Wired into: `stage.ts`, `commit.ts`, `execute/route.ts`,
`app/api/student-hub/jobs/[jobId]/stage/route.ts`,
`ImportClient.tsx`, `ImportHubClient.tsx`.

Also from the earlier SchoolCube/OCR passes (still in this branch, not yet
committed as of this writing): retry-duplication fix and in-batch dedup in
`stage.ts`/`commit.ts`, `IntegrationRequest` persistence, `/api/ocr/extract`
auth + per-user rate-limit fix, client-side score validation added to the
legacy `/import` flow. Run `git status`/`git diff` to see the full pending
diff — none of this has been committed yet.

### Commit/retry invariant (remediation pass)

- Acquiring an import-job commit lease is atomic: a job moves to `COMMITTING`
  only when its status and timestamp still match the request's observed value.
  A second active browser request is rejected; a stale lease may resume only
  after five minutes, longer than the route's 120-second execution limit.
- A whole job is intentionally **not** all-or-nothing. Each successfully marked
`COMMITTED` staging row remains durable; retries process only remaining rows.
  This protects a large import from losing completed work after a timeout.
- The row-level Student + StudentProfile + Score + staging-status sequence is
  a Prisma interactive transaction. The staging row becomes `COMMITTED` only
  inside the successful transaction; failures roll back all production writes,
  then record a retryable row error outside it. This is **CODE COMPLETE —
  RUNTIME DATABASE VERIFICATION PENDING**.

### Baseline identity/profile reconciliation

- `baseline_identity_teacher_student_reconciliation.sql` is **APPLIED +
  DEVELOPMENT VERIFIED**. It restores active Teacher profile/assignment fields,
  optional Student Clerk identity fields, and additive TeacherRole values.
- Broader baseline schema reconciliation (attendance, health, curriculum graph,
  and constraint/default compatibility) remains pending; Phase 8 runtime tests
  must not run until it is complete.

### Baseline attendance/health reconciliation

- `baseline_attendance_health_reconciliation.sql` is **APPLIED + DEVELOPMENT
  VERIFIED**. Attendance status values, attendance uniqueness, health-record
  identity, and their new-table relations were smoke-tested using synthetic data.
- Curriculum graph and broader constraint/default compatibility remain pending.

## 7. Recommended next tasks, roughly in priority order

1. Review the remediation diff, especially the per-job commit lease and
   per-row transaction boundary; no concurrent commit may proceed.
2. Review `phase8_import_reconciliation.sql` for `IntegrationRequest`,
   `SubjectAlias`, `Student.rawFullName`, and the `COMMITTING` enum value; apply only to an explicitly
   selected reachable development/staging database (§5).
3. Run real CSV/XLSX/SchoolCube-export and browser-flow tests, including
   ambiguity, retry, duplicate-subject, and OCR failure paths.
4. Decide on `StudentEnrollment` (§2) — the real fix for cross-session
   identity, currently only mitigated by the same-class-preferred/school-wide-
   fallback resolver.
5. Commit the corrected and validated work in logical boundaries (nothing from
   this handoff has been committed).
6. Consider whether `/api/student-hub/portal/sync`'s Edves path (creates an
   `ImportJob` with a raw payload in `metadata` but never stages it — "Commit
   this data →" is currently a dead end) should be fixed or removed.
7. Longer-term: move toward the one-canonical-pipeline principle explicitly —
   Upload → Detect → Map → Normalize → Validate → Resolve Identity → Preview
   → Confirm → Import → Audit → Report — by having the legacy `/import` UI
   grow into a thin wrapper over the Student Hub staging pipeline, rather than
   maintaining two commit paths.
