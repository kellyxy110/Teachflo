# Workflow: Curriculum Intelligence Graph (CIG)

## Workflow 1 — Initial Curriculum Seed

Triggered once during platform setup. Populates the global NERDC curriculum graph.

```
Define seed data (JSON/TypeScript)
  — SUBJECT nodes for all Nigerian secondary subjects
  — TOPIC nodes per subject/class/term/week
  — CONCEPT nodes per topic
  — LEARNING_OBJECTIVE nodes per topic
  — EXAM_STANDARD nodes (WAEC, NECO, JAMB subjects)
        ↓
Validate seed data
  — No duplicate (subject + classLevel + term + week + label) combinations
  — All referenced nodeIds exist (edges reference valid nodes)
  — All enum values valid
        ↓
Upsert nodes (idempotent — safe to re-run)
  — Insert SUBJECT nodes first
  — Insert TOPIC nodes second (may reference SUBJECT via PART_OF edges)
  — Insert CONCEPT and LEARNING_OBJECTIVE nodes third
  — Insert EXAM_STANDARD nodes fourth
        ↓
Upsert edges (idempotent)
  — PART_OF edges (Topic → Subject)
  — REQUIRES edges (prerequisite relationships)
  — TEACHES_BEFORE / TEACHES_AFTER edges (sequencing)
  — CROSS_SUBJECT edges
  — ASSESSED_BY edges (Topic → ExamStandard)
        ↓
Validate graph integrity
  — No orphaned nodes (every TOPIC has at least one PART_OF edge)
  — No circular REQUIRES chains (would cause infinite traversal)
  — TEACHES_BEFORE / TEACHES_AFTER are consistent (if A teaches_before B, B teaches_after A)
        ↓
Emit: curriculum.graph.seeded
  — { nodeCount, edgeCount, subjects[] }
```

**Idempotency:** The seed uses upsert operations. Running the seed twice produces the same graph, not duplicates.

**Circular prerequisite detection:** Before committing edges, run a DFS from each new REQUIRES edge to verify no cycle is created. Reject and log any cycle — do not silently skip.

---

## Workflow 2 — Get Topic Context (Primary Query)

Triggered when any consuming capability (Lesson Generator, Quiz Generator, Flashcard Engine) needs full curriculum context for a node.

```
Caller provides nodeId
        ↓
Cache check
  — Key: cig:context:{nodeId}
  — Hit: return cached TopicContext immediately
  — Miss: proceed
        ↓
Fetch primary node (CurriculumNode by id, isActive = true)
  — Not found: throw "Node not found"
        ↓
Parallel fetches (all run concurrently):
  ├── Prerequisites: outgoing REQUIRES edges, depth 2
  ├── Learning objectives: outgoing PART_OF ← from LEARNING_OBJECTIVE nodes
  ├── Related concepts: outgoing PART_OF ← from CONCEPT nodes
  ├── Cross-subject: outgoing CROSS_SUBJECT edges with subject name
  └── Exam standards: node.examStandards array (no join needed)
        ↓
Assemble TopicContext object
        ↓
Write to cache (TTL: 24 hours)
        ↓
Return TopicContext to caller
```

**This is the most performance-critical workflow.** Target: < 100ms at p95 with cache hit, < 500ms without cache.

---

## Workflow 3 — Curriculum Browser (Teacher UI)

Triggered when a teacher browses subjects and topics.

```
Teacher opens Curriculum page
        ↓
Load SUBJECT nodes (no auth required for global nodes)
  — Ordered alphabetically
  — Display with class levels available
        ↓
Teacher selects subject + class level + term
        ↓
Load TOPIC nodes: getTopicsForClass(subject, classLevel, term)
  — Ordered by week then label
  — Display with difficulty, estimatedMinutes, Bloom's levels, exam standards
        ↓
Teacher selects a topic
        ↓
Load topic detail: getTopicContext(nodeId)
  — Display full node info
  — Display prerequisites (with links to navigate to them)
  — Display cross-subject connections
  — Display learning objectives
        ↓
Teacher may:
  A. Generate lesson → passes TopicContext to Lesson Generator
  B. Generate quiz → passes TopicContext to Quiz Generator
  C. View related topics → getRelated(nodeId)
  D. Add school-specific node → addNode(...)
```

---

## Workflow 4 — Add School-Specific Node

Triggered when a school wants to extend the curriculum with custom content.

```
Teacher submits new node (label, type, subject, classLevel, term, etc.)
        ↓
Validate: requireSchool() → get schoolId
Validate: label non-empty, type valid enum, max lengths respected
        ↓
Check for near-duplicates
  — Search existing nodes: same subject + classLevel + term + similar label
  — If match found (>80% label similarity): warn teacher, show existing node
  — Teacher confirms: "Add as new" or "Use existing"
        ↓
Create node with schoolId = authenticated school
        ↓
Optional: teacher adds edges to existing nodes
  — Each edge validated: no self-loops, no duplicates
        ↓
Invalidate cache for affected subject/class/term
        ↓
Emit: curriculum.node.created
Return created node
```

---

## Workflow 5 — Learning Path Query

Triggered when requesting the optimal sequence from one concept to another.

```
Caller provides fromId and toId
        ↓
Validate both nodes exist
        ↓
BFS traversal over REQUIRES and TEACHES_BEFORE edges
  — Start at fromId
  — Explore outgoing REQUIRES and TEACHES_BEFORE edges
  — Track visited nodes (prevent infinite loops)
  — Stop when toId reached or all paths exhausted
        ↓
If path found:
  — Return ordered array of nodes from source to target
If no path found:
  — Return null (caller handles gracefully)
```

---

## Failure Paths

| Failure | Cause | Behaviour | Recovery |
|---|---|---|---|
| Node not found | Invalid or deleted nodeId | Throw "Node not found" | Caller shows error; teacher re-selects |
| Circular dependency in seed | Cycle in REQUIRES edges | Reject entire seed transaction, log cycle | Fix seed data and re-run |
| Cache miss + DB unavailable | Supabase unreachable | Surface DB error; do not serve stale cache | Retry with exponential backoff |
| Duplicate edge | addEdge called twice | Throw "Edge already exists" | Caller ignores or logs |
| Near-duplicate node warning | Similar label exists | Warn, do not block | Teacher decides |

---

## Caching

| Operation | Key | TTL | Invalidation |
|---|---|---|---|
| getTopicsForClass | `cig:topics:{subject}:{classLevel}:{term}` | 24h | On node add/update for that subject/class/term |
| getTopicContext | `cig:context:{nodeId}` | 24h | On node update or adjacent edge change |
| getPrerequisites | `cig:prereqs:{nodeId}:{depth}` | 24h | On REQUIRES edge add/remove touching nodeId |
| searchNodes | `cig:search:{hash(query+filters)}` | 1h | Not actively invalidated (short TTL acceptable) |

**Cache implementation:** In-memory (Next.js `unstable_cache`) for now. Upgrade to Redis when multi-instance deployment requires shared cache.
