# F9 Curriculum Graph Migration Plan

Status: proposal only. No schema, migration, SQL, or data was changed in F9A.

## Goals and invariants

- Preserve every existing `CurriculumNode`, `CurriculumEdge`, Question, QuestionVersion, Lesson, Exam, publication, attempt, response, and school record.
- Add academic context without changing historical assessment meaning.
- Keep unmapped legacy values valid and visible as `UNMAPPED`.
- Keep global canonical curriculum read-only to ordinary Teachers.
- Make imports idempotent and reviewable.
- Never delete or destructively rewrite existing curriculum or question data.

## Recommended additive shape (conceptual Prisma diff)

```prisma
enum CurriculumLifecycle { DRAFT REVIEWED PUBLISHED ARCHIVED }
enum AlignmentStatus { UNMAPPED PROPOSED REVIEWED APPROVED REJECTED }
enum CurriculumSourceKind { HUMAN_CREATED IMPORTED CURRICULUM_SEEDED }

model Curriculum {
  id String @id @default(cuid())
  slug String @unique
  name String
  authority String
  kind String // NATIONAL_CURRICULUM or EXAM_SYLLABUS; validated in service
  scope String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  versions CurriculumVersion[]
}

model CurriculumVersion {
  id String @id @default(cuid())
  curriculumId String
  versionKey String
  title String
  editionYear Int?
  status CurriculumLifecycle @default(DRAFT)
  publishedAt DateTime?
  archivedAt DateTime?
  sourceDocumentId String?
  curriculum Curriculum @relation(fields: [curriculumId], references: [id], onDelete: Restrict)
  nodes CurriculumNode[]
  provenance CurriculumProvenance[]
  @@unique([curriculumId, versionKey])
  @@index([status])
}

model CurriculumProvenance {
  id String @id @default(cuid())
  curriculumVersionId String
  organization String?
  documentTitle String
  editionYear Int?
  sourceUrl String?
  pageOrSection String?
  extractionMethod String?
  confidence Float?
  importedAt DateTime @default(now())
  verifiedAt DateTime?
  verifiedByTeacherId String?
  notes String?
  version CurriculumVersion @relation(fields: [curriculumVersionId], references: [id], onDelete: Restrict)
  @@index([curriculumVersionId])
}

model QuestionVersionCurriculumAlignment {
  id String @id @default(cuid())
  questionVersionId String
  curriculumNodeId String
  curriculumVersionId String
  status AlignmentStatus @default(UNMAPPED)
  sourceKind CurriculumSourceKind @default(HUMAN_CREATED)
  confidence Float?
  notes String?
  reviewedAt DateTime?
  reviewedByTeacherId String?
  questionVersion QuestionVersion @relation(fields: [questionVersionId], references: [id], onDelete: Restrict)
  node CurriculumNode @relation(fields: [curriculumNodeId], references: [id], onDelete: Restrict)
  version CurriculumVersion @relation(fields: [curriculumVersionId], references: [id], onDelete: Restrict)
  @@unique([questionVersionId, curriculumNodeId, curriculumVersionId])
  @@index([curriculumNodeId, status])
  @@index([curriculumVersionId, status])
}
```

The existing `CurriculumNode` would gain only `curriculumVersionId`, `stableKey`, and optional lifecycle/provenance linkage after a compatibility review. Existing `QuestionVersion` would gain the reverse relation only; no content fields or historical semantics change. A future exam-syllabus alignment can reuse the same node/version mechanism rather than introducing a second Question alignment table prematurely.

`sourceDocumentId` is intentionally opaque because the repository's document model may not be the right provenance owner. Resolve that relation during F9B schema review. Do not add an enum for every national authority until source governance is confirmed.

## Phase 1 — additive schema

Create versioned registry, provenance, stable keys, lifecycle, and QuestionVersion alignment tables/columns. Use `ON DELETE RESTRICT` for published versions and alignments. Add indexes for version/status, parent navigation, stable keys, and alignment lookup. Migration SQL must contain no destructive operation.

## Phase 2 — legacy preservation/backfill

1. Snapshot counts and schema metadata.
2. Create no fabricated Curriculum rows for undocumented sources.
3. Mark existing graph nodes as legacy/unmapped or attach only to a reviewed version when an authoritative source key is available.
4. Normalize existing subject strings through the existing platform normalizer and `SubjectAlias`; do not merge school subjects automatically.
5. Preserve `Question.curriculumRef`, `topicTag`, `subTopicTag`, `skillTag`, `Lesson.topic`, and `Exam.topic` exactly. Generate candidate mappings only as review work, never as approved alignments.
6. Existing QuestionVersions without reviewed alignment remain valid.

## Phase 3 — controlled ingestion

`SOURCE → EXTRACT → NORMALIZE → MATCH → REVIEW → APPROVE → PUBLISH`. Store rejected/unknown matches outside the canonical published graph or as `REJECTED`; retain source evidence. Stable source key plus parent/version context is the idempotency key.

## Phase 4 — dual-read compatibility

Readers prefer approved versioned alignments and fall back to legacy text fields. Writers create new alignments only through review-aware services. Existing F6/F8 readers remain unchanged.

## Phase 5 — Question Bank and lesson cutover

Add server-side alignment filters and display reviewed context. Add Lesson/Scheme-of-Work joins only after the registry is proven. Never rewrite historical publication items.

## Rollback and verification

- Before migration: record counts and `_prisma_migrations` state.
- After migration: validate schema, foreign keys, uniqueness, and count invariants.
- If backfill is wrong: disable the new read path and remove only newly created unmapped staging records; do not delete legacy rows.
- Production migration requires a separate reviewed plan, backup, dry run, and approval.

## Explicit non-goals

No curriculum seeding, scraping, bulk question generation, mastery, adaptive paths, vector search, or Production migration belongs in F9A/B.
