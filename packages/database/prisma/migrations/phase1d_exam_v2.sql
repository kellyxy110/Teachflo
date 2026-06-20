-- =====================================================
-- Phase 1D: AI Exam 2.0 — Adaptive Assessment Engine
-- Run in Supabase SQL Editor
-- =====================================================

-- Exam mode enum
DO $$ BEGIN
  CREATE TYPE "ExamMode" AS ENUM ('STANDARD', 'DIAGNOSTIC', 'PRACTICE', 'ASSESSMENT', 'ADAPTIVE');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Add v2 columns to exams
ALTER TABLE exams ADD COLUMN IF NOT EXISTS "examMode" "ExamMode" DEFAULT 'STANDARD';
ALTER TABLE exams ADD COLUMN IF NOT EXISTS "blueprint" JSONB;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS "totalQuestions" INT;
ALTER TABLE exams ADD COLUMN IF NOT EXISTS "targetStudentId" TEXT;

-- Add v2 columns to exam_attempts
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS "examMode" "ExamMode" DEFAULT 'STANDARD';
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS "analytics" JSONB;
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS "currentDifficulty" TEXT DEFAULT 'medium';
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS "questionsAnswered" INT DEFAULT 0;
ALTER TABLE exam_attempts ADD COLUMN IF NOT EXISTS "adaptiveState" JSONB;

-- Add v2 columns to questions
ALTER TABLE questions ADD COLUMN IF NOT EXISTS "difficulty" TEXT DEFAULT 'medium';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS "bloomLevel" TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS "skillTag" TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS "topicTag" TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS "subTopicTag" TEXT;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS "questionSource" TEXT DEFAULT 'synthetic';
ALTER TABLE questions ADD COLUMN IF NOT EXISTS "estimatedTime" INT DEFAULT 90;
ALTER TABLE questions ADD COLUMN IF NOT EXISTS "relatedChunkIds" TEXT[];

-- Add misconception analysis columns to question_responses
ALTER TABLE question_responses ADD COLUMN IF NOT EXISTS "errorType" TEXT;
ALTER TABLE question_responses ADD COLUMN IF NOT EXISTS "difficultyAtTime" TEXT;

-- Index for adaptive queries
CREATE INDEX IF NOT EXISTS idx_questions_difficulty ON questions ("difficulty");
CREATE INDEX IF NOT EXISTS idx_questions_skill ON questions ("skillTag");
CREATE INDEX IF NOT EXISTS idx_exam_attempts_mode ON exam_attempts ("examMode");
