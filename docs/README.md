# TeachNexis Engineering Documentation

> Open-source repositories are classrooms and accelerators, not the foundation of TeachNexis ownership.

---

## Architecture

| Document | Description |
|---|---|
| [Service Overview](architecture/service-overview.md) | Full service map, data flows, technology stack, build sequence |

---

## Repository Evaluations

Phase 1 repositories evaluated and filed:

| Repository | Document | Verdict |
|---|---|---|
| Crawl4AI | [crawl4ai.md](repo-evaluations/crawl4ai.md) | WRAP behind KnowledgeCollector |
| olmOCR | [olmocr.md](repo-evaluations/olmocr.md) | WRAP → BUILD native |
| Ollama-OCR | [ollama-ocr.md](repo-evaluations/ollama-ocr.md) | STUDY → BUILD backend |
| Mem0 | [mem0.md](repo-evaluations/mem0.md) | STUDY (build native with pgvector) |
| Logto | [logto.md](repo-evaluations/logto.md) | STUDY (stay on Clerk, plan migration) |
| Langflow | [langflow.md](repo-evaluations/langflow.md) | PROTOTYPE ONLY — never production |

---

## Service Interface Designs

| Service | Document | Capability |
|---|---|---|
| Knowledge Service | [knowledge-service.md](service-interfaces/knowledge-service.md) | WAEC/NECO/textbook RAG, curriculum indexing |
| OCR Service | [ocr-service.md](service-interfaces/ocr-service.md) | PDF/scan → Markdown, math extraction |
| Memory Service | [memory-service.md](service-interfaces/memory-service.md) | Student weakness tracking, teacher preferences |
| Identity Service | [identity-service.md](service-interfaces/identity-service.md) | Multi-school auth, RBAC, student PIN login |
| Workflow Service | [workflow-service.md](service-interfaces/workflow-service.md) | Lesson/CBT/report generation pipelines |

---

## Research

External repositories are cloned (for reference only) into `/research/external-repos/`. Nothing in that directory is imported into production.

---

## Contribution Notes

- All service interfaces are TypeScript — update the `.md` files when the code diverges
- No third-party repository types should appear in `apps/web` imports
- Before adding a new external dependency, check if it should sit behind an existing service interface
