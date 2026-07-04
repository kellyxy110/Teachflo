# TeachNexis Workflow Service — Interface Design

**Service Name:** `TeachNexisWorkflowService`  
**Capability Gap It Closes:** Lesson generation, CBT generation, reporting, and curriculum mapping flows  
**Backed By (Phase 1):** Native TypeScript (prompt chains via existing AI Router). Langflow for prototyping only.  
**Owned By:** TeachNexis  
**Document:** 2026-07-04  

---

## Purpose

Many TeachNexis AI features are not single LLM calls — they are multi-step sequences:

- Lesson note generation: retrieve context → generate outline → expand sections → format → validate
- CBT generation: retrieve past questions → select by topic/difficulty → generate distractors → validate answers
- Report card narrative: fetch student results → compute weaknesses → generate personalised narrative
- Curriculum mapping: load syllabus → map teacher lessons → identify gaps → produce recommendations
- Student revision plan: analyse mistake history → sequence topics → generate schedule

The Workflow Service provides a typed, named, versioned interface for triggering these flows — regardless of how they are implemented internally. The caller (API route, cron job, teacher action) calls `run("lesson-note-generation", params)` and gets a result. The implementation details — prompt chains, retries, context building — are the Workflow Service's concern.

---

## Design Principles

1. **Named, versioned workflows.** Each flow is a named constant. Renaming or breaking a workflow requires a version bump, not silent breakage.
2. **Streaming-first for generative flows.** Lesson notes and report narratives stream tokens to the frontend. Batch flows (CBT generation, curriculum mapping) return complete results.
3. **School-isolated.** All workflow runs are scoped to a school and teacher. Context, results, and logs are never shared across school boundaries.
4. **Observable.** Every workflow run produces a log entry with inputs, outputs, duration, token usage, and cost.
5. **Langflow for prototyping only.** Langflow is used by the engineering team to design and test prompt chains. The prompt patterns it produces are then ported to native TypeScript workflow steps. No Langflow dependency in production.

---

## Workflow Catalogue

```typescript
export type WorkflowName =
  | "lesson-note-generation"       // Generate a full 8-section lesson note
  | "cbt-question-generation"      // Generate CBT questions for an exam
  | "report-card-narrative"        // Generate teacher comment for a student
  | "curriculum-gap-analysis"      // Map covered topics against WAEC syllabus
  | "student-revision-plan"        // Generate personalised revision schedule
  | "parent-progress-report"       // Generate parent-friendly progress summary
  | "homework-generation"          // Generate differentiated homework questions
  | "marking-scheme-generation";   // Generate marking scheme for a theory paper
```

---

## TypeScript Interface

```typescript
// ── Workflow inputs (one type per workflow) ───────────────────────────────────

export interface LessonNoteInput {
  schoolId: string;
  teacherId: string;
  subject: string;
  classLevel: ClassLevel;
  topic: string;
  week?: number;
  term?: 1 | 2 | 3;
  durationMinutes?: number;
  priorKnowledge?: string;
  specialInstructions?: string;
}

export interface CBTQuestionInput {
  schoolId: string;
  teacherId: string;
  examId: string;
  subject: string;
  classLevel: ClassLevel;
  topics: string[];
  questionCount: number;
  difficulty?: "easy" | "medium" | "hard" | "mixed";
  includeWaecStyle?: boolean;
}

export interface ReportCardNarrativeInput {
  schoolId: string;
  teacherId: string;
  studentId: string;
  term: 1 | 2 | 3;
  academicYear: string;
  subjectScores: { subject: string; score: number; total: number; grade: string }[];
  attendancePercent?: number;
  teacherNotes?: string;
}

export interface CurriculumGapInput {
  schoolId: string;
  teacherId: string;
  subject: string;
  classLevel: ClassLevel;
  coveredTopics: string[];
  term: 1 | 2 | 3;
  examBody?: ExamBody;
}

export interface StudentRevisionInput {
  schoolId: string;
  studentId: string;
  subject: string;
  classLevel: ClassLevel;
  weakTopics: string[];
  weeksUntilExam: number;
  studyHoursPerDay?: number;
}

// ── Workflow outputs ──────────────────────────────────────────────────────────

export interface WorkflowResult<T = unknown> {
  runId: string;
  workflowName: WorkflowName;
  status: "completed" | "failed" | "cancelled";
  output: T;
  durationMs: number;
  tokenUsage: { prompt: number; completion: number; total: number };
  estimatedCostUSD: number;
  model: string;
  createdAt: Date;
  error?: string;
}

export interface WorkflowRun {
  runId: string;
  workflowName: WorkflowName;
  schoolId: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled";
  progress?: number;    // 0.0–1.0 for multi-step flows
  startedAt?: Date;
  completedAt?: Date;
}

// ── Main service interface ────────────────────────────────────────────────────

export interface TeachNexisWorkflowService {
  /**
   * Run a workflow synchronously.
   * Use for short flows (< 10 seconds expected): report narratives, homework gen.
   */
  run<TInput, TOutput>(
    workflow: WorkflowName,
    input: TInput,
    options?: { model?: string; timeoutMs?: number }
  ): Promise<WorkflowResult<TOutput>>;

  /**
   * Run a workflow with token streaming.
   * Use for generative flows: lesson notes, report narratives, revision plans.
   */
  stream<TInput>(
    workflow: WorkflowName,
    input: TInput,
    options?: { model?: string }
  ): AsyncGenerator<{ delta: string; done: boolean; runId: string }>;

  /**
   * Submit a long-running workflow as a background job.
   * Use for batch flows: CBT generation (50+ questions), curriculum gap analysis.
   */
  submit<TInput>(
    workflow: WorkflowName,
    input: TInput
  ): Promise<string>; // returns runId

  /** Poll the status of a submitted background job. */
  getRunStatus(runId: string, schoolId: string): Promise<WorkflowRun>;

  /** Get the completed result of a finished background job. */
  getRunResult<TOutput>(runId: string, schoolId: string): Promise<WorkflowResult<TOutput>>;

  /** List recent runs for a school/teacher. */
  listRuns(params: {
    schoolId: string;
    teacherId?: string;
    workflowName?: WorkflowName;
    limit?: number;
  }): Promise<WorkflowRun[]>;

  /** Cancel a running or queued background job. */
  cancelRun(runId: string, schoolId: string): Promise<void>;

  /** Get token usage and cost report for a school. */
  getUsageReport(schoolId: string, periodDays?: number): Promise<{
    totalRuns: number;
    totalTokens: number;
    totalCostUSD: number;
    byWorkflow: Record<WorkflowName, { runs: number; tokens: number; costUSD: number }>;
  }>;
}
```

---

## Internal Step Architecture

Each workflow is a sequence of typed `WorkflowStep` functions:

```typescript
// Internal — not exposed to callers

type WorkflowStep<TState> = (state: TState, ctx: WorkflowContext) => Promise<TState>;

interface WorkflowContext {
  knowledgeService: TeachNexisKnowledgeService;
  aiRouter: TeachNexisAIRouter;
  schoolId: string;
  teacherId: string;
  runId: string;
  logger: WorkflowLogger;
}

// Example: lesson-note-generation workflow steps
const lessonNoteWorkflow: WorkflowStep<LessonNoteState>[] = [
  retrieveKnowledgeContext,   // Step 1: pull relevant content from Knowledge Service
  generateLessonOutline,      // Step 2: LLM call → 8-section outline
  expandObjectives,           // Step 3: expand objectives section
  expandContent,              // Step 4: expand main content + examples
  generateExercises,          // Step 5: generate class exercise questions
  generateHomework,           // Step 6: generate homework
  validateAndFormat,          // Step 7: validate structure, apply TRCN format
];
```

Each step is independently testable. If step 4 fails, it can be retried without rerunning steps 1–3.

---

## Langflow Integration (Development Only)

```
[Development workflow]
Curriculum team → Langflow (visual prototype) → extract prompt patterns → TypeScript workflow steps

[Production path]
TypeScript workflow step → AI Router → LLM provider → response
```

Langflow runs on a developer's laptop or an internal Docker instance. It never receives real student data. The output of Langflow prototyping is a set of prompt templates that get ported into TypeScript `WorkflowStep` functions.

---

## Database Schema (Prisma)

```prisma
model WorkflowRun {
  id           String    @id @default(cuid())
  workflowName String
  schoolId     String
  teacherId    String?
  status       String    @default("queued")
  inputJson    Json
  outputJson   Json?
  error        String?
  durationMs   Int?
  promptTokens Int?
  completionTokens Int?
  costUSD      Float?
  model        String?
  startedAt    DateTime?
  completedAt  DateTime?
  createdAt    DateTime  @default(now())

  school       School    @relation(fields: [schoolId], references: [id])

  @@index([schoolId, workflowName])
  @@index([schoolId, status])
}
```

---

## Phase 1 Implementation Plan

| Week | Task |
|---|---|
| 1 | Add `WorkflowRun` Prisma model. Implement `run()` and `stream()` for lesson-note-generation. |
| 2 | Implement cbt-question-generation using Knowledge Service past question retrieval. |
| 3 | Implement report-card-narrative. Wire to student results data. |
| 3 | Prototype curriculum-gap-analysis in Langflow. |
| 4 | Port curriculum-gap-analysis from Langflow to native TypeScript steps. |
| 4 | Implement `submit()` / `getRunStatus()` / `getRunResult()` for background jobs. |

---

## Replacement Roadmap

The Workflow Service IS the native implementation. There is no external dependency to replace. The roadmap is one of expanding capabilities:

| Phase | Action |
|---|---|
| Phase 1 | Core workflows: lesson note, CBT, report card, curriculum gap |
| Phase 2 | Add student revision plan, parent progress report |
| Phase 3 | Add multi-agent workflows (e.g., collaborative lesson planning between teacher + AI) |
| Phase 4 | Allow schools to create custom workflow templates |
