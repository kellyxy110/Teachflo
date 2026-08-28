# STEM-A1 Mathematical Content Capability Map

## Existing capability

- KaTeX `0.17.0` is already the single math dependency.
- `MathText` renders mixed `$inline$` and `$$display$$` content.
- `KaTeXPreview` and `LaTeXToolbar` provide bounded teacher authoring assistance.
- Question and QuestionVersion content remain backward-compatible strings/JSON; no schema change was made.
- Existing exam v2, AI preview, teacher detail, grading/result surfaces already use or can use the shared renderer.

## Canonical representation

The source of truth remains ordinary text containing explicit `$...$` or `$$...$$` delimiters. Rendered HTML is a derived view only. This supports round-trip author → save → load → edit and preserves compatibility with existing Question/QuestionVersion payloads, CSV/XLSX future fields, and later DOCX/OMML normalization.

## Safety and renderer contract

`MathText` now escapes non-math text before injecting KaTeX output, supports multiline inline/block expressions, and uses KaTeX `throwOnError: false` for graceful malformed-input fallback. No unsanitized teacher, student, imported, or AI HTML is accepted.

The same renderer is used for Question Bank content and the publication-aware Student player, including MCQ options. Curriculum alignment remains separate in F9B QuestionVersion alignment records.

## Known bounded gaps

- Authoring remains textarea plus symbol palette; MathLive/rich structured equation editing is intentionally deferred.
- Student mathematical answer entry remains plain text; no CAS or symbolic equivalence grading is introduced.
- DOCX OMML extraction and CSV/XLSX import fields remain future seams.
- Browser-authenticated runtime and print/PDF acceptance remain pending.
