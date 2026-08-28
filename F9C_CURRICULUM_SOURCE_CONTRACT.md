# F9C Curriculum Source Contract

A source is registered evidence, not canonical curriculum. Registration requires a deterministic SHA-256 fingerprint, title, source type, authority classification, and target Curriculum. Optional metadata is stored only when evidenced: organization, URL, file identity, MIME/size, publication/effective year, jurisdiction, country, license note, and verifier.

Authority values are bounded: `OFFICIAL`, `INSTITUTIONAL`, `VERIFIED_SECONDARY`, `TEACHER_PROVIDED`, `UNKNOWN`. A filename or AI confidence never establishes authority. Unknown licensing and provenance remain unknown.

The same fingerprint returns the existing source. A changed fingerprint or changed raw hash creates a new ingestion revision; it never mutates a published CurriculumVersion.

Supported future source types are official documents, institutional sources, structured datasets, teacher-provided material, and unknown. PDF/DOCX/JSON/CSV/XLSX parsing is an extraction concern; this contract stores evidence independently of parser choice.
