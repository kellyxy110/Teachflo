# Implementation Review: Sprint 1 — CIG Schema

**Date:** 2026-06-28
**Sprint:** 1 — Prisma Schema
**Capability:** Curriculum Intelligence Graph (CUR-001)
**Spec Version:** 1.0
**Impl Version:** 0.1 (schema only; service layer pending)

---

## What Was Completed

1. `CurriculumNode` model added to `packages/database/prisma/schema.prisma`
2. `CurriculumEdge` model added to `packages/database/prisma/schema.prisma`
3. Three new enums added: `NodeType`, `EdgeRelation`, `CurriculumDifficulty`
4. All indexes from Data.md specification implemented, plus one additional partial index (`isActive = true`) for traversal performance
5. Migration SQL written in `migration-cig-001.sql` — safe to re-run (IF NOT EXISTS throughout)
6. Self-loop constraint (`CHECK sourceId != targetId`) added at database level — provides a second enforcement layer beyond the application-layer check in the contract
7. `updatedAt` trigger added for `curriculum_nodes` — PostgreSQL handles timestamp updates automatically
8. Schema validates: `pnpm --filter database exec prisma validate` → "The schema is valid 🚀"

---

## Differences from Specification

| Difference | Spec Said | Implementation | Decision |
|---|---|---|---|
| Difficulty enum | `Difficulty?` (reuse existing) | `CurriculumDifficulty?` (new enum: EASY/MEDIUM/HARD) | #CUR-001-006 — existing Difficulty enum has incompatible values |
| ClassLevel values | `JSS1/JSS2/JSS3` (spec prose) | `JS1/JS2/JS3` (existing enum) | #CUR-001-007 — correct enum values; intent unchanged |
| Additional fields | Not in spec | `version Int @default(1)`, `createdBy String?` | #CUR-001-008 — auditability and versioning per implementation principles |
| Self-loop CHECK constraint | Validated at application layer only | Also enforced at DB level | Enhancement — defence in depth; not a contract change |
| Partial index on `isActive` | Not in spec | Added `WHERE isActive = true` | Performance optimisation — most traversal queries filter active nodes |
| `@@map` convention | Not specified | `curriculum_nodes`, `curriculum_edges` | Follows existing schema convention consistently |

All differences are implementation enhancements or corrections. **No contract methods, outputs, or guarantees were changed.**

---

## Performance Observations

- Schema validates in < 1 second — no circular reference issues in Prisma model definition
- Self-referential relation (`outgoing`/`incoming` on same model) is a known Prisma pattern — confirmed working
- GIN index on `keywords` array is critical for `searchNodes` — included in migration SQL
- Partial index on `isActive = true` reduces index size for the most common traversal case by excluding soft-deleted nodes

---

## Risks Discovered

**Risk 1 — Migration must be run manually**
The self-loop `CHECK` constraint and `updatedAt` trigger cannot be expressed in Prisma schema syntax — they are in the migration SQL only. If the migration SQL is not run, these constraints will not exist. The Prisma schema alone is insufficient.

*Mitigation:* The Schema Validation Gate (criterion 6) specifically tests the self-loop constraint. If it doesn't fail as expected, the migration was not fully applied.

**Risk 2 — Existing `CurriculumPlan` model**
The schema already contains a `CurriculumPlan` model (teacher-authored weekly plans). This is conceptually different from the CIG (knowledge graph) and they coexist without conflict. However, future developers may confuse `CurriculumPlan` (a teacher's schedule) with the CIG (the curriculum knowledge graph). Should be documented in the domain Architecture.md.

*Mitigation:* Noted in Decision.md. No code change needed.

---

## Decisions Recorded

- Decision #CUR-001-006 — CurriculumDifficulty enum
- Decision #CUR-001-007 — ClassLevel enum values
- Decision #CUR-001-008 — version and createdBy fields

---

## Registry and Lifecycle Updates

- `CUR-001` Impl Version: `0.1` (schema implemented; service layer pending)
- Lifecycle Stage: remains `Approved` (full implementation not yet complete)
- Schema Validation Gate: criterion 1 passed; criteria 2–7 awaiting manual migration run

---

## Next Sprint

**Sprint 2 — CIG Service Layer**

Files to create:
- `apps/web/lib/curriculum-graph.ts` — all 8 contract methods (getNode, getTopicsForClass, getPrerequisites, getRelated, getTopicContext, findLearningPath, searchNodes, addNode, addEdge)
- `apps/web/app/actions/curriculum.ts` — server action wrappers

Entry criteria: Schema Validation Gate criteria 1–7 must be confirmed before Sprint 2 begins.

**Gate action required:** Run `migration-cig-001.sql` in Supabase SQL Editor and confirm all validation queries pass.
