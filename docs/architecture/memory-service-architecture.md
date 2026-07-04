# TeachNexis Memory Service — Architecture RFC

**Version:** 1.0  
**Date:** 2026-07-04  
**Status:** Approved for Phase 1 Implementation  
**Owner:** AI Infrastructure Domain (F3)  
**Related Documents:**
- `docs/service-interfaces/memory-service.md` — Public interface contract
- `docs/repo-evaluations/mem0.md` — Mem0 architectural study (reference only)
- `docs/architecture/service-overview.md` — Service map and data flow diagrams
- `architecture/06-AI-Models.md` — Model registry and routing policy

---

## Executive Summary

The Memory Service stores and retrieves long-term behavioural context about teachers, students, parents, and schools. It is the personalisation engine of TeachNexis: without it, every AI interaction starts cold. With it, TeachNexis accumulates institutional and individual intelligence with every interaction.

This document specifies the complete internal architecture — modules, data model, retrieval pipeline, privacy controls, and failure handling — at implementation-ready depth. It is a principal engineer's RFC, not a product description.

**Design lineage:** Mem0's architecture (hybrid retrieval, LLM fact extraction, entity linking, temporal conflict resolution) is the primary reference. TeachNexis implements these patterns natively on Prisma + pgvector with no Mem0 runtime dependency. Mem0 Cloud is economically impossible at Nigerian school budgets (60× over capacity at 10k students on the Pro tier).

---

## 1. Responsibilities

### What Memory Service Owns

- All persistent behavioural memory for every actor type (student, teacher, parent, school).
- The full lifecycle of a memory entry: creation, confidence scoring, conflict resolution, decay, and erasure.
- The extraction pipeline that distils raw events into discrete, searchable facts using a Haiku-class LLM.
- The hybrid retrieval pipeline that surfaces relevant memories for AI prompt injection.
- The `buildMemoryContext()` interface that all AI workflows consume.
- NDPR compliance enforcement: right-to-erasure, expiry, audit logging.

### Strict Boundary with Knowledge Service

| Dimension | Memory Service | Knowledge Service |
|---|---|---|
| **What it stores** | Behavioural facts about specific people | Educational content (textbooks, WAEC papers, notes) |
| **Who generated it** | Observed from actor behaviour or stated by actors | Ingested from external curriculum sources |
| **Personalised to** | A specific actorId within a schoolId | A subject + topic (shared across schools) |
| **Query axis** | "What do I know about this student?" | "What does WAEC say about quadratic equations?" |
| **Expiry** | Yes — mistake patterns age out, sessions clear | Rarely — curriculum content is stable |
| **Privacy regime** | NDPR — tied to identifiable actors | None — content is not personal data |

These services must never call each other. A workflow that needs both (e.g., lesson generation) calls them in parallel from the application layer and merges results in the prompt.

```
// CORRECT
const [knowledgeCtx, memoryCtx] = await Promise.all([
  knowledgeService.buildContext({ query, schoolId }),
  memoryService.buildMemoryContext({ actorId, actorType, schoolId, taskContext }),
]);

// WRONG — Memory Service must not call Knowledge Service or vice versa
```

---

## 2. Internal Modules

### 2.1 StudentMemoryModule

**Responsibility:** Manage all memory scoped to `actorType === "student"`.

**Inputs:**
- Raw quiz submissions (from `processEvent("quiz_submitted", ...)`)
- Tutor session transcripts (from `processEvent("tutor_session_ended", ...)`)
- Explicit student corrections (from `updateMemory()`)
- Score records from the grading system (from `processEvent("score_recorded", ...)`)

**Outputs:**
- Weak topics list (consumed by CBT generation, tutor session start)
- Strong topics list (consumed by adaptive quiz difficulty routing)
- Mistake pattern descriptions (consumed by revision plan generation)
- Learning style annotation (consumed by content format selection)
- Revision history (consumed by spaced repetition engine)

**Key Functions:**
```typescript
extractWeakTopics(studentId: string, subject: string, schoolId: string): Promise<WeakTopic[]>
extractMistakePatterns(quizEvent: QuizSubmittedEvent): Promise<MistakePattern[]>
inferLearningStyle(sessionHistory: SessionEvent[]): Promise<LearningStyleAnnotation>
recordRevisionSession(studentId: string, topics: string[], schoolId: string): Promise<void>
```

**Storage Model:**
- Categories: `student-weak-topic`, `student-strong-topic`, `student-mistake-pattern`, `student-learning-style`, `student-revision-history`, `student-exam-performance`
- `subject` field always populated — student memories are always subject-scoped.
- Mistake patterns expire after 6 months (see ForgettingModule).
- Revision history expires after 3 months.
- Learning style never expires; confidence grows with evidence.

---

### 2.2 TeacherMemoryModule

**Responsibility:** Manage all memory scoped to `actorType === "teacher"`.

**Inputs:**
- Lesson corrections (from `processEvent("lesson_corrected", ...)`) — highest signal
- Explicit preference statements (from `processEvent("preference_stated", ...)`)
- AI feedback events (from `processEvent("ai_output_rejected", ...)`)
- Exam configuration patterns (inferred from repeated exam structures)

**Outputs:**
- Lesson format preferences (consumed by lesson generation workflow)
- Subject focus map (consumed by content depth routing)
- Avoid patterns list (consumed as negative constraints in lesson prompts)
- Preferred example styles (consumed by example selection in lesson generation)

**Key Functions:**
```typescript
extractFormatPreference(correctionEvent: LessonCorrectedEvent): Promise<FormatPreference>
recordExplicitFeedback(teacherId: string, feedbackContent: string, schoolId: string): Promise<MemoryEntry>
buildPreferenceSummary(teacherId: string, schoolId: string): Promise<TeacherPreferenceSummary>
```

**Storage Model:**
- Categories: `teacher-lesson-preference`, `teacher-subject-focus`, `teacher-ai-feedback`, `teacher-exam-style`
- Lesson preferences never expire — a teacher's style is persistent.
- `confirmedByUser: true` set when teacher explicitly states a preference; `source: "ai-observed"` when inferred from corrections.
- `teacher-ai-feedback` with `source: "explicit"` has the highest weight in conflict resolution.

---

### 2.3 ParentMemoryModule

**Responsibility:** Manage all memory scoped to `actorType === "parent"`.

**Inputs:**
- First parent communication (channel, language, tone observed)
- Parent-initiated contact events
- Explicit preference statements during onboarding

**Outputs:**
- Communication channel preference (SMS, WhatsApp, email, in-app)
- Preferred language (English, Yoruba, Igbo, Hausa — primary + fallback)
- Preferred tone (formal/informal)
- Contact frequency preference
- Prior concern history (for continuity in next communication)

**Key Functions:**
```typescript
extractCommunicationPreference(communicationEvent: ParentCommunicationEvent): Promise<CommunicationPref>
getContactPreference(parentId: string, schoolId: string): Promise<ContactPreference>
recordConcern(parentId: string, concern: string, schoolId: string): Promise<MemoryEntry>
```

**Storage Model:**
- Categories: `parent-communication-pref`, `parent-concern-history`
- Communication preferences never expire.
- Concern history expires after 1 academic session (approximately 9 months).
- Language preference has `confirmedByUser: true` only if explicitly stated; `source: "ai-observed"` if inferred from the parent's own written language.

---

### 2.4 SchoolMemoryModule

**Responsibility:** Manage all memory scoped to `actorType === "school"`.

**Inputs:**
- Curriculum progress tracking events (topics completed, scheme of work position)
- School-level AI configuration (school admin preferences for AI behaviour)
- Term boundary events (new term, new session)

**Outputs:**
- Current curriculum position per class and subject (consumed by lesson generation)
- School-level AI config overrides (e.g., "never generate content above SS3 level for this school")
- Term-level progress summary

**Key Functions:**
```typescript
updateCurriculumProgress(schoolId: string, classLevel: ClassLevel, subject: string, weekCompleted: number): Promise<void>
getSchoolAIConfig(schoolId: string): Promise<SchoolAIConfig>
rotateTerm(schoolId: string, newTerm: Term, session: string): Promise<void>
```

**Storage Model:**
- Categories: `school-curriculum-progress`, `school-ai-config`
- Curriculum progress is overwritten (not appended) — we track current position, not full history.
- `school-ai-config` never expires.
- `actorId` is the `school.id` itself.

---

### 2.5 ConversationMemoryModule

**Responsibility:** Manage short-term session context that enables multi-turn coherence within a single session.

**Inputs:**
- Each conversational turn (question, AI response, follow-up)
- Session start and end signals

**Outputs:**
- Recent turn history (last N turns) for prompt injection
- Session topic stack (what subjects/topics have been discussed)
- Unresolved questions from this session

**Key Functions:**
```typescript
appendTurn(sessionId: string, actorId: string, schoolId: string, turn: ConversationTurn): Promise<void>
getSessionContext(sessionId: string, schoolId: string, maxTurns?: number): Promise<ConversationTurn[]>
clearSession(sessionId: string, schoolId: string): Promise<void>
promoteToLongTerm(sessionId: string, schoolId: string): Promise<MemoryEntry[]>
```

**Storage Model:**
- Stored in a separate `ConversationSession` table (not `MemoryEntry`) — session data is too granular and high-volume to go through the extraction pipeline on every turn.
- Hard expiry: 24 hours from session start. A background job clears sessions older than 24 hours.
- Before clearing, `promoteToLongTerm()` runs the ExtractionModule over the full session to extract durable facts.
- `embedding` column not used for ConversationSession rows — retrieval is always by `sessionId` lookup, not semantic search.

---

### 2.6 ExtractionModule

**Responsibility:** Distil raw event data into discrete, searchable memory facts using an LLM.

**Inputs:**
- A raw `MemoryEvent` record (eventType + eventData JSON)
- Existing memories for the actor (for deduplication context)

**Outputs:**
- A list of `ExtractedFact` objects: `{ content: string, category: MemoryCategory, confidence: number, subject?: string }`

**Key Functions:**
```typescript
extractFacts(event: MemoryEvent, existingMemories: MemoryEntry[]): Promise<ExtractedFact[]>
buildExtractionPrompt(event: MemoryEvent, existingMemories: MemoryEntry[]): string
parseExtractionResponse(llmOutput: string): ExtractedFact[]
deduplicateAgainstExisting(newFacts: ExtractedFact[], existingMemories: MemoryEntry[]): DedupResult[]
```

**Model:** Qwen3 (Groq free tier) — short-form, fast, low-cost. Fallback: DeepSeek.  
Per the model registry in `architecture/06-AI-Models.md`, Qwen3 is the designated model for summarisation and extraction tasks. It maps to the "Haiku-class" pattern (cheap, fast, accurate on constrained extraction tasks).

**Storage Model:**
- `ExtractionModule` does not persist anything directly. It returns `ExtractedFact[]` to `processEvent()`, which calls `remember()` for each fact.
- Failed extractions are caught, the raw event is written to `MemoryEvent` with `extractionStatus: "pending"`, and a background retry job handles re-extraction.

---

### 2.7 RetrievalModule

**Responsibility:** Execute hybrid search (vector + full-text + entity boosting) over the `MemoryEntry` table.

**Inputs:**
- A natural language query string
- Actor filter: `actorId + schoolId`
- Optional category filter
- Optional subject filter
- `limit`

**Outputs:**
- Ranked `MemoryEntry[]` with attached retrieval scores

**Key Functions:**
```typescript
vectorSearch(query: string, actorId: string, schoolId: string, limit: number): Promise<ScoredMemory[]>
keywordSearch(query: string, actorId: string, schoolId: string, limit: number): Promise<ScoredMemory[]>
mergeAndRank(vectorResults: ScoredMemory[], keywordResults: ScoredMemory[], entityBoosts: EntityBoost[]): ScoredMemory[]
```

Full SQL and scoring details in Section 6.

---

### 2.8 RankingModule

**Responsibility:** Apply recency decay, confidence weighting, and source weighting to produce a final score for each candidate memory. Resolve conflicts between contradictory memories.

**Inputs:**
- Raw retrieval scores from RetrievalModule
- Memory metadata: `confidence`, `source`, `createdAt`, `updatedAt`, `confirmedByUser`

**Outputs:**
- Final ranked `MemoryEntry[]`
- Flagged conflicts (memories that contradict each other)

**Key Functions:**
```typescript
applyRecencyDecay(score: number, updatedAt: Date): number
applyConfidenceWeight(score: number, confidence: number): number
applySourceWeight(score: number, source: MemorySource, confirmedByUser: boolean): number
detectConflicts(memories: MemoryEntry[]): ConflictPair[]
resolveConflict(pair: ConflictPair): ConflictResolution
```

Full algorithm in Section 7.

---

### 2.9 ForgettingModule

**Responsibility:** Enforce expiry policies, execute right-to-erasure requests, decay confidence on stale AI-observed memories, and ensure NDPR compliance.

**Inputs:**
- Scheduled trigger (daily cron job)
- `forgetActor()` call (right-to-erasure)
- `forgetMemory()` call (single entry deletion)

**Outputs:**
- Deleted/expired memory counts
- Audit log entries
- (Optionally) anonymised aggregate data retained post-erasure

**Key Functions:**
```typescript
runExpiryJob(): Promise<ExpiryJobResult>
decayConfidence(entry: MemoryEntry): number
purgeExpiredEntries(): Promise<number>
executeForgetActor(actorId: string, schoolId: string): Promise<ForgetResult>
anonymiseForAggregation(entry: MemoryEntry): AnonymisedFact
```

Full expiry policy table and decay function in Section 8.

---

## 3. Public API

```typescript
// ── Types ────────────────────────────────────────────────────────────────────

export type MemoryCategory =
  | "student-weak-topic"
  | "student-strong-topic"
  | "student-mistake-pattern"
  | "student-learning-style"
  | "student-revision-history"
  | "student-exam-performance"
  | "teacher-lesson-preference"
  | "teacher-subject-focus"
  | "teacher-ai-feedback"
  | "teacher-exam-style"
  | "parent-communication-pref"
  | "parent-concern-history"
  | "school-curriculum-progress"
  | "school-ai-config";

export type MemorySource = "explicit" | "ai-observed" | "system-computed";

export type ActorType = "student" | "teacher" | "parent" | "school";

export interface MemoryEntry {
  id: string;
  schoolId: string;
  actorId: string;
  actorType: ActorType;
  category: MemoryCategory;
  subject?: string;
  topic?: string;
  content: string;             // Human-readable fact. No PII. Pattern descriptions only.
  embedding?: number[];        // 1536-dim vector (text-embedding-3-small or nomic-embed)
  confidence: number;          // 0.0–1.0
  source: MemorySource;
  confirmedByUser: boolean;
  supersededById?: string;     // Set when this memory is demoted by a conflict resolution
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryEvent {
  actorId: string;
  actorType: ActorType;
  schoolId: string;
  eventType: MemoryEventType;
  eventData: Record<string, unknown>;
  timestamp: Date;
}

export type MemoryEventType =
  | "quiz_submitted"
  | "lesson_generated"
  | "lesson_corrected"
  | "ai_output_rejected"
  | "preference_stated"
  | "tutor_session_ended"
  | "score_recorded"
  | "parent_communication_sent"
  | "parent_communication_received";

export interface MemorySearchParams {
  actorId: string;
  schoolId: string;
  query: string;
  categories?: MemoryCategory[];
  subject?: string;
  limit?: number;            // Default: 10
  minConfidence?: number;    // Default: 0.3
}

export interface MemoryRecallParams {
  actorId: string;
  schoolId: string;
  categories?: MemoryCategory[];
  subject?: string;
  limit?: number;
  minConfidence?: number;
  includeExpired?: boolean;  // Default: false
}

export interface MemoryContextParams {
  actorId: string;
  actorType: ActorType;
  schoolId: string;
  taskContext: string;       // Natural language — what the AI is about to do
  maxTokens?: number;        // Default: 500. Hard cap to protect prompt budgets.
  subject?: string;          // Narrows retrieval to subject-scoped memories
}

export interface MemoryContextResult {
  context: string;           // Formatted string ready for prompt injection
  memories: MemoryEntry[];   // Source memories for traceability
  truncated: boolean;        // True if maxTokens was hit
}

export interface WeakTopic {
  topic: string;
  subject: string;
  confidence: number;
  evidenceCount: number;     // How many quiz/exam events support this fact
  lastConfirmedAt: Date;
}

export interface TeacherPreferences {
  lessonFormat?: string;               // e.g., "5-step inductive approach"
  preferredDepth?: "brief" | "standard" | "detailed";
  avoidPatterns?: string[];            // e.g., ["abstract theory without examples"]
  preferredExamples?: string;          // e.g., "real-world Nigerian context"
  preferredAssessmentStyle?: string;
}

export interface ForgetResult {
  deletedMemoryEntries: number;
  deletedMemoryEvents: number;
  deletedConflictRecords: number;
  retainedAnonymisedAggregates: number;
  completedAt: Date;
}

// ── Service Interface ─────────────────────────────────────────────────────────

export interface TeachNexisMemoryService {

  // ── Write ──────────────────────────────────────────────────────────────────

  /**
   * Store a single discrete memory fact.
   * Generates embedding before write.
   * Checks for conflicts before inserting (calls RankingModule.detectConflicts).
   */
  remember(entry: {
    actorId: string;
    actorType: ActorType;
    schoolId: string;
    category: MemoryCategory;
    content: string;
    subject?: string;
    topic?: string;
    confidence?: number;          // Default: 0.8 for explicit, 0.6 for ai-observed
    source?: MemorySource;        // Default: "ai-observed"
    confirmedByUser?: boolean;    // Default: false
    expiresAt?: Date;
  }): Promise<MemoryEntry>;

  /**
   * Process a raw behavioural event.
   * Runs ExtractionModule → deduplication → remember() for each fact.
   * On LLM failure: writes raw event to MemoryEvent log and returns [].
   */
  processEvent(event: MemoryEvent): Promise<MemoryEntry[]>;

  /**
   * Explicitly update a memory (user-confirmed correction).
   * Always sets confirmedByUser: true and source: "explicit".
   * Previous version is demoted (supersededById set), not deleted.
   */
  updateMemory(
    memoryId: string,
    updates: {
      content?: string;
      confidence?: number;
      confirmedByUser?: boolean;
    },
    schoolId: string               // For ownership verification
  ): Promise<MemoryEntry>;

  /**
   * Delete a single memory entry.
   * Writes an audit log entry before deletion.
   * Verifies schoolId ownership before executing.
   */
  forgetMemory(memoryId: string, schoolId: string): Promise<void>;

  /**
   * Delete ALL memories for an actor.
   * Transactional — all or nothing.
   * Writes a single audit log entry covering the entire deletion.
   * Anonymised aggregates (if any) may be retained — see Section 11.
   */
  forgetActor(
    actorId: string,
    schoolId: string
  ): Promise<ForgetResult>;

  // ── Read ───────────────────────────────────────────────────────────────────

  /**
   * List memories for an actor with optional filters.
   * No semantic search — direct category/subject filter.
   * Results ordered by confidence DESC, updatedAt DESC.
   */
  recall(params: MemoryRecallParams): Promise<MemoryEntry[]>;

  /**
   * Hybrid semantic + keyword search over an actor's memories.
   * See Section 6 for retrieval algorithm.
   */
  search(params: MemorySearchParams): Promise<MemoryEntry[]>;

  /**
   * Build a formatted memory context string for LLM prompt injection.
   * Caches result for 5 minutes per (actorId + taskContext) combination.
   * Returns only the most relevant memories within maxTokens budget.
   */
  buildMemoryContext(params: MemoryContextParams): Promise<MemoryContextResult>;

  // ── Convenience Methods ────────────────────────────────────────────────────

  /** Get weak topics for a student in a specific subject, ordered by confidence. */
  getStudentWeakTopics(
    studentId: string,
    subject: string,
    schoolId: string
  ): Promise<WeakTopic[]>;

  /** Get strong topics for a student in a specific subject. */
  getStudentStrongTopics(
    studentId: string,
    subject: string,
    schoolId: string
  ): Promise<WeakTopic[]>;

  /** Get a teacher's consolidated AI generation preferences. */
  getTeacherPreferences(
    teacherId: string,
    schoolId: string
  ): Promise<TeacherPreferences>;

  /**
   * Record that a student made a mistake on a specific topic.
   * Creates or updates a student-mistake-pattern memory.
   * If a mistake pattern for this topic already exists, increments evidence count.
   */
  recordStudentMistake(params: {
    studentId: string;
    schoolId: string;
    subject: string;
    topic: string;
    mistakeDescription: string;
    score?: number;
  }): Promise<MemoryEntry>;
}
```

---

## 4. Memory Type Taxonomy

TeachNexis implements four memory types, drawn from cognitive science and adapted from Mem0's architectural taxonomy. Each type has distinct storage, retrieval, and expiry behaviour.

### 4.1 Semantic Memory — Facts

**Definition:** Stable, timeless facts derived from observed or stated behaviour. Not tied to a specific event or time.

**Examples:**
- "Student struggles with application of the quadratic formula"
- "Teacher prefers 5-step inductive lesson structure"
- "Parent prefers brief updates in Yoruba"

**Storage:** `MemoryEntry` table. `category` set to a fact-bearing category (e.g., `student-weak-topic`). `embedding` populated. Full hybrid search applies.

**Retrieval:** Vector search + keyword search + entity boosting. Confidence-weighted.

**Expiry:** Category-dependent. Teacher preferences: never. Student weak topics: 6 months of inactivity (reset on new evidence). Student mistake patterns: 6 months absolute.

---

### 4.2 Episodic Memory — Events

**Definition:** Timestamped records of specific occurrences. "What happened, when."

**Examples:**
- "Scored 35% in Mathematics CBT on 2026-06-15"
- "Teacher corrected AI lesson output at 10:32 on 2026-06-20"
- "Parent called school on 2026-05-10 about attendance"

**Storage:** `MemoryEvent` table (raw log) + `MemoryEntry` rows (extracted facts). Raw events are kept for audit and re-extraction; extracted facts are the primary retrieval surface.

**Retrieval:** Direct recall by category (`student-exam-performance`) and subject filter. Ordered by `createdAt` DESC. Not typically used in semantic search (too granular).

**Expiry:** Raw `MemoryEvent` rows: 12 months. Extracted episodic `MemoryEntry` rows: 3–6 months depending on category.

---

### 4.3 Procedural Memory — How-To Patterns

**Definition:** Learned patterns about *how* someone does something — the process they follow, not a one-time fact.

**Examples:**
- "Teacher generates lesson notes using a 5-step approach: hook → prior knowledge → new concept → worked example → evaluation"
- "Teacher always includes at least two WAEC past questions per lesson"
- "Student works through problems by writing out all steps; never skips to the answer"

**Storage:** `MemoryEntry` table. `category: "teacher-lesson-preference"` or `"teacher-exam-style"`. High confidence, `confirmedByUser` typically false (inferred from pattern).

**Retrieval:** Primarily via `getTeacherPreferences()` (structured recall) and `buildMemoryContext()` for lesson generation tasks.

**Expiry:** Never. Procedural patterns are the most stable memory type. They can be updated (new version demotes old) but not expired.

---

### 4.4 Transient Memory — Session Context

**Definition:** Short-term working memory for the current session only. Enables multi-turn coherence. Discarded after 24 hours.

**Examples:**
- "Student is currently working through organic chemistry — we are on alkanes"
- "Teacher has asked three questions about differentiation in this session"
- "Parent mentioned their child's attendance issue 2 turns ago"

**Storage:** `ConversationSession` table (not `MemoryEntry`). Accessed by `sessionId`, never by semantic search. Not embedded.

**Retrieval:** Direct lookup by `sessionId`. Returns ordered turn array for prompt injection.

**Expiry:** Hard 24-hour TTL. Before deletion, `ConversationMemoryModule.promoteToLongTerm()` runs extraction and writes durable `MemoryEntry` rows for any facts worth keeping.

---

## 5. LLM Fact Extraction Pipeline

`processEvent()` triggers this pipeline on every behavioural event. It converts noisy raw data into clean, discrete facts.

### Pipeline Steps

```
1. Raw MemoryEvent arrives at processEvent()
       │
       ▼
2. Route to actor-type module (StudentMemoryModule, TeacherMemoryModule, etc.)
       │
       ▼
3. ExtractionModule.buildExtractionPrompt(event, existingMemories)
       │ — Fetches up to 20 most recent memories for the actor (for dedup context)
       ▼
4. LLM call → Qwen3 via Groq (primary) / DeepSeek fallback
       │ — Temperature: 0.1 (deterministic extraction, not creative)
       │ — Max output tokens: 512 (fact lists are short)
       │
       ├── [ON FAILURE] → Write raw event to MemoryEvent with extractionStatus: "pending"
       │                   Enqueue retry job (exponential backoff: 1m, 5m, 30m)
       │                   Return []
       ▼
5. parseExtractionResponse() → ExtractedFact[]
       │ — Validates JSON structure
       │ — Filters out facts below 0.3 confidence
       │ — Filters out facts with content > 500 chars
       ▼
6. deduplicateAgainstExisting(newFacts, existingMemories)
       │ — For each new fact: check cosine similarity against existing memories
       │   — similarity > 0.92 → skip (duplicate)
       │   — similarity 0.75–0.92 → flag as potential conflict (pass to RankingModule)
       │   — similarity < 0.75 → new fact, proceed
       ▼
7. Generate embedding for each surviving fact
       │ — Batch embed all facts in one API call
       │ — On embedding API failure: store text only, set embedding: null
       │   Backfill job runs nightly to embed text-only entries
       ▼
8. remember() for each fact
       │ — Inserts MemoryEntry row
       │ — Updates MemoryEvent.extractionStatus = "completed"
       ▼
9. Return MemoryEntry[]
```

### Extraction Prompt: Quiz Submission Event

```
SYSTEM:
You are a memory extraction assistant for TeachNexis, an educational AI platform for Nigerian secondary schools.
Your task is to extract discrete, reusable memory facts from a student quiz submission.

Rules:
- Extract facts as short, declarative statements (under 100 words each).
- Never include student names, IDs, or personally identifiable information.
- State patterns and tendencies, not one-time scores.
- If the score is above 70%, extract a strength fact. If below 50%, extract a weakness fact.
- If the student made the same wrong choice on multiple questions about the same sub-topic, extract a mistake pattern.
- Assign a confidence score between 0.3 and 1.0. A single quiz is low evidence (0.5). Repeated pattern across quizzes is high evidence (0.8+).
- Return a valid JSON array. No prose. No explanation. JSON only.

OUTPUT FORMAT:
[
  {
    "content": "<declarative memory statement>",
    "category": "<one of: student-weak-topic | student-strong-topic | student-mistake-pattern | student-learning-style | student-exam-performance>",
    "subject": "<subject name>",
    "topic": "<specific topic or sub-topic>",
    "confidence": <0.3 to 1.0>
  }
]

EXISTING MEMORIES FOR THIS STUDENT (for deduplication — do not repeat these):
{{existingMemoriesList}}

USER:
Subject: {{subject}}
Topic: {{topic}}
Score: {{score}}/{{total}} ({{percentage}}%)
Wrong answers summary:
{{wrongAnswersSummary}}

Extract memory facts from this quiz submission.
```

### Extraction Prompt: Lesson Correction Event

```
SYSTEM:
You are a memory extraction assistant for TeachNexis, an educational AI platform for Nigerian secondary schools.
Your task is to extract discrete, reusable preference facts from a teacher correction event.

A correction event occurs when a teacher modifies or rejects AI-generated lesson content.
The correction reveals something about the teacher's preferences.

Rules:
- Extract what the teacher PREFERS (not what they rejected).
- Frame every fact as a positive preference statement: "Teacher prefers X" not "Teacher rejected Y".
- Never include the teacher's name or ID.
- Corrections carry the highest confidence (0.9). Confirmed explicit statements carry 1.0.
- One correction is sufficient evidence for a preference fact.
- Return a valid JSON array. No prose. JSON only.

OUTPUT FORMAT:
[
  {
    "content": "<declarative preference statement>",
    "category": "<one of: teacher-lesson-preference | teacher-ai-feedback | teacher-exam-style>",
    "subject": "<subject if applicable, else null>",
    "confidence": <0.7 to 1.0>
  }
]

EXISTING MEMORIES FOR THIS TEACHER (do not repeat):
{{existingMemoriesList}}

USER:
Subject: {{subject}}
Original AI output section: {{originalSection}}
Teacher's correction: {{correctedSection}}
Teacher comment (if any): {{teacherComment}}

Extract preference facts from this correction.
```

---

## 6. Hybrid Retrieval

`search()` combines three retrieval signals into a single ranked list. Each leg runs independently; scores are merged via weighted sum.

### Leg A: Vector Search (pgvector cosine similarity)

```sql
-- Query embedding passed as $1 (float4[] cast to vector)
-- actorId = $2, schoolId = $3, limit = $4

SELECT
  me.id,
  me.content,
  me.category,
  me.subject,
  me.confidence,
  me.source,
  me.confirmed_by_user,
  me.updated_at,
  1 - (me.embedding <=> $1::vector) AS vector_score
FROM memory_entries me
WHERE
  me.school_id    = $3
  AND me.actor_id = $2
  AND me.expires_at IS NULL OR me.expires_at > NOW()
  AND me.superseded_by_id IS NULL
  AND me.embedding IS NOT NULL
ORDER BY me.embedding <=> $1::vector
LIMIT $4 * 2;   -- over-fetch before merge
```

Index used: `USING hnsw (embedding vector_cosine_ops)` (see Section 9).

### Leg B: Full-Text Search (ts_vector + ts_query)

```sql
-- Query text passed as $1 (plain text, converted to tsquery)
-- actorId = $2, schoolId = $3, limit = $4

SELECT
  me.id,
  me.content,
  me.category,
  me.subject,
  me.confidence,
  me.source,
  me.confirmed_by_user,
  me.updated_at,
  ts_rank_cd(me.content_tsv, plainto_tsquery('english', $1)) AS keyword_score
FROM memory_entries me
WHERE
  me.school_id    = $3
  AND me.actor_id = $2
  AND (me.expires_at IS NULL OR me.expires_at > NOW())
  AND me.superseded_by_id IS NULL
  AND me.content_tsv @@ plainto_tsquery('english', $1)
ORDER BY keyword_score DESC
LIMIT $4 * 2;
```

`content_tsv` is a generated column:

```sql
ALTER TABLE memory_entries ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX memory_entries_content_tsv_idx
  ON memory_entries USING gin(content_tsv);
```

### Leg C: Entity Boosting

Entity boosting re-ranks results when the query contains a subject or topic that matches `me.subject` or `me.topic` fields exactly.

```typescript
function applyEntityBoost(
  results: ScoredMemory[],
  querySubject: string | undefined,
  queryTopic: string | undefined
): ScoredMemory[] {
  return results.map(m => ({
    ...m,
    entityBoost:
      (querySubject && m.subject?.toLowerCase() === querySubject.toLowerCase() ? 0.15 : 0) +
      (queryTopic && m.topic?.toLowerCase() === queryTopic.toLowerCase() ? 0.10 : 0),
  }));
}
```

### Score Merge

All three legs return `(id, score)` pairs. They are merged into a single ranked list:

```typescript
const WEIGHTS = {
  vector:  0.55,  // Dominant — semantic intent is most important
  keyword: 0.30,  // Strong — exact term matching for topics/subjects
  entity:  0.15,  // Additive boost — tiebreaker for exact subject/topic match
};

function mergeScores(
  vectorResults: ScoredMemory[],
  keywordResults: ScoredMemory[],
  entityBoosts: Map<string, number>
): ScoredMemory[] {
  const index = new Map<string, ScoredMemory>();

  for (const r of vectorResults) {
    index.set(r.id, {
      ...r,
      mergedScore: r.vectorScore * WEIGHTS.vector,
    });
  }

  for (const r of keywordResults) {
    const existing = index.get(r.id);
    if (existing) {
      existing.mergedScore += r.keywordScore * WEIGHTS.keyword;
    } else {
      index.set(r.id, {
        ...r,
        mergedScore: r.keywordScore * WEIGHTS.keyword,
      });
    }
  }

  for (const [id, boost] of entityBoosts) {
    const existing = index.get(id);
    if (existing) existing.mergedScore += boost * WEIGHTS.entity;
  }

  // Apply confidence multiplier from RankingModule
  return Array.from(index.values())
    .map(m => ({
      ...m,
      mergedScore: m.mergedScore * m.confidence,
    }))
    .sort((a, b) => b.mergedScore - a.mergedScore);
}
```

---

## 7. Memory Ranking and Conflict Resolution

### Recency Decay

The retrieval score of any memory is multiplied by a recency decay factor. Memories updated more recently are scored higher.

```typescript
const HALF_LIFE_DAYS = 90; // Memory relevance halves every 90 days

function recencyDecay(updatedAt: Date): number {
  const ageInDays = (Date.now() - updatedAt.getTime()) / (1000 * 60 * 60 * 24);
  return Math.pow(0.5, ageInDays / HALF_LIFE_DAYS);
}
```

A memory updated yesterday retains 99.2% of its score. One updated 90 days ago retains 50%. One updated 270 days ago retains 12.5%.

### Source Weights

```typescript
const SOURCE_WEIGHT: Record<MemorySource, number> = {
  "explicit":        1.0,  // User directly stated this fact
  "ai-observed":     0.75, // AI inferred from behaviour
  "system-computed": 0.85, // Computed from structured data (scores, attendance)
};

// confirmedByUser multiplier applied on top of source weight
const CONFIRMED_MULTIPLIER = 1.15; // Caps at 1.0 after final normalisation
```

### Conflict Detection

Two memories conflict when:
1. They share the same `actorId`, `category`, `subject`, and `topic`.
2. Their content embeddings have cosine similarity > 0.75 (they are "about the same thing").
3. Their content expresses opposing states (detected via a simple keyword check: "struggles" vs "excels", "weak" vs "strong", "avoids" vs "prefers").

```typescript
const OPPOSING_PAIRS: [string, string][] = [
  ["struggles", "excels"],
  ["weak", "strong"],
  ["difficulty", "mastery"],
  ["avoids", "prefers"],
  ["cannot", "can"],
  ["rejects", "accepts"],
];

function expressesOpposite(contentA: string, contentB: string): boolean {
  const a = contentA.toLowerCase();
  const b = contentB.toLowerCase();
  return OPPOSING_PAIRS.some(([neg, pos]) =>
    (a.includes(neg) && b.includes(pos)) ||
    (a.includes(pos) && b.includes(neg))
  );
}
```

### Conflict Resolution Algorithm

When a conflict is detected (either during `remember()` or `updateMemory()`):

```
1. Compute winner score for each memory:
   winnerScore = recencyDecay(updatedAt) × sourceWeight(source) × confidence × (confirmedByUser ? CONFIRMED_MULTIPLIER : 1)

2. The memory with the higher winnerScore is designated the winner.

3. The loser is demoted:
   - loser.supersededById = winner.id
   - loser.confidence = loser.confidence * 0.3  (severely reduced, not zero)
   - loser is NOT deleted — preserved for audit trail

4. A MemoryConflict row is written:
   - winnerMemoryId, loserMemoryId, resolvedAt, resolutionReason

5. The loser is excluded from all retrieval queries via:
   WHERE superseded_by_id IS NULL
   (loser can still be fetched directly by ID for audit purposes)
```

**Example:**

Memory A (older, ai-observed): `"Student struggles with quadratic equations"` — confidence 0.7, updatedAt 90 days ago  
Memory B (newer, system-computed): `"Student demonstrates mastery of quadratic equations"` — confidence 0.85, updatedAt 5 days ago

```
winnerScore(A) = 0.5 × 0.75 × 0.7 = 0.2625
winnerScore(B) = 0.97 × 0.85 × 0.85 = 0.7007
```

Memory B wins. Memory A is demoted: `supersededById = B.id`, confidence reduced to 0.21. Both rows are retained in the database.

---

## 8. Forgetting Policies

### Per-Category Expiry Defaults

| Category | Expiry | Rationale |
|---|---|---|
| `student-weak-topic` | 6 months of inactivity | Topic may be mastered; stale weak labels harm the student |
| `student-strong-topic` | 12 months | Mastery is more durable than weakness |
| `student-mistake-pattern` | 6 months (absolute) | Students improve; old mistakes should not persist |
| `student-learning-style` | Never | Style is stable; update on new evidence |
| `student-revision-history` | 3 months | Only recent history is relevant for spaced repetition |
| `student-exam-performance` | 18 months | Spans two academic sessions for trend analysis |
| `teacher-lesson-preference` | Never | Preferences are stable; update on correction |
| `teacher-subject-focus` | Never | Static professional identity |
| `teacher-ai-feedback` | Never | Explicit corrections should always be honoured |
| `teacher-exam-style` | Never | Stable professional pattern |
| `parent-communication-pref` | Never | Update only on explicit change |
| `parent-concern-history` | 9 months (one session) | Concerns are session-specific |
| `school-curriculum-progress` | Per term — overwritten each term | Progress resets each term |
| `school-ai-config` | Never | Config is intentional and stable |
| `ConversationSession` rows | 24 hours (hard) | Session context is transient |

"Inactivity" means no new evidence has been added for that topic in the expiry window. Each new quiz submission that confirms the weakness resets the expiry clock.

### Confidence Decay Function for Unconfirmed AI-Observed Memories

```typescript
const DECAY_RATE_PER_DAY = 0.005; // 0.5% per day
const MINIMUM_CONFIDENCE = 0.10;  // Below this → eligible for auto-purge

function decayedConfidence(
  originalConfidence: number,
  ageInDays: number,
  confirmedByUser: boolean,
  source: MemorySource
): number {
  if (confirmedByUser || source === "explicit") return originalConfidence; // No decay
  const decayed = originalConfidence - ageInDays * DECAY_RATE_PER_DAY;
  return Math.max(decayed, MINIMUM_CONFIDENCE);
}
```

A 0.6-confidence ai-observed memory decays to the purge threshold in `(0.6 - 0.1) / 0.005 = 100 days` without new confirming evidence. A `confirmedByUser: true` memory never decays.

### Auto-Purge Job

Runs daily at 02:00 WAT (01:00 UTC). Steps:

```sql
-- Step 1: Hard expiry — delete entries past their expiresAt
DELETE FROM memory_entries
WHERE expires_at IS NOT NULL
  AND expires_at < NOW()
  AND school_id = ANY($schoolIds);

-- Step 2: Confidence decay — soft-delete entries below threshold
DELETE FROM memory_entries
WHERE confirmed_by_user = false
  AND source = 'ai-observed'
  AND confidence < 0.10
  AND updated_at < NOW() - INTERVAL '30 days'
  AND superseded_by_id IS NULL;
```

Both steps write to the `MemoryAuditLog` before deleting.

### Right to Erasure: forgetActor()

```typescript
async function forgetActor(actorId: string, schoolId: string): Promise<ForgetResult> {
  // Ownership check — abort if actorId does not belong to schoolId
  await verifyActorOwnership(actorId, schoolId); // throws if mismatch

  return await prisma.$transaction(async (tx) => {
    // 1. Log the erasure request BEFORE deletion (NDPR requirement)
    await tx.memoryAuditLog.create({
      data: {
        schoolId,
        actorId,
        action: "forget_actor",
        detail: "Right-to-erasure request executed",
        timestamp: new Date(),
      },
    });

    // 2. Retain anonymised aggregates before deletion (if school opts in)
    const aggregates = await buildAnonymisedAggregates(actorId, schoolId, tx);
    await tx.anonymisedMemoryAggregate.createMany({ data: aggregates });

    // 3. Delete conflict records (reference memory entries)
    const [deletedConflicts] = await Promise.all([
      tx.memoryConflict.deleteMany({ where: { schoolId, actorId } }),
    ]);

    // 4. Delete memory events (raw log)
    const [deletedEvents] = await Promise.all([
      tx.memoryEvent.deleteMany({ where: { schoolId, actorId } }),
    ]);

    // 5. Delete all memory entries (cascade deletes embeddings)
    const [deletedEntries] = await Promise.all([
      tx.memoryEntry.deleteMany({ where: { schoolId, actorId } }),
    ]);

    // 6. Delete conversation sessions
    await tx.conversationSession.deleteMany({ where: { schoolId, actorId } });

    return {
      deletedMemoryEntries: deletedEntries.count,
      deletedMemoryEvents: deletedEvents.count,
      deletedConflictRecords: deletedConflicts.count,
      retainedAnonymisedAggregates: aggregates.length,
      completedAt: new Date(),
    };
  });
}
```

If the transaction fails at any step, it rolls back entirely. Caller retries on failure (exponential backoff: 1s, 5s, 30s).

### NDPR Compliance: Delete vs Retain

Under the Nigeria Data Protection Regulation (NDPR) 2019 and its 2023 amendments:

| Data Type | Action on forgetActor() |
|---|---|
| Memory entries linked to actor | **Delete** — personal behavioural data, cannot be retained |
| Raw MemoryEvent log rows | **Delete** — event data tied to actor identity |
| Conflict audit records | **Delete** — reference memory entries |
| Anonymised topic-weakness aggregates (no actorId) | **Retain** — school-level analytics, no personal data |
| MemoryAuditLog rows (the record that deletion happened) | **Retain** — 7 years (legal obligation to demonstrate compliance) |

The anonymised aggregate retained has the form: `{ schoolId, subject, topic, weaknessFrequency, termId }` — no actorId, no content, no embeddings.

---

## 9. Database Schema

```prisma
// ── pgvector extension (must be enabled in Supabase SQL Editor) ───────────────
// CREATE EXTENSION IF NOT EXISTS vector;

// ── Memory Entries ────────────────────────────────────────────────────────────

model MemoryEntry {
  id               String    @id @default(cuid())
  schoolId         String
  actorId          String
  actorType        String    // "student" | "teacher" | "parent" | "school"
  category         String    // MemoryCategory enum value
  subject          String?
  topic            String?
  content          String    // Max 500 chars. No PII.
  embedding        Unsupported("vector(1536)")?
  confidence       Float     @default(0.7)
  source           String    @default("ai-observed")  // MemorySource
  confirmedByUser  Boolean   @default(false)
  supersededById   String?   // Self-reference: set when this entry is demoted
  expiresAt        DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  school          School     @relation(fields: [schoolId], references: [id])
  supersededBy    MemoryEntry? @relation("MemorySupersession", fields: [supersededById], references: [id])
  supersedes      MemoryEntry[] @relation("MemorySupersession")
  conflicts       MemoryConflict[] @relation("WinnerMemory")
  conflictedBy    MemoryConflict[] @relation("LoserMemory")

  @@index([schoolId, actorId, actorType])             // Primary lookup axis
  @@index([schoolId, actorId, category])              // Category filter
  @@index([schoolId, actorId, subject])               // Subject-scoped retrieval
  @@index([schoolId, actorId, supersededById])        // Active-only filter
  @@index([expiresAt])                                // Expiry job
  @@index([schoolId, actorType, category])            // School-wide analytics
  @@map("memory_entries")
}

// ── Raw Event Log ─────────────────────────────────────────────────────────────

model MemoryEvent {
  id               String    @id @default(cuid())
  schoolId         String
  actorId          String
  actorType        String
  eventType        String
  eventData        Json
  extractionStatus String    @default("pending")  // "pending" | "completed" | "failed" | "skipped"
  extractionError  String?
  retryCount       Int       @default(0)
  retryAfter       DateTime?
  processedAt      DateTime?
  createdAt        DateTime  @default(now())

  school  School   @relation(fields: [schoolId], references: [id])

  @@index([schoolId, actorId])
  @@index([extractionStatus, retryAfter])  // Retry job index
  @@index([createdAt])                     // Expiry and archival
  @@map("memory_events")
}

// ── Conflict Audit Trail ──────────────────────────────────────────────────────

model MemoryConflict {
  id               String    @id @default(cuid())
  schoolId         String
  actorId          String
  winnerMemoryId   String
  loserMemoryId    String
  resolutionReason String    // Human-readable explanation
  winnerScore      Float
  loserScore       Float
  resolvedAt       DateTime  @default(now())

  school        School       @relation(fields: [schoolId], references: [id])
  winnerMemory  MemoryEntry  @relation("WinnerMemory", fields: [winnerMemoryId], references: [id])
  loserMemory   MemoryEntry  @relation("LoserMemory", fields: [loserMemoryId], references: [id])

  @@index([schoolId, actorId])
  @@index([winnerMemoryId])
  @@index([loserMemoryId])
  @@map("memory_conflicts")
}

// ── Conversation Sessions ─────────────────────────────────────────────────────

model ConversationSession {
  id         String   @id @default(cuid())
  schoolId   String
  actorId    String
  actorType  String
  turns      Json[]   // ConversationTurn[]
  expiresAt  DateTime // Hardcoded: createdAt + 24h
  promotedAt DateTime?
  createdAt  DateTime @default(now())

  school  School @relation(fields: [schoolId], references: [id])

  @@index([schoolId, actorId])
  @@index([expiresAt])  // Session cleanup job
  @@map("conversation_sessions")
}

// ── Audit Log ─────────────────────────────────────────────────────────────────

model MemoryAuditLog {
  id        String   @id @default(cuid())
  schoolId  String
  actorId   String
  action    String   // "remember" | "forget_memory" | "forget_actor" | "update_memory"
  memoryId  String?  // Null for forget_actor (whole-actor operations)
  detail    String?
  requestIp String?
  timestamp DateTime @default(now())

  school  School @relation(fields: [schoolId], references: [id])

  @@index([schoolId, actorId])
  @@index([timestamp])
  @@map("memory_audit_logs")
}

// ── Anonymised Aggregates ─────────────────────────────────────────────────────

model AnonymisedMemoryAggregate {
  id                  String   @id @default(cuid())
  schoolId            String
  subject             String
  topic               String?
  category            String
  weaknessFrequency   Int      @default(1)
  classLevel          String?
  termId              String?
  retainedAt          DateTime @default(now())

  school  School @relation(fields: [schoolId], references: [id])

  @@index([schoolId, subject])
  @@map("anonymised_memory_aggregates")
}
```

### SQL Indexes Applied Outside Prisma

Prisma does not support all index types. These must be applied directly in Supabase SQL Editor:

```sql
-- HNSW vector index (Phase 1 — see Section 13 for transition to IVFFlat at scale)
CREATE INDEX memory_entries_embedding_hnsw_idx
  ON memory_entries
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- GIN full-text search index on generated tsvector column
ALTER TABLE memory_entries
  ADD COLUMN content_tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX memory_entries_content_tsv_idx
  ON memory_entries USING gin(content_tsv);

-- Partial index: active entries only (excludes superseded) — primary query path
CREATE INDEX memory_entries_active_idx
  ON memory_entries (school_id, actor_id, category, updated_at DESC)
  WHERE superseded_by_id IS NULL
    AND (expires_at IS NULL OR expires_at > NOW());
```

---

## 10. Event Flow

### Flow A: Student CBT Quiz Submission → Memory → Tutor Context

```
1. Student submits CBT exam answers
   └─ API Route: POST /api/exams/submit

2. Exam engine grades answers synchronously (no AI)
   └─ Returns score, wrongAnswers[], topic coverage

3. processEvent() fires (async, does not block the response to the student)
   └─ event = {
        actorId: student.id,
        actorType: "student",
        schoolId: student.schoolId,
        eventType: "quiz_submitted",
        eventData: {
          subject: "Mathematics",
          topic: "Quadratic Equations",
          score: 9,
          total: 20,
          percentage: 45,
          wrongAnswers: [
            { question: "...", correctAnswer: "B", studentAnswer: "D", subtopic: "Completing the Square" },
            { question: "...", correctAnswer: "A", studentAnswer: "D", subtopic: "Completing the Square" },
            { question: "...", correctAnswer: "C", studentAnswer: "B", subtopic: "Quadratic Formula" },
          ]
        },
        timestamp: new Date()
      }

4. ExtractionModule runs → Qwen3 extraction call
   └─ Prompt: quiz_submitted template (see Section 5)
   └─ LLM output:
      [
        {
          "content": "Student struggles with completing the square — selected wrong answer on 2 of 3 questions on this sub-topic",
          "category": "student-weak-topic",
          "subject": "Mathematics",
          "topic": "Completing the Square",
          "confidence": 0.65
        },
        {
          "content": "Student consistently selects the fourth option (D) when unsure, suggesting guessing pattern",
          "category": "student-mistake-pattern",
          "subject": "Mathematics",
          "topic": "Quadratic Equations",
          "confidence": 0.50
        }
      ]

5. Deduplication check: cosine similarity against existing memories
   └─ "Student struggles with completing the square" exists (similarity 0.94) → UPDATE confidence, not INSERT
   └─ Guessing pattern is new (similarity 0.31) → INSERT

6. remember() called for each surviving fact
   └─ Embeddings generated and stored
   └─ MemoryEvent.extractionStatus = "completed"

7. [Next session] Student starts AI tutor → buildMemoryContext() called
   └─ params = {
        actorId: student.id,
        actorType: "student",
        schoolId: student.schoolId,
        taskContext: "student AI tutor session — starting new session",
        maxTokens: 400
      }
   └─ Retrieval: search for most relevant memories
   └─ context string injected into tutor system prompt:

      "What I know about this student:
       - Struggles with completing the square in quadratic equations (confirmed across 3 quiz attempts)
       - Has a guessing pattern: frequently selects option D when uncertain
       - Strong in factorisation of simple quadratics (85% score, 2026-05-10)
       Do not re-teach factorisation. Start with completing the square.
       Watch for the guessing pattern on multi-choice questions."
```

### Flow B: Teacher Corrects AI Lesson Output → Stored Preference → Next Lesson

```
1. Teacher reviews AI-generated lesson note
   └─ AI generated: abstract derivation of the quadratic formula with algebraic proof

2. Teacher modifies the introduction section
   └─ Replaces abstract proof with: a real-world story about a farmer calculating field area
   └─ Adds comment: "Always start with a story or real-life context, not maths notation"

3. processEvent() fires on lesson save
   └─ event = {
        actorId: teacher.id,
        actorType: "teacher",
        schoolId: teacher.schoolId,
        eventType: "lesson_corrected",
        eventData: {
          subject: "Mathematics",
          topic: "Quadratic Equations",
          originalSection: "Introduction",
          originalContent: "A quadratic equation is expressed as ax² + bx + c = 0 where...",
          correctedContent: "Ibrahim was a farmer who wanted to fence a rectangular garden...",
          teacherComment: "Always start with a story or real-life context, not maths notation"
        },
        timestamp: new Date()
      }

4. ExtractionModule → lesson_corrected prompt → Qwen3
   └─ Output:
      [
        {
          "content": "Teacher prefers lesson introductions to begin with a real-world story or narrative context rather than mathematical notation or abstract definitions",
          "category": "teacher-lesson-preference",
          "subject": "Mathematics",
          "confidence": 0.90
        },
        {
          "content": "Teacher explicitly avoids opening with formal algebraic derivations or proofs",
          "category": "teacher-ai-feedback",
          "subject": "Mathematics",
          "confidence": 0.95
        }
      ]

5. remember() called
   └─ confirmedByUser: true (correction is explicit user action, not inference)
   └─ source: "explicit"
   └─ High confidence stored

6. [Next lesson generation] teacher clicks Generate Lesson Note for a new topic
   └─ buildMemoryContext() called with taskContext: "generating lesson note on Indices for SS2 Mathematics"
   └─ Memory retrieval finds: teacher-lesson-preference, teacher-ai-feedback entries
   └─ context injected into lesson generation prompt:

      "Teacher preferences for this lesson:
       - Open every lesson with a real-world story or narrative context (not notation)
       - Avoid formal algebraic proofs or derivations in the introduction
       - Preferred depth: standard
       Source: explicitly confirmed by teacher on 2026-07-01"

7. Lesson generator structures introduction as a narrative story by default
   └─ Teacher does not need to correct this lesson
```

---

## 11. Privacy Model

### NDPR Requirements (Nigeria Data Protection Regulation 2019 + 2023 Amendments)

TeachNexis processes personal data of minors (secondary school students). This triggers the highest tier of NDPR obligations.

| Requirement | Implementation |
|---|---|
| Lawful basis for processing | Legitimate educational interest + explicit school-level data processing agreement |
| Data minimisation | Memory entries store patterns, not personal details. Content max 500 chars. No names, ID numbers, or contact details in content field. |
| Purpose limitation | Memory data used only for personalisation within the same school. Never used for inter-school analysis with actor identifiers. |
| Storage limitation | Category-specific expiry (see Section 8). No indefinite retention of behavioural data. |
| Accuracy | Conflict resolution (Section 7) ensures stale facts are demoted. `updateMemory()` allows correction at any time. |
| Right to erasure | `forgetActor()` executes complete deletion (Section 8). Called automatically on account deletion. |
| Data portability | `recall({ actorId, schoolId })` returns all memories in structured JSON. Export available via admin UI. |
| Security | schoolId isolation at query level, audit log on all writes (Section 12). |

### School-Level Isolation

Every query to the Memory Service must include `schoolId`. The service enforces this at the Prisma query level:

```typescript
// Every read operation — example from recall()
const entries = await prisma.memoryEntry.findMany({
  where: {
    schoolId,          // ALWAYS scoped
    actorId,
    ...(categories && { category: { in: categories } }),
    ...(subject && { subject }),
    supersededById: null,
    OR: [
      { expiresAt: null },
      { expiresAt: { gt: new Date() } },
    ],
  },
  orderBy: [
    { confidence: "desc" },
    { updatedAt: "desc" },
  ],
  take: limit ?? 20,
});
```

A missing `schoolId` throws `MemoryServiceError("schoolId is required on all Memory Service queries")` before any database call.

### No PII in Memory Content

The extraction prompt (Section 5) explicitly instructs the LLM to never include names, IDs, or contact details in memory content. Additionally, a PII filter runs on all `content` values before storage:

```typescript
const PII_PATTERNS = [
  /\b[A-Z][a-z]+ [A-Z][a-z]+\b/,   // Name pattern (First Last)
  /\b\d{10,13}\b/,                   // Nigerian phone number patterns
  /\b[A-Z0-9]{8,12}\b/,             // Reg number / ID patterns
  /\S+@\S+\.\S+/,                   // Email addresses
];

function containsPII(content: string): boolean {
  return PII_PATTERNS.some(p => p.test(content));
}

// In remember():
if (containsPII(entry.content)) {
  throw new MemoryServiceError(
    "Memory content failed PII filter. Strip personally identifiable information before storing."
  );
}
```

### What Reaches External APIs

The extraction LLM call (Qwen3 via Groq) receives only anonymised fact extraction prompts:

- No actor names, IDs, or contact details.
- No school names (only subject/topic metadata).
- Wrong answer texts may be included (these are from curriculum content, not personal data).
- The prompt does not include the actorId or schoolId.

The embedding API (OpenAI text-embedding-3-small or Nomic) receives only the memory content string — a pattern statement with no PII, as guaranteed by the PII filter above.

---

## 12. Security Model

### schoolId Enforcement at DB Query Level

Application-level checks are insufficient — a bug in the application layer can bypass them. schoolId is enforced at the Prisma query layer, not only at the route handler.

A service-level wrapper enforces this:

```typescript
class MemoryServiceQueryGuard {
  static validateParams(params: { schoolId?: string; actorId?: string }): void {
    if (!params.schoolId || params.schoolId.trim() === "") {
      throw new MemoryServiceError("schoolId is required", "MISSING_SCHOOL_ID");
    }
    if (!params.actorId || params.actorId.trim() === "") {
      throw new MemoryServiceError("actorId is required", "MISSING_ACTOR_ID");
    }
    // Validate cuid format to prevent injection
    if (!/^c[a-z0-9]{24}$/.test(params.schoolId)) {
      throw new MemoryServiceError("Invalid schoolId format", "INVALID_SCHOOL_ID");
    }
    if (!/^c[a-z0-9]{24}$/.test(params.actorId)) {
      throw new MemoryServiceError("Invalid actorId format", "INVALID_ACTOR_ID");
    }
  }
}
```

This guard is called at the top of every public method before any logic executes.

### Rate Limiting on processEvent()

`processEvent()` involves an LLM call. Without rate limiting, a malicious or buggy caller could inject fabricated memories at scale (memory poisoning attack).

```typescript
// Per-actor rate limit: max 50 processEvent() calls per hour
// Implemented via Upstash Redis (or in-memory LRU for Phase 1)

const PROCESS_EVENT_RATE_LIMIT = {
  maxRequests: 50,
  windowMs: 60 * 60 * 1000,  // 1 hour
  key: (actorId: string, schoolId: string) => `mem:pe:${schoolId}:${actorId}`,
};

// Per-school rate limit: max 1000 processEvent() calls per hour across all actors
const SCHOOL_RATE_LIMIT = {
  maxRequests: 1000,
  windowMs: 60 * 60 * 1000,
  key: (schoolId: string) => `mem:pe:school:${schoolId}`,
};
```

### Input Validation on Memory Content

```typescript
const MEMORY_CONTENT_RULES = {
  maxLength: 500,              // Characters
  minLength: 10,               // Must be a meaningful statement
  forbiddenPatterns: [
    /<script/i,                // No executable content
    /javascript:/i,
    /data:text\/html/i,
    /on\w+\s*=/i,              // No event handlers
  ],
};

function validateMemoryContent(content: string): void {
  if (content.length < MEMORY_CONTENT_RULES.minLength) {
    throw new MemoryServiceError("Memory content too short");
  }
  if (content.length > MEMORY_CONTENT_RULES.maxLength) {
    throw new MemoryServiceError(`Memory content exceeds ${MEMORY_CONTENT_RULES.maxLength} character limit`);
  }
  for (const pattern of MEMORY_CONTENT_RULES.forbiddenPatterns) {
    if (pattern.test(content)) {
      throw new MemoryServiceError("Memory content contains forbidden pattern");
    }
  }
}
```

### Actor Ownership Verification

Before `forgetMemory()` or `updateMemory()` executes, ownership is verified:

```typescript
async function verifyMemoryOwnership(
  memoryId: string,
  schoolId: string
): Promise<MemoryEntry> {
  const entry = await prisma.memoryEntry.findUnique({ where: { id: memoryId } });
  if (!entry) throw new MemoryServiceError("Memory not found", "NOT_FOUND");
  if (entry.schoolId !== schoolId) {
    throw new MemoryServiceError("Memory does not belong to this school", "FORBIDDEN");
  }
  return entry;
}
```

This prevents cross-school memory access even if a valid memoryId is guessed.

---

## 13. Scaling Strategy

### Memory Volume Projections

| Scale | Students | Avg memories/student | Total entries | Total with indexing overhead |
|---|---|---|---|---|
| Phase 1 (pilot) | 500 | 30 | 15,000 | ~50 MB |
| Phase 2 (10 schools) | 2,000 | 50 | 100,000 | ~350 MB |
| Phase 3 (50 schools) | 10,000 | 50 | 500,000 | ~1.7 GB |
| Phase 4 (200 schools) | 40,000 | 75 | 3,000,000 | ~10 GB |

At 500k entries with 1536-dim vectors: each embedding is 6 KB. 500k embeddings = 3 GB. This is well within Supabase/Neon PostgreSQL capacity.

### pgvector Index Strategy

**Phase 1–2 (< 200k entries): HNSW**

```sql
CREATE INDEX memory_entries_embedding_hnsw_idx
  ON memory_entries
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);
```

HNSW offers faster queries with no index build time concerns at this scale. Recall@10 > 95%.

**Phase 3 (200k–2M entries): IVFFlat**

At this scale, HNSW memory usage (proportional to entry count) may strain the DB server. Transition to IVFFlat:

```sql
CREATE INDEX memory_entries_embedding_ivfflat_idx
  ON memory_entries
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 200);  -- sqrt(200k) ≈ 450, use 200 for safety margin
-- Set at query time: SET ivfflat.probes = 10;
```

Always scope vector queries by `schoolId + actorId` before the ANN search to reduce the candidate set to < 1000 entries per actor — at which point HNSW remains fast indefinitely.

### Extraction LLM Cost Model

Model: Qwen3 via Groq (free tier target). Fallback: DeepSeek via OpenRouter.

| Input tokens/event | Output tokens/event | Events/student/week | Students | Tokens/week | Groq free-tier limit |
|---|---|---|---|---|---|
| ~800 (prompt + context) | ~200 (fact list) | 5 | 10,000 | 50,000,000 | ~300M/day — comfortably within free tier |

At Phase 1 (500 students, 5 events/week): 500k input + 125k output tokens/week. At free tier rates, this costs $0 on Groq. At OpenRouter Qwen3 rates (~$0.10/1M tokens), this costs $0.06/week — negligible.

Transition to paid tier only when Groq free tier is exhausted. Model swap requires no code change (routed through AI Infrastructure model router).

### buildMemoryContext() Caching

```typescript
const MEMORY_CONTEXT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Cache key: sha256(actorId + schoolId + taskContext + subject?)
// Phase 1: in-memory LRU cache (1000 entries max, evict LRU)
// Phase 2: Redis cache (Upstash — Vercel KV)

const cache = new LRUCache<string, MemoryContextResult>({
  max: 1000,
  ttl: MEMORY_CONTEXT_CACHE_TTL_MS,
});

function buildCacheKey(params: MemoryContextParams): string {
  return crypto
    .createHash("sha256")
    .update(`${params.actorId}:${params.schoolId}:${params.taskContext}:${params.subject ?? ""}`)
    .digest("hex");
}
```

Cache is invalidated immediately on any `remember()` or `updateMemory()` call for the same actorId. This ensures lessons generated after a teacher correction always use the updated preferences.

---

## 14. Failure Handling

### LLM Extraction Failure

**Trigger:** Qwen3/DeepSeek API returns error, times out, or returns unparseable JSON.

```
On failure:
  1. Catch the error.
  2. Write raw event to MemoryEvent with extractionStatus: "pending", retryCount: 0.
  3. Log the error with event ID (structured log — do not swallow).
  4. Return [] from processEvent() — caller is not blocked.
  5. Retry background job picks up "pending" events every 15 minutes.
  6. Retry schedule: attempt 1 → 1 min, attempt 2 → 5 min, attempt 3 → 30 min, attempt 4 → 2h.
  7. After 4 failed attempts: set extractionStatus: "failed", alert on-call.
```

Consequence: if extraction fails, no memory is written for this event. The next quiz submission will create a fresh extraction attempt. No user-visible impact.

### Embedding API Failure

**Trigger:** Embedding API (OpenAI/Nomic) returns error or times out.

```
On failure:
  1. Store MemoryEntry with embedding: null.
  2. Entry is retrievable via keyword search (Leg B) but not vector search (Leg A).
  3. Nightly backfill job: SELECT * FROM memory_entries WHERE embedding IS NULL LIMIT 500.
     Generates embeddings in batch and updates rows.
  4. Batch size capped at 500 to avoid rate limit issues.
```

Consequence: degraded retrieval quality until backfill completes. Keyword search still works. No data loss.

### pgvector Query Timeout

**Trigger:** Vector search query exceeds 5-second timeout (rare — indicates index degradation or DB overload).

```
On timeout:
  1. Catch the query timeout exception.
  2. Fall back to keyword-only search (Leg B only — no vector Leg A).
  3. Log degraded mode event (metric: memory_service.degraded_mode_count).
  4. Return keyword results with a metadata flag: { degraded: true }.
  5. buildMemoryContext() proceeds with keyword-only results.
  6. Alert fires if degraded mode > 10 events in 5 minutes.
```

### forgetActor() Partial Failure

**Trigger:** Transaction fails mid-way (DB connection drop, deadlock).

```
Handling:
  1. Prisma $transaction rolls back all deletions atomically.
  2. No partial deletion — actor data is either fully deleted or fully intact.
  3. Caller receives error. Retry logic: 3 attempts with exponential backoff (1s, 5s, 30s).
  4. If all 3 attempts fail: write to a "pending_erasure" queue. Manual resolution required.
  5. Alert on-call immediately — NDPR breach risk if erasure is not completed.
```

---

## 15. Testing Strategy

### Unit Tests (per module)

```typescript
// ExtractionModule
describe("ExtractionModule", () => {
  it("extracts weak topic from below-50% quiz score", async () => { ... });
  it("extracts mistake pattern when same subtopic wrong on 2+ questions", async () => { ... });
  it("assigns lower confidence (0.5) on single quiz vs multiple (0.75+)", async () => { ... });
  it("filters out facts with confidence < 0.3", async () => { ... });
  it("returns [] and writes MemoryEvent on LLM failure", async () => { ... });
  it("does not include names in extracted content", async () => { ... });
});

// RankingModule
describe("RankingModule", () => {
  it("newer memory wins conflict when confidence is equal", async () => { ... });
  it("explicit source beats ai-observed source regardless of recency", async () => { ... });
  it("demotes loser but does not delete it", async () => { ... });
  it("writes MemoryConflict row on resolution", async () => { ... });
});

// ForgettingModule
describe("ForgettingModule", () => {
  it("deletes entries past expiresAt", async () => { ... });
  it("decays ai-observed confidence at 0.5% per day", async () => { ... });
  it("does not decay confirmedByUser entries", async () => { ... });
  it("forgetActor deletes all entries transactionally", async () => { ... });
  it("retains MemoryAuditLog row after forgetActor", async () => { ... });
});
```

### Integration Tests (full round-trip)

```typescript
describe("processEvent → search round-trip", () => {
  it("quiz_submitted event creates searchable weak-topic memory within 2 seconds", async () => {
    // Setup: student with no existing memories
    // Action: processEvent({ eventType: "quiz_submitted", score: 40%, topic: "Calculus" })
    // Assert: search({ query: "calculus differentiation" }) returns the new memory in top 3
  });

  it("lesson_corrected event creates teacher preference retrievable in buildMemoryContext", async () => {
    // Action: processEvent({ eventType: "lesson_corrected", ... story vs notation correction })
    // Assert: buildMemoryContext({ taskContext: "generating lesson on indices" })
    //         returns context string mentioning "real-world story"
  });

  it("processEvent deduplicates against existing memory (does not create duplicate)", async () => {
    // Setup: existing memory "Student struggles with completing the square" at confidence 0.7
    // Action: processEvent with same topic, same result
    // Assert: no new MemoryEntry created; existing entry confidence updated
  });
});
```

### Privacy Tests

```typescript
describe("Cross-school isolation", () => {
  it("school A cannot retrieve memories belonging to school B", async () => {
    // Setup: create memory for actor in school A
    // Action: search({ actorId: same, schoolId: school B })
    // Assert: returns []
  });

  it("forgetActor deletes ALL entries for actor, none remain", async () => {
    // Setup: create 10 memories across 3 categories for a student
    // Action: forgetActor(studentId, schoolId)
    // Assert: recall({ actorId: studentId }) returns []
    // Assert: MemoryEvent rows for actor are deleted
    // Assert: MemoryConflict rows for actor are deleted
    // Assert: MemoryAuditLog row for the forgetActor action exists
  });

  it("memory content passes PII filter — no names in content", async () => {
    // Action: remember({ content: "John Okafor struggles with calculus" })
    // Assert: throws MemoryServiceError("Memory content failed PII filter")
  });
});
```

### Accuracy Tests

```typescript
describe("buildMemoryContext accuracy", () => {
  // Fixture: student with 3-month history in Mathematics
  // - 5 quiz submissions: scores 35%, 42%, 38%, 41%, 45% — all on Quadratic Equations
  // - 3 quiz submissions: scores 85%, 90%, 88% — all on Factorisation
  // - 2 quiz submissions: scores 60%, 65% — on Surds (borderline)

  it("surfaces weak topic (quadratic equations) for tutor session context", async () => {
    const result = await memoryService.buildMemoryContext({
      actorId: student.id,
      actorType: "student",
      schoolId: student.schoolId,
      taskContext: "starting a mathematics tutoring session",
      subject: "Mathematics",
    });
    expect(result.context).toContain("quadratic");
    expect(result.memories.some(m => m.category === "student-weak-topic")).toBe(true);
  });

  it("does not surface strong topic (factorisation) as weak", async () => {
    const result = await memoryService.buildMemoryContext({ ... });
    const factorizationWeak = result.memories.find(
      m => m.category === "student-weak-topic" && m.topic?.includes("factorisation")
    );
    expect(factorizationWeak).toBeUndefined();
  });

  it("surfaces strong topics when task context is 'generating advanced quiz'", async () => {
    const result = await memoryService.buildMemoryContext({
      taskContext: "generating an advanced quiz to challenge this student",
    });
    expect(result.memories.some(m => m.category === "student-strong-topic")).toBe(true);
  });
});
```

---

## 16. Monitoring

### Metrics to Emit

All metrics emitted via structured log with `service: "memory-service"` tag. Consumed by Vercel's logging infrastructure and optionally forwarded to a metrics aggregator.

| Metric | Type | Description | Alert Threshold |
|---|---|---|---|
| `memory.write.latency_ms` | Histogram | Time from remember() call to DB commit (includes embedding) | p95 > 2000ms |
| `memory.extraction.latency_ms` | Histogram | Time for LLM extraction in processEvent() | p95 > 5000ms |
| `memory.search.latency_ms` | Histogram | Time from search() call to ranked results | p95 > 800ms |
| `memory.context.latency_ms` | Histogram | Time for buildMemoryContext() (including search) | p95 > 1500ms |
| `memory.extraction.success_rate` | Gauge | % of processEvent() calls that complete extraction successfully | < 95% |
| `memory.extraction.failure_count` | Counter | Count of extraction failures in last 5 minutes | > 10 in 5 min |
| `memory.entries_per_student.p50` | Gauge | Median memory entry count per student | > 200 (capacity risk) |
| `memory.entries.growth_rate_daily` | Gauge | Net new entries per day (excluding deletions) | > 50k (cost alert) |
| `memory.cache.hit_rate` | Gauge | buildMemoryContext() cache hit rate | < 40% (check TTL) |
| `memory.degraded_mode.count` | Counter | pgvector fallback-to-keyword-only events | > 10 in 5 min |
| `memory.forget_actor.duration_ms` | Histogram | End-to-end time for forgetActor() | > 10000ms |
| `memory.forget_actor.failure_count` | Counter | Failed forgetActor() transactions | > 0 (NDPR risk) |

### Alert Definitions

```typescript
const ALERTS = [
  {
    name: "MemoryExtractionFailureRateHigh",
    condition: "memory.extraction.success_rate < 0.95 for 5m",
    severity: "warning",
    action: "Check Groq/OpenRouter API status. Verify extraction prompt has not changed.",
  },
  {
    name: "MemoryExtractionDown",
    condition: "memory.extraction.failure_count > 50 in 5m",
    severity: "critical",
    action: "LLM provider may be down. processEvent() will accumulate pending events. Check retry queue depth.",
  },
  {
    name: "MemorySearchDegraded",
    condition: "memory.degraded_mode.count > 10 in 5m",
    severity: "warning",
    action: "pgvector returning timeouts. Check DB CPU and HNSW index health.",
  },
  {
    name: "ForgetActorFailed",
    condition: "memory.forget_actor.failure_count > 0",
    severity: "critical",
    action: "NDPR risk — erasure request not completed. Check pending_erasure queue. Manual resolution required within 24h.",
  },
];
```

---

## 17. Replacement Roadmap

### Phase 1 — Foundation (Now: Prisma + pgvector + Qwen3 extraction)

**Capabilities:**
- Full memory entry lifecycle (remember, recall, search, forget)
- processEvent() with Qwen3 extraction via Groq
- pgvector HNSW index for vector search
- Keyword search via full-text search (tsvector)
- buildMemoryContext() with in-memory LRU cache
- forgetActor() with NDPR compliance
- Confidence decay and expiry cron job

**Limitations:**
- No graph memory (no relationship links between actors)
- No entity linking beyond subject/topic fields
- Extraction model is general-purpose (not fine-tuned for Nigerian edu context)
- BM25 implemented via PostgreSQL ts_rank_cd (not a true BM25 implementation)

---

### Phase 2 — Enriched Retrieval (+ pg_trgm, entity linking, BM25 improvement)

**New capabilities:**
- `pg_trgm` trigram index on `content` for fuzzy string matching (catches misspellings, e.g., "calculas" → "calculus")
- True BM25 ranking via `ts_rank_cd` tuning + IDF normalization
- Entity linking: named topics linked to the canonical curriculum topic graph (from Knowledge Service topic hierarchy) — enables "student struggles with quadratic equations" to retrieve when searching for "completing the square" (a sub-topic)
- Memory federation across terms: `formerMemory` flag for memories from previous sessions, lower weight but preserved

**Implementation trigger:** When Phase 1 memory search accuracy tests (Section 15) show < 80% recall@5 for topic-specific queries.

---

### Phase 3 — Fine-Tuned Extraction Model

**Motivation:** Qwen3 (general-purpose) makes extraction errors on Nigerian-specific educational context:
- Confuses WAEC/NECO term names with general concepts
- Misclassifies HOTS questions vs standard recall questions
- Under-extracts from Nigerian English writing patterns in teacher corrections

**Action:**
- Collect 5,000 (event → extracted facts) training pairs from production data (manually reviewed, anonymised)
- Fine-tune a small extraction model (1.3B–3B parameters) on this dataset
- Deploy as a self-hosted model on Ollama-compatible infrastructure
- Swap model in ExtractionModule — service interface unchanged

**Trigger:** Phase 2 is stable, extraction accuracy sampled at < 85% correct facts per event.

---

### Phase 4 — Memory Graph for Relationship Memory

**Motivation:** Some memory patterns span actors:
- "Students taught by Teacher X consistently struggle with organic chemistry" (teacher effectiveness memory)
- "SS2A students collectively weak in Statistics this term" (class-level pattern memory)
- "Schools in Lagos that use the 5-step format have better results in English" (anonymised cross-school pattern)

**Action:**
- Add a `MemoryRelation` table: `(subjectActorId, predicateType, objectActorId, weight, schoolId)`
- Build a light graph traversal layer on top of Prisma queries
- Expose `getRelatedMemories(actorId, relationType, schoolId)` on the service interface
- Do not introduce Neo4j — PostgreSQL recursive CTEs are sufficient for Phase 4 graph depth

**Trigger:** 3+ schools on platform, principal asking for class-level and school-level AI insights.

---

## Phase 1 Implementation Checklist

### Week 1 — Schema and Basic Write/Read

- [ ] Enable pgvector extension in Supabase SQL Editor (`CREATE EXTENSION IF NOT EXISTS vector`)
- [ ] Add `MemoryEntry`, `MemoryEvent`, `MemoryConflict`, `ConversationSession`, `MemoryAuditLog`, `AnonymisedMemoryAggregate` models to `packages/database/prisma/schema.prisma`
- [ ] Run schema migration in Supabase SQL Editor (not `prisma db push` — see I3 domain constraint)
- [ ] Apply HNSW vector index, GIN full-text index, partial active-entry index in Supabase SQL Editor
- [ ] Add generated `content_tsv` column to `memory_entries`
- [ ] Implement `MemoryServiceQueryGuard` (schoolId + actorId validation)
- [ ] Implement `remember()`: PII filter → content validation → embedding → DB insert
- [ ] Implement `recall()`: direct category/subject filter query with confidence ordering
- [ ] Implement `forgetMemory()`: ownership check → audit log → delete
- [ ] Write unit tests for `remember()`, `recall()`, `forgetMemory()`
- [ ] Write privacy test: cross-school isolation for `recall()`

### Week 2 — Extraction Pipeline and processEvent()

- [ ] Implement `ExtractionModule.buildExtractionPrompt()` for `quiz_submitted` events
- [ ] Implement `ExtractionModule.buildExtractionPrompt()` for `lesson_corrected` events
- [ ] Implement `ExtractionModule.parseExtractionResponse()` with JSON validation and fact filtering
- [ ] Integrate Qwen3 via Groq in extraction call (route through existing AI Router)
- [ ] Implement `ExtractionModule.deduplicateAgainstExisting()` using cosine similarity threshold
- [ ] Implement `processEvent()`: event routing → extraction → dedup → `remember()` calls
- [ ] Implement failure path: write to `MemoryEvent` with `extractionStatus: "pending"` on LLM failure
- [ ] Write integration test: quiz_submitted → search round-trip
- [ ] Write unit tests: extraction prompt structure, response parsing, deduplication logic

### Week 3 — Hybrid Search and buildMemoryContext()

- [ ] Implement `RetrievalModule.vectorSearch()` (Leg A SQL)
- [ ] Implement `RetrievalModule.keywordSearch()` (Leg B SQL using `content_tsv`)
- [ ] Implement `applyEntityBoost()` (subject/topic exact match boost)
- [ ] Implement `mergeScores()` with weighted sum (0.55 vector, 0.30 keyword, 0.15 entity)
- [ ] Implement `search()` combining all three legs
- [ ] Implement `buildMemoryContext()`: search → rank → format context string → token truncation
- [ ] Implement in-memory LRU cache for `buildMemoryContext()` (5-minute TTL, 1000 entry max)
- [ ] Implement cache invalidation in `remember()` and `updateMemory()`
- [ ] Write integration test: lesson_corrected event → buildMemoryContext returns preference
- [ ] Write accuracy test: student with 3-month quiz history, verify correct weak/strong topic surfacing

### Week 4 — Ranking, Conflict Resolution, Teacher/Student Convenience Methods

- [ ] Implement `RankingModule`: `recencyDecay()`, `sourceWeight()`, `detectConflicts()`, `resolveConflict()`
- [ ] Wire conflict detection into `remember()` — check for conflicts before insert
- [ ] Implement `updateMemory()`: ownership check → previous version demotion → new version insert → conflict record
- [ ] Implement `getStudentWeakTopics()` and `getStudentStrongTopics()`
- [ ] Implement `getTeacherPreferences()` — structured recall of all teacher-category memories
- [ ] Implement `recordStudentMistake()` — create or increment existing mistake pattern
- [ ] Wire `buildMemoryContext()` into lesson note generation workflow
- [ ] Wire `processEvent()` call into CBT quiz submission handler
- [ ] Wire `getStudentWeakTopics()` into AI tutor session start
- [ ] Write unit tests: conflict detection, resolution algorithm, demotion (loser not deleted)

### Week 5 — Forgetting, Privacy, forgetActor()

- [ ] Implement `ForgettingModule.decayedConfidence()` function
- [ ] Implement `ForgettingModule.runExpiryJob()`: hard expiry deletion + confidence decay deletion
- [ ] Set up daily cron job for `runExpiryJob()` at 02:00 WAT (Vercel Cron or external scheduler)
- [ ] Implement `forgetActor()` with full transactional deletion, audit log, anonymised aggregate retention
- [ ] Implement `anonymiseForAggregation()` — strip actorId, retain topic/subject pattern
- [ ] Wire `forgetActor()` call into account deletion flow
- [ ] Implement rate limiting on `processEvent()` (in-memory LRU counter for Phase 1)
- [ ] Write privacy test: `forgetActor()` completeness — all entries, events, conflicts deleted
- [ ] Write NDPR test: `MemoryAuditLog` row persists after `forgetActor()`
- [ ] Write test: anonymised aggregate retained after `forgetActor()`

### Week 6 — Monitoring, Failure Paths, and Retry Job

- [ ] Add structured logging with `service: "memory-service"` tag to all public methods
- [ ] Emit latency metrics: `memory.write.latency_ms`, `memory.extraction.latency_ms`, `memory.search.latency_ms`, `memory.context.latency_ms`
- [ ] Emit health metrics: `memory.extraction.success_rate`, `memory.degraded_mode.count`
- [ ] Implement `processEvent()` failure fallback: pgvector timeout → keyword-only mode with `degraded: true` flag
- [ ] Implement background retry job for `MemoryEvent` rows with `extractionStatus: "pending"` (poll every 15 minutes in Phase 1 — move to queue in Phase 2)
- [ ] Implement embedding backfill job for `memory_entries` where `embedding IS NULL`
- [ ] Configure alert rules (extraction failure rate > 5%, forgetActor failure > 0)
- [ ] End-to-end smoke test: full quiz submission → memory creation → lesson generation using memory → lesson correction → updated preference in next generation
- [ ] Review and sign off on NDPR compliance checklist with all privacy tests passing
- [ ] Update `docs/service-interfaces/memory-service.md` to mark Phase 1 as "Implementation Complete"

---

*Document version 1.0 — 2026-07-04. Next review at Phase 2 kickoff or when monthly active memories exceed 200,000 entries.*
