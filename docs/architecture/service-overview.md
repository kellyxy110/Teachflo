# TeachNexis Service Architecture Overview

**Version:** 1.0  
**Date:** 2026-07-04  
**Status:** Phase 1 Design  

---

## Core Principle

> Open-source repositories are classrooms and accelerators, not the foundation of TeachNexis ownership.

Every external tool or repository sits behind a **TeachNexis-owned service interface**. The interface is versioned, typed, and documented here. Swapping the backend (e.g., Crawl4AI → a native crawler, Clerk → Logto) requires changing one adapter file — not dozens of feature routes.

---

## Service Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                        TeachNexis Frontend                          │
│              (Next.js App Router — apps/web)                        │
└────────┬────────┬───────────┬────────────┬────────────┬────────────┘
         │        │           │            │            │
         ▼        ▼           ▼            ▼            ▼
  Identity    Knowledge    Memory       OCR          Workflow
  Service     Service      Service      Service      Service
     │            │            │            │            │
     ▼            ▼            ▼            ▼            ▼
  [Clerk]    [pgvector    [Prisma DB   [olmOCR /    [Native TS
             + Crawl4AI   + pgvector]  Ollama-      prompt
             + OcrSvc]               Vision]       chains]
```

No feature route imports from Clerk, Crawl4AI, olmOCR, or Mem0 directly. Features import from `@/services/identity`, `@/services/knowledge`, `@/services/memory`, `@/services/ocr`, `@/services/workflow`.

---

## Service Registry

| Service | Interface File | Phase 1 Backend | Priority Capability |
|---|---|---|---|
| **TeachNexis Identity Service** | `docs/service-interfaces/identity-service.md` | Clerk | Multi-school auth, RBAC, student PIN login |
| **TeachNexis Knowledge Service** | `docs/service-interfaces/knowledge-service.md` | pgvector + Crawl4AI + OCR | WAEC/NECO/textbook RAG |
| **TeachNexis OCR Service** | `docs/service-interfaces/ocr-service.md` | olmOCR + Ollama-Vision | PDF/scan → Markdown |
| **TeachNexis Memory Service** | `docs/service-interfaces/memory-service.md` | Prisma + pgvector | Student weakness tracking, teacher prefs |
| **TeachNexis Workflow Service** | `docs/service-interfaces/workflow-service.md` | Native TypeScript | Lesson/CBT/report generation |

---

## Repository Evaluation Index

| Repository | Evaluation | TeachNexis Service | Verdict |
|---|---|---|---|
| Crawl4AI | `docs/repo-evaluations/crawl4ai.md` | Knowledge Service | WRAP |
| olmOCR | `docs/repo-evaluations/olmocr.md` | OCR Service | WRAP → BUILD |
| Ollama-OCR | `docs/repo-evaluations/ollama-ocr.md` | OCR Service (offline) | STUDY → BUILD |
| Mem0 | `docs/repo-evaluations/mem0.md` | Memory Service | STUDY (build native) |
| Logto | `docs/repo-evaluations/logto.md` | Identity Service | STUDY (stay Clerk for now) |
| Langflow | `docs/repo-evaluations/langflow.md` | Workflow Service | PROTOTYPE ONLY |

---

## Capability Gap → Service Mapping

| Immediate Capability Gap | Service | Status |
|---|---|---|
| Document intelligence (textbooks, scanned notes, exam papers) | OCR Service | Design complete |
| Educational knowledge base / RAG (WAEC, NECO, JAMB, textbooks) | Knowledge Service | Design complete |
| Teacher and student memory / personalisation | Memory Service | Design complete |
| Multi-school authentication and RBAC | Identity Service | Design complete |
| Visual AI workflow prototyping | Workflow Service (+ Langflow lab) | Design complete |

---

## Data Flow: Lesson Note Generation

```
Teacher clicks "Generate Lesson Note"
         │
         ▼
API Route: POST /api/lesson-notes/generate
         │
         ├─→ Identity Service: requirePermission("ai:generate")
         │
         ├─→ Memory Service: buildMemoryContext(teacherId, "lesson generation")
         │                   → "Teacher prefers 5-step format, avoids abstract theory"
         │
         ├─→ Knowledge Service: buildContext(subject + topic)
         │                      → Relevant WAEC past questions, textbook excerpts
         │
         ├─→ Workflow Service: stream("lesson-note-generation", { subject, topic, context, memory })
         │                     → Streams 8-section lesson note to frontend
         │
         └─→ Memory Service: processEvent("lesson_generated", { teacherId, preferences_observed })
```

---

## Data Flow: Student CBT Quiz Submission

```
Student submits CBT answers
         │
         ▼
API Route: POST /api/exams/submit
         │
         ├─→ Identity Service: requireSession() → verify student scope
         │
         ├─→ Grade answers (sync, no AI)
         │
         ├─→ Memory Service: processEvent("quiz_submitted", { scores, wrongAnswers })
         │                   → Extracts and stores weak topics, mistake patterns
         │
         └─→ Workflow Service: run("student-revision-plan", { weakTopics })
                               → Returns personalised next-steps
```

---

## Technology Stack (Phase 1)

| Layer | Technology |
|---|---|
| Frontend + API | Next.js 16 (App Router) |
| Database | PostgreSQL (Neon / Supabase) + Prisma |
| Vector search | pgvector extension on PostgreSQL |
| Auth | Clerk (behind Identity Service adapter) |
| File storage | Supabase Storage (behind storage service) |
| Knowledge crawling | Crawl4AI (Python Docker service) |
| OCR (cloud/GPU) | olmOCR (Python Docker service on cloud GPU) |
| OCR (local/offline) | Ollama Vision (runs on school server) |
| AI models | OpenRouter / Groq (via TeachNexis AI Router) |
| Workflow prototyping | Langflow (internal dev tool, never production) |

---

## Phase 1 Build Sequence

**Week 1–2:** OCR Service (upload route → processing → markdown)
**Week 2–3:** Knowledge Service (ingest → chunk → embed → retrieve)
**Week 3–4:** Memory Service (events → storage → prompt context)
**Week 4–6:** Workflow Service (lesson note + CBT generation using all above)
**Week 6–8:** Identity Service refactor (formalize interface, student PIN login)

---

## Non-Goals (Phase 1)

- Do not build a native crawler (use Crawl4AI wrapper)
- Do not fine-tune any models (use pre-trained models via OCR and Knowledge Services)
- Do not integrate Langflow in production
- Do not migrate from Clerk to Logto
- Do not build a custom vector database (use pgvector)

---

## Replacement Roadmap Summary

| Component | Phase 1 | Phase 2 | Phase 3 |
|---|---|---|---|
| Auth | Clerk | Clerk | Consider Logto if scale justifies |
| Crawling | Crawl4AI | Crawl4AI + native scrapers for WAEC/NECO | Native TeachNexis crawler |
| OCR | olmOCR + Ollama | + DeepSeek OCR | TeachNexis-OCR-2B (fine-tuned) |
| Memory | Prisma + pgvector | + smarter extraction pipeline | Native memory graph |
| Workflows | Native TS prompt chains | + background job engine | Multi-agent orchestration |
| Embeddings | OpenAI text-embedding-3-small | + Nomic (offline) | TeachNexis-Embed (Nigerian edu) |
