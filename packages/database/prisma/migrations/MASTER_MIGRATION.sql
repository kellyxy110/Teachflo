-- ============================================================
-- TeachFlow OS — Master Migration
-- Run this ONCE in Supabase SQL Editor
-- Includes: base schema + pgvector + Phase 1A + Phase 1B
-- ============================================================

-- ── 0. Extensions ────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 1. Enums ─────────────────────────────────────────────────

DO $$ BEGIN CREATE TYPE "Plan" AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "TeacherRole" AS ENUM ('TEACHER', 'HOD', 'ADMIN', 'SUPER_ADMIN'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ClassLevel" AS ENUM ('JS1', 'JS2', 'JS3', 'SS1', 'SS2', 'SS3'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Term" AS ENUM ('FIRST', 'SECOND', 'THIRD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LessonMode" AS ENUM ('STANDARD', 'ELI12', 'WAEC', 'JAMB', 'JUPEB'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "ExamType" AS ENUM ('SCHOOL_TEST', 'SCHOOL_EXAM', 'WAEC_MOCK', 'JAMB_PREP', 'JUPEB_PREP'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Difficulty" AS ENUM ('BASIC', 'APPLICATION', 'WAEC', 'JAMB', 'JUPEB'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "Section" AS ENUM ('A', 'B', 'C'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'SHORT_ANSWER', 'ESSAY', 'STRUCTURED', 'CALCULATION'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "HomeworkStatus" AS ENUM ('ACTIVE', 'CLOSED', 'ARCHIVED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "LibraryCategory" AS ENUM ('TEXTBOOK', 'REVISION_GUIDE', 'PAST_QUESTIONS', 'FORMULA_SHEET', 'TEACHER_NOTES', 'AI_NOTES'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "BloomsLevel" AS ENUM ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ── 2. Base Tables ────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lga" TEXT,
    "address" TEXT,
    "logoUrl" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "teachers" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TeacherRole" NOT NULL DEFAULT 'TEACHER',
    "subjects" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "classes" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "ClassLevel" NOT NULL,
    "arm" TEXT,
    "term" "Term" NOT NULL DEFAULT 'FIRST',
    "session" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "students" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "regNumber" TEXT,
    "gender" "Gender",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "scores" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "term" "Term" NOT NULL,
    "session" TEXT NOT NULL,
    "ca1" DOUBLE PRECISION,
    "ca2" DOUBLE PRECISION,
    "exam" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "grade" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "lessons" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "classLevel" "ClassLevel" NOT NULL,
    "week" INTEGER,
    "term" "Term",
    "objectives" TEXT[],
    "introduction" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "activities" JSONB[],
    "evaluation" TEXT[],
    "homework" TEXT[],
    "mode" "LessonMode" NOT NULL DEFAULT 'STANDARD',
    "aiModel" TEXT,
    "promptTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "exams" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "classLevel" "ClassLevel" NOT NULL,
    "examType" "ExamType" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "duration" INTEGER,
    "aiModel" TEXT,
    "promptTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "questions" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "section" "Section" NOT NULL,
    "number" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "stem" TEXT NOT NULL,
    "optionA" TEXT,
    "optionB" TEXT,
    "optionC" TEXT,
    "optionD" TEXT,
    "optionE" TEXT,
    "correctOption" TEXT,
    "questionText" TEXT,
    "markScheme" TEXT,
    "solution" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "distractors" JSONB,
    "commonMistakes" TEXT,
    "examTip" TEXT,
    "curriculumRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "homework" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "HomeworkStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "homework_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "library_items" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "classLevel" "ClassLevel",
    "topic" TEXT,
    "category" "LibraryCategory" NOT NULL,
    "examType" "ExamType",
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "pageCount" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isAIGenerated" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "library_items_pkey" PRIMARY KEY ("id")
);

-- ── 3. Phase 1A — Student Tracking ───────────────────────────

CREATE TABLE IF NOT EXISTS "exam_attempts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "totalScore" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "grade" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),
    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "question_responses" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOption" TEXT,
    "textResponse" TEXT,
    "isCorrect" BOOLEAN,
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "timeSpentSeconds" INTEGER,
    "misconception" TEXT,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "question_responses_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "question_tags" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "topic" TEXT,
    "subtopic" TEXT,
    "bloomsLevel" "BloomsLevel",
    CONSTRAINT "question_tags_pkey" PRIMARY KEY ("id")
);

-- ── 4. Phase 1B — Documents ───────────────────────────────────

CREATE TABLE IF NOT EXISTS "documents" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "classLevel" "ClassLevel",
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "pageCount" INTEGER,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- ── 5. Phase 6 — pgvector Tables ─────────────────────────────

CREATE TABLE IF NOT EXISTS "lesson_embeddings" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector(1024) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "lesson_embeddings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "question_embeddings" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector(1024) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "question_embeddings_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "document_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector(1024) NOT NULL,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- ── 6. Unique Indexes ─────────────────────────────────────────

CREATE UNIQUE INDEX IF NOT EXISTS "schools_code_key" ON "schools"("code");
CREATE UNIQUE INDEX IF NOT EXISTS "teachers_clerkId_key" ON "teachers"("clerkId");
CREATE UNIQUE INDEX IF NOT EXISTS "teachers_schoolId_email_key" ON "teachers"("schoolId", "email");
CREATE UNIQUE INDEX IF NOT EXISTS "classes_schoolId_name_session_key" ON "classes"("schoolId", "name", "session");
CREATE UNIQUE INDEX IF NOT EXISTS "students_schoolId_regNumber_key" ON "students"("schoolId", "regNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "scores_studentId_subject_term_session_key" ON "scores"("studentId", "subject", "term", "session");
CREATE UNIQUE INDEX IF NOT EXISTS "exam_attempts_studentId_examId_key" ON "exam_attempts"("studentId", "examId");
CREATE UNIQUE INDEX IF NOT EXISTS "question_responses_attemptId_questionId_key" ON "question_responses"("attemptId", "questionId");
CREATE UNIQUE INDEX IF NOT EXISTS "question_tags_questionId_skill_key" ON "question_tags"("questionId", "skill");
CREATE UNIQUE INDEX IF NOT EXISTS "lesson_embeddings_lessonId_key" ON "lesson_embeddings"("lessonId");
CREATE UNIQUE INDEX IF NOT EXISTS "question_embeddings_questionId_key" ON "question_embeddings"("questionId");

-- ── 7. Standard Indexes ───────────────────────────────────────

CREATE INDEX IF NOT EXISTS "exam_attempts_schoolId_idx" ON "exam_attempts"("schoolId");
CREATE INDEX IF NOT EXISTS "question_tags_skill_idx" ON "question_tags"("skill");
CREATE INDEX IF NOT EXISTS "documents_schoolId_idx" ON "documents"("schoolId");
CREATE INDEX IF NOT EXISTS "lesson_embeddings_schoolId_idx" ON "lesson_embeddings"("schoolId");
CREATE INDEX IF NOT EXISTS "question_embeddings_schoolId_idx" ON "question_embeddings"("schoolId");
CREATE INDEX IF NOT EXISTS "document_chunks_schoolId_idx" ON "document_chunks"("schoolId");
CREATE INDEX IF NOT EXISTS "document_chunks_documentId_idx" ON "document_chunks"("documentId");

-- ── 8. HNSW Vector Indexes (cosine similarity) ────────────────

CREATE INDEX IF NOT EXISTS "lesson_embeddings_hnsw_idx"
    ON "lesson_embeddings" USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS "question_embeddings_hnsw_idx"
    ON "question_embeddings" USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

CREATE INDEX IF NOT EXISTS "document_chunks_hnsw_idx"
    ON "document_chunks" USING hnsw (embedding vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ── 9. Foreign Keys ───────────────────────────────────────────

ALTER TABLE "teachers"
    ADD CONSTRAINT "teachers_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "classes"
    ADD CONSTRAINT "classes_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "students"
    ADD CONSTRAINT "students_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "students"
    ADD CONSTRAINT "students_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "classes"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "scores"
    ADD CONSTRAINT "scores_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "scores"
    ADD CONSTRAINT "scores_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "scores"
    ADD CONSTRAINT "scores_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "classes"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "scores"
    ADD CONSTRAINT "scores_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "teachers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "lessons"
    ADD CONSTRAINT "lessons_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "lessons"
    ADD CONSTRAINT "lessons_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "teachers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "lessons"
    ADD CONSTRAINT "lessons_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "classes"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "exams"
    ADD CONSTRAINT "exams_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "exams"
    ADD CONSTRAINT "exams_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "teachers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "exams"
    ADD CONSTRAINT "exams_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "classes"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "questions"
    ADD CONSTRAINT "questions_examId_fkey"
    FOREIGN KEY ("examId") REFERENCES "exams"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "homework"
    ADD CONSTRAINT "homework_teacherId_fkey"
    FOREIGN KEY ("teacherId") REFERENCES "teachers"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "homework"
    ADD CONSTRAINT "homework_classId_fkey"
    FOREIGN KEY ("classId") REFERENCES "classes"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "library_items"
    ADD CONSTRAINT "library_items_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id")
    ON DELETE SET NULL ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "exam_attempts"
    ADD CONSTRAINT "exam_attempts_studentId_fkey"
    FOREIGN KEY ("studentId") REFERENCES "students"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "exam_attempts"
    ADD CONSTRAINT "exam_attempts_examId_fkey"
    FOREIGN KEY ("examId") REFERENCES "exams"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "question_responses"
    ADD CONSTRAINT "question_responses_attemptId_fkey"
    FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "question_responses"
    ADD CONSTRAINT "question_responses_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "questions"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "question_tags"
    ADD CONSTRAINT "question_tags_questionId_fkey"
    FOREIGN KEY ("questionId") REFERENCES "questions"("id")
    ON DELETE CASCADE ON UPDATE CASCADE
    NOT VALID;

ALTER TABLE "documents"
    ADD CONSTRAINT "documents_schoolId_fkey"
    FOREIGN KEY ("schoolId") REFERENCES "schools"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE
    NOT VALID;
