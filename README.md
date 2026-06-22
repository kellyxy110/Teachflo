# TeachFlow OS

**The AI-powered learning operating system for Nigerian secondary schools.**

TeachFlow OS is a complete educational platform that gives teachers AI superpowers and gives students a personalized learning experience — all aligned with WAEC, JAMB, and JUPEB curriculum standards.

**Live:** [teachflow-os.vercel.app](https://teachflow-os.vercel.app)

---

## Who is it for?

| Role | What they get |
|------|---------------|
| **Teachers** | AI lesson generation, smart exam builder, automated grading, class analytics, homework management |
| **Students** | Study Buddy AI tutor, practice games, scientific calculator, adaptive exams, skill tracking |
| **School Admins** | School-wide analytics, at-risk student detection, curriculum planning, teacher management |

TeachFlow covers JSS1 through SS3 (Junior Secondary 1 to Senior Secondary 3) across all major Nigerian exam boards.

---

## Core Features

### AI Lesson Generator
Generate complete lesson plans in under 10 seconds. Enter a subject, class level, and topic — the AI produces structured plans with objectives, content, activities, evaluation questions, and homework suggestions. Lessons can be rewritten for different exam standards:

- **WAEC** — West African Examinations Council format
- **JAMB** — Joint Admissions and Matriculation Board (MCQ-focused)
- **JUPEB** — Joint Universities Preliminary Examinations Board
- **ELI12** — Simplified English Language Intensive for lower levels

### Smart Exam Builder
Two exam engines — standard and adaptive:

**Standard (v1):** Generate MCQ + theory exams with distractor analysis, mark schemes, exam tips, and curriculum references. Supports School Test, WAEC Mock, JAMB Prep, and JUPEB Prep exam types.

**Adaptive (v2):** Four intelligent modes:
- **Standard** — balanced assessment across topics
- **Diagnostic** — identifies knowledge gaps before a unit
- **Practice** — low-stakes review targeting weak areas
- **Assessment** — formal exam with misconception detection

Every question is tagged with Bloom's Taxonomy level (Remember through Create), skill tags, and estimated completion time. MCQs are auto-graded with per-question response tracking.

### Study Buddy
An AI learning cockpit with 5 modes — not just a chatbot. Study Buddy knows each student's skill map, recent mistakes, and weak areas, injecting that context into every response.

| Mode | What it does |
|------|-------------|
| **Explain** | Clear explanations with analogies and real-world examples |
| **Test Me** | Generates 3–5 practice questions targeting weak areas |
| **Hint** | Socratic guidance — asks leading questions, never gives answers directly |
| **Step-by-Step** | Walks through solutions with numbered steps and reasoning |
| **Review Mistakes** | Analyzes recent errors, identifies misconceptions, suggests revision |

### Knowledge Studio
Upload PDFs and let AI extract value from them:
- **Summaries** — key points, definitions, and formulas
- **Concept Maps** — extracted concepts with difficulty levels and relationships
- **Flashcards** — 10–15 Q&A review cards
- **Exam Questions** — MCQs and theory questions generated from the document
- **Document Chat** — ask questions about uploaded materials (RAG-powered)

### Intelligence Core
Three interconnected analytics engines:

- **Mistake Intelligence** — tracks error patterns per student, identifies root causes and prerequisite gaps
- **Adaptive Learning Paths** — generates personalized learning progressions per student per subject
- **Curriculum Generator** — creates term-long weekly plans with assessment schedules and revision cycles

### Scientific Calculator
A full-featured calculator accessible from the landing page with 5 tabs:

- **Standard** — arithmetic, trigonometry (regular, inverse, hyperbolic), logarithms, constants (pi, phi, e), factorials, permutations, combinations, memory functions, expression history
- **Equations** — solve quadratic through quintic polynomials, 2x2 and 3x3 linear systems
- **Statistics** — descriptive stats (mean, median, mode, range, quartiles, IQR, variance, standard deviation)
- **Vectors** — 2D/3D operations (add, subtract, dot product, cross product, magnitude, unit vectors, angle, projection)
- **Graph** — plot up to 4 functions simultaneously with adjustable bounds

### Practice Arena
Four interactive games on the landing page — no login required:

- **Math Sprint** — 30-second timed arithmetic challenge with scoring
- **Concept Match** — match scientific terms to their definitions
- **Fix the Answer** — spot the error in a worked solution
- **Quiz Battle** — MCQ challenge against an AI opponent

### School Management
- **Classes** — create and manage classes (JSS1–SS3, arms, terms)
- **Students** — student registry with registration numbers
- **Scores** — enter CA1, CA2, and Exam scores with auto-calculated totals and grades
- **Homework** — create assignments with due dates, assign to classes
- **Library** — document library for textbooks, revision guides, past questions, formula sheets
- **Analytics** — grade distribution, subject performance, class averages, at-risk student detection

---

## Grading Scale

Nigerian secondary school standard:

| Grade | Score Range | Remark |
|-------|-----------|--------|
| **A** | 70–100 | Excellent |
| **B** | 60–69 | Very Good |
| **C** | 50–59 | Good |
| **D** | 45–49 | Fair |
| **E** | 40–44 | Poor |
| **F** | 0–39 | Fail |

---

## AI Model Routing

TeachFlow uses 7 AI models, each selected for what it does best — all on free tiers:

| Task | Model | Why this model |
|------|-------|---------------|
| Tutoring & Q&A | Groq Llama 3.3 70B | Ultra-fast streaming via Groq LPU |
| Exam generation | DeepSeek V4 Flash | Reliable structured JSON output |
| Curriculum planning | Qwen3 80B | Deep reasoning, long context |
| Document analysis | Gemma 4 31B | Strong multimodal understanding |
| Automation | Kimi K2.6 | Agent workflow generation |
| Complex reasoning | Hermes 3 405B | 405B frontier model (fallback) |
| General education | Llama 3.3 70B | Broad educational knowledge |

The AI router classifies each request by intent and routes to the best model automatically. If the primary model fails, it falls back through the chain.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router) |
| Monorepo | Turborepo + pnpm workspaces |
| Database | Supabase PostgreSQL + Prisma 5 |
| Vector search | pgvector with HNSW cosine indexes |
| Auth | Clerk v6 (RBAC, webhooks) |
| AI providers | Groq + OpenRouter (7 models) |
| Embeddings | Jina Embeddings v3 (1024d) |
| Styling | Tailwind CSS v4 |
| Animation | Framer Motion + GSAP + Three.js |
| Deployment | Vercel |

---

## Getting Started

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp apps/web/.env.local.example apps/web/.env.local
# Fill in your API keys (see Environment Variables below)

# 3. Generate Prisma client
cd apps/web && npx prisma generate

# 4. Push schema to database
npx prisma db push

# 5. Run vector + tracking migrations in Supabase SQL Editor
# → packages/database/prisma/migrations/phase6_pgvector.sql
# → packages/database/prisma/migrations/phase1a_tracking.sql
# → packages/database/prisma/migrations/phase1d_exam_v2.sql
# → packages/database/prisma/migrations/phase2_intelligence_core.sql

# 6. Start dev server
pnpm dev
```

### Environment Variables

```env
# Auth (Clerk)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Database (Supabase — use pooler URL for Vercel)
DATABASE_URL=postgresql://postgres.PROJECT_REF:PASSWORD@aws-1-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&sslmode=require

# AI Providers
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...
CEREBRAS_API_KEY=...         # Optional: faster chat provider
JINA_API_KEY=jina_...        # Embeddings
TAVILY_API_KEY=tvly-...      # Web search augmentation
```

### Deploying to Vercel

```bash
# Build
npx turbo run build --filter=@teachflow/web

# Deploy
vercel --prod --yes
```

> **Important:** Use the Supabase **connection pooler** URL (port 6543) for Vercel deployments, not the direct connection (port 5432). Direct connections use IPv6 which Vercel serverless functions cannot reach.

---

## Project Structure

```
teachflow-os/
├── apps/web/                    # Next.js application
│   ├── app/
│   │   ├── (dashboard)/         # Authenticated pages
│   │   │   ├── dashboard/       # Main dashboard
│   │   │   ├── lessons/         # Lesson generation & management
│   │   │   ├── exams/           # Exam builder (v1 + v2 adaptive)
│   │   │   ├── study-buddy/     # AI learning cockpit
│   │   │   ├── knowledge-studio/# Document AI workspace
│   │   │   ├── intelligence/    # Mistake & learning analytics
│   │   │   ├── analytics/       # School-wide analytics
│   │   │   ├── classes/         # Class management
│   │   │   ├── students/        # Student registry
│   │   │   ├── scores/          # Score entry & grading
│   │   │   ├── homework/        # Homework management
│   │   │   ├── library/         # Document library
│   │   │   └── settings/        # Profile & school settings
│   │   ├── api/                 # 15 API endpoints
│   │   └── page.tsx             # Landing page
│   ├── lib/
│   │   ├── ai/                  # Model router & providers
│   │   ├── rag/                 # Vector retrieval
│   │   ├── intelligence/        # Mistake, adaptive, curriculum engines
│   │   └── exam-v2/             # Adaptive exam logic
│   └── components/
│       ├── landing/             # Landing page + Calculator + Games
│       ├── study-buddy/         # Study Buddy UI components
│       └── knowledge-studio/    # Document workspace UI
├── packages/
│   ├── database/                # Prisma schema & migrations
│   ├── ai-prompts/              # Shared prompt builders
│   └── shared/                  # Constants & types
└── turbo.json
```

---

## Roadmap

- [x] Core CRUD — classes, students, scores, homework
- [x] AI lesson generation with 4 exam modes
- [x] Smart exam builder with distractor analysis
- [x] Analytics dashboard with Nigerian grading scale
- [x] Landing page with Three.js, GSAP, Framer Motion
- [x] Clerk authentication with RBAC
- [x] Semantic memory layer (pgvector, embeddings, RAG)
- [x] Student question tracking and skill tags
- [x] Knowledge Studio (PDF upload, RAG, document AI)
- [x] Study Buddy — 5-mode AI learning cockpit
- [x] Adaptive Exam Engine v2 (4 modes, misconception detection)
- [x] Intelligence Core (mistake patterns, learning paths, curriculum plans)
- [x] Scientific Calculator (5 tabs)
- [x] Practice Arena (4 games)
- [ ] Skill Graph visualization (interactive)
- [ ] Parent Insight Dashboard
- [ ] Classroom Live Mode
- [ ] Mobile app (React Native)

---

## Documentation

- **[DOCS.md](./DOCS.md)** — Detailed feature documentation
- **[FAQ.md](./FAQ.md)** — Frequently asked questions

---

## License

Private. All rights reserved.
