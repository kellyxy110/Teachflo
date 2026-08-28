-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED');

-- CreateEnum
CREATE TYPE "AuthProvider" AS ENUM ('CLERK', 'SUPABASE');

-- CreateEnum
CREATE TYPE "BloomsLevel" AS ENUM ('REMEMBER', 'UNDERSTAND', 'APPLY', 'ANALYZE', 'EVALUATE', 'CREATE');

-- CreateEnum
CREATE TYPE "ClassLevel" AS ENUM ('JS1', 'JS2', 'JS3', 'SS1', 'SS2', 'SS3');

-- CreateEnum
CREATE TYPE "ConflictResolution" AS ENUM ('KEEP_EXISTING', 'REPLACE', 'MERGE', 'SKIP');

-- CreateEnum
CREATE TYPE "CurriculumDifficulty" AS ENUM ('EASY', 'MEDIUM', 'HARD');

-- CreateEnum
CREATE TYPE "Difficulty" AS ENUM ('BASIC', 'APPLICATION', 'WAEC', 'JAMB', 'JUPEB');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'FAILED');

-- CreateEnum
CREATE TYPE "EdgeRelation" AS ENUM ('REQUIRES', 'EXTENDS', 'PART_OF', 'RELATED_TO', 'ASSESSED_BY', 'VISUALIZED_BY', 'PRACTICED_BY', 'APPEARS_IN', 'TEACHES_BEFORE', 'TEACHES_AFTER', 'CROSS_SUBJECT');

-- CreateEnum
CREATE TYPE "ExamMode" AS ENUM ('STANDARD', 'DIAGNOSTIC', 'PRACTICE', 'ASSESSMENT', 'ADAPTIVE');

-- CreateEnum
CREATE TYPE "ExamType" AS ENUM ('SCHOOL_TEST', 'SCHOOL_EXAM', 'WAEC_MOCK', 'JAMB_PREP', 'JUPEB_PREP');

-- CreateEnum
CREATE TYPE "Gender" AS ENUM ('MALE', 'FEMALE');

-- CreateEnum
CREATE TYPE "HomeworkStatus" AS ENUM ('ACTIVE', 'CLOSED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ImportSource" AS ENUM ('EXCEL', 'CSV', 'PORTAL', 'MANUAL', 'OCR');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('PENDING', 'ANALYZING', 'STAGED', 'CONFIRMED', 'COMMITTED', 'FAILED', 'DISCARDED', 'COMMITTING');

-- CreateEnum
CREATE TYPE "LessonMode" AS ENUM ('STANDARD', 'ELI12', 'WAEC', 'JAMB', 'JUPEB');

-- CreateEnum
CREATE TYPE "LibraryCategory" AS ENUM ('TEXTBOOK', 'REVISION_GUIDE', 'PAST_QUESTIONS', 'FORMULA_SHEET', 'TEACHER_NOTES', 'AI_NOTES');

-- CreateEnum
CREATE TYPE "NodeType" AS ENUM ('SUBJECT', 'TOPIC', 'CONCEPT', 'SKILL', 'LEARNING_OBJECTIVE', 'EXAM_STANDARD');

-- CreateEnum
CREATE TYPE "Plan" AS ENUM ('FREE', 'BASIC', 'PRO', 'ENTERPRISE');

-- CreateEnum
CREATE TYPE "QuestionLifecycle" AS ENUM ('DRAFT', 'REVIEW', 'APPROVED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuestionSourceKind" AS ENUM ('TEACHER', 'AI', 'IMPORTED', 'PAST_QUESTION', 'SYSTEM');

-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'SHORT_ANSWER', 'ESSAY', 'STRUCTURED', 'CALCULATION');

-- CreateEnum
CREATE TYPE "QuestionVisibility" AS ENUM ('PRIVATE', 'SCHOOL', 'SYSTEM');

-- CreateEnum
CREATE TYPE "Section" AS ENUM ('A', 'B', 'C');

-- CreateEnum
CREATE TYPE "StagingAction" AS ENUM ('CREATE', 'UPDATE', 'SKIP', 'CONFLICT');

-- CreateEnum
CREATE TYPE "StagingStatus" AS ENUM ('PENDING', 'RESOLVED', 'COMMITTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('RUNNING', 'COMPLETED', 'FAILED', 'PARTIAL');

-- CreateEnum
CREATE TYPE "SyncType" AS ENUM ('INITIAL', 'INCREMENTAL', 'FULL', 'MANUAL');

-- CreateEnum
CREATE TYPE "TeacherRole" AS ENUM ('TEACHER', 'HOD', 'ADMIN', 'SUPER_ADMIN', 'FORM_TEACHER', 'VICE_PRINCIPAL', 'PRINCIPAL');

-- CreateEnum
CREATE TYPE "Term" AS ENUM ('FIRST', 'SECOND', 'THIRD');

-- CreateTable
CREATE TABLE "analytics_snapshots" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" TEXT NOT NULL,
    "classId" TEXT,
    "studentId" TEXT,
    "subject" TEXT,
    "term" "Term",
    "session" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "computedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "analytics_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_components" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "maxScore" DOUBLE PRECISION,
    "order" INTEGER NOT NULL DEFAULT 0,
    "category" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "assessment_components_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "assessment_items" (
    "id" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "questionVersionId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "section" "Section" NOT NULL,
    "marksOverride" DOUBLE PRECISION,
    "snapshot" JSONB,

    CONSTRAINT "assessment_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "attendance" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_identities" (
    "id" TEXT NOT NULL,
    "provider" "AuthProvider" NOT NULL,
    "providerUserId" TEXT NOT NULL,
    "teacherId" TEXT,
    "studentId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "auth_identities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "classes" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "level" "ClassLevel" NOT NULL,
    "arm" TEXT,
    "term" "Term" NOT NULL DEFAULT 'FIRST',
    "session" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "classes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_edges" (
    "id" TEXT NOT NULL,
    "sourceId" TEXT NOT NULL,
    "targetId" TEXT NOT NULL,
    "relationship" "EdgeRelation" NOT NULL,
    "weight" DOUBLE PRECISION DEFAULT 1.0,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_edges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_nodes" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "type" "NodeType" NOT NULL,
    "label" TEXT NOT NULL,
    "description" TEXT,
    "subject" TEXT,
    "classLevel" "ClassLevel",
    "term" "Term",
    "week" INTEGER,
    "difficulty" "CurriculumDifficulty",
    "estimatedMinutes" INTEGER,
    "bloomLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "examStandards" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "keywords" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "misconceptions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "formulae" JSONB,
    "metadata" JSONB,
    "version" INTEGER NOT NULL DEFAULT 1,
    "createdBy" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "curriculum_plans" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "classLevel" TEXT NOT NULL,
    "term" TEXT NOT NULL,
    "session" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "weeks" JSONB NOT NULL DEFAULT '[]',
    "assessmentSchedule" JSONB,
    "revisionCycles" JSONB,
    "performanceContext" JSONB,
    "aiModel" TEXT,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "curriculum_plans_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "document_chunks" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector NOT NULL,
    "chunkIndex" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "document_chunks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "documents" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "classLevel" "ClassLevel",
    "fileName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL DEFAULT 'application/pdf',
    "fileSize" INTEGER NOT NULL DEFAULT 0,
    "pageCount" INTEGER,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "chunkCount" INTEGER NOT NULL DEFAULT 0,
    "error" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exam_attempts" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "examId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "totalScore" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION,
    "percentage" DOUBLE PRECISION,
    "grade" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "gradedAt" TIMESTAMP(3),
    "examMode" "ExamMode" DEFAULT 'STANDARD',
    "analytics" JSONB,
    "currentDifficulty" TEXT DEFAULT 'medium',
    "questionsAnswered" INTEGER DEFAULT 0,
    "adaptiveState" JSONB,

    CONSTRAINT "exam_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "exams" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "classLevel" "ClassLevel" NOT NULL,
    "examType" "ExamType" NOT NULL,
    "difficulty" "Difficulty" NOT NULL,
    "duration" INTEGER,
    "aiModel" TEXT,
    "promptTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "examMode" "ExamMode" DEFAULT 'STANDARD',
    "blueprint" JSONB,
    "totalQuestions" INTEGER,
    "targetStudentId" TEXT,

    CONSTRAINT "exams_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "health_records" (
    "id" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "bloodGroup" TEXT,
    "genotype" TEXT,
    "allergies" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "conditions" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "medications" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "emergencyContactName" TEXT,
    "emergencyContactPhone" TEXT,
    "emergencyContactRel" TEXT,
    "parentPhone" TEXT,
    "parentEmail" TEXT,
    "immunizations" JSONB,
    "clinicVisits" JSONB,
    "healthNotes" TEXT,
    "lastUpdatedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "health_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "homework" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "dueDate" TIMESTAMP(3),
    "status" "HomeworkStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "homework_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_jobs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "source" "ImportSource" NOT NULL,
    "fileName" TEXT,
    "status" "ImportStatus" NOT NULL DEFAULT 'PENDING',
    "totalRows" INTEGER NOT NULL DEFAULT 0,
    "newStudents" INTEGER NOT NULL DEFAULT 0,
    "updatedStudents" INTEGER NOT NULL DEFAULT 0,
    "newScores" INTEGER NOT NULL DEFAULT 0,
    "conflicts" INTEGER NOT NULL DEFAULT 0,
    "errors" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "metadata" JSONB,
    "committedAt" TIMESTAMP(6),
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "import_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "import_staging_rows" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "jobId" TEXT NOT NULL,
    "rowIndex" INTEGER NOT NULL,
    "rawData" JSONB NOT NULL,
    "parsedData" JSONB NOT NULL,
    "action" "StagingAction" NOT NULL DEFAULT 'CREATE',
    "status" "StagingStatus" NOT NULL DEFAULT 'PENDING',
    "conflictData" JSONB,
    "resolution" "ConflictResolution",
    "error" TEXT,
    "studentId" TEXT,

    CONSTRAINT "import_staging_rows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "integration_requests" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "connectorId" TEXT NOT NULL,
    "schoolName" TEXT NOT NULL,
    "portalUrl" TEXT NOT NULL,
    "adminContact" TEXT NOT NULL,
    "message" TEXT,
    "status" TEXT NOT NULL DEFAULT 'NEW',
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "integration_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "learning_paths" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "classLevel" TEXT NOT NULL,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "currentStep" INTEGER DEFAULT 0,
    "status" TEXT DEFAULT 'ACTIVE',
    "lastComputedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "learning_paths_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lesson_embeddings" (
    "id" TEXT NOT NULL,
    "lessonId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "lesson_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lessons" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" TEXT,
    "subject" TEXT NOT NULL,
    "topic" TEXT NOT NULL,
    "classLevel" "ClassLevel" NOT NULL,
    "week" INTEGER,
    "term" "Term",
    "objectives" TEXT[],
    "introduction" TEXT NOT NULL,
    "content" JSONB NOT NULL,
    "activities" JSONB[],
    "evaluation" TEXT[],
    "homework" TEXT[],
    "mode" "LessonMode" NOT NULL DEFAULT 'STANDARD',
    "aiModel" TEXT,
    "promptTokens" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lessons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "library_items" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT,
    "title" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "classLevel" "ClassLevel",
    "topic" TEXT,
    "category" "LibraryCategory" NOT NULL,
    "examType" "ExamType",
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER,
    "pageCount" INTEGER,
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "isAIGenerated" BOOLEAN NOT NULL DEFAULT false,
    "downloadCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "library_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mistake_patterns" (
    "id" TEXT NOT NULL DEFAULT (gen_random_uuid())::text,
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "errorType" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "rootCause" TEXT,
    "prerequisiteGap" TEXT,
    "occurrences" INTEGER DEFAULT 1,
    "lastSeen" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "firstSeen" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "resolved" BOOLEAN DEFAULT false,
    "createdAt" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mistake_patterns_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "portal_connections" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "portalType" TEXT NOT NULL,
    "displayName" TEXT NOT NULL,
    "schoolName" TEXT,
    "sessionToken" TEXT,
    "tokenExpiry" TIMESTAMP(6),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSynced" TIMESTAMP(6),
    "syncSettings" JSONB,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "portal_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_embeddings" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "metadata" JSONB,
    "embedding" vector NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_embeddings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_responses" (
    "id" TEXT NOT NULL,
    "attemptId" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "selectedOption" TEXT,
    "textResponse" TEXT,
    "isCorrect" BOOLEAN,
    "score" DOUBLE PRECISION,
    "maxScore" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "timeSpentSeconds" INTEGER,
    "misconception" TEXT,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "errorType" TEXT,
    "difficultyAtTime" TEXT,

    CONSTRAINT "question_responses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_tags" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "skill" TEXT NOT NULL,
    "topic" TEXT,
    "subtopic" TEXT,
    "bloomsLevel" "BloomsLevel",

    CONSTRAINT "question_tags_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "question_versions" (
    "id" TEXT NOT NULL,
    "questionId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "payload" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "question_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questions" (
    "id" TEXT NOT NULL,
    "examId" TEXT,
    "section" "Section" NOT NULL,
    "number" INTEGER NOT NULL,
    "type" "QuestionType" NOT NULL,
    "stem" TEXT NOT NULL,
    "optionA" TEXT,
    "optionB" TEXT,
    "optionC" TEXT,
    "optionD" TEXT,
    "optionE" TEXT,
    "correctOption" TEXT,
    "questionText" TEXT,
    "markScheme" TEXT,
    "solution" TEXT NOT NULL,
    "explanation" TEXT NOT NULL,
    "distractors" JSONB,
    "commonMistakes" TEXT,
    "examTip" TEXT,
    "curriculumRef" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "difficulty" TEXT DEFAULT 'medium',
    "bloomLevel" TEXT,
    "skillTag" TEXT,
    "topicTag" TEXT,
    "subTopicTag" TEXT,
    "questionSource" TEXT DEFAULT 'synthetic',
    "estimatedTime" INTEGER DEFAULT 90,
    "relatedChunkIds" TEXT[],
    "schoolId" TEXT,
    "createdByTeacherId" TEXT,
    "lifecycle" "QuestionLifecycle" NOT NULL DEFAULT 'DRAFT',
    "sourceKind" "QuestionSourceKind" NOT NULL DEFAULT 'TEACHER',
    "visibility" "QuestionVisibility" NOT NULL DEFAULT 'PRIVATE',
    "defaultMarks" DOUBLE PRECISION,

    CONSTRAINT "questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "schools" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "lga" TEXT,
    "address" TEXT,
    "logoUrl" TEXT,
    "plan" "Plan" NOT NULL DEFAULT 'FREE',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "schools_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "score_assessment_component_values" (
    "id" TEXT NOT NULL,
    "scoreId" TEXT NOT NULL,
    "assessmentComponentId" TEXT NOT NULL,
    "obtainedScore" DOUBLE PRECISION,
    "sourceLabel" TEXT,
    "sourceMaxScore" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "score_assessment_component_values_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scores" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "term" "Term" NOT NULL,
    "session" TEXT NOT NULL,
    "ca1" DOUBLE PRECISION,
    "ca2" DOUBLE PRECISION,
    "exam" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "grade" TEXT,
    "remark" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "student_profiles" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "studentId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "dateOfBirth" TIMESTAMP(6),
    "photoUrl" TEXT,
    "parentName" TEXT,
    "parentPhone" TEXT,
    "parentEmail" TEXT,
    "parentRelation" TEXT,
    "address" TEXT,
    "state" TEXT,
    "lga" TEXT,
    "formerSchool" TEXT,
    "admissionDate" TIMESTAMP(6),
    "nationality" TEXT,
    "religion" TEXT,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "students" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "regNumber" TEXT,
    "gender" "Gender",
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "rawFullName" TEXT,
    "clerkId" TEXT,
    "email" TEXT,

    CONSTRAINT "students_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "subject_aliases" (
    "id" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "rawValue" TEXT NOT NULL,
    "canonicalSubject" TEXT NOT NULL,
    "createdAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "subject_aliases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_logs" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "schoolId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "type" "SyncType" NOT NULL,
    "source" TEXT NOT NULL,
    "status" "SyncStatus" NOT NULL,
    "summary" JSONB NOT NULL,
    "startedAt" TIMESTAMP(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(6),

    CONSTRAINT "sync_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "teachers" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "schoolId" TEXT NOT NULL,
    "firstName" TEXT NOT NULL,
    "lastName" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "TeacherRole" NOT NULL DEFAULT 'TEACHER',
    "subjects" TEXT[],
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "phone" TEXT,
    "photoUrl" TEXT,
    "bio" TEXT,
    "qualification" TEXT,
    "institution" TEXT,
    "gradYear" INTEGER,
    "trcnNumber" TEXT,
    "trcnStatus" TEXT,
    "department" TEXT,
    "yearsOfExp" INTEGER,
    "classLevels" TEXT[] DEFAULT ARRAY[]::TEXT[],

    CONSTRAINT "teachers_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "analytics_snapshots_classId_idx" ON "analytics_snapshots"("classId" ASC);

-- CreateIndex
CREATE INDEX "analytics_snapshots_schoolId_idx" ON "analytics_snapshots"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "analytics_snapshots_studentId_idx" ON "analytics_snapshots"("studentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_components_schoolId_normalizedName_key" ON "assessment_components"("schoolId" ASC, "normalizedName" ASC);

-- CreateIndex
CREATE INDEX "assessment_components_schoolId_order_idx" ON "assessment_components"("schoolId" ASC, "order" ASC);

-- CreateIndex
CREATE INDEX "assessment_items_examId_idx" ON "assessment_items"("examId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "assessment_items_examId_order_key" ON "assessment_items"("examId" ASC, "order" ASC);

-- CreateIndex
CREATE INDEX "assessment_items_questionId_idx" ON "assessment_items"("questionId" ASC);

-- CreateIndex
CREATE INDEX "assessment_items_questionVersionId_idx" ON "assessment_items"("questionVersionId" ASC);

-- CreateIndex
CREATE INDEX "attendance_classId_date_idx" ON "attendance"("classId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "attendance_schoolId_idx" ON "attendance"("schoolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "attendance_studentId_date_key" ON "attendance"("studentId" ASC, "date" ASC);

-- CreateIndex
CREATE INDEX "attendance_studentId_idx" ON "attendance"("studentId" ASC);

-- CreateIndex
CREATE INDEX "attendance_teacherId_idx" ON "attendance"("teacherId" ASC);

-- CreateIndex
CREATE INDEX "auth_identities_providerUserId_idx" ON "auth_identities"("providerUserId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "auth_identities_provider_providerUserId_key" ON "auth_identities"("provider" ASC, "providerUserId" ASC);

-- CreateIndex
CREATE INDEX "classes_schoolId_idx" ON "classes"("schoolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "classes_schoolId_name_session_key" ON "classes"("schoolId" ASC, "name" ASC, "session" ASC);

-- CreateIndex
CREATE INDEX "curriculum_edges_relationship_idx" ON "curriculum_edges"("relationship" ASC);

-- CreateIndex
CREATE INDEX "curriculum_edges_sourceId_idx" ON "curriculum_edges"("sourceId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_edges_sourceId_targetId_relationship_key" ON "curriculum_edges"("sourceId" ASC, "targetId" ASC, "relationship" ASC);

-- CreateIndex
CREATE INDEX "curriculum_edges_targetId_idx" ON "curriculum_edges"("targetId" ASC);

-- CreateIndex
CREATE INDEX "curriculum_nodes_schoolId_idx" ON "curriculum_nodes"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "curriculum_nodes_subject_classLevel_term_idx" ON "curriculum_nodes"("subject" ASC, "classLevel" ASC, "term" ASC);

-- CreateIndex
CREATE INDEX "curriculum_nodes_type_idx" ON "curriculum_nodes"("type" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "curriculum_plans_schoolId_subject_classLevel_term_session_key" ON "curriculum_plans"("schoolId" ASC, "subject" ASC, "classLevel" ASC, "term" ASC, "session" ASC);

-- CreateIndex
CREATE INDEX "idx_curriculum_plans_school" ON "curriculum_plans"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "idx_curriculum_plans_teacher" ON "curriculum_plans"("teacherId" ASC);

-- CreateIndex
CREATE INDEX "doc_chunk_doc_idx" ON "document_chunks"("documentId" ASC);

-- CreateIndex
CREATE INDEX "doc_chunk_school_idx" ON "document_chunks"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "doc_chunk_vec_idx" ON "document_chunks"("embedding" ASC);

-- CreateIndex
CREATE INDEX "document_chunks_documentId_idx" ON "document_chunks"("documentId" ASC);

-- CreateIndex
CREATE INDEX "document_chunks_hnsw_idx" ON "document_chunks"("embedding" ASC);

-- CreateIndex
CREATE INDEX "document_chunks_schoolId_idx" ON "document_chunks"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "documents_schoolId_idx" ON "documents"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "exam_attempts_schoolId_idx" ON "exam_attempts"("schoolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "exam_attempts_studentId_examId_key" ON "exam_attempts"("studentId" ASC, "examId" ASC);

-- CreateIndex
CREATE INDEX "idx_exam_attempts_mode" ON "exam_attempts"("examMode" ASC);

-- CreateIndex
CREATE INDEX "exams_schoolId_idx" ON "exams"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "exams_teacherId_idx" ON "exams"("teacherId" ASC);

-- CreateIndex
CREATE INDEX "health_records_schoolId_idx" ON "health_records"("schoolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "health_records_studentId_key" ON "health_records"("studentId" ASC);

-- CreateIndex
CREATE INDEX "homework_classId_idx" ON "homework"("classId" ASC);

-- CreateIndex
CREATE INDEX "homework_schoolId_idx" ON "homework"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "import_jobs_schoolId_idx" ON "import_jobs"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "import_jobs_teacherId_idx" ON "import_jobs"("teacherId" ASC);

-- CreateIndex
CREATE INDEX "import_staging_rows_jobId_idx" ON "import_staging_rows"("jobId" ASC);

-- CreateIndex
CREATE INDEX "integration_requests_schoolId_idx" ON "integration_requests"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "integration_requests_status_idx" ON "integration_requests"("status" ASC);

-- CreateIndex
CREATE INDEX "idx_learning_paths_school" ON "learning_paths"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "idx_learning_paths_student" ON "learning_paths"("studentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "learning_paths_studentId_subject_key" ON "learning_paths"("studentId" ASC, "subject" ASC);

-- CreateIndex
CREATE INDEX "lesson_emb_school_idx" ON "lesson_embeddings"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "lesson_emb_vec_idx" ON "lesson_embeddings"("embedding" ASC);

-- CreateIndex
CREATE INDEX "lesson_embeddings_hnsw_idx" ON "lesson_embeddings"("embedding" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "lesson_embeddings_lessonId_key" ON "lesson_embeddings"("lessonId" ASC);

-- CreateIndex
CREATE INDEX "lesson_embeddings_schoolId_idx" ON "lesson_embeddings"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "lessons_schoolId_idx" ON "lessons"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "lessons_teacherId_idx" ON "lessons"("teacherId" ASC);

-- CreateIndex
CREATE INDEX "idx_mistake_patterns_school" ON "mistake_patterns"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "idx_mistake_patterns_skill" ON "mistake_patterns"("skill" ASC);

-- CreateIndex
CREATE INDEX "idx_mistake_patterns_student" ON "mistake_patterns"("studentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "mistake_patterns_studentId_skill_errorType_key" ON "mistake_patterns"("studentId" ASC, "skill" ASC, "errorType" ASC);

-- CreateIndex
CREATE INDEX "portal_connections_schoolId_idx" ON "portal_connections"("schoolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "portal_connections_schoolId_portalType_key" ON "portal_connections"("schoolId" ASC, "portalType" ASC);

-- CreateIndex
CREATE INDEX "question_emb_school_idx" ON "question_embeddings"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "question_emb_vec_idx" ON "question_embeddings"("embedding" ASC);

-- CreateIndex
CREATE INDEX "question_embeddings_hnsw_idx" ON "question_embeddings"("embedding" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "question_embeddings_questionId_key" ON "question_embeddings"("questionId" ASC);

-- CreateIndex
CREATE INDEX "question_embeddings_schoolId_idx" ON "question_embeddings"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "question_responses_attemptId_idx" ON "question_responses"("attemptId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "question_responses_attemptId_questionId_key" ON "question_responses"("attemptId" ASC, "questionId" ASC);

-- CreateIndex
CREATE INDEX "question_responses_questionId_idx" ON "question_responses"("questionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "question_tags_questionId_skill_key" ON "question_tags"("questionId" ASC, "skill" ASC);

-- CreateIndex
CREATE INDEX "question_tags_skill_idx" ON "question_tags"("skill" ASC);

-- CreateIndex
CREATE INDEX "question_versions_questionId_idx" ON "question_versions"("questionId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "question_versions_questionId_version_key" ON "question_versions"("questionId" ASC, "version" ASC);

-- CreateIndex
CREATE INDEX "idx_questions_difficulty" ON "questions"("difficulty" ASC);

-- CreateIndex
CREATE INDEX "idx_questions_skill" ON "questions"("skillTag" ASC);

-- CreateIndex
CREATE INDEX "questions_createdByTeacherId_idx" ON "questions"("createdByTeacherId" ASC);

-- CreateIndex
CREATE INDEX "questions_examId_idx" ON "questions"("examId" ASC);

-- CreateIndex
CREATE INDEX "questions_lifecycle_visibility_idx" ON "questions"("lifecycle" ASC, "visibility" ASC);

-- CreateIndex
CREATE INDEX "questions_schoolId_idx" ON "questions"("schoolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "schools_code_key" ON "schools"("code" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "score_assessment_component_va_scoreId_assessmentComponentId_key" ON "score_assessment_component_values"("scoreId" ASC, "assessmentComponentId" ASC);

-- CreateIndex
CREATE INDEX "score_assessment_component_values_assessmentComponentId_idx" ON "score_assessment_component_values"("assessmentComponentId" ASC);

-- CreateIndex
CREATE INDEX "scores_classId_idx" ON "scores"("classId" ASC);

-- CreateIndex
CREATE INDEX "scores_schoolId_idx" ON "scores"("schoolId" ASC);

-- CreateIndex
CREATE INDEX "scores_studentId_idx" ON "scores"("studentId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "scores_studentId_subject_term_session_key" ON "scores"("studentId" ASC, "subject" ASC, "term" ASC, "session" ASC);

-- CreateIndex
CREATE INDEX "scores_teacherId_idx" ON "scores"("teacherId" ASC);

-- CreateIndex
CREATE INDEX "student_profiles_schoolId_idx" ON "student_profiles"("schoolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "student_profiles_studentId_key" ON "student_profiles"("studentId" ASC);

-- CreateIndex
CREATE INDEX "students_classId_idx" ON "students"("classId" ASC);

-- CreateIndex
CREATE INDEX "students_clerkId_idx" ON "students"("clerkId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "students_clerkId_key" ON "students"("clerkId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "students_schoolId_regNumber_key" ON "students"("schoolId" ASC, "regNumber" ASC);

-- CreateIndex
CREATE INDEX "subject_aliases_schoolId_idx" ON "subject_aliases"("schoolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "subject_aliases_schoolId_rawValue_key" ON "subject_aliases"("schoolId" ASC, "rawValue" ASC);

-- CreateIndex
CREATE INDEX "sync_logs_schoolId_idx" ON "sync_logs"("schoolId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "teachers_clerkId_key" ON "teachers"("clerkId" ASC);

-- CreateIndex
CREATE UNIQUE INDEX "teachers_schoolId_email_key" ON "teachers"("schoolId" ASC, "email" ASC);

-- CreateIndex
CREATE INDEX "teachers_schoolId_idx" ON "teachers"("schoolId" ASC);

-- AddForeignKey
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assessment_items" ADD CONSTRAINT "assessment_items_questionVersionId_fkey" FOREIGN KEY ("questionVersionId") REFERENCES "question_versions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "attendance" ADD CONSTRAINT "attendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auth_identities" ADD CONSTRAINT "auth_identities_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "classes" ADD CONSTRAINT "classes_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "curriculum_edges" ADD CONSTRAINT "curriculum_edges_sourceId_fkey" FOREIGN KEY ("sourceId") REFERENCES "curriculum_nodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "curriculum_edges" ADD CONSTRAINT "curriculum_edges_targetId_fkey" FOREIGN KEY ("targetId") REFERENCES "curriculum_nodes"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exam_attempts" ADD CONSTRAINT "exam_attempts_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "exams" ADD CONSTRAINT "exams_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "health_records" ADD CONSTRAINT "health_records_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "homework" ADD CONSTRAINT "homework_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "import_staging_rows" ADD CONSTRAINT "import_staging_rows_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "import_jobs"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "learning_paths" ADD CONSTRAINT "learning_paths_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lessons" ADD CONSTRAINT "lessons_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "library_items" ADD CONSTRAINT "library_items_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mistake_patterns" ADD CONSTRAINT "mistake_patterns_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_attemptId_fkey" FOREIGN KEY ("attemptId") REFERENCES "exam_attempts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_responses" ADD CONSTRAINT "question_responses_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_tags" ADD CONSTRAINT "question_tags_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "question_versions" ADD CONSTRAINT "question_versions_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "questions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_createdByTeacherId_fkey" FOREIGN KEY ("createdByTeacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_examId_fkey" FOREIGN KEY ("examId") REFERENCES "exams"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questions" ADD CONSTRAINT "questions_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "score_assessment_component_values" ADD CONSTRAINT "score_assessment_component_values_assessmentComponentId_fkey" FOREIGN KEY ("assessmentComponentId") REFERENCES "assessment_components"("id") ON DELETE RESTRICT ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "score_assessment_component_values" ADD CONSTRAINT "score_assessment_component_values_scoreId_fkey" FOREIGN KEY ("scoreId") REFERENCES "scores"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "scores" ADD CONSTRAINT "scores_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "teachers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "student_profiles" ADD CONSTRAINT "student_profiles_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_classId_fkey" FOREIGN KEY ("classId") REFERENCES "classes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "students" ADD CONSTRAINT "students_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "teachers" ADD CONSTRAINT "teachers_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "schools"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
