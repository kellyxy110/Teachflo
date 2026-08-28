-- Baseline constraints compatibility reconciliation.
-- Adds only active Prisma query indexes. Existing FK actions, legacy vector
-- indexes, timestamp precision, and safe database defaults are intentionally
-- retained; no destructive normalization is performed.
CREATE INDEX IF NOT EXISTS "classes_schoolId_idx" ON "classes"("schoolId");
CREATE INDEX IF NOT EXISTS "exams_schoolId_idx" ON "exams"("schoolId");
CREATE INDEX IF NOT EXISTS "exams_teacherId_idx" ON "exams"("teacherId");
CREATE INDEX IF NOT EXISTS "homework_schoolId_idx" ON "homework"("schoolId");
CREATE INDEX IF NOT EXISTS "homework_classId_idx" ON "homework"("classId");
CREATE INDEX IF NOT EXISTS "lessons_schoolId_idx" ON "lessons"("schoolId");
CREATE INDEX IF NOT EXISTS "lessons_teacherId_idx" ON "lessons"("teacherId");
CREATE INDEX IF NOT EXISTS "question_responses_attemptId_idx" ON "question_responses"("attemptId");
CREATE INDEX IF NOT EXISTS "question_responses_questionId_idx" ON "question_responses"("questionId");
CREATE INDEX IF NOT EXISTS "questions_examId_idx" ON "questions"("examId");
CREATE INDEX IF NOT EXISTS "scores_schoolId_idx" ON "scores"("schoolId");
CREATE INDEX IF NOT EXISTS "scores_studentId_idx" ON "scores"("studentId");
CREATE INDEX IF NOT EXISTS "scores_classId_idx" ON "scores"("classId");
CREATE INDEX IF NOT EXISTS "scores_teacherId_idx" ON "scores"("teacherId");
