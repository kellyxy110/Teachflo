# Implementation Review: Sprint 4b — Full Curriculum Expansion

**Date:** 2026-06-28
**Sprint:** 4b — Full Curriculum Expansion
**Capability:** Curriculum Intelligence Graph (CUR-001)
**Spec Version:** 1.0
**Impl Version:** 0.6

---

## What Was Completed

### `packages/database/prisma/seed-cig.sql` — full replacement

Expanded from 97 sparse topics (Sprint 4) to ~330 full topics covering all 8 subjects × SS1–SS3 × 3 terms at 4–7 topics per (subject, classLevel, term) bucket.

**Node counts (post-Sprint 4b):**
| Type | Count |
|---|---|
| SUBJECT | 8 |
| TOPIC | ~330 |

**Subjects:**
| Subject | SS1 | SS2 | SS3 | Total |
|---|---|---|---|---|
| Mathematics | 20 | 17 | 13 | 50 |
| Physics | 17 | 16 | 11 | 44 |
| Chemistry | 17 | 16 | 12 | 45 |
| Biology | 17 | 15 | 12 | 44 |
| English Language | 14 | 13 | 10 | 37 |
| Economics | 14 | 13 | 12 | 39 |
| Government | 14 | 13 | 11 | 38 |
| Literature in English | 12 | 12 | 9 | 33 |
| **Total** | | | | **~330** |

**Edge strategy (unchanged from Sprint 4):**
| Edge type | Method | Expected count |
|---|---|---|
| PART_OF | Auto: JOIN topic.subject → subject.label | ~330 |
| TEACHES_BEFORE | Auto: LAG() window over week within (subject, classLevel, term) | ~250 |
| REQUIRES | Explicit: 94 pairs covering inter-bucket prerequisite chains for all 8 subjects | ~94 |
| CROSS_SUBJECT | Explicit: 21 pairs covering thematic cross-discipline links | ~21 |
| **Total** | | **~695** |

**REQUIRES coverage highlights:**
- Mathematics: indices→logs, factorisation→quadratics, trig chain, differentiation chain, statistics chain
- Physics: kinematics chain (measurement→scalars→velocity→motion→momentum), waves, atomic
- Chemistry: atomic→bonding→organic→hydrocarbons chain, acids, metals
- Biology: cell→division→genetics→evolution chain, ecology, molecular
- English: grammar→clauses→conditionals, essay progression, formal writing chain
- Economics: intro→demand→supply→price mechanism, production→costs→revenue→market structures, international trade chain
- Government: constitutional chain, colonial history chain (pre-colonial→conquest→indirect rule→constitutional development→independence)
- Literature: poetry chain, drama chain, prose chain → WAEC set texts

**CROSS_SUBJECT links:**
- Maths ↔ Physics: Differentiation/Velocity, Vectors/Scalars, Trigonometry/Waves, Exponential functions/Radioactivity
- Maths ↔ Biology: Statistics/Genetics, Probability/Genetics
- Chemistry ↔ Physics: Atomic Structure overlap
- Chemistry ↔ Biology: Rates of Reaction/Enzymes, Organic Chemistry/Biological Molecules, Nitrogen compounds/Nutrient cycles, Carbon/Nutrient cycles, Water/Osmosis, Pharmaceuticals/Disease
- Physics ↔ Biology: Energy Sources/Environmental Pollution
- Economics ↔ Government: Fiscal Policy/Arms of Government, International Trade/Globalisation, Agricultural Development/Agriculture
- Literature ↔ English: Literary Devices/Figures of Speech, Literary Essay/Argumentative Essay

---

## Seed Approach

**Method:** Single SQL file run in Supabase SQL Editor.
**Idempotency:** `DELETE FROM curriculum_nodes WHERE "schoolId" IS NULL` at top of file clears all global nodes (and cascades to edges via FK) before re-inserting.
**Chunked authoring:** Each subject was written as a separate INSERT statement to avoid output token limits. This has no effect on the final SQL.

---

## How to Re-Run

1. Open Supabase SQL Editor
2. Paste full contents of `packages/database/prisma/seed-cig.sql`
3. Execute
4. Re-run Sprint 5 validation queries from `packages/database/prisma/validate-cig-sprint5.sql`

**Expected post-Sprint-4b validation results:**
- Check 1: SUBJECT=8, TOPIC≈330
- Check 2: PART_OF≈330, TEACHES_BEFORE≈250, REQUIRES≈94, CROSS_SUBJECT≈21
- Checks 3–9: 0 rows (PASS)
- Check 10: leaf topics (informational, expected)

---

## Schema Validation Gate Updates

| # | Criterion | Status |
|---|---|---|
| 1–9 | Previously passed on 97-topic seed | ✅ PASS — re-validate after Sprint 4b |
| 10 | Performance at launch scale | PENDING — requires query profiling on ~330-topic dataset |

---

## Registry and Lifecycle Updates

- CUR-001 Impl Version: `0.6`
- Lifecycle Stage: **Testing** — re-run Sprint 5 validation to confirm no regressions at expanded scale

---

## Next Sprints

| Sprint | Description |
|---|---|
| 5 (re-run) | Re-run educational integrity validation on ~330-topic dataset |
| 4c | JSS1–JSS3 curriculum seed (8 subjects × 3 class levels × 3 terms) |
| CUR-003 | Lesson Generator — AI-driven lesson plans from CIG nodes |
| AIO-001 | AI model routing (Groq/DeepSeek/Qwen3/Gemma 4) |
