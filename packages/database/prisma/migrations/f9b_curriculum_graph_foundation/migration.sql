-- F9B additive Curriculum Graph foundation. No existing rows are rewritten.
CREATE TYPE "CurriculumLifecycle" AS ENUM ('DRAFT','REVIEWED','PUBLISHED','ARCHIVED');
CREATE TYPE "AlignmentStatus" AS ENUM ('UNMAPPED','PROPOSED','REVIEWED','APPROVED','REJECTED');
CREATE TYPE "CurriculumSourceKind" AS ENUM ('HUMAN_CREATED','IMPORTED','CURRICULUM_SEEDED');

CREATE TABLE "curricula" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "authority" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "scope" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "curricula_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "curricula_slug_key" ON "curricula"("slug");

CREATE TABLE "curriculum_versions" (
  "id" TEXT NOT NULL,
  "curriculumId" TEXT NOT NULL,
  "versionKey" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "editionYear" INTEGER,
  "status" "CurriculumLifecycle" NOT NULL DEFAULT 'DRAFT',
  "publishedAt" TIMESTAMP(3),
  "archivedAt" TIMESTAMP(3),
  "sourceDocument" TEXT,
  CONSTRAINT "curriculum_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "curriculum_versions_curriculumId_versionKey_key" ON "curriculum_versions"("curriculumId", "versionKey");
CREATE INDEX "curriculum_versions_status_idx" ON "curriculum_versions"("status");
ALTER TABLE "curriculum_versions" ADD CONSTRAINT "curriculum_versions_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curricula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "curriculum_provenance" (
  "id" TEXT NOT NULL,
  "curriculumVersionId" TEXT NOT NULL,
  "organization" TEXT,
  "documentTitle" TEXT NOT NULL,
  "editionYear" INTEGER,
  "sourceUrl" TEXT,
  "pageOrSection" TEXT,
  "extractionMethod" TEXT,
  "confidence" DOUBLE PRECISION,
  "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "verifiedAt" TIMESTAMP(3),
  "verifiedByTeacherId" TEXT,
  "notes" TEXT,
  CONSTRAINT "curriculum_provenance_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "curriculum_provenance_curriculumVersionId_idx" ON "curriculum_provenance"("curriculumVersionId");
CREATE INDEX "curriculum_provenance_verifiedByTeacherId_idx" ON "curriculum_provenance"("verifiedByTeacherId");
ALTER TABLE "curriculum_provenance" ADD CONSTRAINT "curriculum_provenance_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "curriculum_provenance" ADD CONSTRAINT "curriculum_provenance_verifiedByTeacherId_fkey" FOREIGN KEY ("verifiedByTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "curriculum_nodes" ADD COLUMN "curriculumVersionId" TEXT;
ALTER TABLE "curriculum_nodes" ADD COLUMN "stableKey" TEXT;
CREATE INDEX "curriculum_nodes_curriculumVersionId_type_idx" ON "curriculum_nodes"("curriculumVersionId", "type");
CREATE UNIQUE INDEX "curriculum_nodes_curriculumVersionId_stableKey_key" ON "curriculum_nodes"("curriculumVersionId", "stableKey");
ALTER TABLE "curriculum_nodes" ADD CONSTRAINT "curriculum_nodes_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "question_version_curriculum_alignments" (
  "id" TEXT NOT NULL,
  "questionVersionId" TEXT NOT NULL,
  "curriculumNodeId" TEXT NOT NULL,
  "curriculumVersionId" TEXT NOT NULL,
  "status" "AlignmentStatus" NOT NULL DEFAULT 'UNMAPPED',
  "sourceKind" "CurriculumSourceKind" NOT NULL DEFAULT 'HUMAN_CREATED',
  "confidence" DOUBLE PRECISION,
  "notes" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "reviewedByTeacherId" TEXT,
  CONSTRAINT "question_version_curriculum_alignments_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "qv_curriculum_alignment_identity_key" ON "question_version_curriculum_alignments"("questionVersionId", "curriculumNodeId", "curriculumVersionId");
CREATE INDEX "qv_curriculum_alignments_node_status_idx" ON "question_version_curriculum_alignments"("curriculumNodeId", "status");
CREATE INDEX "qv_curriculum_alignments_version_status_idx" ON "question_version_curriculum_alignments"("curriculumVersionId", "status");
CREATE INDEX "qv_curriculum_alignments_reviewer_idx" ON "question_version_curriculum_alignments"("reviewedByTeacherId");
ALTER TABLE "question_version_curriculum_alignments" ADD CONSTRAINT "qv_curriculum_alignments_questionVersionId_fkey" FOREIGN KEY ("questionVersionId") REFERENCES "question_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_version_curriculum_alignments" ADD CONSTRAINT "qv_curriculum_alignments_nodeId_fkey" FOREIGN KEY ("curriculumNodeId") REFERENCES "curriculum_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_version_curriculum_alignments" ADD CONSTRAINT "qv_curriculum_alignments_versionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_version_curriculum_alignments" ADD CONSTRAINT "qv_curriculum_alignments_reviewer_fkey" FOREIGN KEY ("reviewedByTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
