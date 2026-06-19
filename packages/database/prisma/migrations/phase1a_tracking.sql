-- Phase 1A: Student Question Tracking — Data Foundation
-- Run this in Supabase SQL Editor (Dashboard → SQL Editor → New query)

-- 1. Attempt status enum
DO $$ BEGIN
  CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. Bloom's taxonomy level enum
DO $$ BEGIN
  CREATE TYPE "BloomsLevel" AS ENUM ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Exam attempts (student takes an exam)
CREATE TABLE IF NOT EXISTS exam_attempts (
  id TEXT PRIMARY KEY,
  "studentId" TEXT NOT NULL REFERENCES students(id),
  "examId" TEXT NOT NULL REFERENCES exams(id),
  "schoolId" TEXT NOT NULL,

  status "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
  "totalScore" DOUBLE PRECISION,
  "maxScore" DOUBLE PRECISION,
  percentage DOUBLE PRECISION,
  grade TEXT,

  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "submittedAt" TIMESTAMP(3),
  "gradedAt" TIMESTAMP(3),

  UNIQUE ("studentId", "examId")
);

-- 4. Question responses (one row per question per attempt)
CREATE TABLE IF NOT EXISTS question_responses (
  id TEXT PRIMARY KEY,
  "attemptId" TEXT NOT NULL REFERENCES exam_attempts(id) ON DELETE CASCADE,
  "questionId" TEXT NOT NULL REFERENCES questions(id),

  "selectedOption" TEXT,
  "textResponse" TEXT,
  "isCorrect" BOOLEAN,
  score DOUBLE PRECISION,
  "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 1,
  "timeSpentSeconds" INTEGER,

  misconception TEXT,
  feedback TEXT,

  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  UNIQUE ("attemptId", "questionId")
);

-- 5. Question tags (skill / topic metadata for Skill Graph)
CREATE TABLE IF NOT EXISTS question_tags (
  id TEXT PRIMARY KEY,
  "questionId" TEXT NOT NULL REFERENCES questions(id) ON DELETE CASCADE,

  skill TEXT NOT NULL,
  topic TEXT,
  subtopic TEXT,
  "bloomsLevel" "BloomsLevel",

  UNIQUE ("questionId", skill)
);

-- 6. Indexes
CREATE INDEX IF NOT EXISTS exam_attempts_school_idx ON exam_attempts ("schoolId");
CREATE INDEX IF NOT EXISTS exam_attempts_student_idx ON exam_attempts ("studentId");
CREATE INDEX IF NOT EXISTS question_responses_attempt_idx ON question_responses ("attemptId");
CREATE INDEX IF NOT EXISTS question_responses_question_idx ON question_responses ("questionId");
CREATE INDEX IF NOT EXISTS question_tags_skill_idx ON question_tags (skill);
CREATE INDEX IF NOT EXISTS question_tags_question_idx ON question_tags ("questionId");
