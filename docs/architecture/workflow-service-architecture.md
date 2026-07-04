# TeachNexis Workflow Service — Internal Architecture

**Document Type:** Principal Engineer RFC  
**Version:** 1.0  
**Date:** 2026-07-04  
**Status:** Phase 1 Design — Implementation Ready  
**Author:** TeachNexis Engineering  

---

## Table of Contents

1. [Responsibilities](#1-responsibilities)
2. [Workflow Catalogue](#2-workflow-catalogue)
3. [Internal Modules](#3-internal-modules)
4. [Public API](#4-public-api)
5. [Step Execution Architecture](#5-step-execution-architecture)
6. [Streaming Architecture](#6-streaming-architecture)
7. [Retry Policies](#7-retry-policies)
8. [Human Approval Checkpoints](#8-human-approval-checkpoints)
9. [Background Job System](#9-background-job-system)
10. [Event-Driven Architecture](#10-event-driven-architecture)
11. [Scheduling](#11-scheduling)
12. [Langflow Compatibility Layer](#12-langflow-compatibility-layer)
13. [Database Schema](#13-database-schema)
14. [Security Model](#14-security-model)
15. [Privacy Model](#15-privacy-model)
16. [Testing Strategy](#16-testing-strategy)
17. [Monitoring](#17-monitoring)
18. [Native Workflow Roadmap](#18-native-workflow-roadmap)
19. [Phase 1 Implementation Checklist](#19-phase-1-implementation-checklist)

---

## 1. Responsibilities

### What Workflow Service Owns

- **Workflow definitions.** The canonical registry mapping each `WorkflowName` to its ordered step pipeline, input schema, output schema, streaming flag, estimated duration, and retry policy.
- **Step execution.** Running each workflow step in order (or in a DAG for parallel steps in Phase 2), enforcing per-step timeouts, and accumulating state across steps.
- **Streaming output.** Opening and managing SSE connections, flushing token deltas to the client, and writing partial output to the database for drop-recovery.
- **Background job lifecycle.** Enqueuing long-running workflows as `WorkflowRun` records, polling for available workers, executing jobs, updating status and result.
- **Context assembly.** Calling Knowledge Service and Memory Service to build the enriched context object that LLM calls receive. The Workflow Service owns the assembly call — not the internals of retrieval or memory storage.
- **Human approval gates.** Pausing workflow execution when a step output requires teacher review, persisting the pending state, emitting a notification, and resuming or cancelling on teacher response.
- **Scheduled execution.** Cron-based triggering of recurring workflows (weekly revision plans, term reports, WAEC index refreshes).
- **Observability.** Per-run and per-step logging: inputs, outputs, duration, token usage, model used, cost estimate, error details.
- **Langflow compatibility.** One-directional import of Langflow flow JSON into native `WorkflowDefinition` objects during prototype migration.
- **Usage reporting.** Token consumption and cost aggregation per school, per workflow type, per time period.

### What Workflow Service Does NOT Own

- **Knowledge retrieval internals.** The vector search queries, embedding model calls, and pgvector SQL are inside the Knowledge Service. Workflow Service calls `knowledgeService.buildContext()` and receives a context string. It never touches `KnowledgeChunk` rows directly.
- **Memory storage internals.** The pgvector semantic memory search and Prisma `MemoryEntry` table are owned by the Memory Service. Workflow Service calls `memoryService.buildMemoryContext()` and receives a formatted string.
- **AI provider credentials.** API keys for OpenRouter, Groq, and Anthropic live in the AI Router service (via environment variables accessed only by the router). Workflow Service calls `aiRouter.complete()` or `aiRouter.stream()` with a model preference and prompt — it never constructs Authorization headers.
- **Authentication and authorisation.** The `schoolId`/`teacherId` on every workflow run is asserted by the calling API route (which called Identity Service first). Workflow Service trusts the schoolId it receives — it enforces data scoping but does not re-verify tokens.
- **Frontend rendering.** SSE chunks are written to the Next.js `Response` stream by the calling API route. Workflow Service provides the `AsyncGenerator` of `WorkflowChunk` objects; the route decides how to write them to the wire.
- **File storage.** Uploaded documents that trigger workflows (e.g., a teacher uploading a textbook PDF) are processed by OCR Service and stored via the storage service. Workflow Service receives document text, not file references.

---

## 2. Workflow Catalogue

### 2.1 `lesson-note-generation`

| Property | Value |
|---|---|
| Streams | Yes |
| Estimated Duration | 45–90 seconds (network + LLM latency) |
| Background | No (always streaming) |
| Human Approval Gate | Yes — if content safety check flags output |

**Input parameters:**

```typescript
interface LessonNoteInput {
  schoolId: string;
  teacherId: string;
  subject: string;                    // e.g. "Mathematics"
  classLevel: ClassLevel;             // "SS1" | "SS2" | "SS3" | "JS1" | "JS2" | "JS3"
  topic: string;                      // e.g. "Quadratic Equations"
  week?: number;                      // Scheme of work week number
  term?: 1 | 2 | 3;
  durationMinutes?: number;           // Default: 40
  priorKnowledge?: string;            // What students already know
  specialInstructions?: string;       // Teacher overrides (max 500 chars, validated)
}
```

**Output shape:**

```typescript
interface LessonNoteOutput {
  title: string;
  subject: string;
  classLevel: ClassLevel;
  topic: string;
  sections: {
    objectives: string;               // Specific, measurable objectives (3–5 bullets)
    entryBehaviour: string;           // Prior knowledge activation activity
    content: string;                  // Main instructional content with sub-headings
    diagrams: string[];               // Descriptions of diagrams to draw on board
    examples: GradedExample[];        // 5 worked examples, graded easy → hard
    classExercise: ExerciseQuestion[]; // 5–8 in-class questions
    boardSummary: string;             // Key points summary for board
    homework: string;                 // Homework questions
    waecPastQuestions: PastQuestion[]; // 2–3 real WAEC/NECO questions on topic
  };
  citations: KnowledgeChunk[];        // Sources used in generation
  generatedAt: Date;
}

interface GradedExample {
  difficulty: "introductory" | "basic" | "intermediate" | "challenging" | "exam-style";
  question: string;
  workingSteps: string[];
  answer: string;
}

interface ExerciseQuestion {
  question: string;
  type: "short-answer" | "structured";
  marks: number;
  answer?: string;
}
```

**Step pipeline:** See Section 5 for full step-by-step breakdown.

---

### 2.2 `cbt-question-generation`

| Property | Value |
|---|---|
| Streams | No |
| Estimated Duration | 30–120 seconds depending on question count |
| Background | Yes (question count > 20) |
| Human Approval Gate | No (teacher reviews before publishing exam) |

**Input parameters:**

```typescript
interface CBTQuestionInput {
  schoolId: string;
  teacherId: string;
  examId: string;
  subject: string;
  classLevel: ClassLevel;
  topics: string[];                         // 1–N topics to draw from
  questionCount: number;                    // 1–100
  difficulty?: "easy" | "medium" | "hard" | "mixed"; // Default: "mixed"
  includeWaecStyle?: boolean;               // Draw from WAEC/NECO past question bank
  distractorStrategy?: "plausible" | "curriculum-error-based"; // Default: "plausible"
}
```

**Output shape:**

```typescript
interface CBTQuestionOutput {
  questions: CBTQuestion[];
  totalCount: number;
  topicDistribution: Record<string, number>; // topic → count
  difficultyDistribution: Record<"easy" | "medium" | "hard", number>;
  waecSourcedCount: number;
}

interface CBTQuestion {
  id: string;
  questionText: string;
  options: { A: string; B: string; C: string; D: string; E?: string };
  correctAnswer: "A" | "B" | "C" | "D" | "E";
  explanation: string;
  topic: string;
  difficulty: "easy" | "medium" | "hard";
  isWaecStyled: boolean;
  sourceQuestionId?: string;               // If derived from a past question
}
```

**Steps:**

1. `retrievePastQuestions` — pull relevant WAEC/NECO questions from Knowledge Service for each requested topic
2. `selectAndDeduplicatePool` — select appropriate past questions, remove near-duplicates (cosine similarity > 0.92)
3. `generateNewQuestions` — for any topic gap where past questions are insufficient, generate new questions
4. `generateDistractors` — for generated questions, use LLM to create 3 plausible wrong options that reflect common student misconceptions
5. `calibrateDifficulty` — score each question against difficulty rubric; rebalance if distribution is off target
6. `validateAnswers` — verify each question has exactly one unambiguously correct answer; flag any that need review
7. `assembleAndFormat` — combine, shuffle, assign IDs, return structured output

---

### 2.3 `report-card-narrative`

| Property | Value |
|---|---|
| Streams | Yes (optional — can be sync for batch) |
| Estimated Duration | 10–20 seconds |
| Background | No for individual; Yes when generating for whole class |
| Human Approval Gate | Yes — teacher must approve before narrative is locked to report card |

**Input parameters:**

```typescript
interface ReportCardNarrativeInput {
  schoolId: string;
  teacherId: string;
  studentId: string;                        // Anonymised to student_anon_id in LLM prompt
  term: 1 | 2 | 3;
  academicYear: string;                     // e.g. "2025/2026"
  subjectScores: {
    subject: string;
    score: number;
    total: number;
    grade: string;
  }[];
  attendancePercent?: number;
  teacherNotes?: string;                    // Optional free-form context from teacher
  priorNarrative?: string;                  // Last term's narrative for continuity
  tone?: "encouraging" | "neutral" | "formal"; // Default: "encouraging"
}
```

**Output shape:**

```typescript
interface ReportCardNarrativeOutput {
  narrative: string;              // 80–150 words, TRCN-aligned
  subjectHighlights: {
    subject: string;
    highlight: string;            // One-sentence subject-specific comment
  }[];
  recommendedActions: string[];   // 2–3 specific recommendations for student/parent
  confidenceScore: number;        // 0–1: how confident the model is in the narrative
  flaggedForReview: boolean;      // True if low confidence or sensitive content detected
}
```

**Steps:**

1. `loadStudentHistory` — call Memory Service for student's prior performance and teacher notes
2. `computeSubjectTrends` — calculate per-subject trend (improving/declining/stable) from prior data
3. `generateNarrative` — LLM call producing the full narrative and subject highlights
4. `validateAndFlag` — run content safety check; set `flaggedForReview` if any concern
5. `formatOutput` — enforce word count, TRCN-aligned tone, return structured output

---

### 2.4 `curriculum-gap-analysis`

| Property | Value |
|---|---|
| Streams | No |
| Estimated Duration | 20–40 seconds |
| Background | Yes |
| Human Approval Gate | No |

**Input parameters:**

```typescript
interface CurriculumGapInput {
  schoolId: string;
  teacherId: string;
  subject: string;
  classLevel: ClassLevel;
  coveredTopics: string[];
  term: 1 | 2 | 3;
  examBody?: ExamBody;              // Default: "WAEC"
}
```

**Output shape:**

```typescript
interface CurriculumGapOutput {
  syllabusTopics: string[];         // Full official topic list for subject/level
  coveredTopics: string[];          // Normalised against syllabus (fuzzy matched)
  uncoveredTopics: string[];        // Topics in syllabus not yet covered
  partiallyCovedTopics: string[];   // Topics mentioned but depth unclear
  coveragePercent: number;          // 0–100
  riskTopics: string[];             // Uncovered topics likely on WAEC/NECO this year
  recommendedWeeks: {
    topic: string;
    priority: "urgent" | "high" | "medium";
    estimatedPeriods: number;
  }[];
  generatedAt: Date;
}
```

**Steps:**

1. `loadOfficialSyllabus` — retrieve Knowledge Service chunks tagged `curriculum-document` for subject + classLevel + examBody
2. `normaliseCoveredTopics` — LLM call to fuzzy-match teacher's covered topics against official topic names
3. `computeGaps` — set difference of syllabus vs normalised covered topics
4. `assessRisk` — LLM call cross-referencing gaps with recent WAEC/NECO question frequency data
5. `generateRecommendations` — produce prioritised remediation schedule with estimated teaching periods

---

### 2.5 `student-revision-plan`

| Property | Value |
|---|---|
| Streams | Yes |
| Estimated Duration | 15–30 seconds |
| Background | No |
| Human Approval Gate | No |

**Input parameters:**

```typescript
interface StudentRevisionInput {
  schoolId: string;
  studentId: string;                // Anonymised before LLM call
  subject: string;
  classLevel: ClassLevel;
  weakTopics: string[];             // From Memory Service: student-weak-topic entries
  weeksUntilExam: number;
  studyHoursPerDay?: number;        // Default: 1.5
  preferredFormat?: "daily" | "weekly"; // Default: "weekly"
}
```

**Output shape:**

```typescript
interface StudentRevisionPlanOutput {
  planTitle: string;
  weeksUntilExam: number;
  weeklySchedule: {
    week: number;
    topics: string[];
    practiceQuestionCount: number;
    reviewTopics: string[];         // Topics from prior weeks to re-test
    estimatedHours: number;
  }[];
  studyTips: string[];              // 3–5 subject-specific tips
  milestones: {
    week: number;
    checkpoint: string;             // What the student should be able to do by this week
  }[];
}
```

**Steps:**

1. `loadStudentWeaknesses` — Memory Service: `getStudentWeakTopics()`
2. `rankTopicsByUrgency` — LLM call: order weak topics by WAEC/NECO probability and conceptual dependency
3. `distributeAcrossWeeks` — algorithmic: spread topics across available weeks, build in spaced repetition
4. `generateStudyTips` — LLM call: produce subject-specific revision strategies
5. `formatSchedule` — assemble into structured weekly plan output

---

### 2.6 `parent-progress-report`

| Property | Value |
|---|---|
| Streams | No |
| Estimated Duration | 10–15 seconds |
| Background | No |
| Human Approval Gate | Yes — school admin or class teacher must approve |

**Input parameters:**

```typescript
interface ParentProgressReportInput {
  schoolId: string;
  teacherId: string;
  studentId: string;
  term: 1 | 2 | 3;
  academicYear: string;
  subjectScores: { subject: string; score: number; grade: string }[];
  attendancePercent?: number;
  behaviourNotes?: string;
  parentLanguage?: "english" | "pidgin" | "yoruba" | "igbo" | "hausa"; // Default: "english"
  deliveryChannel?: "sms" | "whatsapp" | "print";                       // Affects length
}
```

**Output shape:**

```typescript
interface ParentProgressReportOutput {
  greeting: string;
  performanceSummary: string;         // 2–3 sentences
  subjectHighlights: string;          // Best and worst subjects named
  attendanceSummary: string;
  actionableAdvice: string;           // 1–2 specific things parent can do
  closingMessage: string;
  fullText: string;                   // Combined, delivery-ready
  wordCount: number;
  smsCompatible: boolean;             // True if < 160 chars
}
```

**Steps:**

1. `assembleStudentSnapshot` — pull scores, attendance, and Memory Service notes
2. `selectTone` — map `parentLanguage` and `deliveryChannel` to appropriate prompt tone
3. `generateReport` — LLM call producing all output fields
4. `enforceLength` — trim/expand to fit delivery channel constraints (SMS: 160 chars, WhatsApp: 500 chars, print: unlimited)
5. `flagForApproval` — always set `awaitingApproval = true`; teacher/admin must review before send

---

### 2.7 `homework-generation`

| Property | Value |
|---|---|
| Streams | No |
| Estimated Duration | 10–20 seconds |
| Background | No |
| Human Approval Gate | No |

**Input parameters:**

```typescript
interface HomeworkInput {
  schoolId: string;
  teacherId: string;
  subject: string;
  classLevel: ClassLevel;
  topic: string;
  questionCount?: number;           // Default: 5
  includeMarkingGuide?: boolean;    // Default: true
  differentiationLevel?: "uniform" | "tiered"; // Default: "uniform"
}
```

**Output shape:**

```typescript
interface HomeworkOutput {
  title: string;
  instructions: string;
  questions: HomeworkQuestion[];
  markingGuide?: HomeworkMarkingGuide;
  totalMarks: number;
  estimatedCompletionMinutes: number;
}

interface HomeworkQuestion {
  number: number;
  question: string;
  marks: number;
  type: "short-answer" | "structured" | "essay";
  hint?: string;
}

interface HomeworkMarkingGuide {
  answers: { questionNumber: number; markScheme: string; marks: number }[];
}
```

**Steps:**

1. `retrieveTopicContext` — Knowledge Service: topic-specific curriculum content
2. `generateQuestions` — LLM call: produce differentiated questions aligned to topic
3. `generateMarkingGuide` — LLM call (if requested): produce mark scheme for each question
4. `validateAndFormat` — verify marks tally, question numbering, format output

---

### 2.8 `marking-scheme-generation`

| Property | Value |
|---|---|
| Streams | No |
| Estimated Duration | 15–30 seconds |
| Background | No |
| Human Approval Gate | Yes — teacher should verify before distributing |

**Input parameters:**

```typescript
interface MarkingSchemeInput {
  schoolId: string;
  teacherId: string;
  subject: string;
  classLevel: ClassLevel;
  examTitle: string;
  questions: {
    number: number;
    questionText: string;
    marks: number;
    type: "multiple-choice" | "short-answer" | "structured" | "essay";
    correctOption?: "A" | "B" | "C" | "D"; // For MCQ
  }[];
  totalMarks: number;
  rubricStyle?: "points-based" | "levels-based"; // Default: "points-based"
}
```

**Output shape:**

```typescript
interface MarkingSchemeOutput {
  examTitle: string;
  totalMarks: number;
  answers: {
    questionNumber: number;
    markScheme: string;
    markAllocation: string;        // e.g. "1 mark for method, 2 for correct answer"
    acceptableVariations?: string; // What alternative correct answers are acceptable
    commonErrors?: string;         // Common mistakes to watch for when marking
  }[];
  generalInstructions: string;     // Marking instructions for the examiner
}
```

**Steps:**

1. `retrieveSubjectKnowledge` — Knowledge Service: retrieve authoritative content on each question's topic
2. `generateMarkScheme` — LLM call per question (batched): produce mark scheme and allocation
3. `identifyCommonErrors` — LLM call: predict common student errors to guide marking
4. `validateMarkTotals` — algorithmic: verify per-question marks sum to total
5. `formatForDistribution` — structure output for teacher download or class use

---

## 3. Internal Modules

### 3.1 WorkflowRegistry

Maps `WorkflowName` to a `WorkflowDefinition` — the canonical static description of every workflow. The registry is the single place where step order, configuration, and metadata live.

**Key responsibilities:**
- Resolve a `WorkflowName` to its `WorkflowDefinition` at runtime
- Validate input against the workflow's input schema (using Zod) before execution begins
- Provide metadata for the usage report and monitoring dashboard
- Enforce versioning — breaking input/output changes require a version bump in the registry key

**Inputs:** `WorkflowName`

**Outputs:** `WorkflowDefinition`

**Key functions:**

```typescript
interface WorkflowRegistry {
  get(name: WorkflowName): WorkflowDefinition;
  getAll(): WorkflowDefinition[];
  validate<T>(name: WorkflowName, input: unknown): T;  // Throws ZodError on invalid input
  isStreamingWorkflow(name: WorkflowName): boolean;
  isBackgroundWorkflow(name: WorkflowName): boolean;
}

interface WorkflowDefinition {
  name: WorkflowName;
  version: string;                    // semver — "1.0.0"
  description: string;
  streaming: boolean;
  backgroundEligible: boolean;        // Can be submitted as background job
  estimatedDurationMs: { min: number; max: number };
  inputSchema: z.ZodType<unknown>;
  outputSchema: z.ZodType<unknown>;
  steps: WorkflowStepConfig[];
  retryPolicy: RetryPolicy;
  requiresApproval: boolean;
  approvalStep?: string;              // Name of the step that triggers approval check
  schedulable: boolean;
  defaultModel?: string;              // Override AI Router default for this workflow
}
```

---

### 3.2 WorkflowExecutor

Orchestrates the execution of a complete workflow. Accepts a `WorkflowDefinition`, an initial `WorkflowState`, and a `WorkflowContext`, then runs each step in order (Phase 1: sequential; Phase 2: DAG-aware).

**Key responsibilities:**
- For synchronous workflows: run steps in order, collect final state, return `WorkflowResult`
- For streaming workflows: run steps in order, pipe each step's token stream through `StreamingEmitter`
- Update `WorkflowRun` record in DB at each state transition (queued → running → per-step → completed/failed)
- Invoke `HumanApprovalGate` when the current step matches `WorkflowDefinition.approvalStep`
- Call `StepRunner` for each individual step with the correct timeout and retry config
- On failure: capture error, update DB, surface clean error to caller

**Inputs:** `WorkflowDefinition`, `WorkflowState`, `WorkflowContext`

**Outputs:** `WorkflowResult<TOutput>` (sync) or `AsyncGenerator<WorkflowChunk>` (streaming)

**Key functions:**

```typescript
class WorkflowExecutor {
  async execute<TState, TOutput>(
    definition: WorkflowDefinition,
    initialState: TState,
    context: WorkflowContext
  ): Promise<WorkflowResult<TOutput>>;

  async *executeStreaming<TState>(
    definition: WorkflowDefinition,
    initialState: TState,
    context: WorkflowContext
  ): AsyncGenerator<WorkflowChunk>;

  private async runStep<TState>(
    stepConfig: WorkflowStepConfig,
    state: TState,
    context: WorkflowContext
  ): Promise<TState>;

  private async checkApprovalGate(
    context: WorkflowContext,
    pendingOutput: unknown
  ): Promise<"approved" | "rejected" | "edited">;
}
```

---

### 3.3 StepRunner

Executes a single `WorkflowStep` function with timeout enforcement, retry logic, structured logging, and per-step DB record persistence.

**Key responsibilities:**
- Wrap the step function call in a `Promise.race()` against a timeout promise
- On timeout or LLM error: apply retry policy from `WorkflowStepConfig`
- Log step start, completion, and failure to `WorkflowStepLog` table
- Record per-step token usage (extracted from AI Router response metadata)
- On non-retriable failure: throw, let WorkflowExecutor handle cancellation

**Inputs:** `WorkflowStepConfig`, current state `TState`, `WorkflowContext`

**Outputs:** Updated state `TState`, or throws `StepError`

**Key functions:**

```typescript
class StepRunner {
  async run<TState>(
    stepConfig: WorkflowStepConfig,
    state: TState,
    context: WorkflowContext
  ): Promise<TState>;

  private async runWithTimeout<TState>(
    fn: WorkflowStep<TState>,
    state: TState,
    context: WorkflowContext,
    timeoutMs: number
  ): Promise<TState>;

  private async runWithRetry<TState>(
    fn: () => Promise<TState>,
    policy: RetryPolicy,
    stepName: string
  ): Promise<TState>;

  private async persistStepLog(
    runId: string,
    stepName: string,
    status: "running" | "completed" | "failed",
    meta: StepLogMeta
  ): Promise<void>;
}

interface StepLogMeta {
  durationMs?: number;
  promptTokens?: number;
  completionTokens?: number;
  model?: string;
  error?: string;
  attempt?: number;
}
```

---

### 3.4 BackgroundJobManager

Manages the lifecycle of long-running workflow runs submitted via `submit()`. Operates against the `WorkflowRun` Prisma table as its job queue (Phase 1). No external queue dependency.

**Key responsibilities:**
- Accept a `submit()` call, create a `WorkflowRun` record with `status: "queued"`, return `runId`
- Poll the `WorkflowRun` table for queued jobs at a configurable interval (default: 5 seconds)
- Enforce per-school worker concurrency limit (max 5 concurrent LLM-heavy workflows per school)
- Prioritise streaming jobs over background jobs in the queue
- On worker pickup: update status to `"running"`, delegate to `WorkflowExecutor`
- On completion: write result to `outputJson`, update status to `"completed"` or `"failed"`

**Inputs:** `WorkflowName`, serialisable input payload, priority

**Outputs:** `runId: string`

**Key functions:**

```typescript
class BackgroundJobManager {
  async submit(
    workflowName: WorkflowName,
    input: unknown,
    context: { schoolId: string; teacherId?: string }
  ): Promise<string>; // runId

  async startWorkerLoop(concurrency: number): Promise<void>;

  private async claimNextJob(schoolId?: string): Promise<WorkflowRun | null>;

  private async executeJob(run: WorkflowRun): Promise<void>;

  async cancelJob(runId: string, schoolId: string): Promise<void>;

  async getSchoolConcurrentCount(schoolId: string): Promise<number>;
}
```

---

### 3.5 ContextBuilder

Assembles the enriched context object that every LLM-calling step receives. Calls Knowledge Service and Memory Service in parallel (where applicable), handles partial failures gracefully (if Memory Service fails, continues with empty memory context rather than failing the whole workflow), and formats context strings for prompt injection.

**Key responsibilities:**
- Accept a `WorkflowContextRequest` specifying which context types are needed
- Fan out to Knowledge Service (`buildContext()`) and Memory Service (`buildMemoryContext()`) in parallel
- Apply token budget: if combined context exceeds token limit, trim Knowledge context first, then Memory context
- Return a structured `WorkflowContext` ready for the WorkflowExecutor

**Inputs:** `WorkflowContextRequest`

**Outputs:** `WorkflowContext`

**Key functions:**

```typescript
class ContextBuilder {
  async build(request: WorkflowContextRequest): Promise<WorkflowContext>;

  private async buildKnowledgeContext(
    query: string,
    schoolId: string,
    filters: KnowledgeFilters,
    maxTokens: number
  ): Promise<{ context: string; citations: KnowledgeChunk[] }>;

  private async buildMemoryContext(
    actorId: string,
    actorType: string,
    schoolId: string,
    taskContext: string,
    maxTokens: number
  ): Promise<{ context: string }>;

  private enforceTokenBudget(
    knowledge: string,
    memory: string,
    budgetTokens: number
  ): { knowledge: string; memory: string; trimmed: boolean };
}

interface WorkflowContextRequest {
  schoolId: string;
  teacherId?: string;
  studentId?: string;          // Anonymised ID — never the real student ID in LLM calls
  knowledgeQuery?: string;
  knowledgeFilters?: KnowledgeFilters;
  needsMemory?: boolean;
  taskDescription?: string;    // Natural language description for memory relevance scoring
  maxContextTokens?: number;   // Default: 4000
}
```

---

### 3.6 StreamingEmitter

Bridges the token stream from the AI Router to the SSE response stream delivered to the frontend. Handles partial output storage for drop-recovery, and emits structured `WorkflowChunk` objects with step metadata.

**Key responsibilities:**
- Accept an `AsyncGenerator<string>` of tokens from AI Router
- Wrap each token as a `WorkflowChunk` SSE payload: `{ delta, step, done, runId }`
- Write accumulated partial output to `WorkflowRun.partialOutput` every 50 tokens (for recovery)
- On `done: true`: write full output to `WorkflowRun.outputJson`, set status `"completed"`
- Handle client disconnect gracefully: stop token generation by aborting the AI Router call via `AbortController`

**Inputs:** `AsyncGenerator<string>` from AI Router, `runId`, current step name

**Outputs:** `AsyncGenerator<WorkflowChunk>` consumed by the API route

**Key functions:**

```typescript
class StreamingEmitter {
  async *emit(
    tokenStream: AsyncGenerator<string>,
    runId: string,
    stepName: string,
    signal: AbortSignal
  ): AsyncGenerator<WorkflowChunk>;

  private async persistPartialOutput(
    runId: string,
    accumulated: string,
    tokenCount: number
  ): Promise<void>;

  private async finaliseRun(runId: string, fullOutput: string): Promise<void>;
}

interface WorkflowChunk {
  delta: string;            // Token or token sequence
  step: string;             // Current step name, e.g. "expandContent"
  done: boolean;            // True on final chunk
  runId: string;
  stepIndex: number;        // 0-based step position in pipeline
  totalSteps: number;       // Total step count for this workflow
}
```

---

### 3.7 HumanApprovalGate

Pauses workflow execution at designated approval steps, stores the pending output, notifies the responsible teacher via notification service, and waits for a decision (approve/reject/edit) before resuming or cancelling.

**Key responsibilities:**
- Atomically update `WorkflowRun.status` to `"awaiting_approval"` when the gate is hit
- Persist the pending step output to `WorkflowApproval.pendingOutput`
- Emit an approval notification event (handled by notification service — not owned by Workflow Service)
- Block the executing goroutine with a DB poll (polling `WorkflowApproval.decision` every 10 seconds, timeout: 48 hours)
- On `approve`: resume execution from the next step
- On `reject`: cancel the run, set status `"cancelled"`, reason `"human_rejected"`
- On `edit`: accept the modified output from the teacher, write it as step output, resume execution

**Inputs:** `WorkflowContext`, pending step output

**Outputs:** `"approved" | "rejected" | { type: "edited"; editedOutput: unknown }`

**Key functions:**

```typescript
class HumanApprovalGate {
  async checkpoint(
    runId: string,
    stepName: string,
    pendingOutput: unknown,
    context: WorkflowContext
  ): Promise<ApprovalDecision>;

  async submitDecision(
    approvalId: string,
    schoolId: string,
    decision: "approve" | "reject",
    editedOutput?: unknown
  ): Promise<void>;

  private async pollForDecision(
    approvalId: string,
    timeoutMs: number
  ): Promise<ApprovalDecision>;
}

type ApprovalDecision =
  | { type: "approved" }
  | { type: "rejected" }
  | { type: "edited"; editedOutput: unknown };
```

---

### 3.8 SchedulerModule

Manages cron-based workflow execution schedules configured by school admins. Evaluates due schedules on startup and every minute, submits workflows via `BackgroundJobManager`, handles missed runs.

**Key responsibilities:**
- Load active `WorkflowSchedule` records on startup and when schedules are created/updated
- Evaluate which schedules are due on each tick (compare `nextRunAt <= now()`)
- Submit due workflows via `BackgroundJobManager.submit()`
- Update `WorkflowSchedule.lastRunAt` and compute `nextRunAt` after each trigger
- Handle missed runs: if `nextRunAt` is in the past and `lastRunAt` was before the scheduled time, run once (catch-up) then advance to the next scheduled time — do not execute multiple missed runs
- Respect school timezone in cron expressions

**Inputs:** `WorkflowSchedule` records from DB

**Outputs:** Submitted `WorkflowRun` records

**Key functions:**

```typescript
class SchedulerModule {
  async start(): Promise<void>;
  async stop(): Promise<void>;

  async createSchedule(
    schedule: CreateScheduleInput,
    schoolId: string
  ): Promise<WorkflowSchedule>;

  async updateSchedule(
    scheduleId: string,
    updates: Partial<CreateScheduleInput>,
    schoolId: string
  ): Promise<WorkflowSchedule>;

  async deleteSchedule(scheduleId: string, schoolId: string): Promise<void>;

  private async tick(): Promise<void>;
  private async triggerSchedule(schedule: WorkflowSchedule): Promise<void>;
  private computeNextRunAt(cronExpression: string, timezone: string): Date;
}
```

---

### 3.9 LangflowCompatLayer

One-directional converter: Langflow flow JSON → TeachNexis `WorkflowDefinition`. Used only during prototype migration — never runs in the production request path.

**Key responsibilities:**
- Parse Langflow flow JSON (nodes + edges)
- Map recognised Langflow node types to TeachNexis `WorkflowStepConfig` entries
- Detect unsupported node types and emit a conversion report listing what requires manual porting
- Output a partial or complete `WorkflowDefinition` with any unconverted steps marked as stubs

**Key functions:**

```typescript
class LangflowCompatLayer {
  convert(flowJson: LangflowFlowJSON): LangflowConversionResult;
}

interface LangflowConversionResult {
  definition: Partial<WorkflowDefinition>;
  unconvertedNodes: { nodeId: string; nodeType: string; reason: string }[];
  warnings: string[];
  conversionReport: string;      // Human-readable summary for the engineer doing the port
}
```

See Section 12 for the full node mapping table and conversion rules.

---

## 4. Public API

### Types

```typescript
// ── Workflow names ────────────────────────────────────────────────────────────

export type WorkflowName =
  | "lesson-note-generation"
  | "cbt-question-generation"
  | "report-card-narrative"
  | "curriculum-gap-analysis"
  | "student-revision-plan"
  | "parent-progress-report"
  | "homework-generation"
  | "marking-scheme-generation";

// ── Workflow step (internal — not exposed to callers) ─────────────────────────

export type WorkflowStep<TState> = (
  state: TState,
  ctx: WorkflowContext
) => Promise<TState>;

export interface WorkflowStepConfig {
  name: string;                       // e.g. "expandContent"
  fn: WorkflowStep<unknown>;
  timeoutMs: number;                  // Per-step timeout
  retryPolicy: RetryPolicy;
  dependencies?: string[];            // Step names this step depends on (Phase 2: DAG)
  streaming?: boolean;                // Does this step produce a token stream?
  streamingModel?: string;            // Model override for streaming steps
  skipIfState?: (state: unknown) => boolean; // Conditional step skip
}

export interface RetryPolicy {
  maxAttempts: number;
  backoffMs: number;
  backoffMultiplier?: number;         // For exponential backoff
  retryOn: ("timeout" | "llm_error" | "rate_limit")[];
}

// ── Workflow context (internal — assembled by ContextBuilder) ─────────────────

export interface WorkflowContext {
  schoolId: string;
  teacherId?: string;
  studentAnonId?: string;             // Hashed student ID — never the raw student PK
  runId: string;
  knowledgeContext: string;           // Pre-built context string from Knowledge Service
  memoryContext: string;              // Pre-built context string from Memory Service
  citations: KnowledgeChunk[];        // Source chunks used in knowledgeContext
  knowledgeService: TeachNexisKnowledgeService;
  memoryService: TeachNexisMemoryService;
  aiRouter: TeachNexisAIRouter;
  logger: WorkflowLogger;
  abortSignal: AbortSignal;           // Set by client disconnect or cancelRun()
  model: string;                      // Resolved model for this run
}

// ── Streaming chunk ───────────────────────────────────────────────────────────

export interface WorkflowChunk {
  delta: string;
  step: string;
  stepIndex: number;
  totalSteps: number;
  done: boolean;
  runId: string;
}

// ── Result and run types ─────────────────────────────────────────────────────

export interface WorkflowResult<TOutput = unknown> {
  runId: string;
  workflowName: WorkflowName;
  status: "completed" | "failed" | "cancelled";
  output: TOutput;
  durationMs: number;
  tokenUsage: {
    prompt: number;
    completion: number;
    total: number;
  };
  estimatedCostUSD: number;
  model: string;
  createdAt: Date;
  completedAt: Date;
  error?: string;
  citations?: KnowledgeChunk[];
  stepBreakdown?: {
    stepName: string;
    durationMs: number;
    promptTokens: number;
    completionTokens: number;
    model: string;
    attempts: number;
  }[];
}

export interface WorkflowRun {
  runId: string;
  workflowName: WorkflowName;
  schoolId: string;
  teacherId?: string;
  status: "queued" | "running" | "completed" | "failed" | "cancelled" | "awaiting_approval";
  progress?: number;                  // 0.0–1.0 for multi-step flows
  currentStep?: string;               // Name of step currently executing
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletionAt?: Date;
  error?: string;
}

export interface UsageReport {
  schoolId: string;
  periodDays: number;
  generatedAt: Date;
  totalRuns: number;
  totalTokens: number;
  totalCostUSD: number;
  byWorkflow: Record<
    WorkflowName,
    {
      runs: number;
      completedRuns: number;
      failedRuns: number;
      tokens: number;
      costUSD: number;
      avgDurationMs: number;
    }
  >;
  dailyBreakdown: {
    date: string;                     // ISO date
    runs: number;
    tokens: number;
    costUSD: number;
  }[];
}
```

### Service Interface

```typescript
export interface TeachNexisWorkflowService {
  /**
   * Run a workflow synchronously to completion.
   * Use for short flows expected to finish in < 15 seconds.
   * Suitable for: report-card-narrative (individual), homework-generation,
   *               parent-progress-report, marking-scheme-generation.
   * Throws WorkflowError on failure.
   */
  run<TInput, TOutput>(
    workflow: WorkflowName,
    input: TInput,
    options?: {
      model?: string;
      timeoutMs?: number;
      skipApprovalGate?: boolean;     // Dangerous — only for automated testing
    }
  ): Promise<WorkflowResult<TOutput>>;

  /**
   * Run a workflow with live token streaming via SSE.
   * Use for long generative flows: lesson-note-generation, report-card-narrative (batch),
   *                                  student-revision-plan.
   * The caller is responsible for piping chunks to the HTTP response.
   * Throws WorkflowError if streaming cannot start (input validation failed, quota exceeded).
   */
  stream<TInput>(
    workflow: WorkflowName,
    input: TInput,
    options?: {
      model?: string;
      signal?: AbortSignal;
    }
  ): AsyncGenerator<WorkflowChunk>;

  /**
   * Submit a workflow as a background job. Returns runId immediately.
   * Use for heavy batch flows: cbt-question-generation (large sets),
   *                             curriculum-gap-analysis, whole-class report batches.
   */
  submit<TInput>(
    workflow: WorkflowName,
    input: TInput
  ): Promise<string>;  // runId

  /**
   * Get the current status of a workflow run.
   * schoolId is required for data isolation — returns 404 if schoolId doesn't match.
   */
  getRunStatus(runId: string, schoolId: string): Promise<WorkflowRun>;

  /**
   * Get the completed result of a finished run.
   * Throws if run is not yet completed (status: "running" | "queued").
   * Throws WorkflowRunNotFoundError if schoolId doesn't own the run.
   */
  getRunResult<TOutput>(runId: string, schoolId: string): Promise<WorkflowResult<TOutput>>;

  /**
   * List recent workflow runs for a school, optionally filtered.
   * Results are always scoped to the provided schoolId.
   */
  listRuns(params: {
    schoolId: string;
    teacherId?: string;
    workflowName?: WorkflowName;
    status?: WorkflowRun["status"];
    limit?: number;                   // Default: 20, max: 100
    offset?: number;
  }): Promise<WorkflowRun[]>;

  /**
   * Cancel a queued or running workflow run.
   * Running runs: signals AbortController, marks as cancelled after current step completes.
   * Queued runs: immediately marks as cancelled.
   * No-op if run is already completed/failed/cancelled.
   */
  cancelRun(runId: string, schoolId: string): Promise<void>;

  /**
   * Retrieve token usage and cost report for a school over the given period.
   * Used by the billing dashboard and quota management system.
   */
  getUsageReport(schoolId: string, periodDays?: number): Promise<UsageReport>;
}
```

---

## 5. Step Execution Architecture

### Step Function Contract

Every step is a pure async function with this signature:

```typescript
type WorkflowStep<TState> = (state: TState, ctx: WorkflowContext) => Promise<TState>;
```

Steps must not maintain external side effects beyond the state object (except structured logging and DB writes made via `ctx.logger` or `ctx.memoryService`). A step that fails can be retried by re-calling it with the same input state — it must be idempotent.

State is a plain object that accumulates over the pipeline. Each step reads from state fields set by prior steps and writes new fields to state. No step should mutate fields written by a later step — fields are append-only within a run.

### Pipeline Composition

```typescript
async function executePipeline<TState>(
  steps: WorkflowStepConfig[],
  initialState: TState,
  context: WorkflowContext
): Promise<TState> {
  let state = initialState;
  for (const stepConfig of steps) {
    if (stepConfig.skipIfState?.(state)) continue;
    state = await stepRunner.run(stepConfig, state, context);
    await updateRunProgress(context.runId, steps.indexOf(stepConfig), steps.length);
  }
  return state;
}
```

### `lesson-note-generation` Full Step Pipeline

```typescript
// State type for lesson note generation
interface LessonNoteState {
  // Input fields (set before pipeline starts)
  input: LessonNoteInput;

  // Assembled context (set by Step 1)
  knowledgeChunks?: KnowledgeChunk[];
  pastQuestions?: PastQuestion[];
  contextString?: string;
  memoryString?: string;

  // LLM-generated content (set progressively)
  outline?: LessonNoteOutline;
  objectives?: string;
  entryBehaviour?: string;
  content?: string;
  diagrams?: string[];
  examples?: GradedExample[];
  classExercise?: ExerciseQuestion[];
  boardSummary?: string;
  homework?: string;

  // Metadata
  citations?: KnowledgeChunk[];
  flaggedForReview?: boolean;
  validationErrors?: string[];
}
```

---

#### Step 1: `retrieveKnowledgeContext`

```typescript
async function retrieveKnowledgeContext(
  state: LessonNoteState,
  ctx: WorkflowContext
): Promise<LessonNoteState> {
```

**Reads from state:** `input.topic`, `input.subject`, `input.classLevel`, `input.schoolId`

**LLM call:** None. Calls Knowledge Service and Memory Service in parallel.

**Writes to state:** `knowledgeChunks`, `pastQuestions`, `contextString`, `memoryString`, `citations`

**Implementation:**

```typescript
  const [knowledgeResult, memoryResult, pastQs] = await Promise.all([
    ctx.knowledgeService.buildContext({
      query: `${input.topic} ${input.subject} ${input.classLevel}`,
      schoolId: input.schoolId,
      filters: { subject: input.subject, classLevel: input.classLevel },
      topK: 8,
      minSimilarity: 0.68,
    }),
    ctx.memoryService.buildMemoryContext({
      actorId: ctx.teacherId!,
      actorType: "teacher",
      schoolId: input.schoolId,
      taskContext: `generating lesson note on ${input.topic} for ${input.classLevel} ${input.subject}`,
      maxTokens: 400,
    }),
    ctx.knowledgeService.getPastQuestions({
      schoolId: input.schoolId,
      subject: input.subject,
      classLevel: input.classLevel,
      topic: input.topic,
      limit: 5,
    }),
  ]);

  return {
    ...state,
    contextString: knowledgeResult.context,
    citations: knowledgeResult.citations,
    memoryString: memoryResult.context,
    pastQuestions: pastQs,
    knowledgeChunks: knowledgeResult.citations,
  };
}
```

**Step config:**

```typescript
{
  name: "retrieveKnowledgeContext",
  fn: retrieveKnowledgeContext,
  timeoutMs: 10_000,
  retryPolicy: {
    maxAttempts: 2,
    backoffMs: 1000,
    retryOn: ["timeout"],
  },
}
```

---

#### Step 2: `generateOutline`

**Reads from state:** `input`, `contextString`, `memoryString`

**LLM call:** `aiRouter.complete()` — non-streaming, expects structured JSON response.

**Writes to state:** `outline`

**Prompt:** Instructs the model to produce a JSON object with all 8 section keys and a one-sentence plan for each. Uses the teacher memory string to adjust tone and format preferences. Uses the knowledge context to ground outline in curriculum content.

**Expected model output:**

```json
{
  "objectives": "3 specific objectives students will achieve",
  "entryBehaviour": "Plan for activation activity using prior knowledge",
  "contentPlan": "Key sub-topics and explanation approach",
  "diagramNeeded": true,
  "examplesApproach": "Range: from simple substitution to real WAEC 2023 Q7",
  "exerciseType": "structured",
  "homeworkType": "differentiated",
  "boardSummaryFocus": "Three key formulas and one worked example"
}
```

**Step config:**

```typescript
{
  name: "generateOutline",
  fn: generateOutline,
  timeoutMs: 15_000,
  retryPolicy: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2,
    retryOn: ["timeout", "llm_error", "rate_limit"],
  },
}
```

---

#### Step 3: `expandObjectives`

**Reads from state:** `outline.objectives`, `input.classLevel`, `memoryString`

**LLM call:** `aiRouter.complete()` — streaming off, structured text response. Produces the full objectives section as a formatted list.

**Writes to state:** `objectives`, `entryBehaviour`

**Output:** Full prose for the Objectives and Entry Behaviour sections, conforming to SMART objective format. Examples: "By the end of the lesson, students should be able to: (i) state the quadratic formula; (ii) apply the formula to solve equations with real roots; (iii) identify equations with no real roots."

**Step config:**

```typescript
{
  name: "expandObjectives",
  fn: expandObjectives,
  timeoutMs: 20_000,
  retryPolicy: { maxAttempts: 2, backoffMs: 1500, retryOn: ["timeout", "llm_error"] },
}
```

---

#### Step 4: `expandContent`

**Reads from state:** `outline`, `contextString`, `input.topic`, `input.subject`, `input.classLevel`, `input.durationMinutes`

**LLM call:** `aiRouter.stream()` — streaming enabled. This is the largest generation step. Produces the main instructional content section with sub-headings, explanations, and board-work descriptions.

**Writes to state:** `content`, `diagrams`

**Note:** This is the primary streaming step. The `StreamingEmitter` pipes tokens from this step to the frontend. All prior steps (1–3) run synchronously before streaming begins.

**Step config:**

```typescript
{
  name: "expandContent",
  fn: expandContent,
  timeoutMs: 60_000,
  streaming: true,
  retryPolicy: { maxAttempts: 2, backoffMs: 3000, retryOn: ["timeout", "rate_limit"] },
}
```

---

#### Step 5: `generateExamples`

**Reads from state:** `content`, `input.topic`, `pastQuestions`, `outline.examplesApproach`

**LLM call:** `aiRouter.stream()` — streaming enabled. Generates 5 graded worked examples: introductory → basic → intermediate → challenging → exam-style (using a real WAEC/NECO past question where available).

**Writes to state:** `examples`

**Step config:**

```typescript
{
  name: "generateExamples",
  fn: generateExamples,
  timeoutMs: 45_000,
  streaming: true,
  retryPolicy: { maxAttempts: 2, backoffMs: 2000, retryOn: ["timeout", "rate_limit"] },
}
```

---

#### Step 6: `generateExercises`

**Reads from state:** `examples`, `input.topic`, `input.classLevel`, `outline.exerciseType`

**LLM call:** `aiRouter.complete()` — non-streaming. Generates 5–8 class exercise questions with mark allocation. Questions must be novel (not copied from `examples`).

**Writes to state:** `classExercise`, `boardSummary`

**Step config:**

```typescript
{
  name: "generateExercises",
  fn: generateExercises,
  timeoutMs: 25_000,
  retryPolicy: { maxAttempts: 2, backoffMs: 1500, retryOn: ["timeout", "llm_error"] },
}
```

---

#### Step 7: `generateHomework`

**Reads from state:** `input.topic`, `classExercise` (to avoid duplication), `outline.homeworkType`

**LLM call:** `aiRouter.complete()` — non-streaming. Generates homework questions including 1–2 real WAEC-style questions. Includes marking guide.

**Writes to state:** `homework`

**Step config:**

```typescript
{
  name: "generateHomework",
  fn: generateHomework,
  timeoutMs: 20_000,
  retryPolicy: { maxAttempts: 2, backoffMs: 1500, retryOn: ["timeout", "llm_error"] },
}
```

---

#### Step 8: `validateAndFormat`

**Reads from state:** all prior fields

**LLM call:** None. Pure TypeScript validation.

**Writes to state:** `flaggedForReview`, `validationErrors`

**Validates:**
- All 8 sections are non-empty
- Objectives contain at least 3 items
- Examples count = 5, one per difficulty tier
- Exercise questions count ≥ 5
- Homework is present
- Board summary is present
- No section exceeds 4000 tokens (truncation protection)
- Content safety: runs against a regex blocklist for Nigerian curriculum-inappropriate patterns

If validation fails non-fatally (e.g., only 4 examples found): sets `flaggedForReview = true`, logs warning, returns partial output.

If validation fails fatally (e.g., content field is empty): throws `StepError("validate_and_format", "fatal_validation_failure")`.

**Step config:**

```typescript
{
  name: "validateAndFormat",
  fn: validateAndFormat,
  timeoutMs: 5_000,
  retryPolicy: { maxAttempts: 1, backoffMs: 0, retryOn: [] },
}
```

---

## 6. Streaming Architecture

### End-to-End Token Flow

```
Teacher browser
  │  (EventSource /api/workflow/stream?runId=...)
  │
  ▼
Next.js API Route
  /app/api/workflow/stream/route.ts
  │  (ReadableStream → Response with Content-Type: text/event-stream)
  │
  ▼
TeachNexisWorkflowService.stream()
  │  (AsyncGenerator<WorkflowChunk>)
  │
  ▼
WorkflowExecutor.executeStreaming()
  │  (runs non-streaming steps 1–3 synchronously, then:)
  │
  ▼
StepRunner → expandContent step
  │  (calls aiRouter.stream({ model, prompt, signal }))
  │
  ▼
TeachNexisAIRouter
  │  (OpenRouter / Groq streaming completion)
  │  (AsyncGenerator<string> of raw tokens)
  │
  ▼
StreamingEmitter.emit()
  │  (wraps tokens as WorkflowChunk, persists partial output every 50 tokens)
  │
  ▼
API Route writes SSE chunks to Response
  │
  ▼
Frontend EventSource handler
  └→ appends delta to lesson note editor
```

### API Route Implementation Pattern

```typescript
// /app/api/workflow/stream/route.ts

export async function POST(req: Request) {
  const { workflowName, input } = await req.json();
  const { schoolId, teacherId } = await requirePermission(req, "ai:generate");

  const stream = workflowService.stream(workflowName, { ...input, schoolId, teacherId });

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of stream) {
          const ssePayload = `data: ${JSON.stringify(chunk)}\n\n`;
          controller.enqueue(new TextEncoder().encode(ssePayload));
          if (chunk.done) controller.close();
        }
      } catch (err) {
        const errorChunk = `data: ${JSON.stringify({ error: err.message, done: true })}\n\n`;
        controller.enqueue(new TextEncoder().encode(errorChunk));
        controller.close();
      }
    },
    cancel() {
      // Client disconnected — AbortController is signalled inside stream()
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
```

### SSE Chunk Schema

```typescript
// Sent as: data: <JSON>\n\n

interface WorkflowChunk {
  delta: string;        // Token or token sequence emitted by the model
  step: string;         // e.g. "expandContent" — the step currently generating
  stepIndex: number;    // 0-based step index (for progress bar)
  totalSteps: number;   // Total steps in this workflow
  done: boolean;        // True on the final chunk
  runId: string;        // Stable across reconnects (used for recovery)
}

// Error chunk (done: true, no delta):
interface WorkflowErrorChunk {
  error: string;
  done: true;
  runId: string;
}
```

### Partial Output Storage for Drop-Recovery

Every 50 tokens emitted by `StreamingEmitter`, the accumulated partial output is written to `WorkflowRun.partialOutput` in the database. This allows:

1. If the client disconnects, the teacher can poll `getRunStatus()` and observe `status: "running"` with `progress`.
2. If the client reconnects with the same `runId`, the frontend requests the current `partialOutput` via a REST endpoint (`GET /api/workflow/runs/{runId}/partial`) and renders what was generated so far.
3. The run continues generating to completion in the server even if the client is disconnected — the full output is stored when done.

```typescript
// In StreamingEmitter
private async persistPartialOutput(runId: string, accumulated: string): Promise<void> {
  await prisma.workflowRun.update({
    where: { id: runId },
    data: {
      partialOutput: accumulated,
      updatedAt: new Date(),
    },
  });
}
```

The partial output write is a non-blocking fire-and-forget: the streaming pipeline does not await the DB write. If the write fails (transient DB error), it is logged but does not interrupt the stream.

### Frontend EventSource Handling

```typescript
// In the lesson note editor component
const runWorkflow = async (input: LessonNoteInput) => {
  const runId = crypto.randomUUID();  // Pre-generate for recovery
  const source = new EventSource(`/api/workflow/stream`);

  let accumulated = "";

  source.onmessage = (event) => {
    const chunk: WorkflowChunk = JSON.parse(event.data);
    if (chunk.error) {
      showError(chunk.error);
      source.close();
      return;
    }
    accumulated += chunk.delta;
    setLessonNoteContent(accumulated);  // React state update
    setProgress(chunk.stepIndex / chunk.totalSteps);
    if (chunk.done) source.close();
  };

  source.onerror = () => {
    // Reconnect and fetch partial output
    fetchPartialOutput(runId).then(partial => setLessonNoteContent(partial));
    source.close();
  };
};
```

---

## 7. Retry Policies

Retry configuration is per-step. The `RetryPolicy` specifies what to retry, how many times, and with what backoff. Different failure modes have different semantics.

### Policy Definitions

```typescript
// Defined as constants — steps reference these by name

const RETRY_POLICIES: Record<string, RetryPolicy> = {

  // LLM rate limit (HTTP 429): exponential backoff, max 3 attempts
  // Use when: provider-side throttling, not a logic error
  RATE_LIMIT_EXPONENTIAL: {
    maxAttempts: 3,
    backoffMs: 2000,
    backoffMultiplier: 2.5,          // 2s → 5s → 12.5s
    retryOn: ["rate_limit"],
  },

  // Transient LLM error (HTTP 5xx, connection reset): fixed backoff, max 2 attempts
  // Use when: provider infra blip — likely resolved on retry
  LLM_TRANSIENT: {
    maxAttempts: 2,
    backoffMs: 3000,
    retryOn: ["llm_error"],
  },

  // Step timeout (context assembly, slow retrieval): retry once with smaller context
  // Use when: knowledge retrieval + memory assembly exceeded time budget
  // On first retry: ContextBuilder reduces topK from 8 → 4 and maxContextTokens from 4000 → 2000
  CONTEXT_TIMEOUT_FALLBACK: {
    maxAttempts: 2,
    backoffMs: 500,
    retryOn: ["timeout"],
    onRetry: (attempt, context) => {
      if (attempt === 1) context.reducedContextMode = true;
    },
  },

  // Short retry — for quick, low-cost operations that should almost never fail
  MINIMAL: {
    maxAttempts: 2,
    backoffMs: 1000,
    retryOn: ["timeout"],
  },

  // No retry — for idempotent validation-only steps
  NONE: {
    maxAttempts: 1,
    backoffMs: 0,
    retryOn: [],
  },
};
```

### Failure Mode Handling

**LLM Rate Limit (HTTP 429):**
- Strategy: exponential backoff with jitter (jitter = random 0–500ms added to each backoff interval to avoid thundering herd)
- Max attempts: 3
- If all 3 fail: throw `WorkflowError("rate_limit_exhausted")`, set `WorkflowRun.status = "failed"`, emit metric `workflow.rate_limit_failure`
- Quota impact: rate limit failures still count toward token usage tracking (partially consumed tokens before 429)

**Context Assembly Timeout:**
- Step 1 (`retrieveKnowledgeContext`) has a 10-second timeout
- On first timeout: retry with reduced context (topK 8 → 4, similarity threshold 0.68 → 0.72 to reduce result set)
- On second timeout: proceed with empty knowledge context but non-empty memory context (log warning, do not fail)
- Lesson note quality degrades gracefully rather than failing entirely

**LLM Refusal (model returns content policy refusal):**
- Detected when: AI Router response contains refusal indicators (model-specific patterns, e.g., "I'm sorry, I can't", "I'm unable to generate")
- Strategy: **do not retry**. Retrying a refused prompt produces the same refusal.
- Action: log the full prompt + model response to a secure internal table (`WorkflowStepLog.refusalLog`), set step status `"failed"`, reason `"llm_refusal"`, surface error to teacher ("Unable to generate this content. The topic may require adjustment.")
- Notify: emit event `workflow.llm_refusal` with sanitised metadata (no prompt content) for engineering review dashboard

**Structured Output Parse Failure:**
- When a step expecting JSON output receives malformed JSON
- Strategy: retry once with explicit format reinforcement added to the prompt suffix: `"Respond ONLY with valid JSON matching the schema above. No markdown, no explanation."`
- If second attempt also fails to parse: use a fallback extraction regex, or fail the step with `parse_error`

### Per-Step Retry Policy Assignment

| Step | Policy |
|---|---|
| `retrieveKnowledgeContext` | `CONTEXT_TIMEOUT_FALLBACK` |
| `generateOutline` | `RATE_LIMIT_EXPONENTIAL` |
| `expandObjectives` | `LLM_TRANSIENT` |
| `expandContent` | `RATE_LIMIT_EXPONENTIAL` |
| `generateExamples` | `RATE_LIMIT_EXPONENTIAL` |
| `generateExercises` | `LLM_TRANSIENT` |
| `generateHomework` | `LLM_TRANSIENT` |
| `validateAndFormat` | `NONE` |
| `generateDistractors` (CBT) | `RATE_LIMIT_EXPONENTIAL` |
| `calibrateDifficulty` (CBT) | `MINIMAL` |
| `validateAnswers` (CBT) | `NONE` |

---

## 8. Human Approval Checkpoints

### When a Checkpoint Fires

Approval gates are configured at the `WorkflowDefinition` level with `requiresApproval: true` and `approvalStep: "stepName"`. The gate fires after the named step completes and before the subsequent step begins.

Approval is required for:
- `report-card-narrative`: always — teacher must review before the narrative is locked to the student record
- `parent-progress-report`: always — admin/teacher must approve before the report is dispatched
- `marking-scheme-generation`: always — teacher verifies before distributing to markers
- `lesson-note-generation`: conditionally — only if `validateAndFormat` sets `flaggedForReview = true` (content safety concern or low-confidence output)

### Workflow Pause Mechanics

When `HumanApprovalGate.checkpoint()` is called:

1. The `WorkflowExecutor` suspends the pipeline loop (the current `for` loop iteration blocks on `await approvalGate.checkpoint(...)`)
2. `WorkflowRun.status` is atomically updated to `"awaiting_approval"`
3. A `WorkflowApproval` record is created with `status: "pending"` and the pending step output serialised to `pendingOutputJson`
4. A notification event is emitted: `workflow.approval_required` — the Notification Service picks this up and delivers in-app and/or SMS notification to the responsible teacher
5. `HumanApprovalGate` polls the `WorkflowApproval` record every 10 seconds
6. Timeout: 48 hours. If no decision in 48 hours, the run is auto-cancelled with reason `"approval_timeout"`

### Teacher Interaction

The teacher sees a "Review Required" banner in the UI. They can:
- **Approve:** Accept the generated output as-is. The workflow resumes immediately.
- **Reject:** Decline the output. The workflow is cancelled. The teacher can restart with different parameters.
- **Edit and Approve:** Modify the generated output inline, then approve. The edited output becomes the committed step output. The workflow resumes with the teacher's edit as the step result.

The approve/reject/edit action calls `POST /api/workflow/approvals/{approvalId}` which calls `HumanApprovalGate.submitDecision()`.

### DB Schema for Approval Records

```prisma
model WorkflowApproval {
  id                 String    @id @default(cuid())
  runId              String    @unique         // One approval per run at a time
  schoolId           String
  teacherId          String
  stepName           String                    // Which step triggered the gate
  pendingOutputJson  Json                      // Serialised step output awaiting review
  status             String    @default("pending") // "pending" | "approved" | "rejected" | "edited" | "timed_out"
  decision           String?                   // "approve" | "reject" | "edit"
  editedOutputJson   Json?                     // Set if teacher chose "edit"
  decidedBy          String?                   // teacherId or adminId who acted
  decidedAt          DateTime?
  expiresAt          DateTime                  // createdAt + 48h
  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  run                WorkflowRun @relation(fields: [runId], references: [id])
  school             School      @relation(fields: [schoolId], references: [id])

  @@index([schoolId, status])
  @@index([runId])
}
```

---

## 9. Background Job System

### Phase 1: DB-Backed Queue

No external queue (no BullMQ, no Inngest, no Redis) in Phase 1. The `WorkflowRun` Prisma table functions as the job queue. This is sufficient for Phase 1 load (estimated < 50 background jobs/hour per school at launch).

### Worker Architecture

A single Node.js worker process (`apps/worker/src/index.ts`) runs alongside the Next.js app. In Phase 1, this is a simple polling worker. In Vercel-hosted environments, the worker runs as a Vercel Function on a cron schedule.

```typescript
// Worker polling loop
class BackgroundWorker {
  private readonly POLL_INTERVAL_MS = 5_000;
  private readonly MAX_CONCURRENT_PER_SCHOOL = 5;
  private readonly MAX_TOTAL_CONCURRENT = 20;

  async start() {
    while (true) {
      const available = await this.getAvailableSlots();
      if (available > 0) {
        const jobs = await this.claimJobs(available);
        for (const job of jobs) {
          this.executeJob(job);  // No await — runs concurrently
        }
      }
      await sleep(this.POLL_INTERVAL_MS);
    }
  }

  private async claimJobs(limit: number): Promise<WorkflowRun[]> {
    // Atomic claim with SELECT ... FOR UPDATE SKIP LOCKED
    return await prisma.$transaction(async (tx) => {
      const jobs = await tx.$queryRaw<WorkflowRun[]>`
        SELECT * FROM workflow_runs
        WHERE status = 'queued'
        AND school_id NOT IN (
          SELECT DISTINCT school_id FROM workflow_runs
          WHERE status = 'running'
          GROUP BY school_id
          HAVING COUNT(*) >= ${this.MAX_CONCURRENT_PER_SCHOOL}
        )
        ORDER BY priority DESC, created_at ASC
        LIMIT ${limit}
        FOR UPDATE SKIP LOCKED
      `;

      if (jobs.length === 0) return [];

      await tx.workflowRun.updateMany({
        where: { id: { in: jobs.map(j => j.id) } },
        data: { status: "running", startedAt: new Date() },
      });

      return jobs;
    });
  }
}
```

### Priority Model

| Priority | Value | When Applied |
|---|---|---|
| `CRITICAL` | 100 | N/A in Phase 1 |
| `HIGH` | 70 | Streaming workflows (non-background) |
| `NORMAL` | 50 | Background workflows from direct teacher action |
| `LOW` | 30 | Scheduled/automated workflows (revision plans, term reports) |

Priority is stored as an integer in `WorkflowRun.priority`. Higher number = claimed first.

### Concurrency Limits

- **Per-school limit:** Maximum 5 concurrent `status: "running"` jobs per `schoolId`. This prevents one school from monopolising LLM quota and causing rate limits that cascade to other schools.
- **Global limit:** Maximum 20 concurrent jobs total. Configurable via environment variable `WORKFLOW_MAX_CONCURRENT`.
- **Streaming jobs:** Not counted against the background concurrency limit — they run on the request thread, not the worker.

### Phase 2 Migration Plan

When background job volume exceeds 200/hour (estimated at 50+ active schools), migrate to **BullMQ** (Redis-backed) or **Inngest** (serverless durable execution). The `BackgroundJobManager` abstraction isolates the queue implementation — the migration requires only changing `BackgroundJobManager` internals, not any workflow or step code. Feature flag `USE_BULLMQ=true` will gate the migration.

---

## 10. Event-Driven Architecture

Workflows are triggered not only by direct API calls but also by domain events emitted by other parts of the system. This decouples event producers (quiz grader, term-end process, document uploader) from workflow execution.

### Event Emitter Pattern

```typescript
// Simple in-process event bus (Phase 1 — no external message queue)
// Phase 2: replace with a Redis pub/sub or Inngest event system

class WorkflowEventBus {
  private handlers: Map<string, WorkflowEventHandler[]> = new Map();

  on(eventType: string, handler: WorkflowEventHandler): void {
    const existing = this.handlers.get(eventType) ?? [];
    this.handlers.set(eventType, [...existing, handler]);
  }

  async emit(event: WorkflowEvent): Promise<void> {
    const handlers = this.handlers.get(event.type) ?? [];
    await Promise.allSettled(handlers.map(h => h(event)));
  }
}

// Singleton instance shared across the application
export const workflowEventBus = new WorkflowEventBus();
```

### Event Schema

```typescript
interface WorkflowEvent {
  id: string;                       // Unique event ID (cuid)
  type: WorkflowEventType;
  schoolId: string;
  payload: Record<string, unknown>;
  emittedAt: Date;
  sourceService: string;            // "exam-service" | "grader" | "scheduler" | "admin"
}

type WorkflowEventType =
  | "student.quiz_submitted"              // Triggers: student-revision-plan
  | "student.term_exam_completed"         // Triggers: report-card-narrative
  | "teacher.document_uploaded"           // Triggers: knowledge-ingest + curriculum-gap-analysis
  | "school.term_ended"                   // Triggers: batch report-card-narrative for whole class
  | "school.exam_created"                 // Triggers: cbt-question-generation (if AI mode)
  | "system.waec_index_refresh_due"       // Triggers: WAEC knowledge crawl
  | "teacher.lesson_completed"            // Triggers: homework-generation (if auto-homework enabled)
  | "student.revision_week_started";      // Triggers: revision-plan refresh
```

### Event Handler Registration

Event handlers are registered at application startup (`apps/web/src/services/workflow/event-handlers.ts`):

```typescript
// Registration — runs once at startup
export function registerWorkflowEventHandlers(
  workflowService: TeachNexisWorkflowService,
  eventBus: WorkflowEventBus
) {
  // Student submits a quiz → trigger personalised revision plan
  eventBus.on("student.quiz_submitted", async (event) => {
    const { studentId, subject, classLevel, weakTopics, schoolId } = event.payload;

    // Only trigger if the student has identifiable weak topics
    if (!weakTopics || weakTopics.length === 0) return;

    await workflowService.submit("student-revision-plan", {
      schoolId,
      studentId,
      subject,
      classLevel,
      weakTopics,
      weeksUntilExam: 8,  // Default lookahead — overridden by exam schedule if known
    });
  });

  // Term ends → batch generate report narratives for every student in the school
  eventBus.on("school.term_ended", async (event) => {
    const { schoolId, classIds, term, academicYear } = event.payload;
    // Submit one background job per class (not one per student — batched inside the workflow)
    for (const classId of classIds) {
      await workflowService.submit("report-card-narrative", {
        schoolId,
        classId,      // Batch mode — workflow iterates all students in this class
        term,
        academicYear,
        mode: "batch",
      });
    }
  });

  // Teacher uploads a document → ingest + optional curriculum gap analysis
  eventBus.on("teacher.document_uploaded", async (event) => {
    const { schoolId, teacherId, documentId, subject, classLevel } = event.payload;

    // Curriculum gap analysis is only triggered if the document is a lesson note or curriculum doc
    if (event.payload.sourceType === "lesson-note" || event.payload.sourceType === "curriculum-document") {
      await workflowService.submit("curriculum-gap-analysis", {
        schoolId,
        teacherId,
        subject,
        classLevel,
        coveredTopics: [],  // Will be extracted from the document during the workflow
        term: event.payload.currentTerm,
      });
    }
  });
}
```

### Event Persistence

In Phase 1, events are ephemeral (in-process only). If the server restarts mid-event, events are lost. This is acceptable for revision plan triggers (which have a weekly fallback via scheduler) and less acceptable for term-end triggers (which are one-shot). For term-end events specifically, the event is also persisted to a `WorkflowEvent` table before processing so it can be re-processed if the handler fails.

---

## 11. Scheduling

### Scheduled Workflows

| Workflow | Schedule | Trigger Condition | Managed By |
|---|---|---|---|
| `student-revision-plan` | Every Sunday at 22:00 school local time | Active students in exam preparation window | SchedulerModule |
| `report-card-narrative` | On school's configured term-end date | School admin sets term-end date in settings | SchedulerModule |
| `curriculum-gap-analysis` | Weekly, Fridays at 18:00 school local time | Schools with the feature enabled | SchedulerModule |
| WAEC index refresh | Daily at 03:00 UTC | System-level (not per-school) | System cron |

### School Admin Configuration

School admins configure scheduled workflows via the admin dashboard. Configuration is stored in the `WorkflowSchedule` table:

```typescript
interface CreateScheduleInput {
  workflowName: WorkflowName;
  cronExpression: string;         // Standard cron: "0 22 * * 0" = every Sunday 22:00
  timezone: string;               // IANA: "Africa/Lagos"
  inputTemplate: Record<string, unknown>; // Workflow input (schoolId auto-injected)
  enabled: boolean;
  label: string;                  // Admin-friendly label: "Weekly Revision Plans"
  priority?: "LOW" | "NORMAL";    // Default: LOW
}
```

The `cronExpression` and `timezone` are validated at creation time. Only pre-approved cron patterns are allowed (minimum interval: 1 hour) to prevent abuse.

### Missed Run Handling

The `SchedulerModule` computes whether a schedule was missed on startup:

```typescript
private async handleMissedRuns(): Promise<void> {
  const schedules = await prisma.workflowSchedule.findMany({
    where: { enabled: true, nextRunAt: { lte: new Date() } },
  });

  for (const schedule of schedules) {
    const wasMissed = schedule.lastRunAt === null
      || schedule.lastRunAt < schedule.nextRunAt;

    if (wasMissed) {
      // Run once (catch-up) — do not attempt to replay every missed interval
      await this.triggerSchedule(schedule);
      ctx.logger.warn("scheduler.missed_run_caught_up", {
        scheduleId: schedule.id,
        missedAt: schedule.nextRunAt,
        caughtUpAt: new Date(),
      });
    }

    // Advance nextRunAt to the next future time regardless of whether a missed run fired
    const nextRunAt = this.computeNextRunAt(schedule.cronExpression, schedule.timezone);
    await prisma.workflowSchedule.update({
      where: { id: schedule.id },
      data: { nextRunAt },
    });
  }
}
```

A school that was offline for 3 days and had 3 missed Sunday revision plan triggers will get exactly 1 catch-up run, not 3. Historically missed revision plans are not back-filled — the next scheduled run produces the current week's plan.

---

## 12. Langflow Compatibility Layer

### Purpose and Scope

The `LangflowCompatLayer` exists solely to assist engineers in migrating prototype flows from Langflow to native TypeScript `WorkflowDefinition` objects. It is a developer tool — it runs offline (in a CLI script), never in the production request path, and never handles real student or school data.

**One-directional:** Langflow JSON → TeachNexis `WorkflowDefinition`. There is no TeachNexis → Langflow export.

### Langflow Node → TeachNexis Step Mapping

| Langflow Node Type | TeachNexis Equivalent | Notes |
|---|---|---|
| `ChatOpenAI` / `ChatGroq` | `aiRouter.complete()` call inside a step | Model name is mapped; provider routing handled by AI Router |
| `ChatPromptTemplate` | Prompt string inside the step function | Template variables → function parameters |
| `LLMChain` | Single `WorkflowStep` function | Chain → one step |
| `SequentialChain` | Array of `WorkflowStep` functions | Each chain element becomes a step |
| `VectorStoreRetriever` (pgvector) | `ctx.knowledgeService.retrieve()` call in `retrieveKnowledgeContext` | |
| `ConversationBufferMemory` | `ctx.memoryService.buildMemoryContext()` | Memory semantics are different — manual review required |
| `HumanInputRun` / `HumanApprovalNode` | `HumanApprovalGate.checkpoint()` | Map exists but requires verification |
| `DocumentLoader` | Knowledge Service ingestion — out of scope for workflow | Flag for manual port |
| `AgentExecutor` | Not supported in Phase 1 — Phase 3 feature | Will be flagged as `"unconverted"` |
| `Router` / `ConditionalRouter` | `skipIfState` predicate on a `WorkflowStepConfig` | |
| `OutputParser` (structured) | Zod schema validation inside the step | |

### Conversion Algorithm

```typescript
class LangflowCompatLayer {
  convert(flowJson: LangflowFlowJSON): LangflowConversionResult {
    const { nodes, edges } = flowJson;
    const sortedNodes = this.topologicalSort(nodes, edges);  // Respect flow order

    const convertedSteps: WorkflowStepConfig[] = [];
    const unconverted: UnconvertedNode[] = [];

    for (const node of sortedNodes) {
      const converter = NODE_CONVERTERS[node.type];

      if (!converter) {
        unconverted.push({
          nodeId: node.id,
          nodeType: node.type,
          reason: `No converter registered for node type "${node.type}"`,
        });
        // Insert a stub step so the pipeline shape is preserved
        convertedSteps.push(this.createStubStep(node));
        continue;
      }

      convertedSteps.push(converter(node, flowJson));
    }

    return {
      definition: {
        name: `imported_${slugify(flowJson.name)}` as WorkflowName,
        version: "0.1.0-imported",
        streaming: this.detectStreamingOutput(nodes),
        steps: convertedSteps,
        // Remaining fields require manual population by the engineer
      },
      unconvertedNodes: unconverted,
      warnings: this.generateWarnings(flowJson, unconverted),
      conversionReport: this.buildReport(flowJson, convertedSteps, unconverted),
    };
  }
}
```

### What Cannot Be Automatically Converted

The following require manual engineering work after import:

1. **AgentExecutor nodes** — Langflow's agent loop (tool selection, multi-hop reasoning) has no Phase 1 equivalent in TeachNexis. Engineers must redesign as a fixed step pipeline or defer to Phase 3 multi-agent architecture.

2. **Custom Python function nodes** — Langflow allows arbitrary Python lambdas. These must be re-implemented in TypeScript.

3. **ConversationBufferMemory with session history** — TeachNexis Memory Service has a different interface than Langflow's session memory. The conversion layer flags these and inserts a `buildMemoryContext` stub, but the memory query parameters must be filled in manually.

4. **External HTTP tool nodes** — Calls to arbitrary external APIs. Must be reviewed for security before porting.

5. **Complex `Router` nodes with > 2 branches** — Multi-way conditional routing becomes nested `skipIfState` predicates. The converter handles 2-branch cases; 3+ branches require manual logic.

6. **Streaming + non-streaming mixed nodes** — Langflow does not have the same streaming architecture as TeachNexis. If a Langflow flow has mixed streaming behaviour, the entire streaming strategy must be redesigned by the engineer.

The conversion report output always ends with a section titled `"REQUIRES MANUAL REVIEW"` listing all items that need engineer attention before the imported workflow is production-ready.

---

## 13. Database Schema

Full Prisma schema additions for the Workflow Service:

```prisma
// ── WorkflowRun ───────────────────────────────────────────────────────────────

model WorkflowRun {
  id               String    @id @default(cuid())
  workflowName     String                          // WorkflowName enum value
  version          String    @default("1.0.0")     // WorkflowDefinition.version at time of run
  schoolId         String
  teacherId        String?                         // Null for system/scheduled runs
  studentId        String?                         // For student-facing workflows
  status           String    @default("queued")
  // "queued" | "running" | "completed" | "failed" | "cancelled" | "awaiting_approval"

  priority         Int       @default(50)          // Higher = more urgent

  // Input
  inputJson        Json                            // Serialised workflow input

  // Output
  outputJson       Json?                           // Serialised WorkflowResult.output
  partialOutput    String?                         // Accumulated streaming output (truncated to last 50k chars)
  error            String?                         // Error message if failed
  errorCode        String?                         // Machine-readable error code

  // Progress
  currentStep      String?                         // Step name currently executing
  stepsCompleted   Int       @default(0)
  totalSteps       Int?

  // Observability
  durationMs       Int?
  promptTokens     Int?
  completionTokens Int?
  totalTokens      Int?
  costUSD          Float?
  model            String?                         // Primary model used

  // Timestamps
  queuedAt         DateTime  @default(now())
  startedAt        DateTime?
  completedAt      DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  // Relations
  school           School          @relation(fields: [schoolId], references: [id])
  stepLogs         WorkflowStepLog[]
  approval         WorkflowApproval?
  schedule         WorkflowSchedule? @relation(fields: [scheduleId], references: [id])
  scheduleId       String?

  @@index([schoolId, workflowName])
  @@index([schoolId, status])
  @@index([schoolId, teacherId])
  @@index([status, priority, queuedAt])  // Worker claim index
}

// ── WorkflowStepLog ───────────────────────────────────────────────────────────

model WorkflowStepLog {
  id               String    @id @default(cuid())
  runId            String
  stepName         String
  stepIndex        Int                             // 0-based position in pipeline
  status           String                          // "running" | "completed" | "failed" | "skipped"

  // Timing
  startedAt        DateTime
  completedAt      DateTime?
  durationMs       Int?

  // LLM usage (per-step)
  promptTokens     Int?
  completionTokens Int?
  model            String?
  promptHash       String?                         // SHA256 of the prompt (for dedup/audit, not the prompt itself)

  // Error detail
  error            String?
  errorCode        String?
  attempt          Int       @default(1)           // Which retry attempt this was

  // Flags
  usedReducedContext Boolean @default(false)       // True if CONTEXT_TIMEOUT_FALLBACK reduced context

  createdAt        DateTime  @default(now())

  run              WorkflowRun @relation(fields: [runId], references: [id], onDelete: Cascade)

  @@index([runId])
  @@index([runId, stepName])
}

// ── WorkflowApproval ──────────────────────────────────────────────────────────

model WorkflowApproval {
  id                 String    @id @default(cuid())
  runId              String    @unique
  schoolId           String
  teacherId          String
  stepName           String
  pendingOutputJson  Json
  status             String    @default("pending")
  // "pending" | "approved" | "rejected" | "edited" | "timed_out"

  decision           String?
  editedOutputJson   Json?
  decidedBy          String?
  decidedAt          DateTime?
  expiresAt          DateTime

  createdAt          DateTime  @default(now())
  updatedAt          DateTime  @updatedAt

  run                WorkflowRun @relation(fields: [runId], references: [id])
  school             School      @relation(fields: [schoolId], references: [id])

  @@index([schoolId, status])
}

// ── WorkflowSchedule ──────────────────────────────────────────────────────────

model WorkflowSchedule {
  id               String    @id @default(cuid())
  schoolId         String
  workflowName     String
  label            String                          // Human-readable: "Weekly Revision Plans"
  cronExpression   String                          // Standard 5-part cron
  timezone         String    @default("Africa/Lagos")
  inputTemplate    Json                            // Workflow input params (schoolId auto-merged)
  enabled          Boolean   @default(true)
  priority         Int       @default(30)          // LOW priority for scheduled runs

  lastRunAt        DateTime?
  lastRunId        String?                         // runId of the last triggered run
  nextRunAt        DateTime?                       // Pre-computed next trigger time
  missedRunsCount  Int       @default(0)           // Incremented on each missed run, reset on success

  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  school           School          @relation(fields: [schoolId], references: [id])
  triggeredRuns    WorkflowRun[]

  @@index([enabled, nextRunAt])                   // Scheduler tick index
  @@index([schoolId])
}
```

---

## 14. Security Model

### School ID Scoping

Every workflow run is created with a `schoolId` from the authenticated session — extracted by the API route via `Identity Service.requirePermission()` before `workflowService.run()` is called. The Workflow Service re-enforces school scoping at every DB access:

```typescript
// Every internal DB query in WorkflowService includes schoolId in the WHERE clause
const run = await prisma.workflowRun.findFirst({
  where: { id: runId, schoolId },  // schoolId must match — no cross-school reads
});
if (!run) throw new WorkflowRunNotFoundError(runId);
```

A teacher can only call `getRunStatus()`, `getRunResult()`, `cancelRun()`, and `listRuns()` for runs in their own school. The `schoolId` from their session is always used — the caller cannot supply a different `schoolId`.

### Teacher Scope Restriction

Teachers can only trigger workflows for their own school. They cannot specify a `schoolId` in the workflow input — it is injected server-side from the session. The API route pattern is:

```typescript
// In API route — never accept schoolId from the request body
const { subject, topic, classLevel, ...rest } = await req.json();
const { schoolId, teacherId } = await requirePermission(req, "ai:generate");

await workflowService.stream("lesson-note-generation", {
  schoolId,       // From session — not from request body
  teacherId,      // From session — not from request body
  subject,
  topic,
  classLevel,
  ...rest,
});
```

### Prompt Injection Protection

User-supplied values that are inserted into LLM prompts (subject, topic, classLevel, specialInstructions) are validated and sanitised before prompt construction:

```typescript
const PROMPT_INJECTION_BLOCKLIST = [
  /ignore (previous|all) instructions/i,
  /system prompt/i,
  /you are now/i,
  /forget everything/i,
  /\[INST\]/i,                            // Mistral instruction injection
  /<\|im_start\|>/i,                      // ChatML injection
];

function sanitiseForPrompt(value: string, fieldName: string): string {
  if (value.length > FIELD_MAX_LENGTHS[fieldName]) {
    throw new ValidationError(`${fieldName} exceeds maximum length`);
  }
  for (const pattern of PROMPT_INJECTION_BLOCKLIST) {
    if (pattern.test(value)) {
      throw new ValidationError(`${fieldName} contains disallowed content`);
    }
  }
  // Escape brackets that could be mistaken for prompt structure tokens
  return value.replace(/[<>\[\]]/g, (c) => `\\${c}`);
}
```

Validation runs in `WorkflowRegistry.validate()` using Zod schemas with `.refine()` hooks that call `sanitiseForPrompt`. A value that fails injection checks causes the workflow to reject the request before any LLM call is made.

### Output Content Filtering

Generated output is checked for content safety before being written to DB or returned to the teacher:

```typescript
// In validateAndFormat step
async function runContentSafety(text: string): Promise<ContentSafetyResult> {
  // Phase 1: keyword-based filter for clearly inappropriate content
  const flaggedTerms = NIGERIAN_EDUCATION_BLOCKLIST.filter(term =>
    text.toLowerCase().includes(term)
  );
  if (flaggedTerms.length > 0) {
    return { safe: false, reason: "blocked_term", terms: flaggedTerms };
  }

  // Phase 2 (roadmap): LLM-based safety classifier call
  return { safe: true };
}
```

Flagged output does not fail the run — it sets `flaggedForReview: true` and routes through the `HumanApprovalGate`. Output that passes safety checks is returned to the teacher normally.

### API Key Isolation

The Workflow Service never reads AI provider credentials. It calls `ctx.aiRouter.complete()` which is the AI Router's responsibility. The AI Router enforces per-school token quota: if a school has exhausted its monthly allocation, the AI Router throws `QuotaExceededError` before making the provider API call, and the workflow fails gracefully with `WorkflowError("quota_exceeded")`.

---

## 15. Privacy Model

### Student Data Anonymisation in LLM Prompts

Workflows that operate on student data (revision plans, report card narratives, progress reports) never include student names, real student IDs, or other PII in LLM prompts:

```typescript
// ContextBuilder.build() when studentId is present
const studentAnonId = hashStudentId(studentId, schoolId);
// HMAC-SHA256(studentId + schoolId, SECRET_ANON_SALT)
// The same student always gets the same anonId within the same school,
// but the anonId cannot be reversed to the real studentId without the salt.
```

LLM prompts use `studentAnonId` in all references. The real `studentId` lives only in:
- The `WorkflowRun.studentId` column (encrypted at rest, schoolId-scoped)
- The `WorkflowRun.inputJson` column (encrypted at rest)
- Memory Service internal storage (never passed to LLM)

The student's real name never appears in any workflow prompt. Report card narratives generated by the AI contain generic placeholders ("the student") that teachers are expected to personalise before printing.

### Output Retention Policy

| Workflow | Output Retention | Rationale |
|---|---|---|
| `lesson-note-generation` | 12 months, then auto-delete | Curriculum content — teacher owns it, can re-generate |
| `cbt-question-generation` | 36 months | Exam integrity — must match what was administered |
| `report-card-narrative` | Permanent | Official school record — required by WAEC/NECO regulations |
| `parent-progress-report` | 24 months | Communication record — parent may request historical copy |
| `curriculum-gap-analysis` | 12 months | Planning artifact — loses relevance after a year |
| `student-revision-plan` | 6 months | Active for one exam cycle; students improve |
| `homework-generation` | 12 months | Teacher reference |
| `marking-scheme-generation` | 36 months | Exam integrity |

Retention is enforced by a scheduled cleanup job (`WORKFLOW_CLEANUP` cron, runs nightly):

```typescript
// Deletes WorkflowRun rows with outputJson where completedAt < retentionCutoff
// Does NOT delete WorkflowRun row itself (status, timing, token usage retained for billing)
// Only nullifies outputJson and partialOutput
```

### NDPR Audit Trail

Nigeria's NDPR (Nigeria Data Protection Regulation) requires an audit trail for any processing of personal data. For all workflows that touch student data:

```typescript
// Logged on every student-data-touching workflow run
interface NDPRAuditEntry {
  runId: string;
  schoolId: string;
  workflowName: WorkflowName;
  dataSubjectType: "student";
  dataSubjectAnonId: string;      // Not the real studentId
  processingPurpose: string;      // e.g. "Generate personalised revision plan"
  legalBasis: "legitimate_interest" | "consent";
  dataCategories: string[];       // e.g. ["academic_performance", "topic_weakness"]
  processedAt: Date;
  retentionPolicy: string;
  processorIdentity: "TeachNexis Workflow Service v1";
}
```

Audit entries are written to a `NDPRAuditLog` table that has `DELETE` privilege removed from the application database user. Only a DBA can delete audit entries.

Schools must obtain consent from parents/guardians for AI processing of student academic data. The Identity Service enforces that a school's `consentCollected` flag is true before `studentId` can be passed to any student-data workflow.

---

## 16. Testing Strategy

### Unit Tests — Per Step

Each `WorkflowStep` function is unit-tested in isolation. Steps are pure async functions — test by passing mock `state` and a mock `WorkflowContext`:

```typescript
// Example: generateOutline step unit test
describe("generateOutline", () => {
  it("produces all 8 outline sections from state with context", async () => {
    const mockAIRouter = createMockAIRouter({
      complete: jest.fn().mockResolvedValue({
        content: JSON.stringify({
          objectives: "3 specific objectives",
          entryBehaviour: "Activation activity plan",
          contentPlan: "Key sub-topics",
          diagramNeeded: true,
          examplesApproach: "Easy to WAEC style",
          exerciseType: "structured",
          homeworkType: "differentiated",
          boardSummaryFocus: "Three formulas",
        }),
        usage: { promptTokens: 400, completionTokens: 200 },
      }),
    });

    const state = createMockLessonNoteState({
      input: { subject: "Mathematics", topic: "Quadratic Equations", classLevel: "SS1" },
      contextString: "Relevant curriculum content...",
      memoryString: "Teacher prefers 5-step format",
    });

    const result = await generateOutline(state, createMockContext({ aiRouter: mockAIRouter }));

    expect(result.outline).toBeDefined();
    expect(result.outline.objectives).toContain("specific objectives");
    expect(mockAIRouter.complete).toHaveBeenCalledOnce();
  });

  it("throws StepError if LLM returns unparseable JSON", async () => {
    // ... test structured output parse failure path
  });
});
```

**Coverage targets:**
- All 8 step functions in `lesson-note-generation`: 100% line coverage
- `validateAndFormat` content safety paths: 100% branch coverage
- Each retry policy branch: integration test (not unit)

### Integration Tests — Full Workflow with Mocked AI Provider

```typescript
describe("lesson-note-generation workflow (integration)", () => {
  it("produces a valid 8-section lesson note structure", async () => {
    const mockAIRouter = createMockAIRouter({
      complete: jest.fn()
        .mockResolvedValueOnce(mockOutlineResponse)
        .mockResolvedValueOnce(mockObjectivesResponse)
        .mockResolvedValueOnce(mockExercisesResponse)
        .mockResolvedValueOnce(mockHomeworkResponse),
      stream: jest.fn()
        .mockImplementation(async function* () {
          yield* mockTokenStream("This is the main content...");
        })
        .mockImplementationOnce(async function* () {
          yield* mockTokenStream("Example 1: ...");
        }),
    });

    const result = await workflowService.run<LessonNoteInput, LessonNoteOutput>(
      "lesson-note-generation",
      validLessonNoteInput,
      { model: "mock" }
    );

    expect(result.status).toBe("completed");
    expect(result.output.sections.objectives).toBeTruthy();
    expect(result.output.sections.examples).toHaveLength(5);
    expect(result.output.sections.examples[4].difficulty).toBe("exam-style");
    expect(result.output.sections.classExercise.length).toBeGreaterThanOrEqual(5);
    expect(result.output.sections.homework).toBeTruthy();
    expect(result.output.sections.waecPastQuestions.length).toBeGreaterThanOrEqual(1);
  });
});
```

### Streaming Tests

```typescript
describe("lesson-note-generation streaming", () => {
  it("SSE chunks arrive in order and no chunks are dropped", async () => {
    const chunks: WorkflowChunk[] = [];
    const stream = workflowService.stream("lesson-note-generation", validInput);

    for await (const chunk of stream) {
      chunks.push(chunk);
    }

    // Verify ordering
    for (let i = 1; i < chunks.length; i++) {
      expect(chunks[i].stepIndex).toBeGreaterThanOrEqual(chunks[i - 1].stepIndex);
    }

    // Verify exactly one `done: true` chunk
    const doneChunks = chunks.filter(c => c.done);
    expect(doneChunks).toHaveLength(1);
    expect(doneChunks[0]).toBe(chunks[chunks.length - 1]);

    // Verify accumulated delta equals the final output
    const accumulated = chunks.map(c => c.delta).join("");
    expect(accumulated.length).toBeGreaterThan(1000);  // Non-trivial content
  });
});
```

### Approval Gate Tests

```typescript
describe("HumanApprovalGate", () => {
  it("pauses workflow at approval step and resumes on approve", async () => {
    const runId = await workflowService.submit("report-card-narrative", validInput);

    // Wait for workflow to reach approval gate
    await waitForRunStatus(runId, "awaiting_approval");
    const run = await workflowService.getRunStatus(runId, validInput.schoolId);
    expect(run.status).toBe("awaiting_approval");

    // Submit approval decision
    const approval = await prisma.workflowApproval.findFirst({ where: { runId } });
    await approvalGate.submitDecision(approval.id, validInput.schoolId, "approve");

    // Verify workflow completes
    await waitForRunStatus(runId, "completed");
    const result = await workflowService.getRunResult(runId, validInput.schoolId);
    expect(result.status).toBe("completed");
  });

  it("cancels workflow on reject", async () => {
    // ... similar pattern, submitDecision("reject"), expect status "cancelled"
  });
});
```

### Load Tests

Load tests use [k6](https://k6.io/) against a staging environment with a mock AI provider that returns pre-generated responses immediately (to test workflow system throughput without real LLM latency):

```javascript
// k6 load test: 10 concurrent lesson note generations
export default function () {
  const response = http.post(
    "https://staging.teachnexis.com/api/workflow/run",
    JSON.stringify({ workflow: "lesson-note-generation", input: lessonNoteInput }),
    { headers: { Authorization: `Bearer ${TEST_TOKEN}` } }
  );
  check(response, { "status is 200": (r) => r.status === 200 });
  check(response, { "completed": (r) => r.json().status === "completed" });
}

export const options = {
  vus: 10,        // 10 virtual users = 10 concurrent lesson note generations
  duration: "2m",
};
```

**Acceptance criteria for load test:**
- 0 rate limit cascade failures across 10 concurrent workflows from the same school (enforced by per-school concurrency limit in BackgroundJobManager)
- All 10 workflows complete successfully
- No DB deadlock errors (validated by monitoring deadlock rate metric during test)

---

## 17. Monitoring

### Metrics (exported to observability platform — Phase 1: Vercel Analytics + custom logging)

```typescript
// Emitted after every workflow run completes or fails
interface WorkflowRunMetric {
  workflowName: WorkflowName;
  schoolId: string;             // Hashed for privacy in metrics
  status: "completed" | "failed" | "cancelled";
  durationMs: number;
  promptTokens: number;
  completionTokens: number;
  costUSD: number;
  model: string;
  stepFailureName?: string;     // Which step failed (if failed)
  stepAttemptCount?: number;    // Retries consumed
  ttfbMs?: number;              // Time to first byte (streaming only)
  usedApprovalGate: boolean;
}
```

### Alerting Thresholds

| Metric | Warning | Critical |
|---|---|---|
| Workflow completion rate (per type, 1h window) | < 90% | < 75% |
| Step failure rate (any step, 1h window) | > 10% | > 25% |
| Background job queue depth (per school) | > 10 jobs | > 25 jobs |
| Time to first streaming token | > 8 seconds | > 20 seconds |
| Rate limit failure rate | > 5% of runs | > 15% of runs |
| Scheduled workflow miss rate | > 1 miss/day | > 5 misses/day |
| Approval gate timeout rate | > 5%/week | > 20%/week |

### Cost Dashboard

The cost dashboard (accessible to school admins and TeachNexis admins) displays:

| Metric | Calculation |
|---|---|
| Cost per lesson note | Avg `costUSD` for `lesson-note-generation` runs for school |
| Cost per CBT set | Avg `costUSD` for `cbt-question-generation` runs |
| Cost per report narrative | Avg `costUSD` for `report-card-narrative` runs |
| Monthly school spend | Sum `costUSD` for all runs in the calendar month |
| Projected monthly spend | Current spend × (30 / days elapsed) |
| Token efficiency | `totalTokens / runs` — increasing = prompts may be bloating |

Cost is calculated from the AI Router's model pricing table, applied to per-run token usage stored in `WorkflowRun.promptTokens` and `WorkflowRun.completionTokens`. The pricing table is updated when model pricing changes — historical run costs are not retroactively adjusted.

### Step-Level Failure Dashboard

A heatmap showing, per workflow type, which steps have the highest failure rates over the past 7 days. This surfaces which prompts need engineering attention. Example findings this is designed to catch:
- `generateDistractors` failing 30% of the time → distractor prompt needs rework
- `retrieveKnowledgeContext` timing out 15% of the time → pgvector query too slow → index needed
- `validateAndFormat` flagging 40% of reports → content safety filter too aggressive

---

## 18. Native Workflow Roadmap

### Phase 1 — Sequential Pipeline, Synchronous + Streaming (Current)

**Capabilities:**
- Fixed sequential step pipeline (`steps[]` array, no branching)
- Synchronous execution (`run()`) and SSE streaming (`stream()`)
- DB-backed background job queue (Prisma `WorkflowRun` table as queue)
- Human approval gates (pause/resume)
- Cron-based scheduling
- Per-school concurrency limit (5 concurrent)
- Langflow compat layer (import-only, developer tool)

**Constraints:**
- Steps run sequentially — no parallelism within a workflow
- No cross-workflow dependencies (can't trigger workflow B when workflow A completes, except via event bus)
- No persistent worker state — worker restart loses in-flight job context (re-queued as `queued`)

---

### Phase 2 — DAG-Based Parallel Steps, BullMQ Background Jobs

**New capabilities:**
- `WorkflowStepConfig.dependencies: string[]` — steps with no dependencies run in parallel
- Lesson note generation: `expandObjectives`, `expandContent`, `generateExamples` run concurrently (3× speedup on generative steps)
- Replace DB polling queue with **BullMQ** (Redis-backed) — removes 5-second poll latency, enables real-time job claiming
- Worker process becomes a standalone service (`apps/workflow-worker`) with Kubernetes HPA or Vercel Function scaling
- Cross-workflow triggers: `WorkflowRun.onComplete` hook — allows "when curriculum-gap-analysis completes, trigger student-revision-plan for flagged students"

**Migration path:** Feature-flagged under `WORKFLOW_ENGINE_V2=true`. Old sequential executor coexists with DAG executor. Workflows opt into DAG execution by adding `dependencies` to their step configs.

---

### Phase 3 — Multi-Agent Workflows

**New capabilities:**
- `AgentStep` — a workflow step that instantiates a specialised AI agent (TeacherAgent, CurriculumAgent, AssessmentAgent) rather than making a single LLM call
- Agents can call tools (Knowledge Service retrieve, Memory Service recall, generate sub-tasks) autonomously
- **Example: collaborative lesson planning** — `TeacherAgent` generates an initial lesson note outline; `CurriculumAgent` reviews it against the WAEC syllabus and requests revisions; `TeacherAgent` incorporates revisions; cycle continues until `CurriculumAgent` approves or max iterations reached
- Agents share a `SharedAgentContext` — can read each other's prior outputs
- Human-in-the-loop: teacher can inject feedback into the agent loop at any iteration

**Constraints:**
- Agent loops have hard token budget limits to prevent runaway generation
- Iteration cap: max 5 rounds between agents per workflow
- Full audit log of all inter-agent messages

---

### Phase 4 — School-Specific Workflow Customisation

**New capabilities:**
- School admins (principals) configure their own report card narrative format via a template editor (no code required)
- Custom step configuration: schools can add school-specific prompt snippets to lesson note generation (school values, uniform sections)
- Custom output schemas: a school using NECO grading scales can configure the report narrative workflow to use NECO grade labels instead of WAEC
- **Workflow marketplace:** TeachNexis publishes approved workflow templates that schools can install and configure. Third-party educators can publish templates.
- Per-school `WorkflowDefinition` overrides stored in DB (overrides apply on top of the canonical registry definition)

---

## 19. Phase 1 Implementation Checklist

### Week 1 — Lesson Note Generation (Core)

- [ ] Add `WorkflowRun`, `WorkflowStepLog`, `WorkflowApproval`, `WorkflowSchedule` Prisma models. Run migration.
- [ ] Enable pgvector extension on dev and staging DB (Knowledge Service dependency).
- [ ] Implement `WorkflowRegistry` with `lesson-note-generation` definition registered.
- [ ] Implement `WorkflowContext` type and `ContextBuilder.build()` — calls `knowledgeService.buildContext()` and `memoryService.buildMemoryContext()` in parallel. Test with mocks.
- [ ] Implement all 8 step functions for `lesson-note-generation` as standalone TypeScript functions. Unit test each step with mock AI Router.
- [ ] Implement `StepRunner` — timeout enforcement, retry on rate_limit/llm_error. Unit test each retry policy.
- [ ] Implement `WorkflowExecutor.execute()` — sequential step pipeline, state accumulation.
- [ ] Wire `workflowService.run("lesson-note-generation", input)` in `POST /api/workflow/run`.
- [ ] Verify: call the API route with a valid `LessonNoteInput`, confirm a `LessonNoteOutput` with all 8 sections is returned.

### Week 2 — Streaming to Frontend

- [ ] Implement `StreamingEmitter` — wraps AI Router token stream as `AsyncGenerator<WorkflowChunk>`.
- [ ] Implement `WorkflowExecutor.executeStreaming()` — runs steps 1–3 synchronously, then pipes steps 4–7 through StreamingEmitter.
- [ ] Implement partial output persistence in StreamingEmitter — write to `WorkflowRun.partialOutput` every 50 tokens.
- [ ] Implement `POST /api/workflow/stream` route — SSE response using `ReadableStream`.
- [ ] Implement `GET /api/workflow/runs/[runId]/partial` — returns current `partialOutput` for reconnect.
- [ ] Implement frontend `useWorkflowStream` hook — EventSource, delta append, reconnect with partial recovery.
- [ ] Wire the lesson note editor to use streaming endpoint.
- [ ] Test: streaming SSE chunks arrive in order, no drops, accumulated delta matches final output.
- [ ] Test: client disconnect mid-stream, reconnect, partial content rendered correctly.
- [ ] Test: 3 concurrent lesson note streams from the same school — no interference.

### Week 3 — CBT Question Generation

- [ ] Register `cbt-question-generation` in `WorkflowRegistry`.
- [ ] Implement all 7 CBT steps: `retrievePastQuestions`, `selectAndDeduplicatePool`, `generateNewQuestions`, `generateDistractors`, `calibrateDifficulty`, `validateAnswers`, `assembleAndFormat`.
- [ ] Implement deduplication logic in `selectAndDeduplicatePool` — cosine similarity check via Knowledge Service.
- [ ] Wire `workflowService.run("cbt-question-generation", input)` for small sets (≤ 20 questions).
- [ ] Implement `BackgroundJobManager` — DB queue polling, worker loop, `submit()` API.
- [ ] Wire `workflowService.submit("cbt-question-generation", input)` for large sets (> 20 questions).
- [ ] Implement `getRunStatus()` and `getRunResult()` API endpoints.
- [ ] Implement `cancelRun()` — signal AbortController for running jobs, update DB for queued jobs.
- [ ] Test: 50-question CBT generation submitted as background job, completes within 3 minutes.
- [ ] Test: per-school concurrency limit — 6th concurrent job from same school stays `queued`.

### Week 4 — Report Card, Curriculum Gap, Background Job System

- [ ] Register `report-card-narrative` in `WorkflowRegistry` with `requiresApproval: true`.
- [ ] Implement 5 report narrative steps: `loadStudentHistory`, `computeSubjectTrends`, `generateNarrative`, `validateAndFlag`, `formatOutput`.
- [ ] Implement `HumanApprovalGate` — pause workflow, create `WorkflowApproval` record, poll for decision, resume.
- [ ] Implement approval decision endpoint: `POST /api/workflow/approvals/[approvalId]`.
- [ ] Test: report narrative run pauses at approval gate, teacher approves, run completes.
- [ ] Test: teacher rejects — run is cancelled, status confirmed.
- [ ] Register `curriculum-gap-analysis` in `WorkflowRegistry`.
- [ ] Implement 5 curriculum gap steps: `loadOfficialSyllabus`, `normaliseCoveredTopics`, `computeGaps`, `assessRisk`, `generateRecommendations`.
- [ ] Wire curriculum gap analysis as background-only workflow.
- [ ] Implement `listRuns()` and `getUsageReport()` API endpoints.
- [ ] Implement `WorkflowEventBus` and register event handlers for `student.quiz_submitted` → `student-revision-plan` and `school.term_ended` → batch `report-card-narrative`.

### Week 5 — Remaining Workflows + Scheduling

- [ ] Register and implement `student-revision-plan` (5 steps). Wire as streaming workflow.
- [ ] Register and implement `parent-progress-report` (5 steps, requires approval).
- [ ] Register and implement `homework-generation` (4 steps, sync).
- [ ] Register and implement `marking-scheme-generation` (5 steps, requires approval).
- [ ] Implement `SchedulerModule` — cron evaluation, `triggerSchedule()`, missed run handling.
- [ ] Add `WorkflowSchedule` CRUD endpoints: `POST /api/workflow/schedules`, `GET /api/workflow/schedules`, `PUT /api/workflow/schedules/[id]`, `DELETE /api/workflow/schedules/[id]`.
- [ ] Configure default schedules: weekly revision plan refresh (Sundays 22:00 Africa/Lagos), term report generation on term-end date.
- [ ] Test: scheduler triggers revision plan on Sunday evening, creates `WorkflowRun` records for eligible students.
- [ ] Test: missed run handling — advance `nextRunAt` past now, restart scheduler, confirm exactly one catch-up run fires.

### Week 6 — Hardening, Observability, Security

- [ ] Implement prompt injection validation in `WorkflowRegistry.validate()` using Zod `.refine()` hooks with `sanitiseForPrompt`.
- [ ] Implement content safety check in `validateAndFormat` step — regex blocklist pass.
- [ ] Implement `NDPRAuditLog` table and audit entry writes on all student-data workflows.
- [ ] Implement student ID anonymisation in `ContextBuilder.build()` — HMAC-SHA256 anonId.
- [ ] Implement output retention cleanup cron — nightly, nullify `outputJson` per retention policy.
- [ ] Implement `WorkflowRunMetric` emission on run completion/failure.
- [ ] Set up monitoring alerts: completion rate, step failure rate, queue depth, TTFB.
- [ ] Build cost dashboard query: `getUsageReport()` feeds admin UI cost breakdown page.
- [ ] Run integration test suite: all 8 workflows with mocked AI provider, assert output structure.
- [ ] Run streaming test suite: chunk ordering, reconnect recovery, concurrent stream isolation.
- [ ] Run approval gate test suite: approve/reject/edit/timeout paths.
- [ ] Run load test: 10 concurrent lesson note generations, 0 cascading failures, all complete.
- [ ] Internal security review of prompt injection defences and schoolId scoping.
- [ ] Ship: enable `lesson-note-generation` streaming and `cbt-question-generation` background jobs for beta schools.

  run              WorkflowRun @relation(fields: [runId], references: [id], onDelete: Cascade)

  @@index([runId])
}

// ── WorkflowSchedule ──────────────────────────────────────────────────────────

model WorkflowSchedule {
  id           String    @id @default(cuid())
  schoolId     String
  teacherId    String?
  workflowName String
  cronExpr     String                         // e.g. "0 21 * * 0" (Sunday 9pm)
  inputJson    Json
  enabled      Boolean   @default(true)
  lastRunAt    DateTime?
  nextRunAt    DateTime?
  lastRunId    String?
  timezone     String    @default("Africa/Lagos")

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  school       School    @relation(fields: [schoolId], references: [id])

  @@index([schoolId, enabled])
  @@index([nextRunAt, enabled])                // Scheduler polls this index
}
```

---

## 14. Security Model

### School Isolation

Every `WorkflowRun` record carries `schoolId`. The `WorkflowService.run()` and `stream()` methods validate that the session's `schoolId` matches the input's `schoolId` before execution begins. A teacher cannot trigger a workflow for another school by manipulating the API payload.

### Prompt Injection Protection

User-supplied values (topic names, subject strings, teacher notes) that flow into LLM prompts are treated as untrusted data:

```typescript
function sanitizePromptInput(value: string, maxLength = 500): string {
  return value
    .slice(0, maxLength)
    .replace(/[\x00-\x1F\x7F]/g, "")  // strip control characters
    .replace(/```/g, "")               // strip code fence delimiters
    .trim();
}
```

No user-supplied value is interpolated directly into a system prompt. All user values pass through `sanitizePromptInput()` and are placed in clearly-delimited user-content sections, never in the system instruction block.

### Output Content Filtering

Generated content (lesson notes, CBT questions) passes through a lightweight safety check before being stored or returned. Flagged content pauses the workflow and routes to the HumanApprovalGate. The filter checks for:
- Explicit or violent content (regex + LLM classifier)
- Politically sensitive content for the Nigerian school context
- Content that contradicts the national curriculum in dangerous ways (e.g., incorrect medical advice in Biology lessons)

### API Key Isolation

The Workflow Service uses the TeachNexis AI Router for all LLM calls. It never holds API keys directly. The AI Router manages provider credentials and school-level quota allocation — so a single school cannot exhaust the platform's OpenRouter quota.

---

## 15. Privacy Model

### Student Data in Workflow Inputs

When a student revision plan is generated, the input includes weak topics (not student names or IDs in the LLM prompt):

```typescript
// In revision-plan workflow — ContextBuilder
const prompt = `
Generate a 4-week revision plan for a ${input.classLevel} ${input.subject} student.
Weak topics (anonymous): ${weakTopics.join(", ")}
Available study hours per day: ${input.studyHoursPerDay ?? 2}
Weeks until exam: ${input.weeksUntilExam}
`;
// input.studentId is used server-side only for memory retrieval — never in the prompt
```

Student names, IDs, and personal details never appear in LLM API calls. Only anonymised academic context is sent.

### Workflow Output Retention

| Output Type | Retention Policy |
|---|---|
| Lesson notes | 12 months from generation |
| CBT question sets | Indefinite (school academic records) |
| Report card narratives | Indefinite (permanent school record) |
| Revision plans | 6 months |
| Parent progress reports | 12 months |
| Workflow run logs (step timing, token usage) | 90 days |

### NDPR Audit Trail

All student-data-touching workflows write an audit entry on initiation:
- Workflow name, school ID, teacher ID (triggerer), student ID (subject, not in LLM)
- Timestamp, input parameters (redacted of any PII)
- Completion status and output location

---

## 16. Testing Strategy

### Unit Tests — Per Step Function

Each `WorkflowStep` is a pure function and independently testable:

```typescript
// Example: generateOutline step test
it("generateOutline produces an 8-section outline for SS2 Mathematics", async () => {
  const state = await generateOutline(
    { topic: "Differentiation", subject: "Mathematics", classLevel: "SS2", knowledgeContext: mockContext },
    mockWorkflowContext
  );
  expect(state.outline.sections).toHaveLength(8);
  expect(state.outline.sections[0].name).toBe("Objectives");
});
```

### Integration Tests — Full Workflow Round-Trip

```typescript
it("lesson-note-generation produces valid 8-section output", async () => {
  const result = await workflowService.run("lesson-note-generation", {
    schoolId: testSchoolId, teacherId: testTeacherId,
    subject: "Mathematics", classLevel: "SS2", topic: "Differentiation",
  });
  expect(result.status).toBe("completed");
  const lessonNote = result.output as LessonNoteOutput;
  expect(lessonNote.sections).toHaveLength(8);
  expect(lessonNote.sections.every(s => s.content.length > 100)).toBe(true);
});
```

### Streaming Tests

Verify SSE chunks arrive correctly ordered, cover all steps, and produce the same final content as the synchronous version:

```typescript
it("streaming lesson note produces identical output to synchronous run", async () => {
  const chunks: string[] = [];
  for await (const chunk of workflowService.stream("lesson-note-generation", input)) {
    chunks.push(chunk.delta);
  }
  const streamedOutput = chunks.join("");
  const syncResult = await workflowService.run("lesson-note-generation", input);
  expect(streamedOutput).toEqual(syncResult.output.fullText);
});
```

### Approval Gate Tests

Verify that flagged content correctly pauses the workflow and resumes correctly on teacher approval.

### Load Tests

10 concurrent lesson note generations for the same school must complete without LLM rate-limit cascades. Verify the AI Router's per-school concurrency limiter fires before the provider's rate limit.

---

## 17. Monitoring

### Key Metrics

| Metric | Description | Alert Threshold |
|---|---|---|
| `workflow.completion_rate` | % of runs that reach `completed` (vs `failed`) | < 95% over 1 hour |
| `workflow.step_failure_rate` | % of step executions that fail, by step name | > 5% for any step |
| `workflow.token_usage` | Tokens consumed per workflow type | Spike > 2× 7-day average |
| `workflow.stream_ttft` | Time to first token for streaming workflows | p95 > 3 seconds |
| `workflow.queue_depth` | Background job queue depth | > 50 jobs |
| `workflow.cost_per_run` | USD per workflow type | Tracked, alerted on 30% spike |
| `approval.pending_age` | How long approval-gated runs have been waiting | > 24 hours |

### Cost Dashboard

Track and display per-school, per-workflow-type spend:
- `$/lesson-note-generation` (target: < $0.08)
- `$/cbt-question-generation` (target: < $0.15 per 20 questions)
- `$/report-card-narrative` (target: < $0.04 per student)

Monthly cost forecast per school, shown in the admin dashboard.

---

## 18. Replacement Roadmap

| Phase | Workflow Engine State |
|---|---|
| **Phase 1** | Linear step pipelines. Sync + streaming. DB-backed background jobs (Prisma polling). |
| **Phase 2** | DAG-based parallel steps (some steps run concurrently). BullMQ/Inngest for background jobs. Scheduled workflows (cron). |
| **Phase 3** | Multi-agent workflows: TeacherAgent + CurriculumAgent collaborate on lesson planning. Approval gates for AI-suggested curriculum changes. |
| **Phase 4** | School-customisable workflow templates. Principals configure report card formats. AI-generated workflow suggestions ("based on your students' performance, here's a recommended revision plan structure"). |

---

## Phase 1 Implementation Checklist

**Week 1 — Core Infrastructure**
- [ ] Add `WorkflowRun`, `WorkflowStep` (log), `WorkflowApproval`, `WorkflowSchedule` Prisma models; run migration
- [ ] Implement `WorkflowRegistry` with `lesson-note-generation` and `cbt-question-generation` registered
- [ ] Implement `StepRunner` with timeout and basic retry (max 2 attempts, 2s backoff)
- [ ] Implement `ContextBuilder.buildKnowledgeContext()` — calls Knowledge Service `buildContext()`
- [ ] Implement `ContextBuilder.buildMemoryContext()` — calls Memory Service `buildMemoryContext()`

**Week 2 — Lesson Note Generation**
- [ ] Implement all 8 steps of `lesson-note-generation` as typed `WorkflowStep` functions
- [ ] Implement `WorkflowExecutor.run()` — sequential step execution with state threading
- [ ] Implement `WorkflowService.run()` — public API entry point with schoolId validation
- [ ] Unit test each of the 8 steps with mocked AI Router responses
- [ ] Integration test: full lesson-note-generation run returns valid 8-section output

**Week 3 — Streaming + CBT**
- [ ] Implement `StreamingEmitter` — SSE from AI Router token stream to Next.js Response
- [ ] Implement `WorkflowService.stream()` — calls same step pipeline but with streaming=true on final step
- [ ] Wire `/api/workflows/stream` Next.js route → `WorkflowService.stream()`
- [ ] Test SSE end-to-end: teacher clicks "Generate", lesson note appears token by token
- [ ] Implement `cbt-question-generation` workflow steps
- [ ] Integration test: 20-question CBT set generated with correct difficulty distribution

**Week 4 — Background Jobs + Report Narrative**
- [ ] Implement `WorkflowService.submit()` — writes `WorkflowRun` with status `queued`
- [ ] Implement `BackgroundJobManager` — polls DB every 5s, picks up queued runs, executes
- [ ] Implement `WorkflowService.getRunStatus()` and `getRunResult()`
- [ ] Implement `report-card-narrative` workflow
- [ ] Test background job lifecycle: submit → queued → running → completed → result retrievable

**Week 5 — Human Approval + Scheduling**
- [ ] Implement `HumanApprovalGate` — pause run, write `WorkflowApproval` record, notify teacher
- [ ] Implement `/api/workflows/approve` route — teacher submits decision, workflow resumes
- [ ] Implement `SchedulerModule` — reads `WorkflowSchedule` records, triggers due runs
- [ ] Set up first scheduled workflow: weekly student revision plan refresh (Sunday 9pm Lagos)

**Week 6 — Observability + Cost Tracking**
- [ ] Instrument all workflows with per-step timing and token usage capture
- [ ] Implement `WorkflowService.getUsageReport()` — aggregate tokens and cost per school
- [ ] Add workflow cost dashboard panel to school admin settings page
- [ ] Set up monitoring alerts for completion rate, queue depth, TTFT
- [ ] Full load test: 10 concurrent lesson note generations, verify no rate-limit cascades
- [ ] Sign-off: all 4 primary workflows (lesson note, CBT, report, revision plan) passing integration tests
