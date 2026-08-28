-- F9C additive ingestion/review pipeline. No canonical curriculum rows are seeded.
CREATE TYPE "CurriculumSourceType" AS ENUM ('OFFICIAL_DOCUMENT','INSTITUTIONAL','STRUCTURED_DATASET','TEACHER_PROVIDED','UNKNOWN');
CREATE TYPE "SourceAuthorityLevel" AS ENUM ('OFFICIAL','INSTITUTIONAL','VERIFIED_SECONDARY','TEACHER_PROVIDED','UNKNOWN');
CREATE TYPE "SourceVerificationState" AS ENUM ('UNVERIFIED','REVIEWED','VERIFIED','REJECTED');
CREATE TYPE "IngestionJobState" AS ENUM ('REGISTERED','VALIDATING','EXTRACTING','NORMALIZING','STAGED','NEEDS_REVIEW','APPROVED','PUBLISHING','PUBLISHED','FAILED','CANCELLED');
CREATE TYPE "StagedReviewState" AS ENUM ('NEEDS_REVIEW','EDITED','APPROVED','REJECTED','PUBLISHED');

CREATE TABLE "curriculum_sources" (
  "id" TEXT NOT NULL,
  "fingerprint" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "sourceType" "CurriculumSourceType" NOT NULL DEFAULT 'UNKNOWN',
  "authorityLevel" "SourceAuthorityLevel" NOT NULL DEFAULT 'UNKNOWN',
  "verificationState" "SourceVerificationState" NOT NULL DEFAULT 'UNVERIFIED',
  "organization" TEXT,
  "sourceUrl" TEXT,
  "fileName" TEXT,
  "mimeType" TEXT,
  "byteSize" INTEGER,
  "publicationYear" INTEGER,
  "effectiveYear" INTEGER,
  "jurisdiction" TEXT,
  "country" TEXT,
  "licenseNote" TEXT,
  "curriculumId" TEXT,
  "curriculumVersionId" TEXT,
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "registeredByTeacherId" TEXT,
  CONSTRAINT "curriculum_sources_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "curriculum_sources_fingerprint_key" ON "curriculum_sources"("fingerprint");
CREATE INDEX "curriculum_sources_curriculumId_idx" ON "curriculum_sources"("curriculumId");
CREATE INDEX "curriculum_sources_curriculumVersionId_idx" ON "curriculum_sources"("curriculumVersionId");
CREATE INDEX "curriculum_sources_verificationState_idx" ON "curriculum_sources"("verificationState");
ALTER TABLE "curriculum_sources" ADD CONSTRAINT "curriculum_sources_curriculumId_fkey" FOREIGN KEY ("curriculumId") REFERENCES "curricula"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "curriculum_sources" ADD CONSTRAINT "curriculum_sources_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "curriculum_sources" ADD CONSTRAINT "curriculum_sources_registeredByTeacherId_fkey" FOREIGN KEY ("registeredByTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "curriculum_ingestion_jobs" (
  "id" TEXT NOT NULL,
  "sourceId" TEXT NOT NULL,
  "curriculumVersionId" TEXT,
  "state" "IngestionJobState" NOT NULL DEFAULT 'REGISTERED',
  "revision" INTEGER NOT NULL DEFAULT 1,
  "rawHash" TEXT,
  "errorMessage" TEXT,
  "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "startedAt" TIMESTAMP(3),
  "completedAt" TIMESTAMP(3),
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "curriculum_ingestion_jobs_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "curriculum_ingestion_jobs_sourceId_revision_key" ON "curriculum_ingestion_jobs"("sourceId", "revision");
CREATE INDEX "curriculum_ingestion_jobs_state_idx" ON "curriculum_ingestion_jobs"("state");
CREATE INDEX "curriculum_ingestion_jobs_version_state_idx" ON "curriculum_ingestion_jobs"("curriculumVersionId", "state");
ALTER TABLE "curriculum_ingestion_jobs" ADD CONSTRAINT "curriculum_ingestion_jobs_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "curriculum_sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "curriculum_ingestion_jobs" ADD CONSTRAINT "curriculum_ingestion_jobs_curriculumVersionId_fkey" FOREIGN KEY ("curriculumVersionId") REFERENCES "curriculum_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "curriculum_staged_items" (
  "id" TEXT NOT NULL,
  "jobId" TEXT NOT NULL,
  "stableKey" TEXT NOT NULL,
  "parentStableKey" TEXT,
  "type" "NodeType" NOT NULL,
  "label" TEXT NOT NULL,
  "normalizedText" TEXT,
  "rawText" TEXT NOT NULL,
  "description" TEXT,
  "subject" TEXT,
  "classLevel" "ClassLevel",
  "term" "Term",
  "sourcePage" TEXT,
  "sourceSection" TEXT,
  "extractionConfidence" DOUBLE PRECISION,
  "classificationConfidence" DOUBLE PRECISION,
  "reviewState" "StagedReviewState" NOT NULL DEFAULT 'NEEDS_REVIEW',
  "reviewRevision" INTEGER NOT NULL DEFAULT 1,
  "reviewNotes" TEXT,
  "reviewedByTeacherId" TEXT,
  "reviewedAt" TIMESTAMP(3),
  "publishedNodeId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "curriculum_staged_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "curriculum_staged_items_jobId_stableKey_key" ON "curriculum_staged_items"("jobId", "stableKey");
CREATE INDEX "curriculum_staged_items_jobId_reviewState_idx" ON "curriculum_staged_items"("jobId", "reviewState");
CREATE INDEX "curriculum_staged_items_publishedNodeId_idx" ON "curriculum_staged_items"("publishedNodeId");
ALTER TABLE "curriculum_staged_items" ADD CONSTRAINT "curriculum_staged_items_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "curriculum_ingestion_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "curriculum_staged_items" ADD CONSTRAINT "curriculum_staged_items_reviewedByTeacherId_fkey" FOREIGN KEY ("reviewedByTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "curriculum_staged_items" ADD CONSTRAINT "curriculum_staged_items_publishedNodeId_fkey" FOREIGN KEY ("publishedNodeId") REFERENCES "curriculum_nodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
