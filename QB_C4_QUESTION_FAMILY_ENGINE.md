# QB-C4 Question Family Engine

QB-C4 adds a typed, application-controlled factory for deterministic Question candidates. It reuses the canonical `Question`, `QuestionVersion`, `QuestionCorpusMetadata`, curriculum-alignment, lifecycle, provenance, and fingerprint contracts from QB-C3.

## Contract and registry

Each registered family has a stable key, version, subject, class level, supported QuestionTypes, and deterministic renderer. The initial bounded SS1 Mathematics families are:

- `ss1-mathematics-linear-equation-v1`
- `ss1-mathematics-algebra-simplification-v1`
- `ss1-mathematics-ratio-proportion-v1`
- `ss1-mathematics-arithmetic-progression-v1`
- `ss1-mathematics-percentage-application-v1`

The definitions are internal deterministic capabilities, not claims of official curriculum authority. Callers supply the curriculum node/version alignment; the factory records it as `INTERNAL_UNVERIFIED` until a published F9 alignment is available.

## Generation and verification

Generation is seedable and rejects unsupported QuestionTypes. The independent verifier reruns the family calculation from the seed and compares its result with the candidate answer; it does not parse or trust the rendered stem. Candidate validation returns blockers and warnings for structured review, including MCQ option uniqueness/presence, provenance safety, lifecycle, and curriculum requirements.

## Provenance and lifecycle

Every deterministic candidate is `DETERMINISTIC_GENERATED`, `DETERMINISTIC`, and `DRAFT`. An assessment style such as `WAEC_STYLE` describes presentation only and never creates `VERIFIED_PAST_QUESTION` provenance.

## Persistence boundary

`persistValidatedQuestionCandidate` reauthorizes an active teacher within the supplied school, checks exact-fingerprint duplicates within that school, writes the canonical Question and immutable version, stores corpus metadata, and creates proposed curriculum alignments in one transaction. It never approves, publishes, or inserts an Assessment item. A duplicate retry returns the existing version identity.

Approved assets are ordinary reusable Questions and require no later model call. Teacher edits must use the existing new-version workflow.

## Future path and limitations

The engine is intentionally bounded: it does not mass-generate, calibrate empirical difficulty, perform semantic duplicate detection, call an AI provider, or provide a review UI. Future phases can add broader family coverage and review/coverage tooling while retaining this candidate and teacher-review boundary.
