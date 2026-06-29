# Testing: Curriculum Intelligence Graph (CIG)

## Acceptance Criteria

The CIG implementation is considered complete when ALL of the following pass:

- [ ] All graph structural integrity tests pass (zero violations)
- [ ] All educational integrity tests pass (zero violations)
- [ ] All contract tests pass (inputs, outputs, failure modes)
- [ ] All security tests pass (tenant isolation, write protection)
- [ ] All traversal tests pass (correct results, depth cap, performance)
- [ ] Seed script runs idempotently (second run produces identical graph)
- [ ] `getTopicContext` returns in < 100ms on cache hit, < 500ms on cache miss
- [ ] Curriculum browser loads topic list in < 300ms
- [ ] No orphaned nodes in the seeded graph
- [ ] No circular prerequisite chains in the seeded graph

---

## 1. Graph Structural Integrity Tests

These tests verify the graph data is structurally sound.

| Test | Assertion |
|---|---|
| No self-loops | No edge where sourceId = targetId |
| No duplicate edges | No two edges with identical (sourceId, targetId, relationship) |
| No dangling edges | Every sourceId and targetId in CurriculumEdge references an existing CurriculumNode |
| No orphaned global nodes | Every TOPIC node (schoolId = null) has at least one PART_OF edge to a SUBJECT node |
| No circular REQUIRES chains | DFS from any node via REQUIRES edges never revisits a node |
| TEACHES_BEFORE / TEACHES_AFTER symmetry | If edge (A TEACHES_BEFORE B) exists, edge (B TEACHES_AFTER A) must also exist |
| Valid enum values | Every `type` in CurriculumNode is a valid NodeType; every `relationship` in CurriculumEdge is a valid EdgeRelation |
| Active nodes only in traversal | getTopicsForClass and traversal methods never return nodes where isActive = false |
| Seed idempotency | Running seed twice produces identical node/edge counts; no duplicates created |

---

## 2. Educational Integrity Tests

These tests verify the graph is not only structurally valid but educationally sound.

| Test | Assertion |
|---|---|
| Every TOPIC has at least one LEARNING_OBJECTIVE | No TOPIC node exists without at least one outgoing PART_OF edge to a LEARNING_OBJECTIVE node |
| Every LEARNING_OBJECTIVE maps to Bloom's Taxonomy | Every LEARNING_OBJECTIVE node has `bloomLevels` array with at least one entry |
| Every ASSESSED_BY edge links to an EXAM_STANDARD node | No ASSESSED_BY edge points to a non-EXAM_STANDARD node |
| Every non-foundational TOPIC has at least one prerequisite | TOPIC nodes marked MEDIUM or HARD difficulty have at least one incoming or outgoing REQUIRES edge |
| No foundational topic marked as requiring prerequisites | TOPIC nodes in Week 1 of JSS1 (foundational position) should have no REQUIRES edges pointing to other TOPICs in the same subject |
| Every node belongs to an approved curriculum | Every global node (schoolId = null) references a subject that exists in the approved NERDC subject list |
| Bloom's Taxonomy coverage per topic | Each TOPIC's learning objectives collectively cover at least two distinct Bloom's levels |
| Exam standard alignment | Every TOPIC node in a WAEC-examined subject has at least one ASSESSED_BY edge to a WAEC EXAM_STANDARD node |
| Cross-subject edges are reciprocal | If (A CROSS_SUBJECT B) exists, (B CROSS_SUBJECT A) must also exist |
| Learning objective clarity | Every LEARNING_OBJECTIVE node label begins with an action verb (Bloom's verb list) |
| No week gaps within a term | For any (subject, classLevel, term), the week numbers are consecutive with no gaps |

---

## 3. Contract Tests

### Input Validation

| Test | Input | Expected |
|---|---|---|
| getNode — invalid id | `id: "not-a-real-id"` | Returns null |
| getTopicsForClass — invalid classLevel | `classLevel: "INVALID"` | Throws validation error |
| getPrerequisites — depth > 5 | `depth: 10` | Silently capped at 5; no error |
| addEdge — self-loop | `sourceId === targetId` | Throws "Self-referential edges are not permitted" |
| addEdge — duplicate | Same (source, target, relationship) twice | Throws "Edge already exists" |
| addNode — null schoolId | `schoolId: null` via API | Throws "Cannot modify global curriculum nodes" |
| searchNodes — empty query | `query: ""` | Throws validation error |
| searchNodes — query > 200 chars | Long string | Throws validation error |

### Output Guarantees

| Test | Operation | Assertion |
|---|---|---|
| getTopicContext never returns null arrays | Any valid nodeId | All arrays (prerequisites, objectives, etc.) are arrays, never null |
| getTopicsForClass ordering | Standard query | Results ordered by week ascending, then label ascending |
| findLearningPath — no path exists | Unconnected nodes | Returns null, not empty array, not error |
| searchNodes cap | `limit: 150` | Returns at most 100 results |
| addNode returns full node | School-specific add | Returns complete CurriculumNode with generated id and timestamps |

---

## 4. Security Tests

| Test | Scenario | Expected |
|---|---|---|
| School A cannot read School B's nodes | Query with schoolId A, node belongs to B | Node not returned |
| School A cannot write to global nodes | addNode with schoolId = null | Throws "Cannot modify global curriculum nodes" |
| School A cannot add edge from global to school B node | addEdge across schools | Throws auth/ownership error |
| Unauthenticated write attempt | addNode without valid session | requireSchool() throws; 401 response |
| Unauthenticated read of global nodes | getTopicsForClass without session | Global nodes are readable without auth (public curriculum); school nodes require auth |

---

## 5. Traversal Tests

| Test | Input | Expected |
|---|---|---|
| getPrerequisites depth 1 | Atomic Structure | Returns: States of Matter |
| getPrerequisites depth 2 | Atomic Structure | Returns: States of Matter + Basic Measurement |
| getPrerequisites on foundational node | States of Matter (no prereqs) | Returns empty array |
| getCrossSubjectConnections | Vectors (Mathematics) | Returns Vectors nodes in Physics, Engineering, CS |
| findLearningPath — direct | States of Matter → Atomic Structure | Returns [States of Matter, Atomic Structure] |
| findLearningPath — multi-hop | States of Matter → Ohm's Law | Returns full chain |
| findLearningPath — no path | Unrelated nodes | Returns null |
| findLearningPath — circular prevention | Artificially cycled graph | Returns null or breaks cycle gracefully |

---

## 6. Performance Targets

| Operation | Target (p95) | Condition |
|---|---|---|
| getTopicContext (cache hit) | < 100ms | Redis/in-memory cache warm |
| getTopicContext (cache miss) | < 500ms | DB query + traversal + cache write |
| getTopicsForClass | < 200ms | Any subject/class/term combination |
| getPrerequisites (depth 2) | < 300ms | Graph of 20,000 nodes |
| searchNodes | < 500ms | Full-text GIN index |
| Curriculum browser initial load | < 300ms | First subject selection |
| Seed script (full NERDC curriculum) | < 60 seconds | ~15,000 nodes, ~80,000 edges |

---

## 7. Regression Checklist

When CIG is modified, verify these dependent capabilities are unaffected:

- [ ] Lesson Generator still receives valid TopicContext (when implemented)
- [ ] Quiz Generator still receives valid TopicContext (when implemented)
- [ ] Assessment domain: existing exams still reference valid subject/classLevel strings
- [ ] Authentication: requireSchool() still enforced on all write operations
- [ ] Curriculum browser: topic list still loads after schema changes

---

## Educational Integrity Test — Automated vs Manual

| Category | Execution |
|---|---|
| Graph structural tests | Automated — run as part of seed validation script |
| Educational integrity tests | Automated — run as part of seed validation script |
| Contract tests | Automated — unit tests on CIG service layer |
| Security tests | Automated — integration tests with test school fixtures |
| Traversal tests | Automated — unit tests with known graph fixtures |
| Performance targets | Manual — run load test on staging before first production deploy |
| Regression checklist | Manual — reviewer signs off before merging CIG changes |

The seed validation script runs all structural and educational integrity tests after every seed operation and rejects the commit if any assertion fails. A graph that is structurally valid but educationally invalid is not permitted in production.
