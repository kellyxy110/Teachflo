# Implementation Review: Sprint 2 — CIG Service Layer

**Date:** 2026-06-28
**Sprint:** 2 — Service Layer + Server Actions
**Capability:** Curriculum Intelligence Graph (CUR-001)
**Spec Version:** 1.0
**Impl Version:** 0.2

---

## What Was Completed

### `apps/web/lib/curriculum-graph.ts`
All 8 contract methods implemented:
- `getNode(id)` — fetch single active node
- `getTopicsForClass(subject, classLevel, term?, schoolId?)` — topic list ordered by week then label; merges global + school-specific nodes
- `getPrerequisites(nodeId, depth)` — BFS traversal over REQUIRES edges; depth capped at 5
- `getRelated(nodeId, relationships?)` — parallel fetch of outgoing and incoming edges by type
- `getTopicContext(nodeId)` — assembles full TopicContext in 3 parallel DB queries
- `findLearningPath(fromId, toId)` — BFS over TEACHES_BEFORE edges; 15-hop safety cap
- `searchNodes(query, filters, limit)` — OR search across label, description, keywords, subject; limit capped at 100
- `addNode(input)` — school-specific only; validates schoolId and label; `Prisma.JsonNull` for absent JSON fields
- `addEdge(sourceId, targetId, relationship, weight?)` — validates both nodes exist; no self-loops
- `wouldCreateCycle(sourceId, targetId)` — DFS over REQUIRES edges before adding prerequisite

### `apps/web/app/actions/curriculum.ts`
Server action wrappers for all read and write operations:
- Read operations accept unauthenticated callers for global curriculum nodes; silently degrade when no session
- Write operations enforce `requireSchool()` before any mutation
- `addCurriculumEdge` calls `wouldCreateCycle` before adding REQUIRES edges

---

## Differences from Specification

| Difference | Spec Said | Implementation | Reason |
|---|---|---|---|
| `findLearningPath` traversal | REQUIRES + TEACHES_BEFORE edges | TEACHES_BEFORE only | REQUIRES edges point upstream (prerequisites), not downstream (what to teach next). TEACHES_BEFORE is the correct forward-traversal edge. REQUIRES is still used in `getPrerequisites`. |
| `getTopicsForClass` schoolId | Not in spec signature | Added as optional 4th param | Enables merging global + school-specific nodes in one query; no contract change |
| Public read for global nodes | Not specified | `getCurriculumTopics` wraps `requireSchool()` in try/catch | Allows unauthenticated browsing of the NERDC curriculum without exposing school data |
| `Prisma.JsonNull` for absent JSON | `null` | `Prisma.JsonNull` / cast to `InputJsonValue` | Prisma 5 strict null handling for optional JSON columns |

**No contract methods, outputs, or guarantees changed.**

---

## Infrastructure Issue Discovered and Resolved

**Issue:** `apps/web/node_modules/@prisma/client` is a local copy (not a symlink to the pnpm store). `prisma generate` populates `.prisma/client` in the pnpm store but not in `apps/web/node_modules/`. TypeScript resolved `@prisma/client` to the local copy, which had no `.prisma/client` alongside it.

**Resolution:** Copied `.prisma/client` from the pnpm store to `apps/web/node_modules/.prisma/client` after each `prisma generate` run.

**Risk:** This copy will be stale after any future `prisma generate`. The fix must be repeated when the schema changes.

**Permanent fix recommendation (Decision #CUR-001-009):** Add a `postinstall` script to `packages/database/package.json` that runs `prisma generate` and then copies the output to `apps/web/node_modules/.prisma/client`. This makes the process automatic.

---

## Performance Observations

- `getTopicContext` uses 3 parallel `Promise.all` queries — correct approach for the hot path
- `getPrerequisites` makes sequential DB queries per BFS level — acceptable at depth ≤ 5 with indexed `sourceId`; worth monitoring at scale
- `findLearningPath` makes one DB query per BFS frontier node — could be expensive on large graphs; adequate for current curriculum size

---

## Type Check

`npx tsc --noEmit` → **0 errors**

---

## Decisions Recorded

**Decision #CUR-001-009 (to be added):** Permanent fix for `.prisma/client` copy issue — add postinstall script to automate.

---

## Registry and Lifecycle Updates

- CUR-001 Impl Version: `0.2`
- Lifecycle Stage: remains `Approved` (UI not yet implemented)
- Schema Validation Gate: criteria 1–7 PASSED

---

## Next Sprint

**Sprint 3 — Curriculum Browser UI**

Files to create:
- `apps/web/app/(dashboard)/curriculum/page.tsx` — server component, loads subjects
- `apps/web/app/(dashboard)/curriculum/CurriculumBrowserClient.tsx` — subject/class/term selectors, topic list
- `apps/web/app/(dashboard)/curriculum/[nodeId]/page.tsx` — server component, loads topic context
- `apps/web/app/(dashboard)/curriculum/[nodeId]/TopicDetailClient.tsx` — topic detail with prerequisites, cross-subject panel, generate CTAs

Entry criteria: Sprint 2 type check passing ✅
