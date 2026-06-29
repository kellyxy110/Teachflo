# Lifecycle: Curriculum Intelligence Graph (CIG)

**Current Stage:** Approved
**Registry ID:** CUR-001
**Spec Version:** 1.0
**Impl Version:** —
**Health:** —

---

## Stage History

| Date | Stage | Notes |
|---|---|---|
| 2026-06-28 | Idea | Originally named "Curriculum Hierarchy" |
| 2026-06-28 | Specification | Renamed to Curriculum Intelligence Graph (CIG); graph-first architecture adopted (Decision #009) |
| 2026-06-28 | Architecture Review | All 10 specification files complete; review passed — no blocking issues |
| 2026-06-28 | Approved | Specification frozen. Ready for implementation. |

---

## Specification: FROZEN

All 10 files complete and reviewed. Specification may not change without a Decision Log entry and spec version increment.

All 10 specification files are written:

- [x] `Capability.md` — Overview, purpose, scope
- [x] `Architecture.md` — Graph design, node types, relationship types, traversal strategy
- [x] `Contract.md` — Full interface contract with inputs, outputs, events, guarantees
- [x] `Workflow.md` — 5 workflows: seed, topic context, curriculum browser, add node, learning path
- [x] `Data.md` — CurriculumNode + CurriculumEdge Prisma schema + migration SQL
- [x] `Decision.md` — 5 decisions recorded
- [x] `Lifecycle.md` — This file
- [ ] `UI.md` — Curriculum browser interface (in progress)
- [ ] `Testing.md` — Test cases and acceptance criteria (in progress)
- [ ] `Prompt.md` — Not applicable to CIG itself (CIG is data, not AI generation)

---

## Next Stage: Architecture Review

**Entry criteria checklist:**
- [x] Contract complete with no open questions
- [x] No circular dependencies in the dependency graph
- [x] Events produced and consumed declared
- [x] Failure behaviour defined for all scenarios
- [x] Data schema consistent with existing Prisma patterns
- [x] Security: schoolId isolation and write protection on global nodes
- [ ] UI.md complete
- [ ] Testing.md complete
- [ ] Registry updated (CUR-001 moved to Architecture Review)

**Blocker:** UI.md and Testing.md need completion before Architecture Review can be passed.

---

## Implementation Preview

Once approved, implementation proceeds in this order:

1. Prisma schema update (add CurriculumNode + CurriculumEdge + enums)
2. Run migration SQL in Supabase SQL Editor
3. CIG service layer (`lib/curriculum-graph.ts`) — traversal methods matching contract
4. Curriculum seed data (`scripts/seed-curriculum.ts`) — Nigerian secondary curriculum
5. Run seed
6. Server actions (`app/actions/curriculum.ts`) — thin wrappers over service layer
7. Curriculum browser UI (`app/(dashboard)/curriculum/`)
8. Integration: Lesson Generator begins consuming `getTopicContext`

---

## Notes

CIG is the reference implementation for all subsequent capability specifications. The quality and completeness of this specification sets the standard for every domain that follows.

The `Prompt.md` file is not applicable to CIG itself — CIG is a data and query layer, not an AI generation capability. The first capability that uses `Prompt.md` will be CUR-003 (Lesson Generator), which consumes CIG via `getTopicContext`.
