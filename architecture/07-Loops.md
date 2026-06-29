# TeachNexis — Loops

This document defines how modules interact in the orchestration layer. It is the blueprint for the TeachNexis Orchestrator — written before the orchestrator exists so that when it arrives, it connects well-defined contracts rather than reverse-engineering implicit dependencies.

---

## Primary Loops

### Loop 1 — Topic Knowledge Package Generation

Triggered when a teacher requests full content for a topic.

```
Teacher requests topic content
        ↓
Curriculum Intelligence
  → Retrieve topic metadata (learning objectives, Bloom's, WAEC alignment)
  → Confirm topic exists in curriculum hierarchy
        ↓
AI Infrastructure
  → Select model (Kimi K2.6 for long-form)
  → Inject curriculum context into prompt
  → Generate in sections to prevent truncation
  → Merge sections
  → Quality validation (completeness, format, curriculum alignment)
        ↓
Content Assembly
  → Lecture Notes (Teacher Version)
  → Lecture Notes (Student Version)
  → Summary
  → Flashcards (routed to Qwen)
  → Quiz questions (routed to DeepSeek for STEM, Qwen for Humanities)
  → Assignment
  → Worksheet
  → Infographic key points
        ↓
Storage
  → Persist all package components with schoolId, teacherId, topic metadata
  → Cache by subject + class + term + topic
        ↓
Teacher Dashboard
  → Notify teacher content is ready
  → Present preview with approve / edit / regenerate options
        ↓
Assessment Intelligence (optional, if teacher enables)
  → Auto-generate quiz from lecture notes
  → Auto-generate flashcard deck
```

**Retry Rules:** If AI model is unavailable, retry up to 3 times with 2-second backoff. After 3 failures, fall back to next model in chain. Surface error to teacher if all fallbacks fail.

**Caching:** Cache hit skips AI generation entirely and serves stored content. Cache invalidated if teacher explicitly regenerates.

---

### Loop 2 — Assessment Generation

Triggered when a teacher creates an exam or requests a question bank for a topic.

```
Teacher selects subject, class, term, topic, exam type, difficulty, question count
        ↓
Curriculum Intelligence
  → Retrieve topic objectives and Bloom's mapping
  → Identify appropriate question types per objective
        ↓
AI Infrastructure
  → Route to DeepSeek (STEM) or Qwen (Humanities)
  → Generate questions with correct answers, solutions, explanations
  → Validate: question count, format compliance, answer accuracy
        ↓
Assessment Intelligence
  → Apply difficulty distribution (Easy / Medium / Hard)
  → Apply Bloom's Taxonomy distribution
  → Check for duplication against existing question bank
        ↓
Storage
  → Persist questions to question bank with examId, schoolId
  → Update exam totalQuestions count
        ↓
Teacher Dashboard
  → Preview question bank
  → Allow edit, delete, regenerate per question
  → Export options: Excel, CSV, JSON, Moodle XML, QTI
```

---

### Loop 3 — Attendance & Absenteeism Detection

Triggered when a teacher saves an attendance session.

```
Teacher marks attendance for class and date
        ↓
Validation
  → Date format, class ownership, student IDs, status values
        ↓
Storage
  → Upsert attendance records (one per student)
        ↓
Analytics
  → Calculate absenteeism rate per student for the current month
  → Flag students absent > 20% of recorded school days
  → Update chronic absenteeism status
        ↓
Teacher Dashboard
  → Display at-risk alerts for flagged students
  → Monthly summary with breakdown bars
```

---

### Loop 4 — Report Card Generation

Triggered at term end when a teacher requests report cards for a class.

```
Teacher selects class, term, session
        ↓
Assessment Intelligence
  → Load all Score records for class + term + session
  → Calculate total score and average per student
  → Rank students ordinally by total score
        ↓
Report Assembly
  → Per-student: subject scores (CA1 + CA2 + Exam = Total), grade, remark
  → Position: "3rd of 42"
  → Class average and highest/lowest total
        ↓
Export
  → Per-student Excel export
  → Bulk class export (all students in one workbook)
```

---

### Loop 5 — Developer Studio Session (Future)

Triggered when a student opens a coding assignment.

```
Assignment loads in Developer Studio
        ↓
Monaco IDE initialises with starter code
        ↓
Student writes code
        ↓
AI Coding Mentor (Ornith)
  → Passive: reads code, detects patterns, prepares suggestions
  → Active (on request): explains error, suggests fix, reviews logic
        ↓
Teacher monitoring
  → Live session view (teacher sees all students' code in real time)
  → Replay mode: review session history after submission
        ↓
Submission
  → Code stored with studentId, assignmentId, timestamp
  → Auto-assessment runs (test cases pass/fail)
  → Teacher notified of submission
```

---

## Event Contracts

These events are produced and consumed across module boundaries. The orchestrator routes events; modules do not call each other directly.

| Event | Producer | Consumers |
|---|---|---|
| `topic.content.generated` | Curriculum Intelligence | Teacher Dashboard, Assessment Intelligence |
| `topic.content.updated` | Curriculum Intelligence | Cache Invalidation, Teacher Dashboard |
| `attendance.saved` | Classroom Management | Analytics, Absenteeism Detector |
| `student.flagged.absent` | Analytics | Teacher Dashboard, (future) Parent Notification |
| `exam.questions.generated` | Assessment Intelligence | Teacher Dashboard, Question Bank |
| `exam.submitted` | Assessment Intelligence | Analytics, Report Card Engine |
| `scores.updated` | Assessment Intelligence | Report Card Engine, Analytics |
| `health.record.updated` | Classroom Management | (future) School Administration |

---

## Fallback Rules

All AI-dependent loops follow the same fallback pattern:

```
Primary model → Fallback model → Secondary fallback → Queue (3 retries) → Surface to teacher
```

All loops are idempotent where possible — retrying a loop produces the same result without creating duplicates.

---

## Orchestrator Readiness Checklist

Before the full TeachNexis Orchestrator is introduced, every module must satisfy:

- [ ] Explicit contract declared in `Contract.md`
- [ ] Inputs and outputs typed and validated
- [ ] Events produced and consumed declared
- [ ] Failure behaviour defined (what happens if the module fails)
- [ ] Idempotency guaranteed for retry scenarios
- [ ] Cache strategy defined
- [ ] No direct coupling to other module implementations (contract-only communication)
