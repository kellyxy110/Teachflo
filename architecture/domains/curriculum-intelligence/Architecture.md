# Architecture: Curriculum Intelligence Graph (CIG)

## Mission
Build and maintain a living, queryable knowledge graph of the Nigerian secondary school curriculum, where every concept, topic, skill, and learning objective is a node, and every educational relationship between them is a typed edge. This graph is the single source of curriculum truth for the entire TeachNexis platform.

## Why a Graph, Not a Hierarchy

A hierarchy (Subject → Class → Term → Week → Topic) can only express one parent-child relationship per node. Education does not work this way.

**Example — Vectors:**
```
Vectors (concept)
├── part_of → Mathematics (JSS3)
├── part_of → Physics (SS1)
├── cross_subject → Engineering Drawing
├── cross_subject → Computer Science (graphics, ML)
├── cross_subject → Navigation / Geography
├── requires → Scalars (prerequisite)
├── requires → Basic Algebra
└── assessed_by → WAEC Mathematics Paper 2
```

A hierarchy can only assign Vectors to one subject. A graph assigns it everywhere it belongs. Every future capability that consumes curriculum context gets the full picture — not an artificially truncated one.

## Node Types

| Type | Description | Examples |
|---|---|---|
| `SUBJECT` | A major subject area | Mathematics, Physics, Biology |
| `TOPIC` | A teachable unit within a subject and class level | "Reflection of Light", "Quadratic Equations" |
| `CONCEPT` | A discrete idea within a topic | "Angle of incidence", "discriminant" |
| `SKILL` | A learnable ability or competency | "Drawing ray diagrams", "Solving simultaneous equations" |
| `LEARNING_OBJECTIVE` | A measurable outcome (mapped to Bloom's level) | "Students will be able to state the laws of reflection" |
| `EXAM_STANDARD` | An external exam reference | "WAEC Physics 2024 Q3", "NECO Mathematics Obj" |

## Relationship Types

| Relationship | Direction | Meaning |
|---|---|---|
| `REQUIRES` | A → B | A cannot be understood without B (prerequisite) |
| `EXTENDS` | A → B | A builds directly on B (same subject, deeper) |
| `PART_OF` | A → B | A is a component of B (containment) |
| `RELATED_TO` | A ↔ B | A and B are conceptually connected (undirected) |
| `ASSESSED_BY` | A → B | Topic A is assessed in exam standard B |
| `VISUALIZED_BY` | A → B | A is best explained using diagram/resource B |
| `PRACTICED_BY` | A → B | A is practiced through activity/worksheet B |
| `APPEARS_IN` | A → B | Concept A appears in curriculum position B |
| `TEACHES_BEFORE` | A → B | A should be taught before B (sequencing) |
| `TEACHES_AFTER` | A → B | A should be taught after B (reverse sequencing) |
| `CROSS_SUBJECT` | A → B | A in one subject connects to B in a different subject |

## Node Properties

Every node carries:

```
id                String      — unique identifier
type              NodeType    — SUBJECT / TOPIC / CONCEPT / SKILL / LEARNING_OBJECTIVE / EXAM_STANDARD
label             String      — human-readable name
description       String?     — detailed description
subject           String?     — subject name (for TOPIC and CONCEPT nodes)
classLevel        ClassLevel? — JSS1–SS3 (for TOPIC nodes)
term              Term?       — FIRST / SECOND / THIRD (for TOPIC nodes)
week              Int?        — curriculum week within the term
difficulty        Difficulty? — EASY / MEDIUM / HARD
estimatedMinutes  Int?        — estimated teaching time
bloomLevels       String[]    — which Bloom's levels this node addresses
examStandards     String[]    — WAEC / NECO / JAMB / BECE tags
keywords          String[]    — searchable terms
misconceptions    String[]    — common student errors for this concept
formulae          Json?       — mathematical formulae (LaTeX strings)
metadata          Json?       — flexible additional properties
schoolId          String?     — null = global NERDC curriculum; non-null = school-specific node
isActive          Boolean     — soft delete
```

## Storage Strategy

**PostgreSQL adjacency list** (via Supabase, Prisma). Two tables:
- `CurriculumNode` — one row per node
- `CurriculumEdge` — one row per directed relationship

**Graph traversal** is implemented at the application layer in TypeScript. For the current scale (thousands of nodes, not millions), this is fully sufficient and avoids adding a separate graph database.

**When to consider a graph database:** If traversal queries for a single teacher request exceed 500ms at median load, or if the graph exceeds 100,000 nodes, evaluate Neo4j or Amazon Neptune. This threshold does not exist today.

**Global vs school-specific nodes:**
- `schoolId = null` → NERDC curriculum node; shared across all schools; read-only for schools
- `schoolId = [id]` → school-specific extension; writable by that school only

## System Position

```
                    CIG (CUR-001)
                         │
        ┌────────────────┼────────────────────┐
        ↓                ↓                    ↓
  Lesson Generator   Quiz Generator     Analytics
  (CUR-003)          (ASS-007)          (ASS-013)
        │                │
        ↓                ↓
   AI Infrastructure (F3)
   — model selection, prompt injection
```

All consuming capabilities call CIG's contract methods. They never query `CurriculumNode` or `CurriculumEdge` directly.

## Traversal Services Exposed

The CIG contract exposes these traversal operations (see `Contract.md` for full specification):

1. **`getNode(id)`** — fetch a single node with all metadata
2. **`getTopicsForClass(subject, classLevel, term?)`** — all TOPIC nodes matching the parameters
3. **`getPrerequisites(nodeId, depth?)`** — all nodes reachable via `REQUIRES` edges (recursive, up to depth)
4. **`getRelated(nodeId, relationshipTypes[])`** — neighbours by relationship type
5. **`getCrossSubjectConnections(nodeId)`** — all `CROSS_SUBJECT` edges from this node
6. **`getTopicContext(nodeId)`** — full context package for AI consumption (node + prerequisites + objectives + exam standards + related concepts)
7. **`findLearningPath(fromId, toId)`** — shortest path through prerequisite graph
8. **`searchNodes(query, filters)`** — keyword and metadata search across the graph

## Design Rationale

**Adjacency list over nested set:** Nested sets are fast for reads but expensive to update. The curriculum graph will be updated periodically (new exam standards, new cross-subject discoveries). Adjacency list is the right trade-off.

**Application-layer traversal over recursive CTEs:** PostgreSQL recursive CTEs work but become opaque and hard to maintain. TypeScript traversal is readable, testable, and composable. For the graph sizes we'll encounter at launch, performance is not a concern.

**Null schoolId for global content:** Rather than duplicating the NERDC curriculum per school, all schools share global nodes. Schools can add school-specific nodes but cannot modify global ones. This keeps the seed data consistent and reduces storage.

## Future Expansion

- **Semantic similarity** (Zvec/embeddings): each node gains a vector embedding; enables "find conceptually similar topics across subjects" without explicit `RELATED_TO` edges
- **Student progress overlay**: student mastery data attached to nodes enables adaptive learning paths through the graph
- **Recommendation engine**: "You just taught X; here's what students typically need next" — graph traversal over `TEACHES_AFTER` edges weighted by student performance
- **AI agent context injection**: agents receive subgraph context (node + N-hop neighbourhood) as structured input, eliminating hallucination of curriculum content
