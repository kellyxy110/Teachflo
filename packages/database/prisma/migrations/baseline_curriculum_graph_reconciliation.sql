-- Baseline Curriculum Intelligence Graph reconciliation.
-- Additive repository migration; Prisma supplies cuid() identifiers.
DO $$ BEGIN CREATE TYPE "NodeType" AS ENUM ('SUBJECT','TOPIC','CONCEPT','SKILL','LEARNING_OBJECTIVE','EXAM_STANDARD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "EdgeRelation" AS ENUM ('REQUIRES','EXTENDS','PART_OF','RELATED_TO','ASSESSED_BY','VISUALIZED_BY','PRACTICED_BY','APPEARS_IN','TEACHES_BEFORE','TEACHES_AFTER','CROSS_SUBJECT'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE "CurriculumDifficulty" AS ENUM ('EASY','MEDIUM','HARD'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS "curriculum_nodes" (
  "id" TEXT PRIMARY KEY, "schoolId" TEXT, "type" "NodeType" NOT NULL,
  "label" TEXT NOT NULL, "description" TEXT, "subject" TEXT,
  "classLevel" "ClassLevel", "term" "Term", "week" INTEGER,
  "difficulty" "CurriculumDifficulty", "estimatedMinutes" INTEGER,
  "bloomLevels" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "examStandards" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "keywords" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "misconceptions" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "formulae" JSONB, "metadata" JSONB, "version" INTEGER NOT NULL DEFAULT 1,
  "createdBy" TEXT, "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS "curriculum_nodes_type_idx" ON "curriculum_nodes"("type");
CREATE INDEX IF NOT EXISTS "curriculum_nodes_subject_classLevel_term_idx" ON "curriculum_nodes"("subject","classLevel","term");
CREATE INDEX IF NOT EXISTS "curriculum_nodes_schoolId_idx" ON "curriculum_nodes"("schoolId");

CREATE TABLE IF NOT EXISTS "curriculum_edges" (
  "id" TEXT PRIMARY KEY, "sourceId" TEXT NOT NULL, "targetId" TEXT NOT NULL,
  "relationship" "EdgeRelation" NOT NULL, "weight" DOUBLE PRECISION DEFAULT 1.0,
  "metadata" JSONB, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "curriculum_edges_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "curriculum_nodes"("id") ON DELETE CASCADE,
  CONSTRAINT "curriculum_edges_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "curriculum_nodes"("id") ON DELETE CASCADE,
  CONSTRAINT "curriculum_edges_sourceId_targetId_relationship_key" UNIQUE ("sourceId","targetId","relationship")
);
CREATE INDEX IF NOT EXISTS "curriculum_edges_sourceId_idx" ON "curriculum_edges"("sourceId");
CREATE INDEX IF NOT EXISTS "curriculum_edges_targetId_idx" ON "curriculum_edges"("targetId");
CREATE INDEX IF NOT EXISTS "curriculum_edges_relationship_idx" ON "curriculum_edges"("relationship");
