# TeachNexis Curriculum Graph Contract (F9A)

Status: architecture proposal; no schema or data changes applied.

## Purpose

The Curriculum Graph is the versioned academic knowledge layer connecting curriculum meaning to school teaching, reusable Questions, immutable assessments, Lessons, and future learning evidence. It is not a content dump, a question generator, or a mastery score.

## Canonical concepts

`Curriculum` identifies an authority or framework (for example a national curriculum or an examination syllabus). `CurriculumVersion` identifies a reviewed release/edition of that framework. A version is immutable after publication; corrections create a new version.

`CurriculumNode` remains the graph substrate and represents a subject, topic, concept, skill, objective, or framework-specific standard. Nodes belong to one CurriculumVersion in the proposed model. `LearningObjective` is represented as a typed node with objective text and structured metadata; a separate table is unnecessary initially.

`CurriculumEdge` remains the relationship substrate. F9A narrows the semantic core to `PART_OF`, `REQUIRES` (prerequisite), `EXTENDS`, and `RELATED_TO`; existing edge values remain for compatibility and are not reinterpreted silently.

## Hierarchy and dimensions

The normal navigation path is:

```text
Curriculum → CurriculumVersion → level node → subject node
  → topic/concept → learning objective
```

Level, class/grade, term, and sequence are dimensions on a node or placement, not duplicated operational classes. `ClassLevel` remains the current operational compatibility value (`JS1`–`SS3`). A future `EducationLevel` registry can support Primary, Junior Secondary, Senior Secondary, and Tertiary Foundation without changing `Class`.

Terms (`FIRST`, `SECOND`, `THIRD`) remain school-calendar values. Curriculum placement may reference a term/period, but a curriculum period is not a School session. `week` is optional sequencing metadata, never identity.

Subtopics are ordinary nested nodes, not a permanently special second table. This supports Topic → Subtopic → Concept and deeper nesting.

## Ownership and lifecycle

Global canonical curriculum is read-only to ordinary Teachers. Privileged curriculum administrators/import reviewers may create reviewed versions. School and Teacher extensions are scoped to their School/Teacher and cannot mutate canonical nodes.

Proposed lifecycle: `DRAFT → REVIEWED → PUBLISHED → ARCHIVED`. Only published versions are authoritative for public/AI grounding. Archived versions remain readable for historical interpretation. School extensions may use the same lifecycle but do not become global.

## Provenance and identity

Every imported node/objective requires source organization, document title, edition/year, source URL (when available), page/section, extraction method, importedAt, reviewer, verifiedAt, and a confidence/notes field. Missing provenance means `UNVERIFIED`, not authoritative.

Stable identity uses `(curriculum, externalKey)` where a source supplies a durable identifier; otherwise a reviewed normalized key composed from parent path, subject/level, and source label is proposed. Display labels alone are never identity. Imports are idempotent on the stable key and source version.

## Versioning rules

Published CurriculumVersions and their nodes are immutable. Corrections, renamed concepts, or changed objectives create a new version and explicit replacement/supersession links. Historical Questions, QuestionVersions, AssessmentPublicationItems, Attempts, and Responses continue to resolve their original QuestionVersion; adding curriculum alignment never rewrites those records.

## Question alignment

Curriculum alignment belongs to `QuestionVersion`, through an explicit many-to-many alignment join to a CurriculumNode/objective and the relevant CurriculumVersion. A Question-level convenience summary may be derived, but it is not authoritative. This is required because a revised QuestionVersion may change the objective tested while the canonical Question identity remains stable.

An alignment records alignment status (`UNMAPPED`, `PROPOSED`, `REVIEWED`, `APPROVED`, `REJECTED`), confidence/notes, provenance, and reviewer. One version may align to multiple objectives; one objective may have many versions. F6 free-text fields remain untouched and are treated as legacy/unmapped until reviewed.

## Examination alignment

An examination syllabus is a framework-specific alignment layer, not a synonym for Curriculum membership. A future `ExamSyllabus` and versioned objective/node join may connect WAEC, NECO, JAMB, and JUPEB objectives to canonical curriculum nodes and QuestionVersions. No alignment is claimed from prompt text or `examStandards[]` alone.

## Lesson and scheme-of-work seams

Future Lesson alignment should reference CurriculumNode/objective IDs in an additive join; existing `Lesson.topic` and `objectives[]` remain compatibility text. A School Scheme of Work is a school-owned ordered placement of canonical nodes/objectives, with local pacing, term, week, and teacher notes. Schools customize sequence without editing the canonical graph.

## AI grounding seam

AI generation context is a read-only, structured package: curriculum/version, level, subject, term, node path, objective IDs/text, approved exam alignments, assessment purpose, and existing approved question coverage. AI output remains `AI_GENERATED` and requires Teacher review before authoritative use.

## Evidence seam

The future evidence path is:

```text
Student → ExamAttempt → QuestionResponse → QuestionVersion
         → QuestionVersionCurriculumAlignment → LearningObjective
```

This permits evidence statements such as “response evidence exists for Objective X.” It does not create mastery. Mastery requires a later evidence policy, aggregation rules, and uncertainty handling.

## Coverage formulas

Coverage is deterministic and denominator-aware. For a scope, objective coverage is `approved aligned Questions or Lessons / objectives in the published scope`; unknown/unmapped items are excluded from the numerator and reported separately. Assessment coverage counts publication items pinned to approved alignments. No percentage is shown when the denominator is zero.

## Authorization

Canonical read access may be global where product policy permits. School/private nodes, scheme-of-work records, Questions, and alignments are server-scoped by School and authenticated Teacher. Client-provided `schoolId`, `teacherId`, or ownership fields are never authoritative.

## Scale and query contract

All graph reads are bounded: direct children, bounded prerequisite depth, paginated search, and explicit filters. Avoid recursive unbounded queries and N+1 traversal. PostgreSQL indexes on version, parent/path, type, subject, level, term, and stable keys are sufficient initially. Existing PostgreSQL text/array search should be extended before introducing a dedicated search engine; external search is justified only after measured query/scale evidence.

## Import contract

```text
SOURCE → EXTRACT → NORMALIZE → MATCH → HUMAN REVIEW
       → APPROVE → PUBLISH → VERSIONED GRAPH
```

Scraped or AI-extracted material never becomes canonical directly. Duplicate matching must use stable source keys and reviewed parent context, not title equality alone. Failed/unknown matches remain quarantined or `UNMAPPED`.

## UI contract

The future Curriculum Explorer uses progressive navigation (level → subject → period → topic → objective), breadcrumbs, bounded search, and mobile drill-down/filter drawers. The Question Bank can expose reviewed curriculum context as filters and metadata without requiring a complete graph in browser memory.
