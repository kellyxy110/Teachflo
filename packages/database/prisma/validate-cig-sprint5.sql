-- =============================================================================
-- TeachNexis CIG — Sprint 5: Educational Integrity Validation
-- CUR-001 Spec 1.0 | Run each block separately in Supabase SQL Editor.
-- PASS = 0 rows returned. Any rows returned = FAIL with detail.
-- =============================================================================

-- ─── CHECK 1: Sanity counts (informational — not a pass/fail) ────────────────
-- Expected post Sprint-4b+4c: SUBJECT ~14 (8 SS + 6 JSS-specific), TOPIC ~618 (330 SS + 288 JSS)
SELECT "type"::TEXT AS node_type, count(*) AS count
FROM curriculum_nodes
WHERE "schoolId" IS NULL
GROUP BY "type";

-- ─── CHECK 2: Edge counts by relationship (informational) ────────────────────
-- Expected post Sprint-4b+4c: CROSS_SUBJECT ~51, PART_OF ~618, REQUIRES ~132, TEACHES_BEFORE ~473
SELECT e."relationship"::TEXT AS relationship, count(*) AS count
FROM curriculum_edges e
JOIN curriculum_nodes n ON n."id" = e."sourceId"
WHERE n."schoolId" IS NULL
GROUP BY e."relationship"
ORDER BY e."relationship";

-- ─── CHECK 3: Invalid examStandards ──────────────────────────────────────────
-- PASS = 0 rows. Any row means a topic has a value outside {WAEC, NECO, JAMB}.
SELECT n."label", n."subject", n."classLevel"::TEXT, s.standard
FROM curriculum_nodes n
CROSS JOIN LATERAL unnest(n."examStandards") AS s(standard)
WHERE n."type" = 'TOPIC'::"NodeType"
  AND n."schoolId" IS NULL
  AND s.standard NOT IN ('WAEC', 'NECO', 'JAMB');

-- ─── CHECK 4: estimatedMinutes out of range ───────────────────────────────────
-- PASS = 0 rows. Spec range: [30, 120] minutes.
-- Topics with NULL estimatedMinutes are also flagged.
SELECT "label", "subject", "classLevel"::TEXT, "estimatedMinutes"
FROM curriculum_nodes
WHERE "type" = 'TOPIC'::"NodeType"
  AND "schoolId" IS NULL
  AND (
    "estimatedMinutes" IS NULL
    OR "estimatedMinutes" < 30
    OR "estimatedMinutes" > 120
  );

-- ─── CHECK 5: REQUIRES cycles ─────────────────────────────────────────────────
-- PASS = 0 rows. Any row means node X can reach itself through REQUIRES edges.
-- Uses recursive CTE with depth guard (50 hops) for cycle detection.
WITH RECURSIVE reachable AS (
  SELECT
    e."sourceId" AS origin,
    e."targetId" AS reached,
    1             AS depth
  FROM curriculum_edges e
  WHERE e."relationship"::TEXT = 'REQUIRES'

  UNION ALL

  SELECT
    r.origin,
    e."targetId",
    r.depth + 1
  FROM reachable r
  JOIN curriculum_edges e ON e."sourceId" = r.reached
  WHERE e."relationship"::TEXT = 'REQUIRES'
    AND r.depth < 50
)
SELECT DISTINCT
  n."label"   AS cycle_node,
  n."subject" AS subject
FROM reachable rx
JOIN curriculum_nodes n ON n."id" = rx.origin
WHERE rx.origin = rx.reached;

-- ─── CHECK 6: TEACHES_BEFORE branching (within same classLevel) ──────────────
-- PASS = 0 rows. A topic should TEACHES_BEFORE at most 1 other topic
-- within the same classLevel. Bridge edges (JSS3→SS1) cross classLevel
-- and are intentionally excluded here — they are not branching errors.
SELECT
  n."label"       AS source_topic,
  n."subject"     AS subject,
  n."classLevel"::TEXT AS class_level,
  n."term"::TEXT  AS term,
  count(*)        AS teaches_before_count
FROM curriculum_edges e
JOIN curriculum_nodes n ON n."id" = e."sourceId"
JOIN curriculum_nodes t ON t."id" = e."targetId"
WHERE e."relationship"::TEXT = 'TEACHES_BEFORE'
  AND n."schoolId" IS NULL
  AND n."classLevel" = t."classLevel"
GROUP BY n."id", n."label", n."subject", n."classLevel", n."term"
HAVING count(*) > 1;

-- ─── CHECK 7: CROSS_SUBJECT edges connecting same-subject nodes ───────────────
-- PASS = 0 rows. Cross-subject edges must connect nodes from DIFFERENT subjects.
SELECT
  a."label"   AS source_label,
  a."subject" AS source_subject,
  b."label"   AS target_label,
  b."subject" AS target_subject
FROM curriculum_edges e
JOIN curriculum_nodes a ON a."id" = e."sourceId"
JOIN curriculum_nodes b ON b."id" = e."targetId"
WHERE e."relationship"::TEXT = 'CROSS_SUBJECT'
  AND a."subject" = b."subject"
  AND a."schoolId" IS NULL;

-- ─── CHECK 8: Topics missing their PART_OF → SUBJECT edge ────────────────────
-- PASS = 0 rows. Every TOPIC must have a PART_OF edge pointing to
-- the SUBJECT node whose label matches the topic's subject field.
SELECT
  t."label"       AS topic,
  t."subject"     AS expected_parent_subject,
  t."classLevel"::TEXT AS class_level
FROM curriculum_nodes t
WHERE t."type"     = 'TOPIC'::"NodeType"
  AND t."schoolId" IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM curriculum_edges e
    JOIN curriculum_nodes s ON s."id" = e."targetId"
    WHERE e."sourceId"         = t."id"
      AND e."relationship"::TEXT = 'PART_OF'
      AND s."label"            = t."subject"
      AND s."type"             = 'SUBJECT'::"NodeType"
  );

-- ─── CHECK 9: Orphaned edges (dangling sourceId or targetId) ─────────────────
-- PASS = 0 rows. All edge endpoints must exist in curriculum_nodes.
SELECT
  e."id"                  AS edge_id,
  e."relationship"::TEXT  AS relationship,
  e."sourceId",
  e."targetId",
  CASE
    WHEN src."id" IS NULL AND tgt."id" IS NULL THEN 'both endpoints missing'
    WHEN src."id" IS NULL THEN 'source missing'
    ELSE 'target missing'
  END AS problem
FROM curriculum_edges e
LEFT JOIN curriculum_nodes src ON src."id" = e."sourceId"
LEFT JOIN curriculum_nodes tgt ON tgt."id" = e."targetId"
WHERE src."id" IS NULL OR tgt."id" IS NULL;

-- ─── CHECK 10: REQUIRES coverage (informational) ─────────────────────────────
-- Lists topics that have NO incoming REQUIRES edge (no topic depends on them).
-- These are "leaf" topics — expected for foundational topics. Not a bug.
SELECT
  n."label"       AS leaf_topic,
  n."subject",
  n."classLevel"::TEXT AS class_level
FROM curriculum_nodes n
WHERE n."type"     = 'TOPIC'::"NodeType"
  AND n."schoolId" IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM curriculum_edges e
    WHERE e."targetId"          = n."id"
      AND e."relationship"::TEXT = 'REQUIRES'
  )
ORDER BY n."subject", n."classLevel", n."label";
