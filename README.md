# TeachFlow OS

AI-powered learning operating system for Nigerian secondary schools (JSS1–SS3), aligned with WAEC, JAMB, and JUPEB curriculum standards.

**Live:** [web-ten-psi-28.vercel.app](https://web-ten-psi-28.vercel.app)

---

## What it does

- **Study Buddy** — AI learning cockpit with 5 modes (Explain, Test Me, Hint, Step-by-Step, Review Mistakes), real-time student context injection, and streaming responses
- **AI lesson generation** — full lesson plans in seconds, with WAEC/JAMB/JUPEB/ELI12 rewrite modes
- **Smart exam builder** — MCQ + theory questions with distractor analysis and difficulty scaling
- **7-model AI router** — routes requests to the best free LLM based on intent (tutoring, exams, curriculum, documents, automation, reasoning)
- **Semantic search** — find similar lessons, deduplicate questions, RAG over school documents via pgvector
- **Student tracking** — per-question response logging, auto-graded MCQs, AI-generated skill tags (Bloom's taxonomy)
- **Skill graph data** — aggregated student performance by skill, weak skill detection for adaptive learning
- **Analytics dashboard** — class averages, pass rates, grade distributions (A–F Nigerian scale), at-risk students
- **Role-based access** — teachers, school admins, students, parents — each sees only what they need
- **Clerk authentication** — sign-up/sign-in, webhook sync, JWT-based RBAC via publicMetadata

---

## Tech stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Monorepo | Turborepo + pnpm workspaces |
| Database | Supabase PostgreSQL + Prisma 5 |
| Vector search | pgvector (HNSW cosine indexes) |
| Auth | Clerk v6 (middleware, webhooks, RBAC) |
| AI — tutoring | Groq (`llama-3.3-70b-versatile`) |
| AI — exams | OpenRouter (`deepseek/deepseek-v4-flash:free`) |
| AI — curriculum | OpenRouter (`qwen/qwen3-next-80b-a3b-instruct:free`) |
| AI — documents | OpenRouter (`google/gemma-4-31b-it:free`) |
| AI — automation | OpenRouter (`moonshotai/kimi-k2.6:free`) |
| AI — reasoning | OpenRouter (`nousresearch/hermes-3-llama-3.1-405b:free`) |
| AI — general | OpenRouter (`meta-llama/llama-3.3-70b-instruct:free`) |
| Embeddings | Configurable (BGE-M3 / Jina / any OpenAI-compatible) |
| Styling | Tailwind CSS v4 |
| Deployment | Vercel (Fluid Compute) |

---

## Project structure

```
teachflow-os/
├── apps/
│   └── web/                      # Next.js application
│       ├── app/
│       │   ├── (dashboard)/      # Authenticated pages (sidebar + header)
│       │   │   ├── dashboard/
│       │   │   ├── lessons/
│       │   │   ├── exams/
│       │   │   ├── students/
│       │   │   ├── classes/
│       │   │   ├── scores/
│       │   │   ├── homework/
│       │   │   ├── analytics/
│       │   │   ├── library/
│       │   │   ├── study-buddy/      # AI learning cockpit
│       │   │   ├── settings/
│       │   │   └── onboarding/
│       │   ├── api/
│       │   │   ├── ai/chat/           # Multi-model streaming chat
│       │   │   ├── study-buddy/chat/  # Learning-mode-aware streaming
│       │   │   ├── lessons/generate/  # Groq lesson generation
│       │   │   ├── lessons/rewrite/   # Groq lesson rewriting
│       │   │   ├── exams/generate/    # DeepSeek exam generation
│       │   │   ├── embedding/generate/
│       │   │   ├── search/similar-lessons/
│       │   │   ├── rag/context/
│       │   │   ├── questions/check-duplicate/
│       │   │   └── webhooks/clerk/    # Clerk webhook (svix verified)
│       │   ├── sign-in/
│       │   ├── sign-up/
│       │   ├── setup/
│       │   └── page.tsx              # Landing page
│       ├── actions/
│       │   ├── study-buddy.ts        # Student context, skill map, mistakes
│       │   ├── exam-attempts.ts      # Start, submit, grade, history
│       │   ├── question-tags.ts      # AI auto-tagging, skill map
│       │   ├── analytics.ts
│       │   ├── settings.ts
│       │   ├── onboarding.ts
│       │   ├── exams.ts
│       │   └── library.ts
│       ├── lib/
│       │   ├── ai/
│       │   │   ├── router.ts         # Intent classification + model routing
│       │   │   └── providers/
│       │   │       ├── groq.ts
│       │   │       └── openrouter.ts
│       │   ├── rag/
│       │   │   └── retriever.ts      # pgvector RAG retrieval
│       │   ├── ai.ts                 # Legacy client exports
│       │   ├── auth.ts               # safeAuth(), RBAC helpers
│       │   ├── roles.ts              # Permission map + can() helper
│       │   ├── db.ts                 # Prisma client singleton
│       │   ├── embeddings.ts         # Configurable embedding provider
│       │   ├── vector-search.ts      # Similar lessons, dedup, storage
│       │   └── chunker.ts            # Document text chunking
│       └── components/
│           ├── layout/
│           │   ├── Sidebar.tsx
│           │   └── Header.tsx
│           ├── study-buddy/
│           │   ├── StudyBuddyClient.tsx  # Main orchestrator
│           │   ├── ModeSelector.tsx      # 5 learning modes
│           │   ├── ChatMessage.tsx       # Messages + AI metadata badges
│           │   ├── ChatInput.tsx         # Auto-resize input
│           │   ├── ContextPanel.tsx      # Skills, mistakes, session stats
│           │   └── StudentSelector.tsx   # Searchable student picker
│           └── ui/
│               └── GradeBadge.tsx
├── packages/
│   ├── database/                 # Prisma schema + migrations
│   │   └── prisma/
│   │       ├── schema.prisma
│   │       └── migrations/
│   │           ├── phase6_pgvector.sql
│   │           └── phase1a_tracking.sql
│   └── ai-prompts/               # Shared prompt builders
└── turbo.json
```

---

## Study Buddy

The Study Buddy (`/study-buddy`) is an AI learning cockpit — not a chatbot. It connects the AI router, student tracking, and semantic memory into one adaptive interface.

### Learning modes

| Mode | Behavior | AI Model |
|------|----------|----------|
| Explain | Clear teaching with analogies and examples | Groq llama-3.3 |
| Test Me | Generates 3–5 practice questions on weak areas | DeepSeek V4 Flash |
| Hint | Socratic guidance only, no direct answers | Groq llama-3.3 |
| Step-by-Step | Numbered solution steps with reasoning | Groq llama-3.3 |
| Review Mistakes | Analyzes errors, misconceptions, and remediation | Groq llama-3.3 |

### Data flow

```
Student input
  → Fetch student context (skill map, weak areas, recent mistakes)
  → Select learning mode system prompt
  → POST /api/study-buddy/chat
    → AI router classifies intent → picks model
    → pgvector RAG retrieval (if relevant documents exist)
    → Stream response with metadata headers
  → Display streaming message with model/intent/RAG badges
  → Update session stats in sidebar
```

### Student context panel (right sidebar)

- **Weak areas** — skills below 50%, shown as progress bars
- **Skill graph** — all tracked skills with color-coded mastery levels
- **Recent mistakes** — last 5 incorrect answers with misconception tags
- **Recommended topics** — auto-derived from weakest skills
- **Session stats** — topics covered, questions answered, accuracy this session

---

## Environment variables

```env
# Clerk authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
CLERK_WEBHOOK_SECRET=whsec_...

# Database (Supabase)
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:5432/postgres

# AI providers
GROQ_API_KEY=gsk_...
OPENROUTER_API_KEY=sk-or-v1-...

# Embeddings (any OpenAI-compatible endpoint)
EMBEDDING_PROVIDER_URL=https://api.jina.ai/v1
EMBEDDING_API_KEY=jina_...
EMBEDDING_MODEL=jina-embeddings-v3
EMBEDDING_DIMENSIONS=1024
```

---

## Getting started

```bash
# 1. Install dependencies
pnpm install

# 2. Set up environment
cp apps/web/.env.example apps/web/.env.local
# Fill in your keys

# 3. Generate Prisma client
pnpm db:generate

# 4. Push schema to database (or run migration SQL in Supabase SQL Editor)
pnpm db:push

# 5. Run pgvector + tracking migrations in Supabase SQL Editor
# → packages/database/prisma/migrations/phase6_pgvector.sql
# → packages/database/prisma/migrations/phase1a_tracking.sql

# 6. Start dev server
pnpm dev
```

---

## AI routing

The router (`lib/ai/router.ts`) classifies user intent and routes to the best model:

| Intent | Model | Why |
|--------|-------|-----|
| Tutoring / Q&A | Groq llama-3.3 | Ultra-fast LPU streaming |
| Exams / grading | DeepSeek V4 Flash | Reliable structured JSON |
| Curriculum planning | Qwen3 80B | Deep reasoning, long context |
| Document analysis | Gemma 4 31B | Multimodal understanding |
| Automation / UI | Kimi K2.6 | Agent workflows |
| Complex fallback | Hermes 3 405B | 405B frontier reasoning |
| General | Llama 3.3 70B | Broad educational knowledge |

Every response includes metadata headers: `X-AI-Model`, `X-AI-Provider`, `X-AI-Intent`, `X-AI-Reason`, `X-AI-RAG-Used`.

If the primary model fails, the router automatically falls back through the chain: primary -> general -> complex.

---

## Grading scale

Nigerian secondary school standard:

| Grade | Range | Remark |
|-------|-------|--------|
| A | 70–100 | Excellent |
| B | 60–69 | Very Good |
| C | 50–59 | Good |
| D | 45–49 | Fair |
| E | 40–44 | Poor |
| F | 0–39 | Fail |

---

## Roadmap

- [x] Phase 1–3: Core CRUD, AI generation, Prisma + Supabase
- [x] Phase 4: Analytics, Library, search/filter
- [x] Phase 5: Landing page, Clerk RBAC, webhook hardening, production deploy
- [x] Phase 6: Semantic memory layer (pgvector, embeddings, RAG, dedup)
- [x] Phase 1A: Student question tracking, exam attempts, skill tags
- [ ] Phase 1B: PDF ingestion -> RAG pipeline (upload & understand)
- [x] Phase 1C: Study Buddy — AI learning cockpit with 5 modes + student context
- [ ] Phase 1D: AI Exam 2.0 (difficulty scaling, curriculum alignment)
- [ ] Skill Graph visualization
- [ ] Mistake Intelligence System
- [ ] Adaptive Learning Engine
- [ ] Curriculum Auto-Generator
- [ ] Parent Insight Dashboard
- [ ] Classroom Live Mode

---

## License

Private. All rights reserved.
