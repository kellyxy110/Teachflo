-- Additive, school-scoped assessment components for flexible result imports.
-- Score.total remains the supplied source total; component values are detail
-- rows used for display and discrepancy validation only.

CREATE TABLE IF NOT EXISTS "assessment_components" (
  "id" TEXT PRIMARY KEY,
  "schoolId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "normalizedName" TEXT NOT NULL,
  "maxScore" DOUBLE PRECISION,
  "order" INTEGER NOT NULL DEFAULT 0,
  "category" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("schoolId", "normalizedName")
);
CREATE INDEX IF NOT EXISTS "assessment_components_schoolId_order_idx" ON "assessment_components"("schoolId", "order");

CREATE TABLE IF NOT EXISTS "score_assessment_component_values" (
  "id" TEXT PRIMARY KEY,
  "scoreId" TEXT NOT NULL REFERENCES "scores"("id") ON DELETE CASCADE,
  "assessmentComponentId" TEXT NOT NULL REFERENCES "assessment_components"("id") ON DELETE RESTRICT,
  "obtainedScore" DOUBLE PRECISION,
  "sourceLabel" TEXT,
  "sourceMaxScore" DOUBLE PRECISION,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE ("scoreId", "assessmentComponentId")
);
CREATE INDEX IF NOT EXISTS "score_assessment_component_values_assessmentComponentId_idx" ON "score_assessment_component_values"("assessmentComponentId");
