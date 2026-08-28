ALTER TABLE "exam_attempts" ADD COLUMN "resultReleasedAt" TIMESTAMP(3);
ALTER TABLE "exam_attempts" ADD COLUMN "resultReleasedByTeacherId" TEXT;
ALTER TABLE "question_responses" ADD COLUMN "gradedByTeacherId" TEXT;
ALTER TABLE "question_responses" ADD COLUMN "gradedAt" TIMESTAMP(3);

CREATE INDEX "exam_attempts_resultReleasedByTeacherId_idx" ON "exam_attempts"("resultReleasedByTeacherId");
CREATE INDEX "question_responses_gradedByTeacherId_idx" ON "question_responses"("gradedByTeacherId");

ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_resultReleasedByTeacherId_fkey" FOREIGN KEY ("resultReleasedByTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_gradedByTeacherId_fkey" FOREIGN KEY ("gradedByTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
