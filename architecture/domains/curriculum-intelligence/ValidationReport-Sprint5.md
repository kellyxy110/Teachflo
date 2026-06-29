# Validation Report: Sprint 5 — Educational Integrity

**Date:** 2026-06-28
**Sprint:** 5 — Educational Integrity Validation
**Capability:** Curriculum Intelligence Graph (CUR-001)
**Spec Version:** 1.0
**Impl Version:** 0.5
**Data scope:** Global nodes only (`"schoolId" IS NULL`) — 8 subjects, 97 topics, ~229 edges

---

## Result: ALL CHECKS PASSED ✅

---

## Check Results

| # | Check | Expected | Result |
|---|---|---|---|
| 1 | Node counts | SUBJECT=8, TOPIC=97 | ✅ PASS |
| 2 | Edge counts by relationship | PART_OF~97, REQUIRES~55, TEACHES_BEFORE~65, CROSS_SUBJECT~12 | ✅ PASS |
| 3 | Invalid `examStandards` values | 0 rows | ✅ PASS |
| 4 | `estimatedMinutes` outside [30, 120] | 0 rows | ✅ PASS |
| 5 | REQUIRES cycles | 0 rows | ✅ PASS |
| 6 | TEACHES_BEFORE branching | 0 rows | ✅ PASS |
| 7 | CROSS_SUBJECT same-subject edges | 0 rows | ✅ PASS |
| 8 | Topics missing PART_OF → SUBJECT | 0 rows | ✅ PASS |
| 9 | Orphaned edges | 0 rows | ✅ PASS |
| 10 | Leaf topics (informational) | Non-empty list expected | ✅ EXPECTED |

---

## Check 10 — Leaf Topics (Informational)

Leaf topics are TOPIC nodes with no incoming REQUIRES edge — no other topic declares them as a prerequisite. These are **entry points** to the curriculum graph. Every curriculum graph has them; they represent where students begin within each subject.

Expected leaf examples: "Introduction to Economics", "Basic Concepts in Government", "Introduction to Chemistry", "Cell Structure & Organisation", "Measurement & Units", etc.

These are correct and intentional.

---

## Graph Integrity Summary

| Property | Status |
|---|---|
| All topics traceable to a SUBJECT via PART_OF | ✅ Verified |
| No circular prerequisite chains | ✅ Verified |
| Sequential topic ordering is linear (no branch) | ✅ Verified |
| All exam standards are valid WAEC/NECO/JAMB values | ✅ Verified |
| All cross-subject edges span different subjects | ✅ Verified |
| No dangling edge endpoints | ✅ Verified |
| Estimated time within pedagogical bounds [30, 120 min] | ✅ Verified |

---

## Schema Validation Gate Updates

| # | Criterion | Status |
|---|---|---|
| 1–7 | Previously passed | ✅ PASS |
| 8 | Seed loads without integrity violations | ✅ PASS |
| 9 | Educational integrity: no circular prerequisites, REQUIRES chains are directional, TEACHES_BEFORE respects week order | ✅ PASS — verified by Sprint 5 SQL validation |
| 10 | Performance at launch scale | PENDING — requires query profiling at full seed (~720 topics) |

---

## Registry and Lifecycle Updates

- CUR-001 Impl Version: `0.5`
- Lifecycle Stage: **Testing → Ready for Sprint 4b**
- Gate 9 is now closed: educational integrity is validated on the current dataset

---

## Next Sprint

**Sprint 4b — Full Curriculum Expansion**

The current seed covers 97 topics (representative sample). A production-ready curriculum needs ~720 topics:

```
8 subjects × 3 class levels × 3 terms × ~10 topics = ~720 topics
```

Sprint 4b will:
- Expand each (subject, classLevel, term) bucket from 1–3 topics to 8–12 topics
- Follow the same NERDC topic sequence used in Nigerian secondary schools
- Re-run Sprint 5 validation queries after expansion to confirm no regressions
- Close Schema Validation Gate #10 after query profiling at full scale
