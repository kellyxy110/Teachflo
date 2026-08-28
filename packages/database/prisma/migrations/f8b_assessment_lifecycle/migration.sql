-- F8B: additive assessment lifecycle/publication persistence.
-- PROTECTED: no destructive operations; legacy Exam/Attempt/Question data remains valid.

CREATE TYPE "AssessmentLifecycle" AS ENUM ('DRAFT', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "ResultReleasePolicy" AS ENUM ('AFTER_SUBMISSION', 'AFTER_CLOSE', 'AFTER_TEACHER_RELEASE');
CREATE TYPE "AnswerReleasePolicy" AS ENUM ('NEVER', 'AFTER_TEACHER_RELEASE');
CREATE TYPE "AssessmentGradingMode" AS ENUM ('AUTO', 'MANUAL', 'MIXED');

ALTER TABLE "exams"
  ADD COLUMN "lifecycle" "AssessmentLifecycle" NOT NULL DEFAULT 'DRAFT',
  ADD COLUMN "instructions" TEXT,
  ADD COLUMN "opensAt" TIMESTAMP(3),
  ADD COLUMN "closesAt" TIMESTAMP(3),
  ADD COLUMN "timezone" TEXT,
  ADD COLUMN "resultReleasePolicy" "ResultReleasePolicy" NOT NULL DEFAULT 'AFTER_TEACHER_RELEASE',
  ADD COLUMN "answerReleasePolicy" "AnswerReleasePolicy" NOT NULL DEFAULT 'NEVER',
  ADD COLUMN "gradingMode" "AssessmentGradingMode" NOT NULL DEFAULT 'MIXED',
  ADD COLUMN "passMarkPercent" DOUBLE PRECISION,
  ADD COLUMN "draftRevision" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "publishedAt" TIMESTAMP(3),
  ADD COLUMN "archivedAt" TIMESTAMP(3);

CREATE TABLE "assessment_publications" (
  "id" TEXT NOT NULL,
  "examId" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "publishedByTeacherId" TEXT NOT NULL,
  "title" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "topic" TEXT NOT NULL,
  "classLevel" "ClassLevel" NOT NULL,
  "instructions" TEXT,
  "duration" INTEGER,
  "opensAt" TIMESTAMP(3),
  "closesAt" TIMESTAMP(3),
  "timezone" TEXT,
  "resultReleasePolicy" "ResultReleasePolicy" NOT NULL,
  "answerReleasePolicy" "AnswerReleasePolicy" NOT NULL,
  "gradingMode" "AssessmentGradingMode" NOT NULL,
  "passMarkPercent" DOUBLE PRECISION,
  "settingsSnapshot" JSONB,
  "contentHash" TEXT NOT NULL,
  "publishedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "assessment_publications_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "assessment_publication_items" (
  "id" TEXT NOT NULL,
  "publicationId" TEXT NOT NULL,
  "assessmentItemId" TEXT,
  "questionId" TEXT NOT NULL,
  "questionVersionId" TEXT NOT NULL,
  "order" INTEGER NOT NULL,
  "section" "Section" NOT NULL,
  "marks" DOUBLE PRECISION NOT NULL,
  "snapshot" JSONB NOT NULL,
  CONSTRAINT "assessment_publication_items_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "exam_attempts"
  ADD COLUMN "publicationId" TEXT,
  ADD COLUMN "deadlineAt" TIMESTAMP(3),
  ADD COLUMN "deliverySnapshot" JSONB;

ALTER TABLE "question_responses"
  ADD COLUMN "publicationItemId" TEXT;

CREATE UNIQUE INDEX "assessment_publications_examId_version_key" ON "assessment_publications"("examId", "version");
CREATE INDEX "assessment_publications_examId_idx" ON "assessment_publications"("examId");
CREATE INDEX "assessment_publications_publishedAt_idx" ON "assessment_publications"("publishedAt");
CREATE UNIQUE INDEX "assessment_publication_items_publicationId_order_key" ON "assessment_publication_items"("publicationId", "order");
CREATE UNIQUE INDEX "assessment_publication_items_publicationId_questionId_key" ON "assessment_publication_items"("publicationId", "questionId");
CREATE INDEX "assessment_publication_items_questionVersionId_idx" ON "assessment_publication_items"("questionVersionId");
CREATE INDEX "exam_attempts_publicationId_idx" ON "exam_attempts"("publicationId");
CREATE INDEX "question_responses_publicationItemId_idx" ON "question_responses"("publicationItemId");
CREATE INDEX "exams_schoolId_lifecycle_idx" ON "exams"("schoolId", "lifecycle");
CREATE INDEX "exams_opensAt_closesAt_idx" ON "exams"("opensAt", "closesAt");

ALTER TABLE "assessment_publications" ADD CONSTRAINT "assessment_publications_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_publications" ADD CONSTRAINT "assessment_publications_publishedByTeacherId_fkey" FOREIGN KEY ("publishedByTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_publication_items" ADD CONSTRAINT "assessment_publication_items_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "assessment_publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_publication_items" ADD CONSTRAINT "assessment_publication_items_assessmentItemId_fkey" FOREIGN KEY ("assessmentItemId") REFERENCES "assessment_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_publication_items" ADD CONSTRAINT "assessment_publication_items_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "assessment_publication_items" ADD CONSTRAINT "assessment_publication_items_questionVersionId_fkey" FOREIGN KEY ("questionVersionId") REFERENCES "question_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_publicationId_fkey" FOREIGN KEY ("publicationId") REFERENCES "assessment_publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_publicationItemId_fkey" FOREIGN KEY ("publicationItemId") REFERENCES "assessment_publication_items"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
