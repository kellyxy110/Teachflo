# Contract: Curriculum Intelligence Graph (CIG)

## Purpose
Provide every TeachNexis capability with structured, relationship-aware, queryable access to the Nigerian secondary school curriculum knowledge graph.

## Responsibilities

**Owns:**
- The canonical node and edge data representing the NERDC curriculum
- All traversal operations on the graph (prerequisites, sequencing, cross-subject, learning paths)
- The full topic context package used by AI-consuming capabilities
- School-specific graph extensions (custom nodes a school adds to the base graph)
- Node search across subject, class level, term, keywords, and metadata

**Does NOT own:**
- AI-generated content derived from graph nodes (Lesson Generator, Flashcard Engine)
- Assessment questions (Assessment & Learning Intelligence)
- Student progress or mastery data (Learning Analytics)
- File storage for resources linked from graph nodes

## Inputs

### getNode
| Field | Type | Required | Validation |
|---|---|---|---|
| id | string | yes | Must be a valid CurriculumNode id |

### getTopicsForClass
| Field | Type | Required | Validation |
|---|---|---|---|
| subject | string | yes | Non-empty string |
| classLevel | ClassLevel enum | yes | Valid Prisma enum value |
| term | Term enum | no | FIRST / SECOND / THIRD |

### getPrerequisites
| Field | Type | Required | Validation |
|---|---|---|---|
| nodeId | string | yes | Valid CurriculumNode id |
| depth | number | no | Default 2; max 5 |

### getRelated
| Field | Type | Required | Validation |
|---|---|---|---|
| nodeId | string | yes | Valid CurriculumNode id |
| relationships | EdgeRelation[] | no | Default: all types |

### getTopicContext
| Field | Type | Required | Validation |
|---|---|---|---|
| nodeId | string | yes | Valid CurriculumNode id |

### findLearningPath
| Field | Type | Required | Validation |
|---|---|---|---|
| fromId | string | yes | Valid CurriculumNode id |
| toId | string | yes | Valid CurriculumNode id |

### searchNodes
| Field | Type | Required | Validation |
|---|---|---|---|
| query | string | yes | Non-empty; max 200 chars |
| filters.type | NodeType | no | Filter by node type |
| filters.subject | string | no | Filter by subject |
| filters.classLevel | ClassLevel | no | Filter by class level |
| filters.term | Term | no | Filter by term |
| limit | number | no | Default 20; max 100 |

### addNode (school-specific extension)
| Field | Type | Required | Validation |
|---|---|---|---|
| schoolId | string | yes | Authenticated school; cannot be null |
| type | NodeType | yes | Valid enum value |
| label | string | yes | Non-empty; max 200 chars |
| subject | string | no | — |
| ... | ... | no | Other optional node properties |

### addEdge (school-specific extension)
| Field | Type | Required | Validation |
|---|---|---|---|
| sourceId | string | yes | Valid CurriculumNode id |
| targetId | string | yes | Valid CurriculumNode id; must not equal sourceId |
| relationship | EdgeRelation | yes | Valid enum value |

## Outputs

### getNode → CurriculumNode | null
Returns the full node object or null if not found.

### getTopicsForClass → CurriculumNode[]
Returns TOPIC nodes matching the parameters, ordered by `week` then `label`. Empty array if none found.

### getPrerequisites → { node: CurriculumNode; depth: number }[]
Returns prerequisite nodes with their hop distance from the source. Ordered from immediate (depth 1) to distant.

### getRelated → { node: CurriculumNode; relationship: EdgeRelation; direction: 'outgoing' | 'incoming' }[]
Returns all related nodes with the relationship type and direction.

### getTopicContext → TopicContext
```typescript
interface TopicContext {
  node: CurriculumNode;
  prerequisites: CurriculumNode[];        // immediate prerequisites
  learningObjectives: CurriculumNode[];   // LEARNING_OBJECTIVE nodes
  relatedConcepts: CurriculumNode[];      // CONCEPT nodes
  crossSubjectConnections: {
    node: CurriculumNode;
    subject: string;
  }[];
  examStandards: string[];                // WAEC / NECO / JAMB tags
  bloomLevels: string[];
  misconceptions: string[];
  formulae: Record<string, string> | null;
}
```

### findLearningPath → CurriculumNode[] | null
Ordered array of nodes from source to target via prerequisite edges. Null if no path exists.

### searchNodes → CurriculumNode[]
Matching nodes ordered by relevance. Capped at `limit`.

### addNode → CurriculumNode
The created node. Throws if validation fails or schoolId is invalid.

### addEdge → CurriculumEdge
The created edge. Throws if duplicate or self-loop.

## Dependencies

| Capability | ID | Nature |
|---|---|---|
| Authentication | PLT-001 | requireSchool() for school-specific operations |
| Data Isolation | PLT-002 | schoolId scoping for school-specific nodes |
| Database | PLT-005 | CurriculumNode + CurriculumEdge tables |

## Events Produced

| Event | Payload | Trigger |
|---|---|---|
| `curriculum.node.created` | `{ nodeId, type, label, schoolId }` | After addNode succeeds |
| `curriculum.node.updated` | `{ nodeId, changes }` | After node metadata update |
| `curriculum.edge.created` | `{ edgeId, sourceId, targetId, relationship }` | After addEdge succeeds |
| `curriculum.graph.seeded` | `{ nodeCount, edgeCount, subjects }` | After initial seed completes |

## Events Consumed
None at launch. Future: may consume `student.progress.updated` to weight graph traversal by class-level mastery patterns.

## Quality Guarantees
- `getTopicContext` always returns a complete context package — it never returns a partial node with missing objectives or prerequisites. If a node has no edges, the arrays are empty, not null.
- `getTopicsForClass` returns only active nodes (`isActive = true`).
- Global NERDC nodes (`schoolId = null`) are read-only to all callers. Write operations are silently scoped to school-specific nodes only.
- Cross-school data isolation: school-specific nodes for school A are never returned to school B.
- `findLearningPath` returns null (not an error) if no path exists — the calling capability is responsible for handling the no-path case.
- Graph traversal depth is capped at 5 hops to prevent runaway queries.

## Failure Behaviour

| Scenario | Behaviour |
|---|---|
| nodeId not found | Returns null (read operations) or throws "Node not found" (traversal operations that require a valid start) |
| Self-loop (sourceId = targetId) | Throws "Self-referential edges are not permitted" |
| Duplicate edge | Throws "Edge already exists" |
| Invalid enum value | Throws descriptive error with field name and value |
| schoolId mismatch (write to global node) | Throws "Cannot modify global curriculum nodes" |
| traversal depth > 5 | Silently capped at 5; no error |

## Extension Points
- Semantic similarity search can be added as `searchSimilar(nodeId, topK)` without changing existing methods.
- Student mastery overlay can be added to `getTopicContext` as an optional `studentId` parameter without changing the base contract.
- The graph can be exported as JSON-LD for interoperability with external educational tools without changing internal structure.
