-- F6B reviewed additive migration. Development application only; no destructive operations.
BEGIN;

CREATE TYPE "QuestionLifecycle" AS ENUM ('DRAFT','REVIEW','APPROVED','ARCHIVED');
CREATE TYPE "QuestionSourceKind" AS ENUM ('TEACHER','AI','IMPORTED','PAST_QUESTION','SYSTEM');
CREATE TYPE "QuestionVisibility" AS ENUM ('PRIVATE','SCHOOL','SYSTEM');

ALTER TABLE "questions" ALTER COLUMN "examId" DROP NOT NULL;
ALTER TABLE "questions" ADD COLUMN "schoolId" TEXT;
ALTER TABLE "questions" ADD COLUMN "createdByTeacherId" TEXT;
ALTER TABLE "questions" ADD COLUMN "lifecycle" "QuestionLifecycle" NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "questions" ADD COLUMN "sourceKind" "QuestionSourceKind" NOT NULL DEFAULT 'TEACHER';
ALTER TABLE "questions" ADD COLUMN "visibility" "QuestionVisibility" NOT NULL DEFAULT 'PRIVATE';
ALTER TABLE "questions" ADD COLUMN "defaultMarks" DOUBLE PRECISION;

CREATE TABLE "question_versions" (
  "id" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "payload" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "question_versions_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "question_versions_questionId_version_key" ON "question_versions"("questionId", "version");
CREATE INDEX "question_versions_questionId_idx" ON "question_versions"("questionId");

CREATE TABLE "assessment_items" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "questionId" TEXT NOT NULL,
  "questionVersionId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "section" "Section" NOT NULL,
  "marksOverride" DOUBLE PRECISION,
  "snapshot" JSONB,
  CONSTRAINT "assessment_items_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "assessment_items_examId_order_key" ON "assessment_items"("examId", "order");
CREATE INDEX "assessment_items_examId_idx" ON "assessment_items"("examId");
CREATE INDEX "assessment_items_questionId_idx" ON "assessment_items"("questionId");
CREATE INDEX "assessment_items_questionVersionId_idx" ON "assessment_items"("questionVersionId");

ALTER TABLE "questions" ADD CONSTRAINT "questions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "questions" ADD CONSTRAINT "questions_createdByTeacherId_fkey" FOREIGN KEY ("createdByTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_questionVersionId_fkey" FOREIGN KEY ("questionVersionId") REFERENCES "question_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Idempotent backfill: one immutable version and one assessment item per legacy question.
INSERT INTO "question_versions" ("id", "questionId", "version", "payload")
SELECT 'f6v_' || q."id", q."id", 1,
  jsonb_build_object('type', q."type", 'stem', q."stem", 'optionA', q."optionA", 'optionB', q."optionB", 'optionC', q."optionC", 'optionD', q."optionD", 'optionE', q."optionE", 'correctOption', q."correctOption", 'solution', q."solution", 'explanation', q."explanation", 'markScheme', q."markScheme")
FROM "questions" q
WHERE NOT EXISTS (SELECT 1 FROM "question_versions" v WHERE v."questionId" = q."id" AND v."version" = 1);

INSERT INTO "assessment_items" ("id", "examId", "questionId", "questionVersionId", "order", "section")
SELECT 'f6i_' || q."id", q."examId", q."id", 'f6v_' || q."id", q."number", q."section"
FROM "questions" q
WHERE q."examId" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "assessment_items" i WHERE i."examId" = q."examId" AND i."questionId" = q."id");

CREATE INDEX "questions_schoolId_idx" ON "questions"("schoolId");
CREATE INDEX "questions_createdByTeacherId_idx" ON "questions"("createdByTeacherId");
CREATE INDEX "questions_lifecycle_visibility_idx" ON "questions"("lifecycle", "visibility");
COMMIT;
