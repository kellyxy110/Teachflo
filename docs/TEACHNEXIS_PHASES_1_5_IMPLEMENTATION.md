# TeachNexis Phases 1–5: implementation and release gates

Status: implementation planning started 2026-10-20. This document is a backlog and acceptance contract, **not** a claim that features are production-ready.

## RC1 baseline
- Integration branch: `release/teachnexis-rc1-20261020`; PR #5.
- QB-C5 isolated database verification: GitHub Actions run 39375104684, passed.
- Pending: full Next.js build, browser-authenticated teacher/student onboarding, HOD decision audit, review queue, mobile/public page acceptance, preview deployment.
- Do not merge or deploy until these gates pass.

## Phase 1: identity, onboarding, school boundaries
**Goal:** Teacher creates or joins an authorized school; student claims their school account and reaches the correct dashboard.
1. Trace Clerk and Supabase provider identities through `AuthIdentity`, `Teacher`, `Student`, role resolution and redirects.
2. Make school creation and teacher identity writes transactional or safely compensating/idempotent; prevent orphan school records and duplicate identities.
3. Ensure student claim verifies school code, registration number, account ownership, uniqueness and replay behavior.
4. Test teacher and student fresh sign-up, returning login, logout, missing role, partial onboarding, invalid code and unauthorized cross-school access.
5. Test mobile and desktop dashboard routes. Preserve existing user data.
**Acceptance:** Two independent schools and their teachers/students cannot access each other's data; new users reach correct dashboards; rerunning onboarding cannot duplicate records.

## Phase 2: question bank and assessments
**Goal:** Reliable question lifecycle from draft through review, approval, publishing and results.
1. Complete HOD same-school, same-department authorization, review queue and immutable decision audit (reviewer, time, reason, question version).
2. Enforce teacher-owned edits independently of HOD approval rights.
3. Verify metadata, fingerprint, duplicate detection, approval eligibility and version consistency.
4. Verify assessment assembly, publishing, timed attempt, grading and controlled result release.
5. Cover concurrent decisions, repeat submissions, cross-school denial and cross-department denial with database integration tests.
**Acceptance:** Approval and rejection are attributable, reversible only through an explicit authorized workflow, and never permit unauthorized edits.

## Phase 3: learning journey
**Goal:** Connect Lesson → Exploration → Practice → Assessment → Mastery → Revision.
1. Inventory existing lesson generator, Study Buddy, Practice Arena, exam engine and student workspace routes.
2. Define durable learner progress events and map them to a stable school/student/subject/topic identity.
3. Expose an actionable next activity after each lesson and practice session.
4. Show assessment feedback only under configured release policy.
5. Add a revision handoff based on demonstrated misconceptions, with Nigerian curriculum examples where relevant.
**Acceptance:** A teacher can assign a topic and a student can traverse the full journey without broken links or leaked answers.

## Phase 4: curriculum and mastery intelligence
**Goal:** Evidence-backed mastery, not invented progress.
1. Inventory curriculum node mapping, question alignments, misconception tracking and adaptive learning paths.
2. Establish provenance and confidence for each topic alignment.
3. Compute mastery from persisted learner events, with clear thresholds, recency and missing-data states.
4. Expose prerequisite gaps and suggested revision without overstating certainty.
5. Test school isolation, empty history, contradictory results and replay/idempotency.
**Acceptance:** Mastery claims trace to actual completed work; the same evidence produces consistent results.

## Phase 5: teacher productivity and intervention
**Goal:** Convert classroom evidence into manageable teacher actions.
1. Audit class, attendance, homework, scores, import, reports and analytics workflows.
2. Provide a unified class snapshot with overdue work and assessment gaps.
3. Add teacher-reviewable intervention suggestions with explanation and source evidence.
4. Ensure student-level access checks and controlled report exports.
5. Add reliability and usability acceptance tests for slow networks and mobile layouts.
**Acceptance:** Teachers can identify a learning gap, assign a follow-up activity and verify its completion.

## Workstream sequencing
- **Now:** Phase 1 acceptance and Phase 2 QB-C5 audit and queue; RC1 build and preview gates.
- **Next:** Phase 3 connected learner flow, then Phase 4 evidence and mastery foundations.
- **After reliable data flow:** Phase 5 class intervention and reporting.
- Workstreams may be developed in parallel on isolated branches; release dependencies must be respected.

## Required evidence for each phase
- Specific source paths and database migration plan
- Test command and successful CI run
- Negative authorization and regression cases
- Screenshots or browser acceptance evidence for user-facing changes
- Rollback plan and explicit release approval

No production deployment is authorized by this roadmap.
