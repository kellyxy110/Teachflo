# Capability: Curriculum Intelligence Graph (CIG)

**ID:** CUR-001
**Domain:** Curriculum & Content Intelligence
**Layer:** Foundation
**Spec Version:** 1.0
**Impl Version:** —
**Lifecycle Stage:** Specification
**Health:** —
**Owner:** —

## Purpose
Model the complete Nigerian secondary school curriculum as a living knowledge graph of typed nodes and typed relationships, providing every other TeachNexis capability with structured, queryable, relationship-aware educational intelligence.

## Scope

**Owns:**
- The canonical graph of curriculum knowledge (nodes + edges)
- Subject, topic, concept, skill, and learning objective definitions
- Prerequisite, cross-subject, and sequencing relationships between nodes
- NERDC curriculum alignment, Bloom's Taxonomy mapping, WAEC/NECO/JAMB exam standard tagging
- Graph traversal services (get prerequisites, get related topics, find learning path)
- The global curriculum seed data (all Nigerian secondary subjects JSS1–SS3)
- School-specific graph extensions (custom nodes a school adds to the base graph)

**Does NOT own:**
- AI-generated lesson content (that is the Lesson Generator capability consuming CIG)
- Assessment questions (Assessment & Learning Intelligence consumes CIG nodes)
- Student progress data (Learning Analytics consumes CIG structure)
- File storage for resources (Storage infrastructure)

## Key Outputs
1. **Node** — a fully described curriculum concept with metadata, Bloom's levels, exam standards, keywords, prerequisites
2. **Edge** — a typed relationship between two nodes (requires, extends, part_of, cross_subject, etc.)
3. **Graph query results** — traversal responses: prerequisites of a topic, topics in a subject+class+term, related cross-subject topics, learning path between two nodes
4. **Topic context package** — everything a consuming capability (lesson generator, quiz generator) needs to know about a node before making an AI call

## Why This Capability Exists
All TeachNexis AI capabilities need to know what they're teaching before they generate anything. Without CIG, every capability independently stores its own incomplete view of the curriculum — leading to duplication, inconsistency, and capabilities that cannot compose. With CIG, one graph serves all: lesson generation, flashcard creation, quiz building, analytics, recommendations, and future AI agents all traverse the same intelligence layer. Adding a new curriculum concept extends the graph once; every capability benefits automatically.

## Dependencies (summary)
- Requires: PLT-001 (Auth), PLT-002 (Data Isolation), PLT-005 (Database)
- Required by: CUR-002 (Knowledge Package), CUR-003 (Lesson Generator), ASS-007 (AI Question Generation), ASS-008 (Flashcard Engine), AIO-001 (Model Router context injection), ASS-013 (Learning Analytics)

## Related Specification Files
- `Architecture.md` — Graph design, node types, relationship types, traversal strategy
- `Contract.md` — Formal interface contract
- `Workflow.md` — Graph construction, traversal, and seed workflows
- `Data.md` — Prisma schema for CurriculumNode and CurriculumEdge
- `UI.md` — Curriculum browser interface for teachers
- `Testing.md` — Graph integrity tests, traversal tests, seed validation
- `Decision.md` — Decisions made during CIG specification
- `Lifecycle.md` — Stage history and milestones
