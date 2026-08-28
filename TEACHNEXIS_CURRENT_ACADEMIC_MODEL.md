# TeachNexis Current Academic Model

## Scope and evidence

This map reflects the Prisma schema, existing curriculum services, shared constants, AI prompts, import services, and F6–F8 contracts as inspected for F9A. It describes what exists today; it is not a proposed migration.

## Operational relationships

```text
School
├── Teacher
├── Class (level, term, session)
│   └── Student
├── Subject values (currently strings on operational records)
├── Lesson (subject, topic, classLevel, term)
├── Exam (subject, topic, classLevel, examType)
├── Question (optional examId, school, free-text curriculum fields)
└── Score (subject, class, term, session)
```

Assessment history is separate but connected:

```text
Question → QuestionVersion → AssessmentItem
Exam → AssessmentPublication → AssessmentPublicationItem
ExamAttempt → AssessmentPublication
QuestionResponse → Question / publication item / attempt
```

The historical chain is authoritative for delivered content and grading. Curriculum context must attach to it without rewriting it.

## Existing curriculum graph

`CurriculumNode` is a global-or-school-scoped graph node with `NodeType` values `SUBJECT`, `TOPIC`, `CONCEPT`, `SKILL`, `LEARNING_OBJECTIVE`, and `EXAM_STANDARD`. It stores optional `subject`, `classLevel`, `term`, `week`, labels, descriptions, arrays for Bloom levels/exam standards/keywords/misconceptions, and flexible JSON metadata. `schoolId = null` denotes a global read-only node; a non-null value denotes a school extension.

`CurriculumEdge` provides typed relationships (`REQUIRES`, `EXTENDS`, `PART_OF`, `RELATED_TO`, `ASSESSED_BY`, `VISUALIZED_BY`, `PRACTICED_BY`, `APPEARS_IN`, `TEACHES_BEFORE`, `TEACHES_AFTER`, `CROSS_SUBJECT`) with duplicate and self-loop protections in service code. Traversal is bounded in code.

The graph is therefore a useful existing foundation, but it is not yet a versioned curriculum registry: there is no canonical `Curriculum`, `CurriculumVersion`, provenance record, stable external identity, or first-class alignment join to Questions/Lessons.

## Current representation classification

| Concept | Current representation | Classification | Evidence / risk |
|---|---|---|---|
| School | `School` model | CANONICAL | Tenant root and server authorization boundary. |
| Teacher | `Teacher` model | CANONICAL | Attribution and ownership. |
| Student/Class | `Student`, `Class` | CANONICAL | Operational cohort; `Class.level` is the current grade dimension. |
| Level/grade | `ClassLevel` enum (`JS1`–`SS3`) | CANONICAL_OPERATIONAL | Adequate for current Nigerian secondary app, not a multi-curriculum registry. |
| Term | `Term` enum (`FIRST`–`THIRD`) | CANONICAL_OPERATIONAL | School calendar value; must remain distinct from curriculum sequencing. |
| Subject | String fields plus `SubjectAlias` | DENORMALIZED/HYBRID | No global subject entity; aliases are school-scoped. |
| Topic | `CurriculumNode.TOPIC` plus free text on `Lesson`, `Exam`, `Question` | DUPLICATED | Labels are not stable identities across surfaces. |
| Subtopic | `Question.subTopicTag` and free text | FREE_TEXT | No graph-level subtopic contract. |
| Objective | `CurriculumNode.LEARNING_OBJECTIVE` | PARTIAL | Node exists, but no explicit objective model/version or question join. |
| Prerequisite | `CurriculumEdge.REQUIRES` | PARTIAL | Directed edge and bounded traversal exist; cycle prevention is service-level. |
| Exam alignment | `examStandards[]`, `ExamType`, prompt strings | DENORMALIZED | Not evidence of a syllabus-objective alignment. |
| Curriculum source/version | None; `CurriculumNode.version` is an integer | MISSING/PARTIAL | Integer is not a curriculum release identity or provenance record. |
| Lesson alignment | Lesson free-text `topic`, `objectives[]` | FREE_TEXT | No stable node/objective references. |
| Question alignment | `curriculumRef`, `topicTag`, `subTopicTag`, `skillTag` | FREE_TEXT | Cannot guarantee historical or multi-curriculum identity. |
| Scheme of work | `CurriculumPlan` JSON weeks and assessment schedule | PARTIAL | School/teacher plan exists, but not linked to canonical nodes. |
| Student evidence | Attempts/responses and learning/intelligence tables | PARTIAL | Evidence exists; objective-level evidence and mastery policy are absent. |
| Mastery | Intelligence/adaptive code and comments | FUTURE/UNSAFE_TO_CLAIM | No F9A authoritative mastery model. |

## Existing terminology contradictions

1. `ClassLevel` is both the operational class level and a curriculum filter. It works for current JS1–SS3 but should not be treated as the whole education-level ontology.
2. `Term` is used by school records and curriculum nodes. A future graph needs an academic-period concept without conflating it with a particular school session.
3. `Question.curriculumRef`, `topicTag`, `subTopicTag`, `skillTag`, `Exam.topic`, and `Lesson.topic` are independent strings. They must remain backward-compatible while new alignments are additive.
4. `examStandards[]` and AI prompt language mention WAEC/NECO/JAMB/JUPEB, but no authoritative syllabus source or objective mapping is stored. These are hints/tags, not verified alignment.
5. `CurriculumNode.version` is not a historical version. It must not be interpreted as publication/version control without a new contract.
6. `CurriculumPlan` is an AI/school planning artifact, not a canonical curriculum release.

## F9A implication

Retain `CurriculumNode`/`CurriculumEdge` as the compatible graph substrate, but introduce a versioned registry and explicit alignment/provenance joins in a later additive phase. Existing free-text values remain valid as `UNMAPPED` until reviewed; no automatic semantic guesses are permitted.
