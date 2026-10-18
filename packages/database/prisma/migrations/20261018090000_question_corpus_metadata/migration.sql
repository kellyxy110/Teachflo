CREATE TABLE "question_corpus_metadata" (
  "id" TEXT NOT NULL,
  "questionVersionId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "classLevel" "ClassLevel" NOT NULL,
  "term" "Term",
  "topic" TEXT NOT NULL,
  "subtopic" TEXT,
  "questionType" "QuestionType" NOT NULL,
  "difficulty" TEXT NOT NULL,
  "cognitiveSkills" TEXT[] NOT NULL,
  "assessmentProfiles" TEXT[] NOT NULL,
  "calculatorPolicy" TEXT NOT NULL,
  "estimatedTimeSeconds" INTEGER NOT NULL,
  "marks" DOUBLE PRECISION NOT NULL,
  "prerequisiteNodeIds" TEXT[] NOT NULL,
  "familyKey" TEXT,
  "familyVariant" JSONB,
  "generationMethod" TEXT,
  "verifierId" TEXT,
  "verifierVersion" TEXT,
  "origin" TEXT NOT NULL,
  "provenanceVerification" TEXT NOT NULL,
  "exactFingerprint" TEXT NOT NULL,
  "normalizedFingerprint" TEXT NOT NULL,
  "familyVariantFingerprint" TEXT NOT NULL,
  "reviewStatus" "QuestionLifecycle" NOT NULL DEFAULT 'DRAFT',
  CONSTRAINT "question_corpus_metadata_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "question_corpus_metadata_questionVersionId_key" ON "question_corpus_metadata"("questionVersionId");
CREATE INDEX "question_corpus_metadata_exactFingerprint_idx" ON "question_corpus_metadata"("exactFingerprint");
CREATE INDEX "question_corpus_metadata_normalizedFingerprint_idx" ON "question_corpus_metadata"("normalizedFingerprint");
CREATE INDEX "question_corpus_metadata_familyVariantFingerprint_idx" ON "question_corpus_metadata"("familyVariantFingerprint");
CREATE INDEX "question_corpus_metadata_familyKey_idx" ON "question_corpus_metadata"("familyKey");
ALTER TABLE "question_corpus_metadata" ADD CONSTRAINT "question_corpus_metadata_questionVersionId_fkey" FOREIGN KEY ("questionVersionId") REFERENCES "question_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
