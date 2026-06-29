# TeachNexis — Roadmap

## Status Legend
- `SHIPPED` — Live in production
- `IN PROGRESS` — Currently being built
- `SPECIFIED` — Architecture complete, implementation next
- `PLANNED` — On roadmap, not yet specified
- `FUTURE` — Long-term vision, not yet planned
- `BLOCKED` — Waiting on a dependency
- `CANCELLED` — Removed from scope

---

## Phase 0 — Foundation (COMPLETE)

**Goal:** Establish the base platform infrastructure and core identity.

| Feature | Status | Notes |
|---|---|---|
| Next.js 16 + Turbopack monorepo | SHIPPED | Turbo + pnpm workspaces |
| Clerk v6 authentication | SHIPPED | clerkMiddleware in proxy.ts |
| Supabase PostgreSQL + Prisma | SHIPPED | Supavisor pooler port 6543 |
| Mobile-first responsive layout | SHIPPED | Bottom nav, collapsible sidebar |
| Dashboard restructure | SHIPPED | Quick actions, greeting, stats |
| OG image social sharing | SHIPPED | — |
| Project rebrand to TeachNexis | SPECIFIED | Decision #001; UI update pending |

---

## Phase 1 — Core Classroom Tools (COMPLETE)

**Goal:** Give teachers the daily workflow tools they need immediately.

| Feature | Status | Notes |
|---|---|---|
| Digital Attendance Register | SHIPPED | 4-status, date navigator, stats, absenteeism alerts |
| Student Digital Health Records | SHIPPED | Medical info, emergency contacts, clinic visits |
| Two-column login page with narrative panel | SHIPPED | Rotating quotes, micro-stories, insights |

---

## Phase 2 — Examination & Assessment (COMPLETE)

**Goal:** Complete the examination and assessment workflow.

| Feature | Status | Notes |
|---|---|---|
| KaTeX math editor with LaTeX toolbar | SHIPPED | 18 symbol shortcuts, mixed preview |
| Manual question builder | SHIPPED | MCQ + essay + structured types |
| Excel bulk import | SHIPPED | SheetJS, flexible column mapping, 10-question preview |
| Exam export (Excel) | SHIPPED | Questions + scoring export |
| CA Report Cards | SHIPPED | Ordinal ranking, per-student and bulk export |
| Security audit + fixes | SHIPPED | IDOR, XSS, input validation, DoS prevention |

---

## Phase 3 — Architectural Operating System (SHIPPED)

**Goal:** Establish the governance layer before building intelligence features.

| Task | Status | Notes |
|---|---|---|
| AOS folder structure (`/architecture/`) | SHIPPED | — |
| 00-Vision.md | SHIPPED | — |
| 01-Principles.md | SHIPPED | — |
| 02-Decisions.md | SHIPPED | Decisions #001–#010 recorded |
| 03-Domains.md | SHIPPED | — |
| 04-Standards.md | SHIPPED | — |
| 05-Workflows.md | SHIPPED | — |
| 06-AI-Models.md | SHIPPED | — |
| 07-Loops.md | SHIPPED | — |
| 08-Roadmap.md | SHIPPED | This file |
| 09-Contracts.md | SHIPPED | All 8 domain contracts SHIPPED |
| Architecture & Capability Audit | SHIPPED | 10-Audit.md — all 6 capabilities rated |
| Event bus + domain event stubs | SHIPPED | `lib/events.ts`; attendance + health emit |
| TeachNexis rebrand in UI | PLANNED | Page title/metadata update pending |

---

## Phase 4 — Curriculum Intelligence Engine (SHIPPED)

**Goal:** Build the educational heart of TeachNexis.

| Feature | Status | Notes |
|---|---|---|
| CIG schema (`curriculum_nodes` + `curriculum_edges`) | SHIPPED | `migration-cig-001.sql` |
| Curriculum data seed — ~330 topics, SS1–SS3 | SHIPPED | `seed-cig.sql` |
| Curriculum data seed — 288 topics, JS1–JS3 | SHIPPED | `seed-cig-jss.sql` |
| Bloom's Taxonomy + exam standards per node | SHIPPED | Part of schema |
| WAEC/NECO/JAMB alignment metadata | SHIPPED | `examStandards[]` on each node |
| Topic Knowledge Package (misconceptions, formulae, keywords) | SHIPPED | Node fields + context API |
| Curriculum Browser UI | SHIPPED | `/curriculum` — 618 TOPIC nodes browseable |
| CIG graph API routes | SHIPPED | `GET /api/curriculum/*` |
| Lesson Generator (streaming, CIG-anchored) | SHIPPED | `POST /api/cig/lesson` |
| Quiz + Flashcard generation from CIG | SHIPPED | `type=quiz/flashcards` in same route |
| Educational integrity validation | SHIPPED | `validate-cig-sprint5.sql` — all checks PASS |
| Topic relationship graph | SHIPPED | 473 TEACHES_BEFORE + 51 CROSS_SUBJECT edges |

---

## Phase 5 — AI Infrastructure & Orchestration (SHIPPED)

**Goal:** Build the routing, memory, and orchestration layer that powers all AI features.

| Feature | Status | Notes |
|---|---|---|
| Model router (content-type intent-based) | SHIPPED | `lib/ai/router.ts` — classifyIntent + routeToModel |
| Fallback chains | SHIPPED | LESSON_MODELS, EXAM_MODELS, DOCUMENT_MODELS in `lib/ai.ts` |
| Prompt library package | SHIPPED | `@teachflow/ai-prompts` — lesson, rewrite, exam, CIG exam |
| AI output quality validation | SHIPPED | `lib/ai-validator.ts` — MCQ, lesson, flashcard |
| Content caching (Upstash Redis, 7-day TTL) | SHIPPED | `lib/ai-cache.ts` — wired into generate-cig route |
| Event loop foundation | SHIPPED | `lib/events.ts` — fire-and-forget bus |
| Rate limiting (in-memory + Upstash) | SHIPPED | `lib/rate-limit.ts` |
| Groq / Cerebras / OpenRouter providers | SHIPPED | `lib/ai/providers/` |
| Coding Lab AI router | SHIPPED | `lib/ai/coding-router.ts` |
| Context management and memory | PLANNED | Session-level conversation history |
| Full agent orchestration | FUTURE | Multi-step agentic loops |

---

## Phase 6 — Assessment Intelligence Upgrade (IN PROGRESS)

**Goal:** Extend the existing assessment system with intelligence and completeness.

| Feature | Status | Notes |
|---|---|---|
| Extended symbol palette (850+ symbols, search, favorites) | SHIPPED | `LatexSymbolPalette.tsx` — Sprint 6a |
| CBT export: Excel CBT, CSV, JSON, Moodle XML, QTI 2.1 | SHIPPED | `lib/export.ts` — Sprint 6b |
| AI question generation from CIG topics | SHIPPED | `POST /api/exams/generate-cig` + wizard — Sprint 6c |
| Question deduplication (semantic similarity) | PLANNED | Sprint 6d |
| Spaced repetition flashcard engine | PLANNED | Sprint 6e |
| Bloom's Taxonomy distribution in question banks | PLANNED | Sprint 6f |
| AI-powered marking for essay questions | PLANNED | Sprint 6g |
| Learning analytics dashboard | PLANNED | Sprint 6h |

---

## Phase 7 — AI Lesson Editor (IN PROGRESS)

**Goal:** Replace the basic text input with a professional document editor.

| Feature | Status | Notes |
|---|---|---|
| Split-pane markdown editor with formatting toolbar | SHIPPED | `LessonEditorClient.tsx` |
| Equation editor integration (LaTeX symbol palette) | SHIPPED | Reuses `LatexSymbolPalette` from Phase 6a |
| Autosave (debounced, 1.5s) | SHIPPED | PATCH `/api/lessons/[lessonId]` |
| Version history (localStorage, last 10 saves) | SHIPPED | `tf_lesson_hist_[id]` in localStorage |
| AI Expand / Condense in-editor actions | SHIPPED | `POST /api/lessons/edit-ai` streaming |
| Image upload and embedding | PLANNED | Requires Vercel Blob or S3 |
| Voice typing | PLANNED | — |
| Translation support | PLANNED | — |
| Citation support | PLANNED | — |
| Comments and annotations | PLANNED | — |

---

## Phase 8 — Landing Page (PLANNED)

**Goal:** Professional marketing site reflecting TeachNexis identity.

| Section | Status |
|---|---|
| Hero | PLANNED |
| Trusted by Schools | PLANNED |
| Why TeachNexis | PLANNED |
| Core Features | PLANNED |
| Curriculum Library | PLANNED |
| Assessment Suite | PLANNED |
| Teacher Workspace | PLANNED |
| School Administration | PLANNED |
| Vision & Mission | PLANNED |
| Testimonials | PLANNED |
| Pricing | PLANNED |
| FAQ | PLANNED |
| Footer | PLANNED |

---

## Phase 9 — Learning Studios (FUTURE)

| Studio | Status |
|---|---|
| Developer Studio (Monaco IDE + AI mentor) | FUTURE |
| Design Studio (Technical Drawing) | FUTURE |
| Virtual Physics Lab | FUTURE |
| Virtual Chemistry Lab | FUTURE |
| Virtual Biology Lab | FUTURE |
| Mathematics Workspace | FUTURE |
| GIS & Mapping Studio | FUTURE |
| Digital Art Studio | FUTURE |
| Music Composition Studio | FUTURE |
| Economics Data Studio | FUTURE |
| Accounting Workspace | FUTURE |
| Agricultural Science Simulation | FUTURE |

---

## Blocked / On Hold

| Item | Reason |
|---|---|
| Voice features | Suspended pending core platform stability |
| Video features | Suspended pending core platform stability |
| Zvec semantic similarity | Phase 6+; depends on AI Infrastructure domain |
| Rate limiting (Upstash Redis) | Infrastructure; low priority until traffic warrants it |
| Model fallback chain (Qwen → DeepSeek → Gemma) | Blocked on AI Infrastructure domain spec |

---

## Cancelled

| Item | Reason |
|---|---|
| LangGraph orchestration | Replaced by prompt-chain architecture (simpler, more maintainable at current scale) |
