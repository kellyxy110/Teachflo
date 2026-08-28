# F9C Curriculum Ingestion Implementation

Implemented additively in Development:

- `CurriculumSource` with SHA-256 fingerprint uniqueness and authority/verification metadata.
- `CurriculumIngestionJob` with bounded state machine, revision, raw hash, retry identity, and failure fields.
- `CurriculumStagedItem` preserving raw evidence, normalized candidate data, source location, confidence, review revision, reviewer, and published node linkage.
- Server-authoritative registration, transitions, deterministic normalization, validation, review edit/reject/approve, and transactional idempotent publication services.
- Privileged authorization using existing administrator roles; ordinary Teachers cannot publish canonical curriculum.
- Development-only synthetic F9C harness with cleanup.

Not implemented: real curriculum ingestion, scraping, OCR/parser adapters, AI extraction, review UI, bulk approval, exam-syllabus ingestion, Scheme of Work, Question Import, mastery, or Production migration.

Migration: `packages/database/prisma/migrations/f9c_curriculum_ingestion/migration.sql`; additive only. Existing F9B nodes and QuestionVersion alignments remain compatible and are not remapped.
