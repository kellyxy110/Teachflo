-- CIG Migration 001: Curriculum Intelligence Graph
-- Run this in Supabase SQL Editor (NOT prisma db push — IPv6 restriction)
-- Safe to re-run: uses IF NOT EXISTS throughout

BEGIN;

-- ─────────────────────────────────────────────
-- Enums
-- ─────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE "NodeType" AS ENUM (
    'SUBJECT',
    'TOPIC',
    'CONCEPT',
    'SKILL',
    'LEARNING_OBJECTIVE',
    'EXAM_STANDARD'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "EdgeRelation" AS ENUM (
    'REQUIRES',
    'EXTENDS',
    'PART_OF',
    'RELATED_TO',
    'ASSESSED_BY',
    'VISUALIZED_BY',
    'PRACTICED_BY',
    'APPEARS_IN',
    'TEACHES_BEFORE',
    'TEACHES_AFTER',
    'CROSS_SUBJECT'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE "CurriculumDifficulty" AS ENUM (
    'EASY',
    'MEDIUM',
    'HARD'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- CurriculumNode
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "curriculum_nodes" (
  "id"               TEXT        NOT NULL DEFAULT gen_random_uuid()::text,
  "schoolId"         TEXT,
  "type"             "NodeType"  NOT NULL,
  "label"            TEXT        NOT NULL,
  "description"      TEXT,
  "subject"          TEXT,
  "classLevel"       "ClassLevel",
  "term"             "Term",
  "week"             INTEGER,
  "difficulty"       "CurriculumDifficulty",
  "estimatedMinutes" INTEGER,
  "bloomLevels"      TEXT[]      NOT NULL DEFAULT '{}',
  "examStandards"    TEXT[]      NOT NULL DEFAULT '{}',
  "keywords"         TEXT[]      NOT NULL DEFAULT '{}',
  "misconceptions"   TEXT[]      NOT NULL DEFAULT '{}',
  "formulae"         JSONB,
  "metadata"         JSONB,
  "version"          INTEGER     NOT NULL DEFAULT 1,
  "createdBy"        TEXT,
  "isActive"         BOOLEAN     NOT NULL DEFAULT true,
  "createdAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  "updatedAt"        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT "curriculum_nodes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "curriculum_nodes_type_idx"
  ON "curriculum_nodes"("type");

CREATE INDEX IF NOT EXISTS "curriculum_nodes_subject_classLevel_term_idx"
  ON "curriculum_nodes"("subject", "classLevel", "term");

CREATE INDEX IF NOT EXISTS "curriculum_nodes_schoolId_idx"
  ON "curriculum_nodes"("schoolId");

CREATE INDEX IF NOT EXISTS "curriculum_nodes_keywords_idx"
  ON "curriculum_nodes" USING GIN("keywords");

CREATE INDEX IF NOT EXISTS "curriculum_nodes_isActive_idx"
  ON "curriculum_nodes"("isActive")
  WHERE "isActive" = true;

-- ─────────────────────────────────────────────
-- CurriculumEdge
-- ─────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS "curriculum_edges" (
  "id"           TEXT            NOT NULL DEFAULT gen_random_uuid()::text,
  "sourceId"     TEXT            NOT NULL,
  "targetId"     TEXT            NOT NULL,
  "relationship" "EdgeRelation"  NOT NULL,
  "weight"       DOUBLE PRECISION DEFAULT 1.0,
  "metadata"     JSONB,
  "createdAt"    TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  CONSTRAINT "curriculum_edges_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "curriculum_edges_source_fkey"
    FOREIGN KEY ("sourceId") REFERENCES "curriculum_nodes"("id") ON DELETE CASCADE,
  CONSTRAINT "curriculum_edges_target_fkey"
    FOREIGN KEY ("targetId") REFERENCES "curriculum_nodes"("id") ON DELETE CASCADE,
  CONSTRAINT "curriculum_edges_unique"
    UNIQUE ("sourceId", "targetId", "relationship"),
  CONSTRAINT "curriculum_edges_no_self_loop"
    CHECK ("sourceId" != "targetId")
);

CREATE INDEX IF NOT EXISTS "curriculum_edges_sourceId_idx"
  ON "curriculum_edges"("sourceId");

CREATE INDEX IF NOT EXISTS "curriculum_edges_targetId_idx"
  ON "curriculum_edges"("targetId");

CREATE INDEX IF NOT EXISTS "curriculum_edges_relationship_idx"
  ON "curriculum_edges"("relationship");

-- ─────────────────────────────────────────────
-- updatedAt trigger for curriculum_nodes
-- ─────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_curriculum_node_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS curriculum_nodes_updated_at ON "curriculum_nodes";
CREATE TRIGGER curriculum_nodes_updated_at
  BEFORE UPDATE ON "curriculum_nodes"
  FOR EACH ROW EXECUTE FUNCTION update_curriculum_node_updated_at();

COMMIT;

-- ─────────────────────────────────────────────
-- Validation queries (run after COMMIT to verify)
-- ─────────────────────────────────────────────

-- Confirm tables exist:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_name IN ('curriculum_nodes', 'curriculum_edges');

-- Confirm enums exist:
-- SELECT typname FROM pg_type
-- WHERE typname IN ('NodeType', 'EdgeRelation', 'CurriculumDifficulty');

-- Confirm indexes exist:
-- SELECT indexname FROM pg_indexes
-- WHERE tablename IN ('curriculum_nodes', 'curriculum_edges');

-- Confirm self-loop constraint works:
-- INSERT INTO curriculum_nodes (type, label) VALUES ('TOPIC', 'Test');
-- (get the id from above, then:)
-- INSERT INTO curriculum_edges (sourceId, targetId, relationship)
-- VALUES ('<same-id>', '<same-id>', 'REQUIRES');
-- → Should fail with: violates check constraint "curriculum_edges_no_self_loop"
