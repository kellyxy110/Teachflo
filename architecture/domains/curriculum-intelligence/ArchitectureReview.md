# Architecture Review: Curriculum Intelligence Graph (CIG)

**Date:** 2026-06-28
**Reviewer:** TeachNexis AOS
**Capability ID:** CUR-001
**Spec Version:** 1.0

---

## Review Checklist

| Item | Status | Notes |
|---|---|---|
| Contract is complete (all fields populated) | ✅ PASS | 8 methods fully specified with inputs, outputs, events, guarantees, failure modes |
| No circular dependencies | ✅ PASS | CIG depends only on PLT-001/002/005 (platform layer); no application domain dependencies |
| Events produced and consumed are declared | ✅ PASS | 4 events produced; 0 consumed at launch; future consumption noted |
| Failure behaviour defined for all scenarios | ✅ PASS | 7 failure scenarios documented in Contract.md |
| Data schema consistent with platform standards | ✅ PASS | cuid PKs, schoolId isolation, timestamps, cascading deletes — all consistent |
| UI design consistent with UIUX standards | ✅ PASS | Mobile-first, design tokens, empty/loading/error states, accessibility checklist |
| Prompt follows AI-Models standards | ✅ N/A | CIG is a data layer; no AI prompt |
| Security requirements met | ✅ PASS | Global node write protection; schoolId isolation; requireSchool() on all writes |
| Testing criteria defined | ✅ PASS | 7 test categories including structural + educational integrity |
| Registry entry updated | ✅ PASS | CUR-001 updated to Spec 1.0 |

---

## Specification Completeness

| File | Status |
|---|---|
| Capability.md | ✅ Complete |
| Architecture.md | ✅ Complete |
| Contract.md | ✅ Complete |
| Workflow.md | ✅ Complete — 5 workflows |
| Data.md | ✅ Complete — Prisma schema + migration SQL |
| Decision.md | ✅ Complete — 5 decisions |
| Lifecycle.md | ✅ Complete |
| UI.md | ✅ Complete |
| Testing.md | ✅ Complete — structural + educational integrity tests |
| Examples.md | ✅ Complete — 6 representative examples |

**All 10 specification files: COMPLETE.**

---

## Architectural Concerns Raised

**Concern 1 — Cache implementation**
`Workflow.md` specifies `unstable_cache` (Next.js in-memory). This is noted as a temporary solution. When multi-instance deployment is required, upgrade to Redis. This is logged in `Decision.md` as a future consideration, not a blocker.

**Resolution:** Acceptable. Cache strategy is an implementation detail inside the CIG contract. Consumers are unaffected by this change when it occurs. ✅

**Concern 2 — Seed data scope**
The specification assumes full NERDC curriculum seed data is available. This data must be authored before the seed script can run.

**Resolution:** The seed data authoring is a pre-implementation task tracked in `08-Roadmap.md`. It does not block the schema or service layer implementation. ✅

**Concern 3 — Graph traversal performance**
Application-layer TypeScript traversal is correct for current scale. The 5-hop depth cap is an important protection.

**Resolution:** Depth cap is enforced in Contract.md and Workflow.md. Performance targets are defined in Testing.md. Acceptable. ✅

---

## Issues Found

**None.** No blocking issues identified.

---

## Review Outcome

**APPROVED**

The Curriculum Intelligence Graph (CIG) specification is complete, internally consistent, architecturally sound, and aligned with all TeachNexis AOS standards.

CUR-001 lifecycle advances from **Specification → Approved**.

The CIG specification is now **frozen**. Changes to any contract method, event, data schema, or traversal guarantee require:
1. A new entry in `Decision.md`
2. A spec version increment
3. Notification to all consuming capabilities (currently none in Production; this rule applies once consumers are implemented)

---

## Post-Approval: Implementation Order

1. Add `CurriculumNode`, `CurriculumEdge`, `NodeType`, `EdgeRelation` to Prisma schema
2. Run migration SQL in Supabase SQL Editor
3. Implement CIG service layer (`packages/database/src/curriculum-graph.ts` or `apps/web/lib/curriculum-graph.ts`) — all 8 contract methods
4. Write seed data (`scripts/curriculum-seed.ts`) — Nigerian secondary curriculum
5. Write seed validation script (structural + educational integrity tests)
6. Run seed on development database; validate
7. Implement server actions (`apps/web/app/actions/curriculum.ts`) — thin wrappers over service layer
8. Implement curriculum browser UI (`apps/web/app/(dashboard)/curriculum/`)
9. Integration test: verify `getTopicContext` returns correct output for 5 representative topics
10. Update Registry: CUR-001 → Implementation
