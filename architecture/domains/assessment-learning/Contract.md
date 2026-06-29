# Contract: Assessment & Learning Intelligence Domain

## Purpose
Own the complete lifecycle of assessment — question creation, exam management, score recording, and report card generation — for any school on the platform.

## Responsibilities

**Owns:**
- Question bank (manual entry + bulk import)
- Exam creation and configuration
- CBT question delivery (future)
- Score recording and CA calculation
- Report card generation with ordinal ranking
- Exam and score export (Excel, and future formats)

**Does NOT own:**
- AI question generation routing (AI Infrastructure domain)
- Curriculum alignment metadata (Curriculum Intelligence domain)
- Student enrolment or class assignment (School Administration domain)
- Attendance or health data (Classroom Management domain)

## Inputs

### saveManualQuestion
| Field | Type | Required | Validation |
|---|---|---|---|
| examId | string | no | If provided, must belong to authenticated schoolId |
| subject | string | yes | Non-empty |
| classLevel | ClassLevel enum | yes | Valid Prisma enum value |
| stem | string | yes | Non-empty |
| questionType | QuestionType enum | yes | Valid Prisma enum value |
| solution | string | yes | Non-empty |
| explanation | string | yes | Non-empty |

### bulkImportQuestions
| Field | Type | Required | Validation |
|---|---|---|---|
| examId | string | yes | Must belong to authenticated schoolId |
| questions | Array | yes | 1–200 items; type validated per item |

### getReportCardData
| Field | Type | Required | Validation |
|---|---|---|---|
| classId | string | yes | Must belong to authenticated schoolId |
| term | Term enum | yes | FIRST, SECOND, or THIRD only |
| session | string | yes | Length ≤20 chars |

## Outputs

### getReportCardData
| Field | Type | Guarantee |
|---|---|---|
| className | string | Always present |
| term | Term | Always present |
| session | string | Always present |
| students | Array<StudentReport> | All belong to authenticated school's class |
| students[].position | string | Ordinal format: "3rd of 42" or "N/A" |
| students[].scores | Array<SubjectScore> | Ordered by subject name |
| totalStudents | number | Count of students with at least one score |

### saveManualQuestion / bulkImportQuestions
| Field | Type | Guarantee |
|---|---|---|
| questionId | string | Present on manual save |
| examId | string | Always present |
| imported | number | Count of questions imported (bulk only) |

## Dependencies
- Platform: Authentication & Authorisation
- Platform: Data Isolation (schoolId scoping)
- Database: Exam, Question, Score, Student, Class tables
- Future: AI Infrastructure (for AI-generated questions)
- Future: Curriculum Intelligence (for topic alignment metadata)

## Events Produced

| Event | Payload | Trigger |
|---|---|---|
| `exam.questions.saved` | `{ examId, schoolId, questionCount }` | After manual or bulk question save |
| `scores.updated` | `{ classId, term, session, schoolId }` | After score records are written |
| `report.generated` | `{ classId, term, session, schoolId, studentCount }` | After report card data is retrieved for export |

## Events Consumed
| Event | Source | Action |
|---|---|---|
| `topic.content.generated` | Curriculum Intelligence | (Future) Auto-generate quiz from topic content |

## Quality Guarantees
- Bulk import is limited to 200 questions per operation to prevent performance degradation.
- All question and exam records returned are guaranteed to belong to the authenticated school.
- Report card ranking uses consistent ordinal calculation across all students in the class.
- Term values are enum-validated before any database query.
- Class ownership is verified against schoolId before report data is returned.

## Failure Behaviour
- Exam not found (or belonging to different school): throws "Exam not found".
- Class not found: throws "Class not found".
- Invalid term: throws "Invalid term".
- Invalid session: throws "Invalid session".
- Bulk import count out of range: throws "Import between 1 and 200 questions at a time".
- Bulk import transaction failure: entire transaction rolls back; no partial import.

## Extension Points
- `exam.questions.saved` event may be consumed by AI Infrastructure to trigger quality review.
- Question bank may be extended with semantic deduplication (Zvec) without changing this contract.
- Report cards may be extended with AI-generated teacher commentary per student.
- Export formats (Moodle XML, QTI, JSON) may be added to the export layer without changing core data contracts.
