-- Student Data Hub: Import, Sync, Portal Connectors, Profiles, Analytics
-- Run after MASTER_MIGRATION.sql

-- Enums
CREATE TYPE "ImportSource"      AS ENUM ('EXCEL','CSV','PORTAL','MANUAL','OCR');
CREATE TYPE "ImportStatus"      AS ENUM ('PENDING','ANALYZING','STAGED','CONFIRMED','COMMITTED','FAILED','DISCARDED');
CREATE TYPE "StagingAction"     AS ENUM ('CREATE','UPDATE','SKIP','CONFLICT');
CREATE TYPE "StagingStatus"     AS ENUM ('PENDING','RESOLVED','COMMITTED','SKIPPED');
CREATE TYPE "ConflictResolution" AS ENUM ('KEEP_EXISTING','REPLACE','MERGE','SKIP');
CREATE TYPE "SyncType"          AS ENUM ('INITIAL','INCREMENTAL','FULL','MANUAL');
CREATE TYPE "SyncStatus"        AS ENUM ('RUNNING','COMPLETED','FAILED','PARTIAL');

-- Import Jobs (staging controller)
CREATE TABLE "import_jobs" (
  "id"              TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "schoolId"        TEXT NOT NULL,
  "teacherId"       TEXT NOT NULL,
  "source"          "ImportSource" NOT NULL,
  "fileName"        TEXT,
  "status"          "ImportStatus" NOT NULL DEFAULT 'PENDING',
  "totalRows"       INTEGER NOT NULL DEFAULT 0,
  "newStudents"     INTEGER NOT NULL DEFAULT 0,
  "updatedStudents" INTEGER NOT NULL DEFAULT 0,
  "newScores"       INTEGER NOT NULL DEFAULT 0,
  "conflicts"       INTEGER NOT NULL DEFAULT 0,
  "errors"          TEXT[] NOT NULL DEFAULT '{}',
  "metadata"        JSONB,
  "committedAt"     TIMESTAMP,
  "createdAt"       TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"       TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "import_jobs_schoolId_idx"  ON "import_jobs"("schoolId");
CREATE INDEX "import_jobs_teacherId_idx" ON "import_jobs"("teacherId");

-- Staging Rows (pre-commit buffer)
CREATE TABLE "import_staging_rows" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "jobId"        TEXT NOT NULL REFERENCES "import_jobs"("id") ON DELETE CASCADE,
  "rowIndex"     INTEGER NOT NULL,
  "rawData"      JSONB NOT NULL,
  "parsedData"   JSONB NOT NULL,
  "action"       "StagingAction" NOT NULL DEFAULT 'CREATE',
  "status"       "StagingStatus" NOT NULL DEFAULT 'PENDING',
  "conflictData" JSONB,
  "resolution"   "ConflictResolution",
  "error"        TEXT,
  "studentId"    TEXT
);
CREATE INDEX "import_staging_rows_jobId_idx" ON "import_staging_rows"("jobId");

-- Sync History
CREATE TABLE "sync_logs" (
  "id"          TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "schoolId"    TEXT NOT NULL,
  "teacherId"   TEXT NOT NULL,
  "type"        "SyncType" NOT NULL,
  "source"      TEXT NOT NULL,
  "status"      "SyncStatus" NOT NULL,
  "summary"     JSONB NOT NULL,
  "startedAt"   TIMESTAMP NOT NULL DEFAULT now(),
  "completedAt" TIMESTAMP
);
CREATE INDEX "sync_logs_schoolId_idx" ON "sync_logs"("schoolId");

-- Portal Connections (session tokens only — no passwords)
CREATE TABLE "portal_connections" (
  "id"           TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "schoolId"     TEXT NOT NULL,
  "teacherId"    TEXT NOT NULL,
  "portalType"   TEXT NOT NULL,
  "displayName"  TEXT NOT NULL,
  "schoolName"   TEXT,
  "sessionToken" TEXT,
  "tokenExpiry"  TIMESTAMP,
  "isActive"     BOOLEAN NOT NULL DEFAULT true,
  "lastSynced"   TIMESTAMP,
  "syncSettings" JSONB,
  "metadata"     JSONB,
  "createdAt"    TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"    TIMESTAMP NOT NULL DEFAULT now(),
  UNIQUE ("schoolId", "portalType")
);
CREATE INDEX "portal_connections_schoolId_idx" ON "portal_connections"("schoolId");

-- Extended Student Profiles
CREATE TABLE "student_profiles" (
  "id"             TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "studentId"      TEXT NOT NULL UNIQUE REFERENCES "students"("id") ON DELETE CASCADE,
  "schoolId"       TEXT NOT NULL,
  "dateOfBirth"    TIMESTAMP,
  "photoUrl"       TEXT,
  "parentName"     TEXT,
  "parentPhone"    TEXT,
  "parentEmail"    TEXT,
  "parentRelation" TEXT,
  "address"        TEXT,
  "state"          TEXT,
  "lga"            TEXT,
  "formerSchool"   TEXT,
  "admissionDate"  TIMESTAMP,
  "nationality"    TEXT,
  "religion"       TEXT,
  "metadata"       JSONB,
  "createdAt"      TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt"      TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "student_profiles_schoolId_idx" ON "student_profiles"("schoolId");

-- Analytics Snapshots (computed cache)
CREATE TABLE "analytics_snapshots" (
  "id"         TEXT PRIMARY KEY DEFAULT gen_random_uuid(),
  "schoolId"   TEXT NOT NULL,
  "classId"    TEXT,
  "studentId"  TEXT,
  "subject"    TEXT,
  "term"       "Term",
  "session"    TEXT NOT NULL,
  "type"       TEXT NOT NULL,
  "data"       JSONB NOT NULL,
  "computedAt" TIMESTAMP NOT NULL DEFAULT now()
);
CREATE INDEX "analytics_snapshots_schoolId_idx"  ON "analytics_snapshots"("schoolId");
CREATE INDEX "analytics_snapshots_classId_idx"   ON "analytics_snapshots"("classId");
CREATE INDEX "analytics_snapshots_studentId_idx" ON "analytics_snapshots"("studentId");
