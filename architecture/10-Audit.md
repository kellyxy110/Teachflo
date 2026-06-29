# TeachNexis — Architecture & Capability Audit

**Date:** 2026-06-28
**Auditor:** TeachNexis AOS Review
**Scope:** All capabilities shipped prior to Phase 3 (AOS establishment)

This audit assesses every existing capability across 10 dimensions and 7 compliance questions, then assigns a classification and improvement action.

---

## Scoring Guide

**Dimensions (1–5):**
- 5 — Excellent, no action needed
- 4 — Good, minor improvements possible
- 3 — Adequate, specific gaps identified
- 2 — Weak, significant improvement needed
- 1 — Poor, fundamental issues

**Compliance Questions:** Pass / Partial / Fail

**Classifications:** Keep as-is | Upgrade | Refactor | Merge | Replace | Deprecate

---

## Capability 1 — Authentication & Session Management

**Domain:** Platform Infrastructure (Clerk v6)
**Description:** Clerk-based authentication, `clerkMiddleware()` in `proxy.ts`, `requireSchool()` server-side auth helper, `PUBLIC_PATHS` routing.

| Dimension | Score | Notes |
|---|---|---|
| Business Value | ⭐⭐⭐⭐⭐ | Foundational — all features depend on it |
| Code Quality | ⭐⭐⭐⭐ | Clean helper pattern via `requireSchool()` |
| UI/UX Quality | ⭐⭐⭐⭐ | Login page upgraded with narrative panel |
| Performance | ⭐⭐⭐⭐⭐ | Edge middleware, no latency issues |
| Security | ⭐⭐⭐⭐⭐ | Clerk handles token management; schoolId isolation enforced |
| Test Coverage | ⭐ | No automated tests |
| Contract Compliance | ⭐⭐⭐ | Implied contract exists; not yet formalised |
| AI Readiness | ⭐⭐⭐⭐ | `requireSchool()` callable from any server action |
| Orchestration Readiness | ⭐⭐⭐ | No events produced; needs contract declaration |
| Scalability | ⭐⭐⭐⭐⭐ | Clerk handles scaling |

**Compliance Questions:**
| Question | Result |
|---|---|
| Satisfies intended responsibility? | Pass |
| Exposes a clear contract? | Partial — implied but not documented |
| Can another capability depend on it safely? | Pass |
| Is it reusable? | Pass — used by every server action |
| Is it independently testable? | Partial — requires Clerk test environment |
| Is it AI-ready? | Pass |
| Is it orchestration-ready? | Partial — no event surface |

**Classification: Upgrade**
**Action:** Formalise contract in `domains/security/Contract.md`. Add event `auth.session.established`. No code changes required.

---

## Capability 2 — Mobile-First Layout System

**Domain:** Platform Infrastructure
**Description:** `MobileNavContext`, `BottomNav` (5 tabs), collapsible `Sidebar` with overlay, mobile `Header` with hamburger, dashboard layout with safe-area insets.

| Dimension | Score | Notes |
|---|---|---|
| Business Value | ⭐⭐⭐⭐⭐ | Critical for teachers on mobile |
| Code Quality | ⭐⭐⭐⭐ | Clean context pattern, good separation |
| UI/UX Quality | ⭐⭐⭐⭐ | Solid; minor polish opportunities |
| Performance | ⭐⭐⭐⭐ | CSS transitions, no JS animation overhead |
| Security | ⭐⭐⭐⭐⭐ | No security surface |
| Test Coverage | ⭐ | No automated tests |
| Contract Compliance | ⭐⭐ | Layout contracts not defined |
| AI Readiness | ⭐⭐⭐ | Not directly AI-facing |
| Orchestration Readiness | ⭐⭐ | No event surface (not required for layout) |
| Scalability | ⭐⭐⭐⭐⭐ | CSS-based, scales freely |

**Compliance Questions:**
| Question | Result |
|---|---|
| Satisfies intended responsibility? | Pass |
| Exposes a clear contract? | Fail — layout API is implicit |
| Can another capability depend on it safely? | Partial — no documented layout contract |
| Is it reusable? | Pass — used across all dashboard pages |
| Is it independently testable? | Partial — UI testing possible but not set up |
| Is it AI-ready? | Fail — not applicable |
| Is it orchestration-ready? | Fail — not applicable |

**Classification: Upgrade**
**Action:** Document layout system in `09-UIUX.md`. Define the layout contract (slot names, responsive breakpoints, safe area handling). No code changes required — layout quality is good.

---

## Capability 3 — Digital Attendance Register

**Domain:** Classroom Management
**Description:** Class selector, date navigator, 4-status toggles (Present/Late/Absent/Excused), quick actions, summary bar, save, stats tab with absenteeism detection. Server actions with full input validation, IDOR prevention, bulk student validation.

| Dimension | Score | Notes |
|---|---|---|
| Business Value | ⭐⭐⭐⭐⭐ | Daily use; immediate teacher value |
| Code Quality | ⭐⭐⭐⭐ | Well-structured server actions, validation thorough |
| UI/UX Quality | ⭐⭐⭐⭐ | Clean; mobile-friendly |
| Performance | ⭐⭐⭐⭐ | Indexed queries; upsert transaction |
| Security | ⭐⭐⭐⭐⭐ | IDOR fixed; date/status/note validation; student bulk validation |
| Test Coverage | ⭐ | No automated tests |
| Contract Compliance | ⭐⭐ | No formal contract declared |
| AI Readiness | ⭐⭐ | No AI integration yet; data exists for future analytics |
| Orchestration Readiness | ⭐⭐ | No events produced; `attendance.saved` event not yet emitted |
| Scalability | ⭐⭐⭐⭐ | Transaction-based; Supabase handles load |

**Compliance Questions:**
| Question | Result |
|---|---|
| Satisfies intended responsibility? | Pass |
| Exposes a clear contract? | Fail — no contract file |
| Can another capability depend on it safely? | Partial — data exists but no event surface |
| Is it reusable? | Pass — server actions are clean |
| Is it independently testable? | Partial — actions testable; UI not automated |
| Is it AI-ready? | Partial — data ready, no AI hooks |
| Is it orchestration-ready? | Fail — no events emitted |

**Classification: Upgrade**
**Action:** Write `domains/classroom-management/Contract.md`. Add `attendance.saved` and `student.flagged.absent` events. No code logic changes required — quality is high.

---

## Capability 4 — Student Digital Health Records

**Domain:** Classroom Management
**Description:** Health info form (blood group, genotype, allergies, conditions, medications, emergency contacts), clinic visit log with history (capped at 200), student list with badge status. Full IDOR prevention, schoolId scoping, array cap.

| Dimension | Score | Notes |
|---|---|---|
| Business Value | ⭐⭐⭐⭐ | High value; not yet daily use |
| Code Quality | ⭐⭐⭐⭐ | Clean upsert pattern, TagInput component well-built |
| UI/UX Quality | ⭐⭐⭐⭐ | Two-tab layout works well |
| Performance | ⭐⭐⭐⭐ | JSON column for visits; efficient |
| Security | ⭐⭐⭐⭐⭐ | IDOR fixed; visit array capped; schoolId scoped |
| Test Coverage | ⭐ | No automated tests |
| Contract Compliance | ⭐⭐ | No formal contract |
| AI Readiness | ⭐⭐ | Data available; no AI integration planned yet |
| Orchestration Readiness | ⭐⭐ | No events produced |
| Scalability | ⭐⭐⭐⭐ | JSON column approach has limits at very high visit volume |

**Compliance Questions:**
| Question | Result |
|---|---|
| Satisfies intended responsibility? | Pass |
| Exposes a clear contract? | Fail |
| Can another capability depend on it safely? | Partial |
| Is it reusable? | Pass |
| Is it independently testable? | Partial |
| Is it AI-ready? | Partial |
| Is it orchestration-ready? | Fail |

**Classification: Upgrade**
**Action:** Formalise contract. Add `health.record.updated` event. Long-term: consider migrating `clinicVisits` from JSON column to a relational `ClinicVisit` table when volume warrants it (log in Decisions.md as a future consideration).

---

## Capability 5 — Examination & Question Bank

**Domain:** Assessment & Learning Intelligence
**Description:** Manual question builder with KaTeX editor (18 LaTeX shortcuts, mixed preview), Excel bulk import (SheetJS, 200-question limit), exam export to Excel, CBT question bank with full type support (MCQ, Essay, Structured, etc.). Exam ownership validation, schoolId scoping.

| Dimension | Score | Notes |
|---|---|---|
| Business Value | ⭐⭐⭐⭐⭐ | Core feature; teachers use this weekly |
| Code Quality | ⭐⭐⭐⭐ | KaTeX preview well-architected (segment-based, XSS-safe) |
| UI/UX Quality | ⭐⭐⭐⭐ | LaTeX toolbar functional; symbol palette is limited (18 shortcuts) |
| Performance | ⭐⭐⭐⭐ | Transaction-based bulk import; efficient |
| Security | ⭐⭐⭐⭐⭐ | XSS prevention; ownership validation; import cap |
| Test Coverage | ⭐ | No automated tests |
| Contract Compliance | ⭐⭐ | No formal contract |
| AI Readiness | ⭐⭐⭐ | Structure supports AI question generation; no integration yet |
| Orchestration Readiness | ⭐⭐ | No events produced |
| Scalability | ⭐⭐⭐⭐ | Question bank scales well; 200-cap on imports is a safety limit |

**Compliance Questions:**
| Question | Result |
|---|---|
| Satisfies intended responsibility? | Pass |
| Exposes a clear contract? | Fail |
| Can another capability depend on it safely? | Partial |
| Is it reusable? | Pass |
| Is it independently testable? | Partial |
| Is it AI-ready? | Partial — structure ready, integration missing |
| Is it orchestration-ready? | Fail |

**Classification: Upgrade**
**Action:** Formalise contract. Add `exam.questions.saved` event. Upgrade symbol palette to 1,500+ symbols (Phase 6). Add AI question generation hook in Phase 5.

---

## Capability 6 — CA Report Cards

**Domain:** Assessment & Learning Intelligence
**Description:** Class/term/session selectors, student rows with full subject score table (CA1+CA2+Exam=Total), ordinal position ranking, per-student and bulk Excel export. Class ownership validated against schoolId, term enum validated, session length checked.

| Dimension | Score | Notes |
|---|---|---|
| Business Value | ⭐⭐⭐⭐⭐ | Term-end; every school needs this |
| Code Quality | ⭐⭐⭐⭐ | Clean ranking algorithm; validated inputs |
| UI/UX Quality | ⭐⭐⭐⭐ | Expandable rows work well; could be richer |
| Performance | ⭐⭐⭐⭐ | Single query with nested scores; efficient |
| Security | ⭐⭐⭐⭐⭐ | IDOR fixed; classId + schoolId validated; term/session validated |
| Test Coverage | ⭐ | No automated tests |
| Contract Compliance | ⭐⭐ | No formal contract |
| AI Readiness | ⭐⭐ | Data available; AI performance commentary not yet built |
| Orchestration Readiness | ⭐⭐ | No events; could emit `report.generated` |
| Scalability | ⭐⭐⭐⭐ | Handles full class of 60+ students efficiently |

**Compliance Questions:**
| Question | Result |
|---|---|
| Satisfies intended responsibility? | Pass |
| Exposes a clear contract? | Fail |
| Can another capability depend on it safely? | Partial |
| Is it reusable? | Pass |
| Is it independently testable? | Partial |
| Is it AI-ready? | Partial |
| Is it orchestration-ready? | Fail |

**Classification: Upgrade**
**Action:** Formalise contract. Add `report.generated` event. Future: AI-generated teacher comment per student based on score profile.

---

## Audit Summary

| Capability | Classification | Primary Gap | Priority |
|---|---|---|---|
| Authentication | Upgrade | Contract not formalised | P2 |
| Mobile Layout | Upgrade | UI/UX contract not documented | P3 |
| Attendance Register | Upgrade | Contract + events missing | P1 |
| Health Records | Upgrade | Contract + events missing | P1 |
| Examination System | Upgrade | Contract + events + AI hooks | P1 |
| Report Cards | Upgrade | Contract + events missing | P1 |

**Key Finding:** Every existing capability is classified as **Upgrade**, not Replace or Refactor. The implementation quality is consistently good. The primary gap across all capabilities is the same: no formal Architectural Contracts and no event surface for orchestration.

This means the upgrade path for all Phase 1 and 2 capabilities is:
1. Write the formal `Contract.md` for each domain
2. Add event emission to the relevant server actions
3. No business logic changes required

**No existing feature needs to be rebuilt.**

---

## Next Actions from Audit

1. Write `domains/classroom-management/Contract.md` — covers Attendance + Health Records
2. Write `domains/assessment-learning/Contract.md` — covers Exam System + Report Cards
3. Write `domains/security/Contract.md` — covers Authentication + Data Isolation
4. Add event emission stubs to server actions (non-breaking; events are fire-and-forget initially)
5. Log these as Decision #009 in `02-Decisions.md`
