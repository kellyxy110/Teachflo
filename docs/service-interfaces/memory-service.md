# TeachNexis Memory Service — Interface Design

**Service Name:** `TeachNexisMemoryService`  
**Capability Gap It Closes:** Teacher and student long-term memory, personalisation, weakness tracking, preference retention  
**Backed By (Phase 1):** Prisma DB + pgvector (semantic search on memory entries). Mem0 studied as reference architecture.  
**Owned By:** TeachNexis  
**Document:** 2026-07-04  

---

## Purpose

TeachNexis AI features become dramatically more useful when they remember context across sessions:

- A student's AI tutor recalls that she struggles with quadratic equations and skips review of what she already knows
- A lesson generator remembers that a teacher prefers 5-step lesson structures and dislikes overly theoretical examples
- A report card generator recalls what was noted about a student in the previous term
- A parent communication assistant remembers that this parent prefers brief, formal updates in Yoruba

Without memory, every interaction starts cold. With memory, TeachNexis becomes a platform that improves with use — which is a genuine moat.

The Memory Service owns all persistent memory for teachers, students, parents, and schools. It is separate from the Knowledge Service (which stores indexed educational content) — Memory Service stores behavioural and preference context about people.

---

## Memory Categories

```typescript
export type MemoryCategory =
  // Student memory
  | "student-weak-topic"          // Topic the student consistently struggles with
  | "student-strong-topic"        // Topic the student demonstrates mastery
  | "student-mistake-pattern"     // Recurring error type (e.g., "confuses sine/cosine signs")
  | "student-learning-style"      // Observed preference (visual, worked examples, etc.)
  | "student-revision-history"    // Topics covered in recent revision sessions
  | "student-exam-performance"    // Scores and grade trends per subject
  
  // Teacher memory
  | "teacher-lesson-preference"   // Format, style, depth preferences for lesson notes
  | "teacher-subject-focus"       // Subjects they teach most, favourite topics
  | "teacher-ai-feedback"         // Explicit corrections to AI output ("don't use this format")
  | "teacher-exam-style"          // Preferred question difficulty, topic distribution
  
  // Parent memory
  | "parent-communication-pref"   // Preferred language, tone, channel, frequency
  | "parent-concern-history"      // Topics raised in previous communications
  
  // School memory
  | "school-curriculum-progress"  // What topics have been covered this term
  | "school-ai-config";           // School-level AI behaviour preferences
```

---

## TypeScript Interface

```typescript
// ── Memory entry ──────────────────────────────────────────────────────────────

export interface MemoryEntry {
  id: string;
  schoolId: string;
  actorId: string;           // teacher.id / student.id / parent.id / school.id
  actorType: "teacher" | "student" | "parent" | "school";
  category: MemoryCategory;
  subject?: string;          // Optional subject scoping
  content: string;           // Human-readable memory statement
  embedding?: number[];      // For semantic search (stored in pgvector)
  confidence: number;        // 0.0–1.0 — how certain we are this memory is accurate
  source: MemorySource;      // How this memory was created
  confirmedByUser: boolean;  // Was this explicitly confirmed by the teacher/student?
  expiresAt?: Date;          // Some memories should expire (e.g., revision history)
  createdAt: Date;
  updatedAt: Date;
}

export type MemorySource =
  | "explicit"          // User directly stated this ("I prefer 5-step lessons")
  | "ai-observed"       // AI inferred from behaviour patterns
  | "system-computed";  // Computed from data (e.g., average score below 50% → weak topic)

// ── Memory update event ───────────────────────────────────────────────────────

export interface MemoryEvent {
  actorId: string;
  actorType: "teacher" | "student" | "parent" | "school";
  schoolId: string;
  eventType: string;         // e.g., "lesson_generated", "quiz_submitted", "correction_made"
  eventData: Record<string, unknown>;
  timestamp: Date;
}

// ── Main service interface ────────────────────────────────────────────────────

export interface TeachNexisMemoryService {
  // ── Write ──────────────────────────────────────────────────────────────────

  /** Record a new memory entry. */
  remember(entry: {
    actorId: string;
    actorType: MemoryEntry["actorType"];
    schoolId: string;
    category: MemoryCategory;
    content: string;
    subject?: string;
    confidence?: number;
    source?: MemorySource;
    expiresAt?: Date;
  }): Promise<MemoryEntry>;

  /** Process an event and extract/update relevant memories. */
  processEvent(event: MemoryEvent): Promise<MemoryEntry[]>;

  /** Explicitly update or correct a memory (user-confirmed). */
  updateMemory(memoryId: string, updates: {
    content?: string;
    confidence?: number;
    confirmedByUser?: boolean;
  }, schoolId: string): Promise<MemoryEntry>;

  /** Delete a specific memory entry. */
  forgetMemory(memoryId: string, schoolId: string): Promise<void>;

  /** Delete all memories for an actor (right to erasure). */
  forgetActor(actorId: string, schoolId: string): Promise<{ deletedCount: number }>;

  // ── Read ───────────────────────────────────────────────────────────────────

  /** Get all memories for an actor, optionally filtered. */
  recall(params: {
    actorId: string;
    schoolId: string;
    categories?: MemoryCategory[];
    subject?: string;
    limit?: number;
    minConfidence?: number;
  }): Promise<MemoryEntry[]>;

  /** Semantic search over an actor's memories. */
  search(params: {
    actorId: string;
    schoolId: string;
    query: string;            // Natural language query
    categories?: MemoryCategory[];
    limit?: number;
  }): Promise<MemoryEntry[]>;

  /** Build a concise memory context string for LLM prompt injection. */
  buildMemoryContext(params: {
    actorId: string;
    actorType: MemoryEntry["actorType"];
    schoolId: string;
    taskContext: string;      // e.g., "generating a lesson on quadratic equations for this teacher"
    maxTokens?: number;       // Default: 500
  }): Promise<{
    context: string;          // Formatted for prompt injection
    memories: MemoryEntry[];  // Source memories
  }>;

  // ── Convenience methods ────────────────────────────────────────────────────

  /** Get a student's weak topics for a subject. */
  getStudentWeakTopics(studentId: string, subject: string, schoolId: string): Promise<string[]>;

  /** Get a student's strong topics for a subject. */
  getStudentStrongTopics(studentId: string, subject: string, schoolId: string): Promise<string[]>;

  /** Get a teacher's AI preferences. */
  getTeacherPreferences(teacherId: string, schoolId: string): Promise<{
    lessonFormat?: string;
    preferredDepth?: "brief" | "standard" | "detailed";
    avoidPatterns?: string[];
    preferredExamples?: string;
  }>;

  /** Record that a student made a mistake on a specific topic. */
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

## Memory Extraction from Events

When a student submits a CBT quiz, the Memory Service's `processEvent()` fires:

```typescript
// Example: processEvent called after quiz submission
await memoryService.processEvent({
  actorId: student.id,
  actorType: "student",
  schoolId: student.schoolId,
  eventType: "quiz_submitted",
  eventData: {
    subject: "Mathematics",
    topic: "Quadratic Equations",
    score: 45,
    totalQuestions: 20,
    wrongAnswers: [
      { question: "...", correctAnswer: "C", studentAnswer: "A" },
      // ...
    ],
  },
  timestamp: new Date(),
});

// Memory Service computes and stores:
// - "student-weak-topic": "Quadratic Equations (score: 45%, 3 attempts below 50%)"
// - "student-mistake-pattern": "Consistently selects wrong sign when applying quadratic formula"
```

---

## Database Schema (Prisma)

```prisma
model MemoryEntry {
  id               String    @id @default(cuid())
  schoolId         String
  actorId          String
  actorType        String    // "teacher" | "student" | "parent" | "school"
  category         String
  subject          String?
  content          String
  embedding        Unsupported("vector(1536)")?  // pgvector for semantic search
  confidence       Float     @default(0.8)
  source           String    @default("ai-observed")
  confirmedByUser  Boolean   @default(false)
  expiresAt        DateTime?
  createdAt        DateTime  @default(now())
  updatedAt        DateTime  @updatedAt

  school           School    @relation(fields: [schoolId], references: [id])

  @@index([schoolId, actorId, actorType])
  @@index([schoolId, actorId, category])
}
```

---

## Prompt Injection Pattern

```typescript
// How AI features use the Memory Service
async function generateLessonNote(input: LessonNoteInput) {
  const [knowledgeContext, memoryContext] = await Promise.all([
    knowledgeService.buildContext({ query: `${input.topic} ${input.subject}`, schoolId: input.schoolId }),
    memoryService.buildMemoryContext({
      actorId: input.teacherId,
      actorType: "teacher",
      schoolId: input.schoolId,
      taskContext: `generating lesson note on ${input.topic} for ${input.classLevel}`,
    }),
  ]);

  const prompt = `
${LESSON_NOTE_SYSTEM_PROMPT}

## What I know about this teacher:
${memoryContext.context}

## Relevant curriculum knowledge:
${knowledgeContext.context}

## Task:
Generate a lesson note on "${input.topic}" for ${input.classLevel} ${input.subject}.
  `.trim();
  
  // ... rest of generation
}
```

---

## Privacy Design

- **School isolation:** `schoolId` is enforced on every query. Cross-school memory access returns 403.
- **Right to erasure:** `forgetActor()` permanently deletes all memories for a user. Required before account deletion.
- **Confidence decay:** AI-observed memories (not user-confirmed) have confidence decay over time. Stale low-confidence memories are auto-purged.
- **No PII in memory content:** Memory entries store behaviour patterns, not personal details. "Struggles with calculus" not "Chidi's exam score was 32%."
- **Audit log:** All `remember()` and `forgetActor()` calls are logged with timestamp and source.
- **Expiry for sensitive patterns:** `student-mistake-pattern` memories expire after 6 months by default — students improve, stale mistakes should not persist forever.

---

## Mem0 Relationship

Mem0 (reference repo) influenced the design of:
- The event-based memory extraction pattern (`processEvent()`)
- The semantic search over memories (`search()`)
- The memory update/conflict resolution approach (`updateMemory()` with confidence scoring)
- The `buildMemoryContext()` prompt injection helper

TeachNexis does NOT use Mem0 directly. The Memory Service is a native Prisma + pgvector implementation. Mem0's architectural patterns are the reference, not the code.

---

## Phase 1 Implementation Plan

| Week | Task |
|---|---|
| 1 | Add `MemoryEntry` Prisma model. Implement `remember()`, `recall()`, `forgetActor()`. |
| 2 | Implement `buildMemoryContext()`. Wire into lesson note generation. |
| 2 | Implement `processEvent()` for quiz submission events. |
| 3 | Implement `search()` with pgvector semantic search. |
| 3 | Implement `getStudentWeakTopics()` and wire into CBT generation. |
| 4 | Implement `getTeacherPreferences()`. Wire into all AI generation flows. |
| 4 | Implement privacy controls: `forgetActor()` called on account deletion. |
