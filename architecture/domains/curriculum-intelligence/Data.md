# Data: Curriculum Intelligence Graph (CIG)

## Tables

### CurriculumNode
**Purpose:** Every concept, topic, skill, objective, and exam standard in the curriculum graph is a node.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | String (cuid) | No | auto | Primary key |
| schoolId | String? | Yes | null | null = global NERDC node; non-null = school extension |
| type | NodeType enum | No | — | SUBJECT / TOPIC / CONCEPT / SKILL / LEARNING_OBJECTIVE / EXAM_STANDARD |
| label | String | No | — | Human-readable name |
| description | String? | Yes | null | Full description |
| subject | String? | Yes | null | Subject name (TOPIC/CONCEPT nodes) |
| classLevel | ClassLevel? | Yes | null | JSS1–SS3 |
| term | Term? | Yes | null | FIRST / SECOND / THIRD |
| week | Int? | Yes | null | Week number within the term |
| difficulty | Difficulty? | Yes | null | EASY / MEDIUM / HARD |
| estimatedMinutes | Int? | Yes | null | Estimated teaching time |
| bloomLevels | String[] | No | [] | Bloom's Taxonomy levels this node addresses |
| examStandards | String[] | No | [] | e.g. ["WAEC", "NECO", "JAMB"] |
| keywords | String[] | No | [] | Searchable terms |
| misconceptions | String[] | No | [] | Common student errors |
| formulae | Json? | Yes | null | LaTeX formula strings (for STEM nodes) |
| metadata | Json? | Yes | null | Flexible additional properties |
| isActive | Boolean | No | true | Soft delete |
| createdAt | DateTime | No | now() | |
| updatedAt | DateTime | No | auto | |

**Indexes:**
- Primary: `id`
- Lookup: `type` (filter by node type)
- Lookup: `subject, classLevel, term` (curriculum browser queries)
- Lookup: `schoolId` (tenant isolation for school extensions)
- Search: `keywords` (GIN index for array search — PostgreSQL)

---

### CurriculumEdge
**Purpose:** Every typed relationship between two curriculum nodes.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| id | String (cuid) | No | auto | Primary key |
| sourceId | String | No | — | FK → CurriculumNode.id |
| targetId | String | No | — | FK → CurriculumNode.id |
| relationship | EdgeRelation enum | No | — | The type of relationship |
| weight | Float? | Yes | 1.0 | Ordering/priority (e.g. prerequisite strength) |
| metadata | Json? | Yes | null | Additional relationship properties |
| createdAt | DateTime | No | now() | |

**Indexes:**
- Unique: `(sourceId, targetId, relationship)` — prevents duplicate edges of the same type
- Lookup: `sourceId` — find all outgoing edges from a node (most common traversal)
- Lookup: `targetId` — find all incoming edges to a node
- Lookup: `relationship` — filter by edge type across the whole graph

---

## Enums

```prisma
enum NodeType {
  SUBJECT
  TOPIC
  CONCEPT
  SKILL
  LEARNING_OBJECTIVE
  EXAM_STANDARD
}

enum EdgeRelation {
  REQUIRES
  EXTENDS
  PART_OF
  RELATED_TO
  ASSESSED_BY
  VISUALIZED_BY
  PRACTICED_BY
  APPEARS_IN
  TEACHES_BEFORE
  TEACHES_AFTER
  CROSS_SUBJECT
}
```

---

## Prisma Schema

```prisma
model CurriculumNode {
  id               String      @id @default(cuid())
  schoolId         String?
  type             NodeType
  label            String
  description      String?
  subject          String?
  classLevel       ClassLevel?
  term             Term?
  week             Int?
  difficulty       Difficulty?
  estimatedMinutes Int?
  bloomLevels      String[]
  examStandards    String[]
  keywords         String[]
  misconceptions   String[]
  formulae         Json?
  metadata         Json?
  isActive         Boolean     @default(true)
  createdAt        DateTime    @default(now())
  updatedAt        DateTime    @updatedAt

  outgoing         CurriculumEdge[] @relation("EdgeSource")
  incoming         CurriculumEdge[] @relation("EdgeTarget")

  @@index([type])
  @@index([subject, classLevel, term])
  @@index([schoolId])
}

model CurriculumEdge {
  id           String       @id @default(cuid())
  sourceId     String
  targetId     String
  relationship EdgeRelation
  weight       Float?       @default(1.0)
  metadata     Json?
  createdAt    DateTime     @default(now())

  source       CurriculumNode @relation("EdgeSource", fields: [sourceId], references: [id], onDelete: Cascade)
  target       CurriculumNode @relation("EdgeTarget", fields: [targetId], references: [id], onDelete: Cascade)

  @@unique([sourceId, targetId, relationship])
  @@index([sourceId])
  @@index([targetId])
  @@index([relationship])
}
```

---

## Migration SQL

Run in Supabase SQL Editor (not `prisma db push` — IPv6 restriction):

```sql
-- CurriculumNode
CREATE TABLE "CurriculumNode" (
  "id"               TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "schoolId"         TEXT,
  "type"             TEXT NOT NULL,
  "label"            TEXT NOT NULL,
  "description"      TEXT,
  "subject"          TEXT,
  "classLevel"       TEXT,
  "term"             TEXT,
  "week"             INTEGER,
  "difficulty"       TEXT,
  "estimatedMinutes" INTEGER,
  "bloomLevels"      TEXT[] NOT NULL DEFAULT '{}',
  "examStandards"    TEXT[] NOT NULL DEFAULT '{}',
  "keywords"         TEXT[] NOT NULL DEFAULT '{}',
  "misconceptions"   TEXT[] NOT NULL DEFAULT '{}',
  "formulae"         JSONB,
  "metadata"         JSONB,
  "isActive"         BOOLEAN NOT NULL DEFAULT true,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "CurriculumNode_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "CurriculumNode_type_idx" ON "CurriculumNode"("type");
CREATE INDEX "CurriculumNode_subject_classLevel_term_idx" ON "CurriculumNode"("subject", "classLevel", "term");
CREATE INDEX "CurriculumNode_schoolId_idx" ON "CurriculumNode"("schoolId");
CREATE INDEX "CurriculumNode_keywords_idx" ON "CurriculumNode" USING GIN("keywords");

-- CurriculumEdge
CREATE TABLE "CurriculumEdge" (
  "id"           TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  "sourceId"     TEXT NOT NULL,
  "targetId"     TEXT NOT NULL,
  "relationship" TEXT NOT NULL,
  "weight"       DOUBLE PRECISION DEFAULT 1.0,
  "metadata"     JSONB,
  "createdAt"    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "CurriculumEdge_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "CurriculumEdge_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "CurriculumNode"("id") ON DELETE CASCADE,
  CONSTRAINT "CurriculumEdge_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "CurriculumNode"("id") ON DELETE CASCADE,
  CONSTRAINT "CurriculumEdge_source_target_rel_unique" UNIQUE ("sourceId", "targetId", "relationship")
);

CREATE INDEX "CurriculumEdge_sourceId_idx" ON "CurriculumEdge"("sourceId");
CREATE INDEX "CurriculumEdge_targetId_idx" ON "CurriculumEdge"("targetId");
CREATE INDEX "CurriculumEdge_relationship_idx" ON "CurriculumEdge"("relationship");
```

---

## Data Constraints

| Constraint | Field | Rule |
|---|---|---|
| Global vs school | schoolId | null = read-only NERDC node; schools may not modify global nodes |
| No self-loops | sourceId / targetId | sourceId must not equal targetId |
| No duplicate edges | (sourceId, targetId, relationship) | Enforced by unique constraint |
| Cascade delete | CurriculumEdge | Deleting a node removes all its edges |
| Node type integrity | type | Only valid NodeType enum values |

## Caching Strategy

| Data | Cache Key | TTL | Invalidation |
|---|---|---|---|
| Topic list | `cig:topics:{subject}:{classLevel}:{term}` | 24 hours | On any node update for that subject/class/term |
| Topic context package | `cig:context:{nodeId}` | 24 hours | On node or adjacent edge update |
| Prerequisites | `cig:prereqs:{nodeId}` | 24 hours | On REQUIRES edge add/remove |
| Cross-subject | `cig:cross:{nodeId}` | 7 days | On CROSS_SUBJECT edge add/remove |

## Storage Estimate

- Nigerian secondary curriculum: ~6 subjects × 6 class levels × 3 terms × 10 topics = ~1,080 TOPIC nodes at minimum
- CONCEPT nodes: ~5–10 per topic = 5,000–10,000 nodes
- LEARNING_OBJECTIVE nodes: ~3–5 per topic = 3,000–5,000 nodes
- Total initial graph: ~10,000–20,000 nodes, ~50,000–100,000 edges
- PostgreSQL handles this with ease; no scaling concerns at launch
