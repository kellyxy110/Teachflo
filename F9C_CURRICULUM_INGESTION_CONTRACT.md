# F9C Curriculum Ingestion Contract

## Pipeline

```text
REGISTERED → VALIDATING → EXTRACTING → NORMALIZING → STAGED
→ NEEDS_REVIEW → APPROVED → PUBLISHING → PUBLISHED
```

Failure and cancellation are terminal until an explicit retry/cancel operation. No unreviewed extraction can create canonical nodes.

## Staged evidence

Each staged candidate preserves raw text, normalized label/text, type, parent stable key, subject/level/term context, page/section evidence, extraction/classification confidence, review revision, reviewer, and eventual published node ID. Staging is disposable and may be edited, rejected, or retried without changing published history.

## Authority and approval

Only privileged `ADMIN`/`SUPER_ADMIN` school actors can register, review, approve, or publish in the current implementation. This is a bounded interim seam; a future platform curriculum-admin role is required for globally authoritative publications. Ordinary Teachers are denied rather than granted a client-side admin flag.

## Validation

Hard blockers include missing label/raw evidence, orphan parent, and invalid candidate structure. Warnings include missing page/section evidence. Duplicate stable keys and source fingerprints are deterministic database/application checks. AI confidence is never authority.

## Publication

Publishing runs in a transaction, upserts nodes by `(CurriculumVersion, stableKey)`, creates idempotent `PART_OF` edges, marks staged candidates published, and advances the job state. Retrying a published job returns an idempotent result. A new source revision targets a new CurriculumVersion and cannot mutate the prior version.

## Re-import and diff

Unchanged fingerprint/raw hash returns the existing job. Changed content creates a new revision for review. Additions, changes, moves, and source removals are review concerns; absence never hard-deletes canonical history.

## Future extraction adapters

Text PDF extraction should precede OCR; scanned/OCR output is marked evidence. DOCX adapters must preserve headings, tables, lists, and OMML where possible. CSV/XLSX and Teacher Question Import remain separate pipelines sharing only bounded validation/staging primitives.
