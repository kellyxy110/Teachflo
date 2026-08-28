-- Import reconciliation remediation. Reviewed additive migration; NOT APPLIED.
-- Safe for existing records: new student field is nullable; new tables have no
-- required backfill. ImportStatus value supports a bounded commit lease.

ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "rawFullName" TEXT;

CREATE TABLE IF NOT EXISTS "subject_aliases" (
  -- Prisma's @default(cuid()) supplies this value in application writes.
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "rawValue" TEXT NOT NULL,
  "canonicalSubject" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE ("schoolId", "rawValue")
);
CREATE INDEX IF NOT EXISTS "subject_aliases_schoolId_idx" ON "subject_aliases"("schoolId");

CREATE TABLE IF NOT EXISTS "integration_requests" (
  -- Prisma's @default(cuid()) supplies this value in application writes.
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "connectorId" TEXT NOT NULL,
  "schoolName" TEXT NOT NULL,
  "portalUrl" TEXT NOT NULL,
  "adminContact" TEXT NOT NULL,
  "message" TEXT,
  "status" TEXT NOT NULL DEFAULT 'NEW',
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS "integration_requests_schoolId_idx" ON "integration_requests"("schoolId");
CREATE INDEX IF NOT EXISTS "integration_requests_status_idx" ON "integration_requests"("status");

ALTER TYPE "ImportStatus" ADD VALUE IF NOT EXISTS 'COMMITTING';
