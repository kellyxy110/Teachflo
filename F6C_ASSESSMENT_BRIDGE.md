# F6C Question Bank → Assessment Bridge

## Current workflow evidence

The current assessment container is `Exam`. Teachers create exams through `/exams/new`, `/exams/generate-ai`, or `/exams/questions/new`; `saveExam` and `saveManualQuestion` persist legacy `Exam.questions`. `/exams/[examId]` is the review/export surface. Student delivery creates `ExamAttempt` and `QuestionResponse`; grading currently reads legacy questions. There is no Exam lifecycle/status field.

## F6C boundary

F6C adds one bridge alongside the legacy flow: `/question-bank` reads bounded, authorized reusable `Question` records; selected questions are added as `AssessmentItem` rows that pin the latest approved `QuestionVersion` and its snapshot. Canonical question content is not copied or mutated.

The server derives Teacher and School from `requireSchool()`. Client input is limited to assessment ID, question IDs, and optional marks. The destination Exam must belong to the authenticated Teacher and School. Questions must be accessible through PRIVATE/SCHOOL/SYSTEM visibility and must be APPROVED with a version.

Because Exam has no publication state, the evidence-backed mutation boundary is attempts: any Exam with an attempt is immutable through this bridge. Multi-question additions are atomic. A PostgreSQL transaction advisory lock serializes submissions per assessment; existing question relationships are skipped and new items append in selected order.

## Compatibility and deferrals

Legacy `Exam.questions`, QuestionBuilderClient, grading, attempts, and responses remain unchanged. The assessment review page displays bridge-added items separately from legacy questions to avoid double-rendering backfilled relationships. Advanced search/filtering, reordering, QuestionEditor extraction, assessment-engine cutover, and grading from AssessmentItem snapshots remain deferred.
