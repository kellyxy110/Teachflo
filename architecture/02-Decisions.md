# TeachNexis — Decision Log

This document is a permanent, append-only record of every architectural and product decision made for TeachNexis. Decisions are never deleted or revised. When a decision is superseded, a new entry is added referencing the original.

---

## Decision #001 — Project Rebrand: TeachFlow OS → TeachNexis

**Date:** 2026-06-28
**Status:** Accepted

**Decision:**
The project is permanently renamed from TeachFlow OS to TeachNexis.

**Rationale:**
The name TeachFlow conflicts with an existing brand (teachflow.site). TeachNexis better reflects the platform's identity as a unified Teaching Operating System — a nexus of curriculum, assessment, classroom management, and intelligence.

**Impact:**
- All architecture, documentation, and specification files use TeachNexis exclusively.
- All UI references, page titles, and branding are updated to TeachNexis.
- Code comments and variable names are updated as they are touched during development.
- Git commit history retains the old name — this is expected and acceptable.
- The previous name exists only in historical commits, nowhere in active architecture or implementation.

**Alternatives Considered:**
- TeachOS — too generic
- TeachFlow (retain existing) — trademark conflict risk
- NexisEdu — less distinctive

---

## Decision #002 — Architectural Operating System (AOS)

**Date:** 2026-06-28
**Status:** Accepted

**Decision:**
The `/architecture/` folder is the Architectural Operating System (AOS) of TeachNexis. It is not documentation. It is the governing system that every implementation must follow.

**Rationale:**
Passive documentation drifts from implementation. The AOS is treated as authoritative: code is the final expression of architecture, not the source of truth. This prevents the gradual architectural erosion that affects long-running projects.

**Impact:**
- Every major capability requires an Architecture Review before implementation begins.
- Every domain and module declares an explicit Architectural Contract.
- Implementation that conflicts with the AOS triggers an architecture update first, not a spec override.

---

## Decision #003 — Capability Domain Model

**Date:** 2026-06-28
**Status:** Accepted

**Decision:**
TeachNexis is organised into Capability Domains rather than individual modules. Domains share Architecture, Decisions, Workflows, and Standards. Individual modules within a domain contain only what is unique to them.

**Rationale:**
Treating every feature as an independent module creates duplication and maintenance overhead. Domain-level shared contracts reduce coupling and make long-term maintenance tractable.

**Domain Layers:**
- **Foundation Domains:** Curriculum & Content Intelligence, Assessment & Learning Intelligence, AI Infrastructure & Orchestration
- **Application Domains:** Classroom Management, Learning Studios, School Administration
- **Infrastructure Domains:** Security, API, Database, Deployment, Monitoring, Integrations

**Dependency Rule:** Application Domains depend on Foundation Domains. Foundation Domains do not depend on Application Domains. Infrastructure Domains support all layers.

---

## Decision #004 — Evolutionary Codebase Strategy

**Date:** 2026-06-28
**Status:** Accepted

**Decision:**
The existing codebase is the foundation of TeachNexis. No existing feature is rebuilt without justification. All features are assessed through an Architecture & Capability Audit before any action is taken.

**Rationale:**
Rebuilding working features incurs cost without adding user value. Evolutionary improvement preserves momentum while improving architectural integrity.

**Audit Classification:**
Features are classified as: Keep as-is, Refactor, Upgrade, Replace, Merge, or Deprecate.
Each feature is scored across ten dimensions: Business Value, Code Quality, UI/UX Quality, Performance, Security, Test Coverage, Contract Compliance, AI Readiness, Orchestration Readiness, Scalability.

---

## Decision #005 — Architectural Contracts Standard

**Date:** 2026-06-28
**Status:** Accepted

**Decision:**
Every Domain and Module must declare an explicit Architectural Contract. The contract is the formal agreement between capabilities. The orchestration layer coordinates contracts, never implementations.

**Contract Fields:**
Purpose, Responsibilities, Inputs, Outputs, Dependencies, Events Produced, Events Consumed, Quality Guarantees, Failure Behaviour, Extension Points.

**Rationale:**
Implicit coupling creates fragility. Explicit contracts enable loose coupling from the beginning, making model swaps, implementation replacements, and orchestration additions safe operations.

---

## Decision #006 — Domain Implementation Priority

**Date:** 2026-06-28
**Status:** Accepted

**Decision:**
Foundation Domains are specified and implemented in the following order:
1. Curriculum & Content Intelligence
2. Assessment & Learning Intelligence
3. AI Infrastructure & Orchestration

**Rationale:**
Educational contracts must be stable before technical infrastructure is optimised around them. The curriculum structure defines what assessment must measure. Assessment contracts define what AI must generate. Building in this order prevents infrastructure from constraining educational design.

---

## Decision #007 — AI Model Responsibilities

**Date:** 2026-06-28
**Status:** Accepted

**Decision:**
AI model responsibilities are assigned by capability type, not by feature. Models are routed by the AI Infrastructure domain and may be changed without affecting domain contracts.

**Initial Assignments:**
- Kimi K2.6: Long-form lesson generation and deep curriculum reasoning
- DeepSeek: Mathematics, structured assessment, calculation-heavy content
- Qwen: Summaries, flashcards, educational transformations, short-form content
- Grok: General writing, teacher communications, fallback tasks
- Ornith: Code generation, software engineering, UI, testing

**Constraint:** No OpenAI APIs. All models accessed via Groq or OpenRouter free tier. Cost optimisation is a first-class concern.

---

## Decision #008 — Prompt Architecture

**Date:** 2026-06-28
**Status:** Accepted

**Decision:**
Prompts are the last element defined in any module specification, after Purpose, Workflow, Inputs, Outputs, and Quality Standards are fully documented. Prompt files contain only the prompt — no explanations or rationale (those belong in Architecture.md and Workflow.md).

**Rationale:**
Treating prompts as the primary design artefact leads to "prompt soup" — many disconnected prompts with incompatible assumptions. By defining architecture first, the prompt becomes a replaceable implementation detail inside a stable contract.

---

## Decision #009 — TeachNexis is Graph-First

**Date:** 2026-06-28
**Status:** Accepted

**Decision:**
TeachNexis adopts a graph-first architecture for curriculum knowledge. Curriculum content is stored as a knowledge graph of typed nodes and typed relationships, not as a folder hierarchy or flat document tree.

**Rationale:**
Education is not hierarchical. A topic like Vectors appears in Mathematics, Physics, Engineering, Computer Graphics, and Machine Learning simultaneously. A hierarchy can only express one parent per node — it cannot represent this reality. A graph expresses it naturally. Every future capability — lesson generation, flashcards, quizzes, analytics, recommendations, adaptive learning, AI agents — can traverse the same graph rather than maintaining isolated, duplicated views of the curriculum. This unified model is extremely difficult to retrofit after the fact but straightforward to establish at the foundation.

**Impact:**
- CUR-001 is renamed from "Curriculum Hierarchy" to "Curriculum Intelligence Graph (CIG)"
- The CIG schema introduces `CurriculumNode` and `CurriculumEdge` tables in Prisma
- All curriculum-consuming capabilities traverse the graph via the CIG contract — they do not maintain their own curriculum models
- Lesson generation operates on graph nodes as context, not on flat topic strings
- Assessments map to graph nodes via `assessed_by` edges
- Analytics operate on graph relationship data (prerequisite gaps, cross-subject connections, learning paths)
- Future AI agents consume graph context as structured input
- New curriculum additions extend the graph; they do not duplicate existing knowledge

**Alternatives Considered:**
- Hierarchical folder structure (Subject / Class / Term / Week / Topic) — rejected: cannot represent cross-subject relationships or non-linear prerequisites
- Flat topic table with metadata columns — rejected: cannot represent relationships; would require constant schema changes as relationship types grow
- External graph database (Neo4j) — deferred: adds infrastructure complexity; PostgreSQL adjacency list with application-layer traversal is sufficient at current scale; can migrate later if performance requires it

**Trade-offs Accepted:**
- Graph traversal queries are more complex than simple table lookups. This complexity is managed at the service layer, not exposed to callers.
- Seeding the initial Nigerian secondary curriculum as graph data requires more upfront effort than creating folders. This is the correct investment — every downstream capability benefits permanently.

---

## Decision #010 — Fire-and-Forget Event Bus for Cross-Domain Communication

**Date:** 2026-06-29
**Status:** Accepted

**Decision:**
TeachNexis server actions emit typed domain events after successful data writes using a fire-and-forget event bus (`lib/events.ts`). Events are dispatched asynchronously without blocking the calling request. Handlers are registered at module load time and run in background microtasks.

**Rationale:**
Tightly coupling server actions to downstream side effects (analytics ingestion, notification dispatch, cache invalidation, audit logging) creates fragile dependencies and increases response latency. A fire-and-forget event bus allows any number of handlers to react to a business event without the originating action knowing or caring about them. This pattern is the prerequisite for agent-observable workflows: an AI orchestration layer can subscribe to events like `attendance.saved` and trigger adaptive interventions without modifying classroom management code.

**Impact:**
- `lib/events.ts` provides `emit(event, payload)` and `on(event, handler)` with full error isolation
- Server actions for attendance, health, exams, and report cards emit typed events after successful writes
- Contract definitions now include `Events Produced` and `Events Consumed` sections
- Event names follow `domain.entity.action-past-tense` convention (e.g., `attendance.saved`, `health.record.updated`)
- No handler failure can propagate back to the calling server action — errors are caught and logged

**Alternatives Considered:**
- Synchronous callback chains — rejected: adds latency and couples domains tightly
- Upstash QStash webhook queue — deferred: adds infrastructure complexity; in-process bus is sufficient at current scale; can migrate to durable queue when agent workloads require it
- Next.js `after()` hook — deferred: correct abstraction but not yet stable in production; revisit when GA

**Trade-offs Accepted:**
- In-process bus is non-durable: events are lost on cold start. Acceptable for current use cases (analytics, soft notifications). Durable queue will be added when any handler requires at-least-once delivery.

---
