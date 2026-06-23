# TeachFlow OS — Documentation

Complete feature documentation for the TeachFlow OS platform.

---

## Table of Contents

1. [Overview](#overview)
2. [Getting Started](#getting-started)
3. [Dashboard](#dashboard)
4. [AI Lesson Generator](#ai-lesson-generator)
5. [Exam Builder](#exam-builder)
6. [Study Buddy](#study-buddy)
7. [Knowledge Studio](#knowledge-studio)
8. [Intelligence Core](#intelligence-core)
9. [Scientific Calculator](#scientific-calculator)
10. [Practice Arena](#practice-arena)
11. [School Management](#school-management)
12. [Analytics](#analytics)
13. [AI Model Routing](#ai-model-routing)
14. [Authentication & Roles](#authentication--roles)
15. [Database Schema](#database-schema)
16. [API Reference](#api-reference)
17. [Deployment](#deployment)

---

## Overview

TeachFlow OS is an AI-powered educational platform built for Nigerian secondary schools (JSS1–SS3). It combines AI content generation, adaptive assessment, student analytics, and interactive learning tools into a single platform aligned with WAEC, JAMB, and JUPEB curriculum standards.

The platform serves three user groups:
- **Teachers** create lessons, exams, and homework. They track student performance and use AI tools to generate curriculum content.
- **Students** use Study Buddy for personalized tutoring, take adaptive exams, play practice games, and track their skill development.
- **School Administrators** monitor school-wide performance, identify at-risk students, and generate term-long curriculum plans.

---

## Getting Started

### First-Time Setup (Onboarding)

1. Visit [teachflow-os.vercel.app](https://teachflow-os.vercel.app)
2. Click **Get Started** and create an account
3. Complete the onboarding form:
   - School name
   - State (all 36 states + FCT)
   - Local Government Area (LGA)
4. You'll be redirected to your dashboard

### Navigation

The sidebar provides access to all features:

| Section | Description |
|---------|-------------|
| Dashboard | Overview with stats and recent activity |
| Classes | Create and manage school classes |
| Students | Student registry and enrollment |
| Lessons | AI-generated lesson plans |
| Exams | Standard and adaptive exam builder |
| Homework | Assignment creation and tracking |
| Scores | Score entry with auto-grading |
| Analytics | School-wide performance data |
| Study Buddy | AI tutoring cockpit |
| Knowledge Studio | Document AI workspace |
| Intelligence | Mistake patterns and learning paths |
| Library | Document and resource management |
| Settings | Profile and school configuration |

---

## Dashboard

The dashboard is your command centre. It shows:

- **Welcome greeting** — time-based (Good morning/afternoon/evening) with your name and school
- **Stat cards** — four key metrics at a glance:
  - Total Classes
  - Total Students
  - Lessons Generated
  - Pending Homework
- **Recent Lessons** — your 5 most recently created lesson plans
- **Performance Snapshot** — school average and count of at-risk students (those scoring below 50 in any subject)
- **Recent Exams** — your 3 latest exams with question counts and type badges

---

## AI Lesson Generator

### How to Generate a Lesson

1. Go to **Lessons** > **New Lesson**
2. Fill in:
   - **Subject** — Mathematics, Biology, Chemistry, Physics, English, etc.
   - **Class Level** — JSS1 through SS3
   - **Topic** — the specific topic (e.g., "Quadratic Equations")
   - **Week** (optional) — week number in the term
   - **Term** (optional) — First, Second, or Third term
3. Click **Generate**
4. The AI produces a complete lesson plan in under 10 seconds

### Lesson Plan Structure

Every generated lesson includes:

| Section | Content |
|---------|---------|
| **Objectives** | 3–5 specific learning outcomes |
| **Introduction** | Hook, motivation, and prior knowledge review |
| **Content** | Structured topic content with examples |
| **Activities** | 2–4 classroom activities (individual, pair, and group work) |
| **Evaluation** | Assessment questions to check understanding |
| **Homework** | Take-home assignment suggestions |

### Exam Mode Rewrites

After generating a lesson, you can rewrite it for different exam standards:

| Mode | Focus |
|------|-------|
| **WAEC** | West African Examinations Council — theory-heavy, structured answers |
| **JAMB** | Joint Admissions and Matriculation Board — MCQ-focused, speed-oriented |
| **JUPEB** | Joint Universities Preliminary Examinations Board — university-prep depth |
| **ELI12** | Simplified language for lower levels |

The rewrite preserves the topic but adjusts depth, language, question style, and assessment format to match the target exam board.

---

## Exam Builder

### Standard Exam (v1)

1. Go to **Exams** > **New Exam**
2. Configure:
   - Subject, class level, topic
   - Exam type: School Test, WAEC Mock, JAMB Prep, or JUPEB Prep
   - Difficulty: Easy, Medium, Hard
3. The AI generates a full exam with:
   - **MCQ section** — 5 options (A–E) per question with the correct answer, explanation, and common mistakes
   - **Theory section** — structured questions with mark schemes
   - **Distractor analysis** — explains why each wrong option is plausible
   - **Exam tips** — advice for students on each question
   - **Curriculum references** — links each question to specific curriculum objectives

### Adaptive Exam (v2)

The v2 engine adapts in real-time to student performance:

| Mode | Purpose | How it works |
|------|---------|-------------|
| **Standard** | Balanced assessment | Even coverage across topic areas |
| **Diagnostic** | Find knowledge gaps | Starts broad, drills into weak areas |
| **Practice** | Low-stakes review | Focuses on previously missed topics |
| **Assessment** | Formal evaluation | Fixed difficulty, comprehensive coverage |

**Adaptive features:**
- Difficulty adjusts based on accuracy during the exam
- Misconceptions are detected from wrong answer patterns
- Questions are tagged with Bloom's Taxonomy level
- Per-question timing is tracked
- Results show detailed analytics with skill-level breakdown

### Question Types

| Type | Description |
|------|-------------|
| **MCQ** | Multiple choice with 5 options |
| **Short Answer** | Brief written response |
| **Essay** | Extended written response |
| **Structured** | Multi-part question with sub-questions |
| **Calculation** | Numeric answer with working shown |

### Bloom's Taxonomy Tagging

Every question is tagged with a cognitive level:

| Level | Description | Example |
|-------|-------------|---------|
| **Remember** | Recall facts | "What is the formula for..." |
| **Understand** | Explain concepts | "Describe the process of..." |
| **Apply** | Use knowledge | "Calculate the..." |
| **Analyze** | Break down relationships | "Compare and contrast..." |
| **Evaluate** | Judge and justify | "Assess the validity of..." |
| **Create** | Produce new work | "Design an experiment to..." |

---

## Study Buddy

### What It Is

Study Buddy is an AI tutoring cockpit, not a simple chatbot. It connects to the student's skill data, mistake history, and school documents to provide personalized learning support.

### The 5 Learning Modes

**Explain** — The AI teaches the topic clearly using analogies, examples, and visual descriptions. Best for learning new material.

**Test Me** — Generates 3–5 practice questions targeting the student's weak areas. Questions adapt based on the student's skill map. Best for exam preparation.

**Hint** — Uses the Socratic method. The AI asks guiding questions to lead the student toward the answer without giving it directly. Best for developing problem-solving skills.

**Step-by-Step** — Provides detailed worked solutions with numbered steps and reasoning for each step. Best for mathematics, physics, and chemistry problems.

**Review Mistakes** — Analyzes the student's recent errors, identifies misconceptions, and suggests specific revision topics. Best for targeted improvement.

### How It Works

1. Teacher selects a student from the sidebar
2. The system loads that student's context:
   - Skill map (per-topic mastery percentages)
   - Weak areas (skills below 50%)
   - Recent mistakes with misconception tags
   - Recommended topics
3. Teacher (or student) selects a learning mode
4. Every message to the AI includes the student's context
5. The AI adapts its response based on the mode and the student's data
6. Session stats track topics covered, questions answered, and accuracy

### Context Panel

The right sidebar shows real-time student data:
- **Weak Areas** — skills below 50% shown as progress bars
- **Skill Graph** — all tracked skills with color-coded mastery
- **Recent Mistakes** — last 5 incorrect answers with misconception labels
- **Recommended Topics** — auto-derived from weakest skills
- **Session Stats** — topics, questions, and accuracy for the current session

---

## Knowledge Studio

### Uploading Documents

1. Go to **Knowledge Studio**
2. Click **Upload** and select a PDF
3. Fill in metadata: title, subject, class level
4. The system automatically:
   - Extracts text from the PDF
   - Splits it into semantic chunks
   - Generates vector embeddings for each chunk
   - Stores everything for retrieval

### Generation Types

After upload, you can generate:

| Type | What you get |
|------|-------------|
| **Summary** | Key points, definitions, formulas, and overview |
| **Concepts** | Extracted concepts with definitions, difficulty levels, and relationships |
| **Flashcards** | 10–15 question-and-answer cards for review |
| **Exam Questions** | MCQs and theory questions sourced from the document |

### Document Chat

Ask questions about any uploaded document. The system uses RAG (Retrieval-Augmented Generation) to find relevant passages from the document and feed them to the AI, so answers are grounded in the actual content.

### How RAG Works

1. Your question is converted to a vector embedding
2. The system searches for the most similar document chunks using pgvector
3. The top 5 matching chunks are included in the AI prompt
4. The AI generates an answer grounded in the retrieved content
5. Source chunks are cited so you can verify the information

---

## Intelligence Core

### Mistake Intelligence

Tracks error patterns across all students:

- **Error Type Detection** — classifies mistakes (computation error, misconception, careless error, etc.)
- **Root Cause Analysis** — identifies whether the mistake stems from a prerequisite gap or a fundamental misconception
- **Pattern Tracking** — counts occurrences and tracks when patterns first and last appeared
- **Resolution Status** — marks patterns as resolved when the student demonstrates mastery

### Adaptive Learning Paths

Generates personalized learning progressions:

- Created per student, per subject
- Each path contains ordered steps with target skills
- Progress is tracked (current step, completion status)
- Paths adjust based on ongoing performance data
- Feeds weak skills back to Study Buddy for targeted sessions

### Curriculum Generator

Creates term-long teaching plans:

- 12–15 week schedules per subject per class
- Includes assessment dates and revision cycles
- Considers past performance data when sequencing topics
- Used by the Adaptive Exam v2 engine for student-aware blueprints

---

## Scientific Calculator

Accessible from the landing page navigation bar — no login required.

### Standard Tab

Full scientific calculator with:
- Basic arithmetic with operator precedence
- Trigonometric functions: sin, cos, tan (with DEG/RAD/GRAD modes)
- Inverse trig: sin⁻¹, cos⁻¹, tan⁻¹
- Hyperbolic: sinh, cosh, tanh and their inverses
- Logarithms: log (base 10), ln (natural), log₂
- Constants: pi, phi (golden ratio), e (Euler's number)
- Powers: x², x³, xⁿ, 10^x, 2^x, e^x
- Roots: square root, cube root
- Combinatorics: n!, nPr, nCr
- Memory: M+, M-, MR, MC
- Expression history with clickable replay

### Equations Tab

Solve polynomial equations and linear systems:
- **Quadratic** — ax² + bx + c = 0 (shows discriminant, handles complex roots)
- **Cubic** — ax³ + bx² + cx + d = 0
- **Quartic** — degree-4 polynomials
- **Quintic** — degree-5 polynomials
- **2x2 System** — two equations, two unknowns
- **3x3 System** — three equations, three unknowns (Gaussian elimination)

### Statistics Tab

Enter comma, space, or newline-separated numbers to calculate:
- Count (n), Sum, Sum of squares
- Mean, Median, Mode
- Range, Min, Max
- Quartiles (Q1, Q3), Interquartile Range (IQR)
- Population variance and standard deviation
- Sample variance and standard deviation

### Vectors Tab

2D or 3D vector operations:
- Addition (A + B) and Subtraction (A - B)
- Dot product (A . B)
- Cross product (A x B) — full 3D vector or 2D scalar
- Magnitude (|A|, |B|)
- Unit vectors
- Angle between vectors
- Projection of A onto B

### Graph Tab

Plot mathematical functions:
- Enter any f(x) expression and click Plot
- Support for up to 4 simultaneous functions (color-coded)
- Adjustable bounds (xMin, xMax, yMin, yMax)
- Grid lines with axis labels
- Quick-access presets: sin(x), cos(x), tan(x), x², x³, ln(x), 1/x, exp(x), etc.

---

## Practice Arena

Four interactive games available on the landing page — no login required. Located under the **Explore** tab in the Learning Modes section.

### Math Sprint

A 30-second timed arithmetic challenge:
- Random questions using +, -, x, and /
- Four multiple-choice answers per question
- +10 points per correct answer
- Real-time feedback (green flash for correct, red for wrong)
- Final score shown with play-again option

### Concept Match

Match scientific terms to their definitions:
- 4 pairs shown at a time
- Covers: Osmosis, Photosynthesis, Mitosis, Covalent Bond, Newton's 1st Law, Electrolysis
- Select a term, then select its matching definition
- Matched pairs turn green
- Wrong matches flash red

### Fix the Answer

Spot the error in a worked solution:
- A multi-step problem is shown with one intentional mistake
- Click the step you think is wrong
- The correct answer is highlighted with a detailed explanation
- Covers math (algebra), physics (speed), and geometry (area)

### Quiz Battle

MCQ challenge against an AI opponent:
- Multiple-choice questions from Biology, Chemistry, and Physics
- You answer first, then the AI answers after 1.2 seconds
- The AI answers correctly ~80% of the time
- Score tracked: You vs. AI
- Detailed explanation shown after each question

---

## School Management

### Classes

- Create classes with name, level (JSS1–SS3), arm (A, B, C...), term, and session
- View class details with enrolled students
- Filter and search classes

### Students

- Add students with first name, last name, registration number, and gender
- Assign students to classes
- Activate/deactivate student records
- Search and filter student lists

### Scores

Enter academic scores with automatic grading:

| Component | Description |
|-----------|-------------|
| **CA1** | Continuous Assessment 1 |
| **CA2** | Continuous Assessment 2 |
| **Exam** | End-of-term examination |
| **Total** | Auto-calculated (CA1 + CA2 + Exam) |
| **Grade** | Auto-assigned using the Nigerian A–F scale |

Scores are entered per student, per subject, per term. The system automatically calculates totals and assigns grades based on the Nigerian grading scale.

### Homework

- Create assignments with title, description, subject, and due date
- Assign to specific classes
- Track status: Active, Closed, or Archived
- Filter by status and class

### Library

Manage educational resources:
- Upload and categorize documents
- Categories: Textbook, Revision Guide, Past Questions, Formula Sheet, Teacher Notes, AI Notes
- Track download counts
- Mark resources as public or private
- Filter by subject, class level, and category

---

## Analytics

### School-Wide Metrics

- **School Average** — overall average across all students and subjects
- **Pass Rate** — percentage of students scoring 50 or above
- **At-Risk Students** — count of students scoring below 50 in one or more subjects

### Grade Distribution

Bar chart showing the distribution of grades (A through F) across the school, color-coded:
- A/B — Green (strong performance)
- C — Yellow (credit)
- D/E — Orange (needs improvement)
- F — Red (failing)

### Subject Performance

Per-subject averages displayed as a ranked list, making it easy to identify subjects that need attention across the school.

### Class Statistics

Per-class breakdowns showing averages, pass rates, and student counts.

---

## AI Model Routing

### How It Works

The AI router (`lib/ai/router.ts`) classifies each request by intent using keyword pattern matching, then routes to the best model:

1. User sends a message
2. Router analyzes the message for intent keywords
3. The appropriate model is selected
4. If the primary model fails, the router falls back: primary > general > complex
5. Every response includes metadata headers showing which model was used and why

### Model Assignments

| Intent | Keywords | Model | Provider |
|--------|----------|-------|----------|
| Tutoring | explain, teach, help, learn | Llama 3.3 70B | Groq |
| Exams | exam, test, quiz, MCQ, question | DeepSeek V4 Flash | OpenRouter |
| Curriculum | plan, scheme, curriculum, term | Qwen3 80B | OpenRouter |
| Documents | document, PDF, upload, analyze | Gemma 4 31B | OpenRouter |
| Automation | automate, generate UI, code | Kimi K2.6 | OpenRouter |
| Reasoning | prove, derive, complex, why | Hermes 3 405B | OpenRouter |
| General | (default) | Llama 3.3 70B | OpenRouter |

### RAG Integration

When relevant documents exist in the school's Knowledge Studio:
1. The user's message is embedded as a vector
2. The 5 most similar document chunks are retrieved via pgvector
3. These chunks are injected into the AI prompt as context
4. The AI grounds its response in the retrieved content

---

## Authentication & Roles

### Clerk Integration

TeachFlow uses Clerk v6 for authentication:
- Email/password sign-up and sign-in
- Session management with JWTs
- Webhook sync for user record creation
- Protected routes via proxy middleware

### User Roles

| Role | Permissions |
|------|------------|
| **Teacher** | Manage own classes, students, lessons, exams, homework |
| **HOD** | Teacher permissions + department-level analytics |
| **Admin** | Full school management, all analytics, all teachers |
| **Super Admin** | System-wide access across all schools |

### Onboarding Flow

1. New user signs up via Clerk
2. Clerk webhook creates a placeholder record
3. User is redirected to `/onboarding`
4. User enters school details (name, state, LGA)
5. A School and Teacher record are created
6. User is redirected to the dashboard

---

## Database Schema

TeachFlow uses 20 database tables across PostgreSQL (Supabase) with Prisma ORM:

### Core Tables

| Table | Purpose |
|-------|---------|
| **School** | Multi-tenant school records (name, state, LGA, plan tier) |
| **Teacher** | Staff profiles linked to Clerk IDs (name, email, role, subjects) |
| **Class** | Classrooms (level, arm, term, session) |
| **Student** | Student records (name, registration number, gender) |
| **Score** | Per-student scores (CA1, CA2, Exam, Total, Grade) |
| **Homework** | Assignments (title, subject, due date, status) |

### AI Content Tables

| Table | Purpose |
|-------|---------|
| **Lesson** | Generated lesson plans (objectives, content, activities, evaluation) |
| **Exam** | Exam templates (type, mode, difficulty, blueprint) |
| **Question** | Individual questions (stem, options, solution, Bloom's level) |
| **QuestionTag** | Skill metadata per question (topic, subtopic, Bloom's level) |
| **ExamAttempt** | Student exam sessions (score, grade, adaptive state) |
| **QuestionResponse** | Per-question student answers (selected option, correctness, time) |

### Document & Vector Tables

| Table | Purpose |
|-------|---------|
| **Document** | Uploaded PDFs (title, subject, status, chunk count) |
| **DocumentChunk** | RAG chunks with pgvector embeddings (1024 dimensions) |
| **LessonEmbedding** | Vector index for lesson similarity search |
| **QuestionEmbedding** | Vector index for question deduplication |
| **LibraryItem** | Downloadable resources (textbooks, past questions, notes) |

### Intelligence Tables

| Table | Purpose |
|-------|---------|
| **MistakePattern** | Student error tracking (skill, error type, root cause, occurrences) |
| **LearningPath** | Adaptive learning progressions (steps, current position, status) |
| **CurriculumPlan** | Term plans (weekly schedule, assessments, revision cycles) |

---

## API Reference

### AI & Content Generation

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/ai/chat` | POST | Multi-model streaming chat with intent routing and RAG |
| `/api/study-buddy/chat` | POST | Learning-mode-aware streaming (5 modes) |
| `/api/lessons/generate` | POST | Generate full lesson plan (Groq, streaming) |
| `/api/lessons/rewrite` | POST | Rewrite lesson for different exam mode |
| `/api/exams/generate` | POST | Generate exam with MCQs + theory (DeepSeek) |
| `/api/exams/v2/blueprint` | POST | Generate adaptive exam blueprint |
| `/api/knowledge-studio/generate` | POST | Generate summaries/concepts/flashcards/questions from PDFs |
| `/api/knowledge-studio/chat` | POST | RAG-powered document chat |
| `/api/knowledge-studio/analyze` | POST | Analyze document content |

### Search & Embeddings

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/embedding/generate` | POST | Generate vector embeddings |
| `/api/search/similar-lessons` | POST | Find similar lessons via pgvector |
| `/api/rag/context` | POST | Retrieve RAG context from school documents |
| `/api/questions/check-duplicate` | POST | Check for duplicate questions |

### Other

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/documents/upload` | POST | Upload PDF for Knowledge Studio |
| `/api/webhooks/clerk` | POST | Clerk webhook receiver (Svix verified) |

---

## Deployment

### Vercel (Recommended)

TeachFlow is deployed on Vercel with Fluid Compute:

```bash
# Build
npx turbo run build --filter=@teachflow/web

# Deploy to production
vercel --prod --yes
```

### Database Connection

**Important:** For Vercel serverless deployments, you must use the Supabase **connection pooler** (Supavisor), not the direct connection:

| Connection Type | URL Format | Use When |
|----------------|------------|----------|
| **Direct** | `db.PROJECT.supabase.co:5432` | Local development only |
| **Pooler (Transaction)** | `aws-1-REGION.pooler.supabase.com:6543` | Vercel / serverless (recommended) |

The pooler URL uses IPv4 and connection pooling, which are required for serverless environments. Add `?pgbouncer=true` to the connection string for Prisma compatibility.

### Required Environment Variables

Set these in the Vercel dashboard (Settings > Environment Variables):

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | Supabase pooler connection string |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Yes | Clerk publishable key |
| `CLERK_SECRET_KEY` | Yes | Clerk secret key |
| `CLERK_WEBHOOK_SECRET` | Yes | Svix webhook signing secret |
| `GROQ_API_KEY` | Yes | Groq API key for tutoring |
| `OPENROUTER_API_KEY` | Yes | OpenRouter API key for multi-model routing |
| `CEREBRAS_API_KEY` | Optional | Cerebras API key (faster chat) |
| `JINA_API_KEY` | Optional | Jina API key for embeddings |
| `TAVILY_API_KEY` | Optional | Tavily API key for web search |
| `NEXT_PUBLIC_CLERK_SIGN_IN_URL` | Yes | `/sign-in` |
| `NEXT_PUBLIC_CLERK_SIGN_UP_URL` | Yes | `/sign-up` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL` | Yes | `/dashboard` |
| `NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL` | Yes | `/onboarding` |
| `UPSTASH_REDIS_REST_URL` | Optional | Upstash Redis for distributed rate limiting |
| `UPSTASH_REDIS_REST_TOKEN` | Optional | Upstash Redis auth token |
| `NEXT_PUBLIC_SENTRY_DSN` | Optional | Sentry DSN for error tracking |
| `SENTRY_AUTH_TOKEN` | Optional | Sentry auth token for source map uploads |

---

## Smart Import Engine

### Overview

Teachers upload CSV or Excel files — result sheets, broadsheets, student lists — and TeachFlow automatically maps columns and imports data.

### How It Works

1. **Upload** — Drag-and-drop or click to browse. Supports CSV, XLSX, XLS, TSV.
2. **AI Column Mapping** — Headers and 5 sample rows are sent to the AI. It recognizes Nigerian school conventions:

| File Header | Maps To |
|-------------|---------|
| S/N, No | Skipped |
| Surname, Last Name | `lastName` |
| Other Names, First Name, Given Name | `firstName` |
| Reg No, Adm No, Admission Number | `regNumber` |
| 1st Test, CA 1, Test 1 | `ca1` |
| 2nd Test, CA 2, Test 2 | `ca2` |
| Exam, Examination | `exam` |
| Total, Aggregate, Overall | `total` |
| Position, Rank | Skipped |

3. **Review** — Teacher confirms or adjusts mappings, selects class, subject, term, and session.
4. **Preview** — Shows first 8 rows as they'll be imported with mapped column names.
5. **Execute** — Creates/updates students and upserts scores.

### Student Matching

- If a reg number is provided, matches by `schoolId + regNumber`
- Otherwise matches by `schoolId + classId + firstName + lastName` (case-insensitive)
- If no match found, creates a new student

### Score Handling

- Uses Prisma upsert on unique constraint: `studentId + subject + term + session`
- Re-importing the same file updates existing scores (no duplicates)
- Auto-calculates total if missing: `CA1 + CA2 + Exam`
- Auto-assigns grade using Nigerian A-F scale if grade column is missing

---

## Code Lab

### Overview

Interactive coding lessons across 4 languages with 18 total lessons. No server-side execution — validation is regex-based.

### Languages & Lessons

| Language | Lessons | Topics |
|----------|---------|--------|
| **HTML** | 5 | Headings, Paragraphs, Links, Lists, Forms |
| **CSS** | 4 | Color, Background/Padding, Flexbox, Grid |
| **JavaScript** | 5 | Variables, Functions, Arrays/Loops, Objects, Async/Await |
| **Python** | 5 | Print/Variables, If/Else, Lists/Loops, Functions, Classes |

### Features

- **Progressive unlock** — Complete lesson N to unlock N+1
- **Difficulty badges** — Beginner (green), Intermediate (amber), Advanced (red)
- **Live preview** — HTML and CSS render in real-time
- **Hint system** — One-line hints per lesson
- **Solution toggle** — View and reset to solution code
- **Tab support** — Tab key inserts 2 spaces
- **Line numbers** — Gutter with line numbers
- **Progress tracking** — Per-language completion bar

---

## Observability

### Sentry Error Tracking

- **SDK**: `@sentry/nextjs` v10.59
- **Region**: EU (`de.sentry.io`)
- **Pattern**: `instrumentation.ts` + `instrumentation-client.ts` (Next.js 15+ pattern)
- **Tunnel**: `/monitoring` route bypasses ad-blockers
- **Session Replay**: 10% of sessions, 100% on error
- **Source Maps**: Auto-uploaded on every production build via `SENTRY_AUTH_TOKEN`
- **Request Error Capture**: `onRequestError = Sentry.captureRequestError` in instrumentation

### Rate Limiting

Distributed rate limiting via Upstash Redis REST API with automatic in-memory fallback:

```
Request → rateLimit("key") → Upstash Redis (if env var set)
                            → In-memory Map (if no Redis)
```

- All API routes are rate-limited
- Sliding window: 60 seconds
- Limit: 10 requests per window per key
- Key format: `feature:userId` (e.g., `lesson-gen:user_abc123`)

### Caching

KV cache with TTL via Upstash Redis:

```typescript
const stats = await withCache("dashboard-stats:schoolId", 60, async () => {
  // expensive DB queries
});
```

- Falls back to in-memory Map when Upstash is not configured
- Dashboard stats cached for 60 seconds per school

---

## Theme System

### Architecture

Class-based dark mode using Tailwind CSS v4 custom properties.

### Components

- **ThemeProvider** (`components/layout/ThemeProvider.tsx`) — React context managing theme state
- **Header toggle** — Sun/Moon button in dashboard header
- **CSS variables** — Defined in `globals.css` for both `:root` (light) and `.dark` (dark)

### How It Works

1. On mount, `ThemeProvider` reads `localStorage("tf-theme")`
2. If no stored preference, checks `prefers-color-scheme` media query
3. Applies `.dark` class to `<html>` element
4. Toggle button switches between themes and persists to localStorage
5. Components use semantic tokens: `bg-bg`, `text-text`, `border-border`

### Tailwind v4 Configuration

```css
/* globals.css */
@custom-variant dark (&:is(.dark *));
```

This tells Tailwind v4 to scope `dark:` variants to elements inside `.dark` class, rather than using `@media (prefers-color-scheme: dark)`.

### CSS Variables

```css
:root {
  --color-bg: #ffffff;
  --color-surface: #f8fafc;
  --color-text: #0f172a;
  --color-text-2: #475569;
  --color-border: #e2e8f0;
  --color-primary: #3b82f6;
}

.dark {
  --color-bg: #0b1120;
  --color-surface: #111827;
  --color-text: #f1f5f9;
  --color-text-2: #94a3b8;
  --color-border: #1e293b;
  --color-primary: #3b82f6;
}
