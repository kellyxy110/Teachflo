-- Baseline identity/profile reconciliation.
-- Restores active Prisma/application fields omitted from the historical base SQL.
-- Additive and idempotent: suitable for fresh non-production reconstruction and
-- existing controlled environments. No destructive schema operations.

-- Teacher profile and teaching-assignment fields. Nullable fields preserve
-- compatibility with pre-profile teacher records. classLevels is a required
-- Prisma list; an empty-array default keeps existing and onboarding records safe.
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "phone" TEXT;
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "photoUrl" TEXT;
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "bio" TEXT;
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "qualification" TEXT;
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "institution" TEXT;
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "gradYear" INTEGER;
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "trcnNumber" TEXT;
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "trcnStatus" TEXT;
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "department" TEXT;
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "yearsOfExp" INTEGER;
ALTER TABLE "teachers" ADD COLUMN IF NOT EXISTS "classLevels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

-- Student authentication/claim identity is optional until a student claims an
-- account. Postgres permits multiple NULL values in this unique index.
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "clerkId" TEXT;
ALTER TABLE "students" ADD COLUMN IF NOT EXISTS "email" TEXT;
CREATE UNIQUE INDEX IF NOT EXISTS "students_clerkId_key" ON "students"("clerkId");
CREATE INDEX IF NOT EXISTS "students_classId_idx" ON "students"("classId");
CREATE INDEX IF NOT EXISTS "students_clerkId_idx" ON "students"("clerkId");
CREATE INDEX IF NOT EXISTS "teachers_schoolId_idx" ON "teachers"("schoolId");

-- PostgreSQL enum additions are additive and preserve all existing role values.
ALTER TYPE "TeacherRole" ADD VALUE IF NOT EXISTS 'FORM_TEACHER';
ALTER TYPE "TeacherRole" ADD VALUE IF NOT EXISTS 'VICE_PRINCIPAL';
ALTER TYPE "TeacherRole" ADD VALUE IF NOT EXISTS 'PRINCIPAL';
