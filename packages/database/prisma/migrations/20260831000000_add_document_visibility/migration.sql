-- Additive visibility boundary for Documents. Existing rows remain school-visible.
CREATE TYPE "DocumentVisibility" AS ENUM ('PRIVATE', 'SCHOOL');
ALTER TABLE "documents" ADD COLUMN "visibility" "DocumentVisibility" NOT NULL DEFAULT 'SCHOOL';

CREATE INDEX "documents_school_visibility_teacher_idx"
  ON "documents" ("schoolId", "visibility", "teacherId");
