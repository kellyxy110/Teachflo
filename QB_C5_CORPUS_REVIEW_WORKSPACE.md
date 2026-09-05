# QB-C5 Corpus Review Workspace

QB-C5 provides a Teacher-facing review queue over the canonical Question and QuestionVersion records. It does not create a parallel Question model or generate corpus content.

## Workflow

The workspace is server-rendered with bounded pagination and exposes one question at a time for focused decisions. A Teacher can move previous/next, preview content, edit, approve, reject, or return an archived rejection to draft. Queue progress is shown without loading the complete corpus into the browser.

Questions are scoped by authenticated school and Teacher ownership, with school-visible questions handled by the existing access rules. Future filters can use subject, level, term, topic, QuestionType, difficulty, cognitive skill, assessment profile, family, provenance, validation state, and lifecycle through the same paginated service.

## Validation and approval

Approval is a server action. Corpus metadata is validated through the QB-C3 contract before approval; a failed hard gate rejects the transition. Approval never publishes an assessment or inserts an Assessment item. Generated content remains DRAFT until the Teacher approves it.

## Editing and versioning

Editing updates the current Question projection and creates a new QuestionVersion. Historical versions are never overwritten. The new version returns to DRAFT and must pass validation again before approval.

## Rejection and family feedback

Rejection uses bounded categories such as incorrect answer, poor wording, duplicate, wrong curriculum alignment, inappropriate difficulty, weak distractors, poor solution, and unsuitable question. A bounded note is retained in a new version payload. The decision structure is suitable for future QB-C6 family-quality metrics without automated family mutation.

## Provenance and evidence

The review surface displays deterministic, AI, imported, Teacher, extracted, and verified-past-question origins distinctly. WAEC_STYLE, NECO_STYLE, and JAMB_STYLE are assessment styles only. Existing source-backed questions continue to use canonical source evidence and existing permission checks; no client excerpt becomes authoritative.

## Batch and tenant safety

The current workspace keeps decisions per question. Any future batch action must authorize every selected Question and execute the same validation/transition function individually, reporting partial failures. No cross-school or private-Teacher content may be shown as duplicate evidence.

## Accessibility and responsive behavior

The review card uses semantic buttons, labels, visible focus states, readable MathText, and a responsive metadata hierarchy. Actions are available without hover and the single-question layout remains usable on small screens.

## Future QB-C6 integration

QB-C6 may add coverage orchestration and deterministic metrics such as queue counts, approval/rejection rates, topic coverage, and family outcomes. Approved Questions remain permanent Question Bank assets and require no LLM call for retrieval.
