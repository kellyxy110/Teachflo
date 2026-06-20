-- =====================================================
-- Phase 2A/2B/3A: TeachFlow Unified Intelligence Core
-- Run in Supabase SQL Editor
-- =====================================================

-- ── Phase 2B: Mistake Intelligence ──────────────────

CREATE TABLE IF NOT EXISTS mistake_patterns (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  "schoolId" TEXT NOT NULL,
  skill TEXT NOT NULL,
  "errorType" TEXT NOT NULL,
  pattern TEXT NOT NULL,
  "rootCause" TEXT,
  "prerequisiteGap" TEXT,
  occurrences INT DEFAULT 1,
  "lastSeen" TIMESTAMP DEFAULT now(),
  "firstSeen" TIMESTAMP DEFAULT now(),
  resolved BOOLEAN DEFAULT false,
  "createdAt" TIMESTAMP DEFAULT now(),
  UNIQUE("studentId", skill, "errorType")
);

CREATE INDEX IF NOT EXISTS idx_mistake_patterns_student ON mistake_patterns ("studentId");
CREATE INDEX IF NOT EXISTS idx_mistake_patterns_school ON mistake_patterns ("schoolId");
CREATE INDEX IF NOT EXISTS idx_mistake_patterns_skill ON mistake_patterns (skill);

-- ── Phase 2A: Adaptive Learning Paths ───────────────

CREATE TABLE IF NOT EXISTS learning_paths (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "studentId" TEXT NOT NULL REFERENCES students(id) ON DELETE CASCADE,
  "schoolId" TEXT NOT NULL,
  subject TEXT NOT NULL,
  "classLevel" TEXT NOT NULL,
  steps JSONB NOT NULL DEFAULT '[]',
  "currentStep" INT DEFAULT 0,
  status TEXT DEFAULT 'ACTIVE',
  "lastComputedAt" TIMESTAMP DEFAULT now(),
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now(),
  UNIQUE("studentId", subject)
);

CREATE INDEX IF NOT EXISTS idx_learning_paths_student ON learning_paths ("studentId");
CREATE INDEX IF NOT EXISTS idx_learning_paths_school ON learning_paths ("schoolId");

-- ── Phase 3A: Curriculum Plans ──────────────────────

CREATE TABLE IF NOT EXISTS curriculum_plans (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "schoolId" TEXT NOT NULL,
  "teacherId" TEXT NOT NULL,
  subject TEXT NOT NULL,
  "classLevel" TEXT NOT NULL,
  term TEXT NOT NULL,
  session TEXT NOT NULL,
  title TEXT NOT NULL,
  weeks JSONB NOT NULL DEFAULT '[]',
  "assessmentSchedule" JSONB,
  "revisionCycles" JSONB,
  "performanceContext" JSONB,
  "aiModel" TEXT,
  "createdAt" TIMESTAMP DEFAULT now(),
  "updatedAt" TIMESTAMP DEFAULT now(),
  UNIQUE("schoolId", subject, "classLevel", term, session)
);

CREATE INDEX IF NOT EXISTS idx_curriculum_plans_school ON curriculum_plans ("schoolId");
CREATE INDEX IF NOT EXISTS idx_curriculum_plans_teacher ON curriculum_plans ("teacherId");
