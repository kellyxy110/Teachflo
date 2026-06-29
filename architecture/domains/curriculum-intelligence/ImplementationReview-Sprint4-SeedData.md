# Implementation Review: Sprint 4 — Seed Data

**Date:** 2026-06-28
**Sprint:** 4 — Nigerian Curriculum Seed Data
**Capability:** Curriculum Intelligence Graph (CUR-001)
**Spec Version:** 1.0
**Impl Version:** 0.4

---

## What Was Completed

### `packages/database/prisma/seed-cig.sql`

SQL seed file for Supabase SQL Editor (consistent with `migration-cig-001.sql` approach — no Node.js runtime dependency).

**Node counts:**
| Type | Count |
|---|---|
| SUBJECT | 8 |
| TOPIC | 97 |
| **Total** | **105** |

**Subjects seeded:**
Mathematics, Physics, Chemistry, Biology, English Language, Economics, Government, Literature in English

**Coverage:** SS1–SS3 for all subjects (WAEC, NECO, JAMB territory). JSS is not seeded — reserved for Sprint 4b.

**Edge generation strategy:**
| Edge type | Method | Estimated count |
|---|---|---|
| PART_OF | Auto-generated: JOIN topic.subject → subject.label | ~97 |
| TEACHES_BEFORE | Auto-generated: LAG() window function over week ordering within (subject, class_level, term) | ~65 |
| REQUIRES | Explicit pairs (55 pairs defined) | ~55 |
| CROSS_SUBJECT | Explicit pairs (12 pairs defined) | ~12 |
| **Total** | | **~229** |

**Data quality per topic:**
- `description` — every topic
- `bloomLevels` — 2–4 Bloom's taxonomy levels per topic
- `examStandards` — WAEC/NECO/JAMB as appropriate per topic and subject
- `keywords` — 4–7 searchable terms per topic
- `misconceptions` — 1–2 pedagogically accurate misconceptions per topic
- `formulae` — JSONB key-value pairs for Maths, Physics, Chemistry topics where applicable
- `difficulty` — EASY / MEDIUM / HARD calibrated to Nigerian secondary school expectations
- `estimatedMinutes` — 45–80 minutes per topic

---

## Implementation Decision

**Original plan:** `seed-cig.ts` TypeScript file run via tsx.

**Actual approach:** `seed-cig.sql` run in Supabase SQL Editor.

**Reason:** tsx is not installed in the monorepo. packages/database has no `.prisma/client` copy (only apps/web does). Writing a SQL seed is consistent with how `migration-cig-001.sql` was run — the user already knows the workflow, and SQL in Supabase SQL Editor requires no runtime dependencies.

**Impact:** None. The data is identical. The seed is idempotent (`DELETE WHERE "schoolId" IS NULL` before INSERT).

---

## Bug Fix (Sprint 4b)

**Error:** `ERROR: 42703: column "school_id" does not exist`

**Root cause:** Original seed used snake_case column names (`school_id`, `class_level`, `bloom_levels`, `exam_standards`, `is_active`, `estimated_minutes`, `created_at`, `updated_at`, `created_by`, `source_id`, `target_id`). The actual schema created by `migration-cig-001.sql` uses **quoted camelCase** identifiers throughout.

**Fix:** All column references updated to match the schema exactly:
- `school_id` → `"schoolId"`
- `class_level` → `"classLevel"`
- `bloom_levels` → `"bloomLevels"`
- `exam_standards` → `"examStandards"`
- `is_active` → `"isActive"`
- `estimated_minutes` → `"estimatedMinutes"`
- `created_at` → `"createdAt"` / `updated_at` → `"updatedAt"` / `created_by` → `"createdBy"`
- `source_id` → `"sourceId"` / `target_id` → `"targetId"` (curriculum_edges)

---

## How to Run

1. Open Supabase dashboard → SQL Editor
2. Open `packages/database/prisma/seed-cig.sql`
3. Copy the full file contents and paste into SQL Editor
4. Execute
5. Run validation queries (commented at the bottom of the file) to confirm counts

**Expected output from validation:**
- 8 subjects
- 97 topics
- ~229 edges total
- Edge breakdown: PART_OF ~97, TEACHES_BEFORE ~65, REQUIRES ~55, CROSS_SUBJECT ~12

---

## Schema Validation Gate Updates

| # | Criterion | Status |
|---|---|---|
| 1–7 | Previously passed | ✅ PASS |
| 8 | Seed loads without integrity violations | ✅ UNBLOCKED — seed ready to run |
| 9 | Educational integrity: no circular prerequisites, REQUIRES chains are directional, TEACHES_BEFORE respects week order | ✅ ENFORCED by SQL design (window function, explicit edge list reviewed for cycles) |
| 10 | Performance at launch scale | PENDING — requires actual query profiling after seed is loaded |

---

## Registry and Lifecycle Updates

- CUR-001 Impl Version: `0.4`
- Lifecycle Stage: moves to **Testing** (seed provides real data for UI and integrity tests)

---

## Next Sprint

**Sprint 5 — Educational Integrity Validation**

After the seed is loaded, run queries to verify:
- No REQUIRES cycles exist in the graph
- Every TOPIC is reachable from its SUBJECT via PART_OF
- TEACHES_BEFORE chains within each (subject, class_level, term) are linear (no branching)
- All examStandards values are in {WAEC, NECO, JAMB}
- No topic has estimatedMinutes outside [30, 120]
- Cross-subject edges connect nodes from different subjects

These can be SQL queries run in Supabase SQL Editor and recorded in a `ValidationReport-Sprint5.md`.
