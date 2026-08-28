# TeachNexis Migration Reconciliation (Read-only Baseline)

## Observed repository state

Prisma recognizes these canonical migration directories:

- `0_init`
- `f8b_assessment_lifecycle`
- `f8e_grading_release`
- `f9b_curriculum_graph_foundation`
- `f9c_curriculum_ingestion`

The Development database reports these migrations as applied and up to date.

## Loose SQL inventory

Loose SQL files under `packages/database/prisma/migrations/` are historical/manual artifacts. They include baseline reconciliation scripts and feature-era scripts for Auth Identity, F6B reusable questions, Phase 1–8 work, and assessment components.

`f8b_assessment_lifecycle.sql` is byte-for-byte identical to the canonical `f8b_assessment_lifecycle/migration.sql` and must not be replayed.

The remaining loose files are not byte-for-byte duplicates of the five canonical migrations. Their presence alone does not prove that their objects are missing; Development harnesses successfully use the corresponding schema objects.

## Production state

No safe, separately identified Production `DATABASE_URL` or read-only Production migration snapshot is available in the current environment. Production `_prisma_migrations`, constraints, indexes, foreign keys, and enum state therefore remain unverified.

## Decision

No migration was created, rewritten, marked resolved, or applied. Replaying or packaging the loose SQL without Production state could duplicate manually-applied objects or alter migration order. Production deployment remains blocked until an owner-provided read-only Production schema/migration snapshot establishes the exact baseline and a deterministic additive path.
