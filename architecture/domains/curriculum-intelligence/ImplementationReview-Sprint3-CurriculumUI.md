# Implementation Review: Sprint 3 — Curriculum Browser UI

**Date:** 2026-06-28
**Sprint:** 3 — Curriculum Browser UI
**Capability:** Curriculum Intelligence Graph (CUR-001)
**Spec Version:** 1.0
**Impl Version:** 0.3

---

## Files Created

### `apps/web/app/(dashboard)/curriculum/page.tsx`
Server component. Loads all SUBJECT nodes via `searchCurriculumNodes("", { type: "SUBJECT" }, 100)` and passes labels to `CurriculumBrowserClient`. Marked `force-dynamic` to prevent stale subject list.

### `apps/web/app/(dashboard)/curriculum/CurriculumBrowserClient.tsx`
Client component with:
- Subject filter — pill buttons; auto-loads on click
- Class Level segmented control — JS1–SS3 displayed as JSS1–SSS3 per Nigerian convention
- Term segmented control — First / Second / Third
- "Browse Topics" CTA (hidden after first load; filters trigger auto-reload)
- Topic card grid — week badge, difficulty badge (colour-coded), time estimate, exam standard tags (WAEC/NECO/JAMB), Bloom's levels
- Loading skeleton (6 cards, `animate-pulse`)
- Empty state, error state with retry, pre-load prompt state
- `useTransition` for non-blocking filter interactions

### `apps/web/app/(dashboard)/curriculum/[nodeId]/page.tsx`
Server component. Loads `TopicContext` via `getCurriculumTopicContext(params.nodeId)`. Calls `notFound()` if node missing or errored.

### `apps/web/app/(dashboard)/curriculum/[nodeId]/TopicDetailClient.tsx`
Client component with:
- Back navigation (`router.back()`)
- Topic header — subject/class/term/week meta, title, description, difficulty badge
- Bloom's taxonomy badges (colour-coded per level)
- Exam standard badges (WAEC/NECO/JAMB)
- Generate AI CTAs — Lesson Plan / Quiz / Flashcards (wired to future AI actions)
- Learning objectives list
- Key formulae panel (key/value, monospace formula display)
- Common misconceptions panel (amber warning style)
- Prerequisites — clickable NodeChip links
- Related concepts grid — clickable NodeChip links
- Cross-subject connections — subject tag + topic label + link

---

## Differences from Specification

| Difference | Spec Said | Implementation | Reason |
|---|---|---|---|
| Generate CTAs are non-functional | CTAs should trigger AI generation | No-op `onClick` | AI model routing (AIO-001) not yet implemented; wiring deferred to Sprint when Lesson Generator (CUR-003) is built |
| `searchCurriculumNodes` empty-query guard | Guard threw on empty string | Guard changed to check `typeof query !== "string"` | Empty string is valid: "return all matching filter" semantics |
| Class level display label | Not specified in UI spec | `JS1` → `JSS1` in display, enum value unchanged | Nigerian convention uses "JSS" not "JS" in common speech |

---

## Type Check

`npx tsc --noEmit` → **0 errors** ✅

---

## Registry and Lifecycle Updates

- CUR-001 Impl Version: `0.3`
- Lifecycle Stage: moves to **Implementation** (all three sprints complete)
- Next gate: Sprint 4 — Seed Data

---

## Next Sprint

**Sprint 4 — Seed Data**

Files to create:
- `packages/database/prisma/seed-cig.ts` — Nigerian secondary curriculum seed data
  - Subjects: Mathematics, Physics, Chemistry, Biology, English, Economics, Government, Literature
  - Nodes: SUBJECTs + TOPICs + CONCEPTs + LEARNING_OBJECTIVEs per class/term/week
  - Edges: PART_OF (topic→subject), TEACHES_BEFORE (sequential topics), REQUIRES (prerequisites), CROSS_SUBJECT
  - Exam standards: WAEC/NECO/JAMB mapped to relevant topics
- Validation queries to confirm node + edge counts

Entry criteria: Sprint 3 type check passing ✅

Blocked criteria now unblocked: Schema Validation Gate #8 (seed integrity), #9 (educational integrity), #10 (performance at launch scale)
