-- Repeatable TeachNexis Question Bank isolation check
-- Run on disposable synthetic database only.
\set ON_ERROR_STOP on
BEGIN;
DO $$ BEGIN
IF (SELECT count(*) FROM schools WHERE id IN ('s_a','s_b')) <> 2 THEN RAISE EXCEPTION 'school fixtures missing'; END IF;
IF (SELECT count(*) FROM teachers WHERE "schoolId" IN ('s_a','s_b')) <> 14 THEN RAISE EXCEPTION 'teacher fixtures missing'; END IF;
IF (SELECT count(*) FROM teachers t JOIN questions q ON q."schoolId"=t."schoolId" AND q."createdByTeacherId"=t.id WHERE q.id IN ('q_a','q_b')) <> 2 THEN RAISE EXCEPTION 'owner matches incorrect'; END IF;
IF NOT EXISTS (SELECT 1 FROM question_versions v JOIN question_corpus_metadata m ON m."questionVersionId"=v.id WHERE v."questionId"='q_a') THEN RAISE EXCEPTION 'metadata missing'; END IF;
RAISE NOTICE 'PASS: synthetic school ownership and metadata';
END $$;
ROLLBACK;
