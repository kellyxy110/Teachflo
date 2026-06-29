# Decision Log: Curriculum Intelligence Graph (CIG)

Append-only. Never delete. Reference global Decision Log (02-Decisions.md #009) for the root graph-first architectural decision.

---

## Decision #CUR-001-001 — Graph Model over Hierarchy

**Date:** 2026-06-28
**Status:** Accepted (derives from global Decision #009)

**Decision:**
CUR-001 implements a knowledge graph (adjacency list: nodes + typed edges) rather than a hierarchical folder tree.

**Rationale:**
See global Decision #009. A topic like Vectors belongs to Mathematics, Physics, and Computer Science simultaneously. A hierarchy cannot represent this. A graph can.

**Impact:**
- Two tables: CurriculumNode + CurriculumEdge
- Application-layer traversal in TypeScript
- All consuming capabilities call CIG contract methods, never query the tables directly

**Alternatives Considered:**
- Hierarchy (single parentId per node) — rejected: cannot represent cross-subject relationships
- Nested set model — rejected: expensive updates, opaque queries
- External graph DB (Neo4j) — deferred: unnecessary infrastructure at current scale

---

## Decision #CUR-001-002 — PostgreSQL Adjacency List, Not a Graph Database

**Date:** 2026-06-28
**Status:** Accepted

**Decision:**
The graph is stored in PostgreSQL (Supabase) as an adjacency list. Graph traversal is implemented in TypeScript at the application layer, not in a dedicated graph database.

**Rationale:**
At launch scale (10,000–20,000 nodes, 50,000–100,000 edges), PostgreSQL with indexed adjacency tables handles traversal well. Adding Neo4j or Amazon Neptune introduces operational complexity, a new billing line, and a new failure point — without a performance justification that exists yet.

**Trade-off Accepted:**
Deep traversal (>5 hops) is slower in PostgreSQL than in a native graph DB. Depth is capped at 5 hops. If median p95 traversal exceeds 500ms at production load, this decision is revisited.

**Migration Path:**
If a graph DB is needed later: export nodes and edges as JSON → import into graph DB → update CIG service layer → all contracts remain unchanged (consumers are unaffected).

---

## Decision #CUR-001-003 — Null schoolId for Global NERDC Curriculum

**Date:** 2026-06-28
**Status:** Accepted

**Decision:**
Nodes representing the NERDC official curriculum have `schoolId = null`. School-specific extensions have `schoolId = [schoolId]`.

**Rationale:**
If every school had its own copy of the full curriculum, we'd store 1,000+ identical copies. Global nodes are shared read-only across all schools. Schools extend the graph but do not fork it.

**Security implication:**
Write operations always require a non-null schoolId. Any attempt to write a node with `schoolId = null` through the API is rejected. Only the seed script (run by platform admin) may create global nodes.

---

## Decision #CUR-001-004 — TopicContext as Primary AI Consumption Interface

**Date:** 2026-06-28
**Status:** Accepted

**Decision:**
The primary interface for AI-consuming capabilities (Lesson Generator, Quiz Generator, etc.) is `getTopicContext(nodeId)`, which returns a pre-assembled `TopicContext` object containing the node, prerequisites, objectives, cross-subject connections, exam standards, Bloom's levels, misconceptions, and formulae.

**Rationale:**
AI capabilities should not perform their own graph traversal — that would couple them to the graph structure. Instead, CIG assembles a clean, structured context package. This means prompt engineering only needs to know the TopicContext shape, not the graph schema. When the graph schema evolves, the AI capabilities remain unchanged.

**Impact:**
`getTopicContext` is the most performance-critical method in the CIG. It is cached aggressively (24-hour TTL).

---

## Decision #CUR-001-005 — Circular Prerequisite Prevention at Write Time

**Date:** 2026-06-28
**Status:** Accepted

**Decision:**
When adding a REQUIRES edge (A requires B), the system performs a DFS from B to confirm A is not reachable — which would create a cycle. If a cycle is detected, the edge is rejected.

**Rationale:**
A circular prerequisite (A requires B, B requires A) would cause infinite loops in `getPrerequisites` and `findLearningPath`. Prevention at write time is cheaper than detection at read time.

**Trade-off:** Every REQUIRES edge write pays a DFS cost. At the graph sizes we'll operate at, this is negligible (< 10ms for a 20,000-node graph).

---

## Decision #CUR-001-006 — CurriculumDifficulty Enum (separate from existing Difficulty)

**Date:** 2026-06-28
**Status:** Accepted — Implementation Decision

**Decision:**
The CIG uses a new enum `CurriculumDifficulty` (EASY / MEDIUM / HARD) rather than the existing `Difficulty` enum in the schema.

**Rationale:**
The existing `Difficulty` enum carries exam-standard values: `BASIC / APPLICATION / WAEC / JAMB / JUPEB`. These describe exam preparation level, not content difficulty. Reusing this enum for curriculum nodes would misrepresent the meaning of the field. A separate `CurriculumDifficulty` enum with EASY / MEDIUM / HARD correctly describes how difficult a concept is to teach and learn.

**Impact:** Data.md updated to reference `CurriculumDifficulty`. No contract change. Spec version unchanged.

---

## Decision #CUR-001-007 — ClassLevel Enum Values (JS1/JS2/JS3, not JSS1/JSS2/JSS3)

**Date:** 2026-06-28
**Status:** Accepted — Implementation Decision

**Decision:**
The `classLevel` field uses the existing `ClassLevel` enum with values `JS1 / JS2 / JS3 / SS1 / SS2 / SS3`.

**Rationale:**
The existing schema defines `ClassLevel` as `JS1/JS2/JS3/SS1/SS2/SS3`. The spec prose used `JSS1/JSS2/JSS3` informally. Intent is identical. Using the existing enum maintains schema consistency.

**Impact:** Data.md updated to reflect actual enum values. No contract change.

---

## Decision #CUR-001-008 — version and createdBy Fields Added for Auditability

**Date:** 2026-06-28
**Status:** Accepted — Implementation Decision

**Decision:**
Two fields are added to `CurriculumNode` beyond the original Data.md spec: `version Int @default(1)` and `createdBy String?`.

**Rationale:**
Implementation principles for Sprint 1 include "design for versioning from day one" and "make every node traceable and auditable." `version` enables cache invalidation and update detection when NERDC revises the curriculum. `createdBy` stores the teacherId (school-specific nodes) or "system" (seed data) for audit purposes. Both are internal implementation details not exposed in the contract.

**Impact:** Data.md updated to include these fields. Contract unchanged. Spec version unchanged.

---
