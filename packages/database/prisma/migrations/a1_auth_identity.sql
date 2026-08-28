-- TeachNexis A1: additive provider-neutral identity mapping.
-- Legacy Teacher.clerkId and Student.clerkId remain intact for rollback.

DO $$ BEGIN
  CREATE TYPE "AuthProvider" AS ENUM ('CLERK', 'SUPABASE');
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "auth_identities" (
  "id" TEXT NOT NULL,
  "provider" "AuthProvider" NOT NULL,
  "providerUserId" TEXT NOT NULL,
  "teacherId" TEXT,
  "studentId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "auth_identities_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "auth_identities_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "auth_identities_provider_providerUserId_key"
  ON "auth_identities"("provider", "providerUserId");
CREATE UNIQUE INDEX IF NOT EXISTS "auth_identities_teacherId_key"
  ON "auth_identities"("teacherId") WHERE "teacherId" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "auth_identities_studentId_key"
  ON "auth_identities"("studentId") WHERE "studentId" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "auth_identities_providerUserId_idx"
  ON "auth_identities"("providerUserId");

-- Preserve existing Clerk-linked actors in the provider-neutral map.
INSERT INTO "auth_identities" ("id", "provider", "providerUserId", "teacherId", "createdAt", "updatedAt")
SELECT 'clerk_teacher_' || t."id", 'CLERK', t."clerkId", t."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "teachers" t
WHERE t."clerkId" IS NOT NULL
ON CONFLICT ("provider", "providerUserId") DO NOTHING;

INSERT INTO "auth_identities" ("id", "provider", "providerUserId", "studentId", "createdAt", "updatedAt")
SELECT 'clerk_student_' || s."id", 'CLERK', s."clerkId", s."id", CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "students" s
WHERE s."clerkId" IS NOT NULL
ON CONFLICT ("provider", "providerUserId") DO NOTHING;
