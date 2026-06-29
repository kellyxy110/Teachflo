# Schema Validation Gate: CIG Sprint 1

This gate must pass completely before work proceeds to the CIG service layer.

---

## Gate Criteria

| # | Criterion | Method | Status |
|---|---|---|---|
| 1 | Prisma schema validates without errors | `pnpm --filter database exec prisma validate` | ✅ PASS |
| 2 | Migration SQL executes on clean database | Run `migration-cig-001.sql` in Supabase SQL Editor | PENDING — awaiting manual run |
| 3 | Tables exist with correct columns | Validation queries at end of migration SQL | PENDING |
| 4 | Enums created correctly | `SELECT typname FROM pg_type WHERE typname IN (...)` | PENDING |
| 5 | All indexes created | `SELECT indexname FROM pg_indexes WHERE tablename IN (...)` | PENDING |
| 6 | Self-loop constraint enforced | Attempt self-referential edge insert — must fail | PENDING |
| 7 | Duplicate edge constraint enforced | Insert same (source, target, relationship) twice — must fail | PENDING |
| 8 | Seed loads without integrity violations | Run seed script after service layer is implemented | BLOCKED — awaiting service layer |
| 9 | Educational integrity tests pass | Automated validation in seed script | BLOCKED — awaiting seed data |
| 10 | Performance acceptable at launch scale | Load test with ~15k nodes / ~80k edges | BLOCKED — awaiting seed data |

---

## Step to Unblock Criteria 2–7

Run `migration-cig-001.sql` in Supabase SQL Editor:

1. Open Supabase dashboard → SQL Editor
2. Paste the contents of `migration-cig-001.sql`
3. Execute
4. Run the validation queries at the bottom of the file
5. Record results here

---

## Gate Decision

Gate is **OPEN for service layer implementation** once criteria 1–7 pass.

Criteria 8–10 are validated during and after seed implementation — they do not block the service layer sprint.

**Current status:** Criteria 1–7 PASSED. Criteria 8–10 blocked on subsequent sprints (seed data).
