-- Baseline attendance and health reconciliation.
-- Additive, idempotent, and safe for existing rows. IDs are supplied by
-- Prisma's cuid() default; no database UUID default is introduced.

DO $$ BEGIN
  CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'PRESENT';
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'ABSENT';
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'LATE';
ALTER TYPE "AttendanceStatus" ADD VALUE IF NOT EXISTS 'EXCUSED';

CREATE TABLE IF NOT EXISTS "attendance" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "classId" TEXT NOT NULL,
  "studentId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  "date" DATE NOT NULL,
  "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE,
  CONSTRAINT "attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE,
  CONSTRAINT "attendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT
);
CREATE UNIQUE INDEX IF NOT EXISTS "attendance_studentId_date_key" ON "attendance"("studentId", "date");
CREATE INDEX IF NOT EXISTS "attendance_schoolId_idx" ON "attendance"("schoolId");
CREATE INDEX IF NOT EXISTS "attendance_classId_date_idx" ON "attendance"("classId", "date");
CREATE INDEX IF NOT EXISTS "attendance_studentId_idx" ON "attendance"("studentId");
CREATE INDEX IF NOT EXISTS "attendance_teacherId_idx" ON "attendance"("teacherId");

CREATE TABLE IF NOT EXISTS "health_records" (
  "id" TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL UNIQUE,
  "schoolId" TEXT NOT NULL,
  "bloodGroup" TEXT,
  "genotype" TEXT,
  "allergies" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "conditions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "medications" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "emergencyContactName" TEXT,
  "emergencyContactPhone" TEXT,
  "emergencyContactRel" TEXT,
  "parentPhone" TEXT,
  "parentEmail" TEXT,
  "immunizations" JSONB,
  "clinicVisits" JSONB,
  "healthNotes" TEXT,
  "lastUpdatedBy" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "health_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS "health_records_schoolId_idx" ON "health_records"("schoolId");
