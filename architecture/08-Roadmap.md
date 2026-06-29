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

## Phase 3 — Architectural Operating System (IN PROGRESS)

**Goal:** Establish the governance layer before building intelligence features.

| Task | Status | Notes |
|---|---|---|
| AOS folder structure (`/architecture/`) | IN PROGRESS | — |
| 00-Vision.md | SHIPPED | — |
| 01-Principles.md | SHIPPED | — |
| 02-Decisions.md | SHIPPED | Decisions #001–#008 recorded |
| 03-Domains.md | SHIPPED | — |
| 04-Standards.md | SHIPPED | — |
| 05-Workflows.md | SHIPPED | — |
| 06-AI-Models.md | SHIPPED | — |
| 07-Loops.md | SHIPPED | — |
| 08-Roadmap.md | IN PROGRESS | This file |
| 09-Contracts.md | IN PROGRESS | — |
| Architecture & Capability Audit | PLANNED | Audit existing 6 capabilities |
| TeachNexis rebrand in UI | PLANNED | Update page titles, logos, metadata |

---

## Phase 4 — Curriculum Intelligence Engine (PLANNED)

**Goal:** Build the educational heart of TeachNexis.

| Feature | Status | Priority |
|---|---|---|
| Curriculum hierarchy schema (Subject → Class → Term → Week → Topic) | PLANNED | P1 |
| Curriculum data seed (all Nigerian secondary subjects) | PLANNED | P1 |
| Scheme of work structure per term | PLANNED | P1 |
| Learning objectives per topic | PLANNED | P1 |
| Bloom's Taxonomy mapping | PLANNED | P1 |
| WAEC/NECO/JAMB alignment metadata | PLANNED | P2 |
| Topic Knowledge Package generation | PLANNED | P1 |
| Lecture Notes (Teacher + Student versions) | PLANNED | P1 |
| Summary generation | PLANNED | P1 |
| Flashcard engine | PLANNED | P2 |
| Infographic key point extraction | PLANNED | P2 |
| Assignment and worksheet generation | PLANNED | P2 |
| Topic relationship graph | PLANNED | P3 |

---

## Phase 5 — AI Infrastructure & Orchestration (PLANNED)

**Goal:** Build the routing, memory, and orchestration layer that powers all AI features.

| Feature | Status | Priority |
|---|---|---|
| Model router (content-type-based routing) | PLANNED | P1 |
| Fallback chains | PLANNED | P1 |
| Prompt library management | PLANNED | P1 |
| AI output quality validation | PLANNED | P1 |
| Content caching (curriculum + assessment) | PLANNED | P2 |
| Context management and memory | PLANNED | P2 |
| Cost optimisation layer | PLANNED | P2 |
| Event loop foundation | PLANNED | P3 |
| Full agent orchestration | FUTURE | — |

---

## Phase 6 — Assessment Intelligence Upgrade (PLANNED)

**Goal:** Extend the existing assessment system with intelligence and completeness.

| Feature | Status | Priority |
|---|---|---|
| AI question generation from curriculum topics | PLANNED | P1 |
| Extended symbol palette (1,500–2,000+ symbols) | PLANNED | P1 |
| Question deduplication (semantic similarity) | PLANNED | P2 |
| CBT export: CSV, JSON, Moodle XML, QTI | PLANNED | P1 |
| Spaced repetition flashcard engine | PLANNED | P2 |
| Bloom's Taxonomy distribution in question banks | PLANNED | P2 |
| AI-powered marking for essay questions | PLANNED | P3 |
| Learning analytics dashboard | PLANNED | P2 |

---

## Phase 7 — AI Lesson Editor (PLANNED)

**Goal:** Replace the basic text input with a professional document editor.

| Feature | Status | Priority |
|---|---|---|
| Rich text editing (headings, bold, lists, tables) | PLANNED | P1 |
| Equation editor integration | PLANNED | P1 |
| Image upload and embedding | PLANNED | P1 |
| Autosave | PLANNED | P1 |
| AI Rewrite / Expand / Condense | PLANNED | P2 |
| Version history | PLANNED | P2 |
| Voice typing | PLANNED | P3 |
| Translation support | PLANNED | P3 |
| Citation support | PLANNED | P3 |
| Comments and annotations | PLANNED | P3 |

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
