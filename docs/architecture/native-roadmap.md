# TeachNexis Native Ownership Roadmap

**Version:** 1.0
**Date:** 2026-07-04
**Status:** Living Document — update on every architecture review
**Owner:** Principal Architect

---

## Guiding Principle

Open-source repositories are research laboratories, accelerators, and references. They prove a concept, shortcut months of plumbing work, and teach us what mature engineering in a domain looks like. They are not foundations. TeachNexis owns the architecture, the educational intelligence, the service APIs, and the long-term platform. Every external dependency is a temporary tenant behind a permanent interface. The interface is the product. The dependency is the implementation detail.

---

## Capability 1: OCR Engine

**Current Implementation**
olmOCR (Allen Institute) running on a cloud GPU instance (Modal or RunPod), accessed via a TeachNexis-owned REST wrapper. Ollama-Vision (llama3.2-vision:11b) serves as the offline/data-sovereign backend for schools without cloud connectivity. Both backends are routed by the `TeachNexisOCRService` based on school configuration and document type. Classical Tesseract retained as a low-cost fallback for machine-typeset text that does not require math extraction.

**External Dependency**
olmOCR (`allenai/olmocr`, Apache 2.0) — sglang inference server + Qwen2-VL-7B-fine-tuned weights. Ollama (`ollama/ollama`) serving `llama3.2-vision:11b` for offline deployments.

**Why It Was Chosen**
olmOCR offered the strongest open-source accuracy on typeset documents with mixed prose, mathematical notation, and tables — precisely the document profile of WAEC past papers and Nigerian secondary school textbooks. No comparable open-source alternative existed with equivalent math/table handling as of Phase 1 evaluation. Ollama-Vision was chosen for its offline capability and zero-egress data sovereignty, not for quality.

**What We Learned**
1. Vision-first OCR (render page as image, pass to VLM) is architecturally superior to classical OCR for educational documents. Tesseract fails on math; olmOCR succeeds.
2. Anchored prompting (providing the pdfminer text layer as a hint alongside the image) cuts VLM hallucination rate on dense text significantly. This pattern belongs in any native OCR pipeline we build.
3. The abstraction that matters is backend selection, not model selection. The `OCRBackend` enum (`olmocr | ollama-vision | deepseek-ocr | tesseract`) is the control plane. The model underneath any backend can be swapped independently.
4. GPU cold start (~30s model load) is the primary UX problem, not accuracy. Keep model warm with a heartbeat endpoint. Never put OCR in a synchronous user-facing request path.
5. Nigerian educational content — handwritten teacher notes, low-resolution exam scans, multi-column textbook layouts — is a domain gap in every evaluated model. Native fine-tuning is the only path to closing it.

**TeachNexis-Native Replacement Plan**
Phase 3: Fine-tune a Qwen2-VL-2B (or similarly lightweight vision model) on a TeachNexis-curated dataset of Nigerian secondary school documents: WAEC papers (1990–2026), NECO past questions, NERDC-approved textbook pages, handwritten teacher lesson notes, and school report card formats. Target model name: `TeachNexis-OCR-2B`. The model runs via sglang behind the existing `TeachNexisOCRService` interface with no API surface changes. Reduce from 7B to 2B parameters; reduce GPU cost by ~60%; increase accuracy on Nigerian document types by training on domain-specific corpus.

**Estimated Replacement Phase**
Phase 3 (Month 9–14). Prerequisite: annotated Nigerian document dataset of at least 50,000 pages assembled in Phases 1–2 from ingested WAEC/NECO/textbook content. Fine-tuning cannot start without this corpus.

**Risks**
- Annotation cost and quality: building a 50,000-page ground-truth corpus requires either a dedicated annotation team or synthetic data generation. Low-quality annotations produce a model worse than olmOCR.
- Model regression on non-Nigerian content: domain-specific fine-tuning can reduce general accuracy. Maintain olmOCR as a benchmark and fallback.
- sglang API instability: if sglang undergoes breaking changes between now and Phase 3, the inference wrapper needs rework before fine-tuning begins.
- GPU infra continuity: the fine-tuning run requires sustained A100/H100 access for days. Modal and RunPod pricing volatility is a budget risk.

**Success Criteria**
- `TeachNexis-OCR-2B` achieves ≥ 92% character accuracy on a held-out test set of 500 WAEC past question pages
- Math formula LaTeX accuracy ≥ 90% on a held-out set of 200 mathematics questions
- GPU cost per 10-page document ≤ $0.02 (vs. ~$0.05 for olmOCR-7B)
- End-to-end latency for a 10-page document ≤ 20 seconds on A10G
- Zero regressions on the existing olmOCR benchmark test suite

---

## Capability 2: Memory System

**Current Implementation**
Native Prisma + pgvector implementation built from scratch, informed by studying Mem0's architecture. No Mem0 dependency in production. The `TeachNexisMemoryService` implements three memory types: semantic (discrete facts about students/teachers), episodic (timestamped events), and procedural (workflow preferences). Fact extraction from behavioral events uses Claude Haiku via the AI Router.

**External Dependency**
Mem0 (`mem0ai/mem0`, Apache 2.0) studied only — used in a development environment to validate extraction patterns. Not deployed in production. pgvector extension on PostgreSQL is the vector store.

**Why It Was Chosen**
Mem0's cloud economics made it impossible at Nigerian school scale (60x over Pro tier capacity at 10,000 students with standard usage patterns). Self-hosted Mem0 OSS with a Python SDK was technically viable but introduced a language boundary and a dependency that carried no compliance documentation for NDPR. Building natively on the existing Prisma + pgvector stack was cheaper in total engineering time (2–3 weeks) than wrapping Mem0 and then replacing it within 6 months.

**What We Learned**
1. Hybrid retrieval — dense vector similarity + BM25 keyword + entity boosting — is categorically better than vector-only for memory search. Implement all three layers; do not shortcut to vector-only.
2. LLM-powered fact extraction from raw behavioral events (quiz submissions, lesson feedback, correction events) is the correct pattern. Storing raw conversation text is noisy and expensive to search.
3. Memory must carry a confidence field. Inferred memories (from behavior) are lower confidence than confirmed memories (from explicit teacher feedback). Low-confidence + old memories should auto-expire.
4. Cross-actor isolation is not enforced by the memory store — it is enforced by the service layer. School-level partitioning must be a mandatory filter on every query, not an optional parameter.
5. The right-to-erasure workflow (`forgetActor()`) must be implemented before the first student data enters the system. Retrofitting erasure is operationally painful.

**TeachNexis-Native Replacement Plan**
The native implementation IS the plan. No replacement needed — the `TeachNexisMemoryService` is already the owned implementation. The evolution path is:
- Phase 2: Add entity graph layer (PostgreSQL adjacency table, not Neo4j) linking memories to named curriculum entities (subjects, topics, exam boards). This enables structured queries like "find all memories related to quadratic equations for this student."
- Phase 3: Replace Claude Haiku for fact extraction with a fine-tuned TeachNexis extraction model trained on Nigerian school behavioral patterns. Reduce extraction latency and cost by ~70%.
- Phase 4: Add federated memory across academic years. A student's memory context carries forward term-over-term, with temporal decay applied to performance-based memories older than 12 months.

**Estimated Replacement Phase**
No replacement needed — native from Phase 1. Enhancement milestones in Phases 2, 3, 4.

**Risks**
- Fact extraction quality: a fine-tuned extraction model trained on insufficient or low-quality behavioral data will produce noisy memories that degrade AI output quality over time.
- pgvector index performance: at 10,000 students × 500 memories each = 5M vectors. IVFFlat index requires reindexing at this scale. Monitor query latency and plan index strategy proactively.
- Temporal conflict resolution: when a student improves at a topic previously flagged as weak, the system must recognize the contradiction. This logic requires careful unit testing with real-world performance trajectory data.

**Success Criteria**
- Memory search returns relevant results in ≤ 200ms P99 at 10,000 concurrent students
- Fact extraction accuracy (human-evaluated): ≥ 85% of extracted facts judged correct and relevant by a domain expert
- `forgetActor()` removes all actor data within 30 seconds, verified by a post-deletion query returning zero results
- Cross-school query isolation: penetration test returns zero results when querying Actor A's memories with Actor B's schoolId

---

## Capability 3: Identity & Auth

**Current Implementation**
Clerk, accessed exclusively through the `TeachNexisIdentityService` adapter in `lib/auth/adapters/clerk.ts`. No Clerk SDK imports appear outside this adapter. Student PIN login is a native TeachNexis JWT system implemented independently of Clerk, issuing short-lived JWTs verified by API middleware.

**External Dependency**
Clerk (`clerk/javascript` — proprietary cloud service, free tier to 10,000 MAU). Student PIN auth is already native (no external dependency).

**Why It Was Chosen**
Clerk provides the fastest path to production-grade Next.js App Router authentication with zero infrastructure management. Its embedded components (sign-in, sign-up, user profile) reduce frontend build time by weeks. For a team in active feature development, zero-ops auth is a genuine productivity asset. Logto (the evaluated self-hosted alternative) offers superior data sovereignty and native RBAC, but requires managing PostgreSQL, Redis, SSL, and updates for the identity layer — a reliability overhead that is difficult to justify at Phase 1 team size.

**What We Learned**
1. The adapter pattern is the only safe way to take on a cloud auth vendor. Clerk code must never appear in feature routes, middleware handlers, or workflow services — only in the adapter file. This is enforced and non-negotiable.
2. Logto's org-scoped RBAC model (Organization → Members → Roles → Permissions embedded in JWT claims) is the correct conceptual framework for multi-school tenancy, and it can be implemented in Clerk's `publicMetadata` today without migrating.
3. Student PIN login is a genuinely different auth problem from teacher/admin login. It does not fit standard OIDC flows (students are 10–17 year olds with school-issued codes). The native JWT implementation is correct; it should not be forced through Clerk or Logto.
4. The migration cost from Clerk to Logto is dominated by two problems: JWT issuer change (all existing sessions invalidate) and user ID foreign key migration in the database (Teacher, Student, Parent tables reference external IDs). Designing data models to minimize this dependency is the most important mitigation.

**TeachNexis-Native Replacement Plan**
Phase 3 (migration target): Replace Clerk adapter with a Logto adapter when any of these triggers are reached: MAU exceeds 40,000; NITDA or NDPR enforcement creates a data residency requirement Clerk cannot satisfy; Clerk's pricing at scale becomes prohibitive. The migration requires: (1) Logto self-hosted deployment on dedicated VM with managed PostgreSQL and Redis; (2) Logto adapter written to the same `TeachNexisIdentityService` interface; (3) shadow mode running both adapters simultaneously; (4) school-by-school user migration with a 72-hour window per school. Student PIN auth remains unchanged throughout — it is already fully native.

**Estimated Replacement Phase**
Phase 3 (Month 10–15), triggered by MAU or compliance threshold, not by calendar.

**Risks**
- JWT issuer change invalidates all active sessions during migration. Users must re-authenticate. Coordinate migration during a school holiday break.
- Logto self-hosting requires 99.9% uptime discipline for the identity layer. A crashed Logto server = zero users can log in. Dedicated VM with automated failover is mandatory.
- Custom SMS OTP (Africa's Talking, Termii) requires building Logto connector plugins. Budget 2–3 weeks of connector development before migration.
- Staff training: the Logto admin console has a different UX from Clerk's dashboard. School IT staff who manage user accounts need retraining.

**Success Criteria**
- Logto adapter passes 100% of the same interface contract tests as the Clerk adapter
- Auth latency for teacher login (including JWT verification) ≤ 300ms P95
- Student PIN login remains unchanged and unaffected by the Logto migration
- Zero Clerk SDK imports remain in the codebase after migration
- NDPR compliance documentation from Logto (or self-hosted certification) on file

---

## Capability 4: Workflow Engine

**Current Implementation**
Native TypeScript prompt-chain functions, one per named workflow, registered in the `TeachNexisWorkflowService`. Workflows call the AI Router, which dispatches to the appropriate model and provider. Langflow is installed as an internal development tool for prototyping new workflows visually — it has no role in any production code path.

**External Dependency**
Langflow (`langflow-ai/langflow`, MIT) — internal lab use only, never in production. The Workflow Service itself has no external dependency beyond the AI Router.

**Why It Was Chosen**
Langflow was chosen as a prototyping accelerator, not a production dependency. It reduces the time to discover which prompt chain structure and retrieval pattern works for a given workflow from days to hours. The visual flow editor lets curriculum staff iterate without writing TypeScript. The production decision was to build native TypeScript prompt chains immediately — Langflow proved the patterns, TypeScript owns the execution.

**What We Learned**
1. Every workflow is a composition of typed steps. Langflow's component model (each node is a typed input/output unit) is the right abstraction. Each step in a TeachNexis workflow must be independently testable.
2. Workflow definitions should be stored as versioned configuration (JSON or YAML), not hard-coded control flow. This enables non-engineers to understand and audit what the AI is doing at each step.
3. Streaming is not optional for long-running workflows. An 8-section lesson note generation takes 15–25 seconds. Without SSE streaming to the frontend, users abandon the request. Every workflow that generates substantial text must stream.
4. LangChain tight coupling in Langflow is an anti-pattern to avoid in native implementations. The Workflow Service calls the AI Router directly — no LangChain, no LlamaIndex, no framework intermediary.

**TeachNexis-Native Replacement Plan**
Phase 2: Build a Workflow Definition Registry — a versioned JSON store of workflow configurations (prompt templates, step sequences, model preferences, retrieval settings). This separates workflow logic from execution code. The TypeScript executor reads workflow definitions at runtime; curriculum staff can update a workflow definition without a code deploy.
Phase 3: Add background job execution with a durable queue (PostgreSQL-backed, Prisma-managed — no additional infrastructure). Enable long-running workflows (full curriculum mapping, term report generation for a whole school) to execute as background jobs with progress tracking and resumption on failure.
Phase 4: Multi-agent orchestration — workflows that spawn sub-agents (e.g., a curriculum review workflow that runs a fact-checking agent, a syllabus-alignment agent, and a past-question relevance agent in parallel). Native implementation using the TeachNexis Agent Platform (Capability 11).

**Estimated Replacement Phase**
No replacement — the Workflow Service is native from Phase 1. Workflow Definition Registry in Phase 2 (Month 4–5). Background job execution in Phase 3 (Month 8–10). Multi-agent orchestration in Phase 4 (Month 14+).

**Risks**
- Workflow versioning without a migration strategy causes production bugs when a workflow definition changes mid-generation. Version field on all workflow definitions; never mutate a version in-place.
- Background job durability: if a job fails mid-workflow (e.g., AI model returns error on step 4 of 8), the system must resume from the last checkpoint, not restart. Designing checkpoint semantics requires upfront architectural thought.
- Langflow prototype divergence: curriculum staff iterate in Langflow and the production TypeScript implementation drifts. Enforce a sync review process: every Langflow prototype that becomes production-intent must be reviewed by an engineer before TypeScript extraction begins.

**Success Criteria**
- Lesson note generation workflow completes in ≤ 30 seconds end-to-end for a standard 8-section note (P95)
- First token streamed to frontend in ≤ 2 seconds from request submission
- Workflow Definition Registry supports atomic version rollback in ≤ 5 minutes
- Background job failure rate ≤ 0.5% with automatic retry on retriable errors

---

## Capability 5: Knowledge Engine (Crawling + RAG)

**Current Implementation**
Crawl4AI Docker microservice (internal only, never network-exposed) handles web crawling of WAEC, NECO, JAMB, Ministry of Education, and educational blog sources. The TypeScript `KnowledgeCollectorAdapter` submits crawl jobs, receives results, runs SSRF validation before forwarding URLs, and applies a PII filter to results before they reach the vector store. Chunked documents are embedded and stored in pgvector. Retrieval uses a hybrid approach: dense vector search + `pg_trgm` trigram search with result fusion.

**External Dependency**
Crawl4AI (`unclecode/crawl4ai`, Apache 2.0) — Docker microservice, accessed via its FastAPI. pgvector (PostgreSQL extension) for vector storage and retrieval.

**Why It Was Chosen**
Crawl4AI provides browser automation (Playwright), JS rendering, BM25 pre-filtering, LLM schema extraction, and a production-grade job queue in a single deployable service. The alternative — building a crawler from scratch with equivalent capability (session management, infinite scroll, checkpoint resumption, anti-bot handling) — is a 2–3 month senior engineering effort. Crawl4AI shortcut that entirely and directed that engineering effort toward product features.

**What We Learned**
1. Declarative extraction schemas are the correct pattern for educational content ingestion. Defining a `WAECPastQuestion` Pydantic schema (subject, year, paper, question number, question text, options, answer, explanation) and letting the LLM fill it from arbitrary HTML is more robust than brittle CSS/XPath selectors against sites that redesign without notice.
2. BM25 pre-filtering before LLM extraction calls is the correct cost control. Never send full page HTML to an LLM. Score relevance first (cheap), then extract structured data (expensive).
3. The chunking strategy is a content-type decision, not a system-level decision. Subject-specific chunking rules (a mathematics question is a natural chunk boundary; a prose textbook chapter is not) must live in the knowledge service, not in Crawl4AI configuration.
4. SSRF is the primary security risk in any crawling system. URL validation and domain allowlisting must happen in TypeScript before the URL reaches Crawl4AI — never pass raw user-supplied URLs to the crawler.
5. PII can appear in educational content (scholarship pages, results portals). A mandatory PII scan step between extraction and indexing is required. This is not optional.

**TeachNexis-Native Replacement Plan**
Phase 2: For the highest-volume, structurally predictable sources (WAEC past questions, NECO syllabi, NERDC curriculum documents), build lightweight TypeScript-native scrapers using Playwright for Node.js. These sources have stable enough structure for schema-aware extraction without a full Crawl4AI pipeline. Route these in the `KnowledgeCollectorAdapter` away from Crawl4AI.
Phase 3: Build the TeachNexis Knowledge Ingestion Pipeline — a minimal Python async service using raw Playwright + TeachNexis-owned chunker implementations (mirroring Crawl4AI's five chunking strategies but tuned for Nigerian educational content), removing the Crawl4AI dependency entirely for all crawl types. The `KnowledgeCollectorAdapter` interface does not change.

**Estimated Replacement Phase**
Phase 2 partial (high-volume predictable sources, Month 4–6). Phase 3 full (Month 10–14).

**Risks**
- WAEC and government site structure changes break predictable scrapers. Maintain LLM-based schema extraction as a fallback even for "stable" sources.
- Crawl4AI CVE recurrence (multiple CVSS 9.8 issues in 2026): until replaced, maintain strict network isolation and update cadence.
- Native crawler scope creep: a minimal crawler built in-house tends to grow into a general-purpose crawler. Define strict scope: educational Nigerian sources only.

**Success Criteria**
- WAEC past question ingestion pipeline processes 10 years of papers (estimated 50,000 questions) in ≤ 48 hours
- PII scan passes (zero PII indexed) verified by monthly audit of 500 randomly sampled chunks
- Crawl4AI removed from production container manifest after Phase 3 replacement
- Knowledge retrieval P95 latency ≤ 150ms for a standard subject+topic query returning 5 chunks

---

## Capability 6: AI Router (Model Selection + Provider Abstraction)

**Current Implementation**
TeachNexis AI Router — a native TypeScript module that abstracts model selection and provider dispatching. Routes to OpenRouter (for broad model access and fallback routing) and Groq (for inference speed on latency-sensitive workflows like real-time student chat). Model selection is determined by workflow type, latency requirements, and cost tier configured per workflow in the Workflow Definition Registry.

**External Dependency**
OpenRouter (proprietary API aggregator, per-token pricing) and Groq (proprietary inference API, per-token pricing). No external AI routing framework (no LiteLLM, no LangChain router, no Portkey) is used — routing logic is native.

**Why It Was Chosen**
OpenRouter provides access to 200+ models through a single API, enabling rapid model experimentation and fallback routing without maintaining individual provider integrations. Groq provides the lowest inference latency available for open-weight models, critical for streaming workflows where first-token latency directly affects perceived responsiveness. The routing logic is native from day one because external AI routing frameworks (LiteLLM, Portkey) add an abstraction layer over an abstraction layer, create debugging complexity, and carry their own reliability risks.

**What We Learned**
1. Model selection rules belong in workflow configuration, not in code. Hard-coding `model: "claude-3-haiku"` in a function creates a migration task every time a better or cheaper model appears. The Workflow Definition Registry should specify model selection policy per workflow.
2. Provider fallback logic must be synchronous and fast. If OpenRouter returns a 503, the router switches to Groq within 100ms — this logic must be tested with synthetic provider failures.
3. Cost tracking is a first-class requirement, not an afterthought. Every model call must emit a cost event (input tokens, output tokens, provider, model, workflow name) to an internal cost ledger. Without this, AI spend becomes unauditable.
4. Streaming requires provider-specific handling. The router must normalize SSE streams from different providers into a unified `AsyncGenerator<string>` that workflow steps consume identically regardless of the underlying provider.

**TeachNexis-Native Replacement Plan**
Phase 2: Build a direct integration with at least three providers (Anthropic, Google Vertex AI, Groq) replacing OpenRouter for all high-volume workflows. OpenRouter remains useful for low-volume exploration and model switching but should not be in the critical path for production workflows where per-request cost savings compound at scale.
Phase 3: Implement provider selection optimization based on real cost and latency telemetry collected in Phases 1–2. The router uses observed P95 latency and cost-per-token by workflow type to automatically select the cheapest provider that meets the latency SLA for each call. No manual model configuration required.
Phase 4: Evaluate self-hosted inference (vLLM or llama.cpp on dedicated GPU) for the highest-volume, cost-sensitive workflows (student CBT question generation, basic drill feedback). At 10,000 students, inference volume on commodity open-weight models justifies dedicated GPU economics.

**Estimated Replacement Phase**
Phase 2 direct integrations (Month 4–6). Phase 3 optimization layer (Month 9–12). Phase 4 self-hosted evaluation (Month 14+).

**Risks**
- OpenRouter API changes or pricing changes disrupt all model access simultaneously. Build direct Anthropic and Groq integrations before OpenRouter becomes a single point of failure.
- Model capability regression: a new model version deployed by a provider can produce worse output quality for TeachNexis-specific prompts than the previous version. Automated regression testing on workflow outputs is mandatory before adopting new model versions.
- Self-hosted inference GPU economics only make sense above a cost break-even point. Calculate this based on actual usage data collected in Phase 1 before committing to GPU infrastructure.

**Success Criteria**
- Provider failover activates within 200ms of a provider error, transparent to the calling workflow
- Cost ledger captures 100% of model calls with accurate token counts (verified against provider billing dashboards within 1%)
- Model routing produces measurably better cost-per-quality-point than single-provider routing (quality measured by educator satisfaction scores on generated content)
- Zero LiteLLM, Portkey, or LangChain router code in the TeachNexis codebase

---

## Capability 7: Notification Service (SMS, Email, WhatsApp, Push)

**Current Implementation**
Not yet built. Phase 1 includes only basic transactional email via a direct provider API (Resend or similar) for system notifications. No SMS, WhatsApp, or push notification capability exists.

**External Dependency**
Resend (proprietary email API) for transactional email. TextBee (`vernu/textbee`, MIT) evaluated as a Phase 2 SMS candidate for Nigerian number delivery. Africa's Talking evaluated for SMS OTP. WhatsApp Business API (Meta, proprietary) for WhatsApp notifications.

**Why It Was Chosen**
Email via Resend was the fastest path to baseline transactional notifications (welcome emails, password resets, system alerts). The full notification stack (SMS, WhatsApp, push) is Phase 2 because the MVP must first prove the core teaching/learning value before investing in a multi-channel notification architecture.

**What We Learned**
1. SMS delivery in Nigeria is fragmented. International SMS providers (Twilio, SendGrid SMS) have inconsistent delivery rates to Nigerian numbers due to local carrier routing issues. Nigeria-native providers (Termii, Africa's Talking, TextBee) have better delivery rates and lower per-SMS cost.
2. WhatsApp is the dominant communication channel for Nigerian parents and school administrators — not email, not SMS. A notification service that does not support WhatsApp is a significant UX gap for the parent portal.
3. Notification routing (choose SMS vs. WhatsApp vs. push based on user preference and delivery status) requires a stateful delivery tracker, not just a fire-and-forget API call.

**TeachNexis-Native Replacement Plan**
Phase 2: Build the `TeachNexisNotificationService` as a native TypeScript service with pluggable provider adapters. Provider adapters for: Resend (email), Termii/Africa's Talking (SMS), WhatsApp Business API (WhatsApp), and web push (PWA push notifications). A notification definition (recipient, channel, template, variables) is submitted to the service; the service selects the delivery adapter based on recipient preferences and delivery history, sends, tracks, and retries on failure.
Phase 3: Build a notification template engine — versioned, curriculum-aware templates that generate contextually appropriate messages (e.g., "Daniel scored 72% on today's Mathematics quiz — 3 points above his class average. Tap to see his weak areas.") using a small LLM call rather than static templates.

**Estimated Replacement Phase**
Phase 2 multi-channel service (Month 4–7). Phase 3 intelligent templates (Month 10–12).

**Risks**
- WhatsApp Business API requires Meta approval, a verified business account, and ongoing compliance with message template approval processes. Lead time is 2–6 weeks. Start the approval process at the beginning of Phase 2, not when the feature is ready to ship.
- TextBee self-hosting (it's an Android SMS gateway) requires a physical Nigerian SIM and a device running the TextBee app. This is a good fit for school-operated gateways but requires schools to maintain the device.
- Nigeria Communication Commission regulations on bulk SMS require a sender ID registration for business SMS. Non-compliance results in messages delivered as "Unknown Sender" or blocked.

**Success Criteria**
- SMS delivery rate ≥ 95% to Nigerian numbers (verified by Termii/Africa's Talking delivery receipts)
- WhatsApp notification delivery rate ≥ 98% (WhatsApp delivery receipts)
- Notification delivery latency ≤ 30 seconds from event trigger to recipient device
- Failed delivery retry logic: 3 attempts at 1-minute intervals, then fallback to secondary channel

---

## Capability 8: File Storage

**Current Implementation**
Supabase Storage, accessed through a thin `TeachNexisStorageService` adapter. All file operations (upload, download, delete, signed URL generation) are routed through this adapter. No direct Supabase Storage SDK calls appear in feature routes.

**External Dependency**
Supabase Storage (proprietary cloud service, S3-compatible API, free tier limits apply).

**Why It Was Chosen**
Supabase Storage was already part of the initial stack (Supabase was evaluated as a database provider before PostgreSQL/Neon was chosen). Retaining Storage while migrating the database to Neon was pragmatic — the storage adapter was already written, and storage migration is lower risk than database migration.

**What We Learned**
1. S3-compatible APIs are the correct abstraction to target. Any storage provider that speaks S3 can slot behind the `TeachNexisStorageService` adapter with a one-day implementation effort.
2. School documents (uploaded textbooks, lesson notes, student exam papers) are sensitive data. Signed URLs with expiry times are the only correct pattern for serving these files — never generate public permanent URLs for school documents.
3. Per-school storage quotas must be enforced at the service layer, not by the storage provider's account limits. Build quota tracking in the database from Phase 1.

**TeachNexis-Native Replacement Plan**
Phase 2 (if triggered): If Supabase Storage pricing becomes prohibitive at scale, or if NDPR/NITDA creates a data residency requirement that Supabase cannot satisfy, migrate to self-hosted MinIO (S3-compatible, MIT license) deployed in a DigitalOcean Lagos droplet or Azure West Africa region. The `TeachNexisStorageService` adapter requires one adapter file to be swapped — no feature code changes. Self-hosted MinIO eliminates per-GB-month storage cost and puts all school document data in a Nigerian data center.

**Estimated Replacement Phase**
Phase 2 (Month 5–8, triggered by storage volume or compliance requirement). If Supabase Storage remains within budget and compliance, migration may not be necessary until Phase 3.

**Risks**
- MinIO self-hosting introduces storage reliability as an operational responsibility. Data loss due to disk failure requires a backup strategy (replicated across two nodes or backed up to Backblaze B2).
- Supabase Storage migration requires transferring potentially large volumes of files (schools may upload hundreds of GBs of textbooks). Plan a scripted migration with checksums, not a manual copy.

**Success Criteria**
- File upload latency ≤ 5 seconds for files ≤ 10MB (P95)
- Signed URL generation ≤ 100ms P99
- Per-school storage usage tracked accurately within 1% of actual storage consumed
- Zero Supabase Storage SDK direct imports in feature routes after Phase 1

---

## Capability 9: Search (Full-Text + Semantic)

**Current Implementation**
Hybrid search on PostgreSQL: `pgvector` for semantic/dense vector search, `pg_trgm` trigram index for fuzzy full-text matching, `to_tsvector`/`to_tsquery` for exact full-text search. Result fusion uses reciprocal rank fusion (RRF) to merge the three result sets. All search is routed through the `TeachNexisKnowledgeService.retrieve()` method.

**External Dependency**
pgvector (PostgreSQL extension, open-source). `pg_trgm` and `ts_vector` (built-in PostgreSQL extensions). No external search engine (no Elasticsearch, no Typesense, no Meilisearch) is currently in use.

**Why It Was Chosen**
PostgreSQL with pgvector eliminates a dedicated search infrastructure dependency. For Phase 1 corpus sizes (≤ 1M chunks) and query volumes (≤ 100 queries/second), pgvector with IVFFlat indexing is sufficient. Adding Elasticsearch or Typesense would require operating, monitoring, and syncing a separate data store — an operational overhead not justified until search volume exceeds what PostgreSQL can handle.

**What We Learned**
1. Reciprocal rank fusion (RRF) produces better results than score normalization when merging dense and sparse search results. The weights between vector score and BM25 score are domain-dependent; tune them empirically on a held-out evaluation set.
2. Query expansion is important for Nigerian educational queries. A student searching for "surds" should also retrieve "irrational numbers" and "radicals." Build a query expansion layer (using a small LLM or a pre-computed synonym table) before hitting the vector store.
3. pgvector IVFFlat index performance degrades at ≥ 1M vectors without careful tuning of `lists` and `probes` parameters. Monitor index performance proactively and plan a migration to HNSW indexing before performance degrades.

**TeachNexis-Native Replacement Plan**
Phase 2: Add re-ranking using a cross-encoder model (a small, fast model that scores query-chunk pairs more accurately than vector similarity alone). This improves precision without replacing the search infrastructure.
Phase 3: Evaluate dedicated search infrastructure (Typesense, self-hosted) if query volume exceeds PostgreSQL limits or if faceted search requirements (filter by subject, year, exam board, school) create index complexity that PostgreSQL handles poorly. The `TeachNexisKnowledgeService.retrieve()` interface does not change.

**Estimated Replacement Phase**
Enhancement in Phase 2 (re-ranking, Month 5–7). Full infrastructure evaluation in Phase 3 (Month 9–12) based on observed query volume.

**Risks**
- pgvector HNSW migration at large scale requires index rebuild time during which search quality degrades.
- Re-ranking models add latency. A cross-encoder that takes 50ms per chunk × 20 candidates = 1 second added to every search query. Profile before shipping.

**Success Criteria**
- Search retrieval relevance (NDCG@5) ≥ 0.75 on a held-out evaluation set of 500 Nigerian educational queries with ground-truth relevant chunks labeled by domain experts
- Search P95 latency ≤ 200ms for a standard query returning 5 chunks at 10,000 concurrent users
- Zero search queries that return results from a different school's document corpus (isolation audit)

---

## Capability 10: Analytics & Reporting

**Current Implementation**
Basic reporting using Prisma queries aggregated in API routes. No dedicated analytics infrastructure. Reports are generated on-demand (not pre-computed) and cover: student performance per subject per term, class average vs. school average, teacher lesson note generation frequency, CBT question bank coverage by syllabus topic.

**External Dependency**
None — all current analytics are native Prisma + PostgreSQL aggregation queries.

**Why It Was Chosen**
Starting with native Prisma queries avoids premature analytics infrastructure investment. The reporting requirements at Phase 1 are well-understood and low-volume (one report per school per week). Dedicated analytics infrastructure (ClickHouse, Apache Superset, Metabase) is justified only when query complexity or data volume makes PostgreSQL aggregation inadequate.

**What We Learned**
1. Educational analytics for Nigerian secondary schools have a distinct seasonal pattern: extremely high query volume at end-of-term (report card generation) and near-zero between terms. On-demand query architecture must handle 100x normal load during the 2-week end-of-term window.
2. Principal dashboards need pre-computed summaries, not real-time query results. Generating a school-wide performance summary on-demand at 500 students × multiple subjects takes 2–5 seconds. Materialized views or pre-computation jobs are required.
3. WAEC/NECO curriculum gap analysis (which topics have the lowest class average, correlated with past exam frequency) is the highest-value analytics feature for teachers. Building this requires joining student performance data with the knowledge corpus topic taxonomy.

**TeachNexis-Native Replacement Plan**
Phase 2: Build a dedicated `TeachNexisAnalyticsService` with: pre-computed school-level summary snapshots (refreshed nightly via cron), on-demand subject/class/student performance queries, and a basic dashboard API. Materialized views in PostgreSQL handle the pre-computation without a separate data warehouse.
Phase 3: If data volume or query complexity exceeds PostgreSQL's capabilities, evaluate ClickHouse (columnar, self-hosted, MIT license) as an analytics store. Implement an event stream from the application to ClickHouse for append-only event data (quiz submissions, lesson views, AI generations). The analytics service reads from ClickHouse for heavy aggregations and from PostgreSQL for entity lookups.

**Estimated Replacement Phase**
Phase 2 dedicated service (Month 5–8). Phase 3 ClickHouse evaluation (Month 12+) if data volume justifies.

**Risks**
- Pre-computed summaries go stale if the refresh job fails silently. Implement staleness detection: flag summaries older than 25 hours as stale and show a warning in the principal dashboard.
- WAEC gap analysis requires joining student performance data with curriculum topic metadata. This join may be expensive at scale and requires the curriculum topic taxonomy to be stable before running.

**Success Criteria**
- Student performance report generation latency ≤ 3 seconds for a full term's data at 500 students
- Principal dashboard pre-computed summaries refresh within 1 hour of midnight daily
- WAEC topic gap analysis produces actionable output (ranked list of weak topics with past exam frequency) in ≤ 5 seconds

---

## Capability 11: Agent Platform (AI Agents for Teachers, Students, Parents)

**Current Implementation**
Not built. Workflow Service handles structured, deterministic prompt-chain workflows. True AI agents (capable of reasoning, tool use, multi-step planning, and autonomous action selection) do not exist in Phase 1.

**External Dependency**
No production dependency. Langflow (internal lab only) is used to prototype agentic workflows. CrewAI and AutoGen are evaluated as Phase 3 candidates.

**Why It Was Chosen**
Agents are a Phase 3+ capability because they require a mature knowledge corpus (Capability 5), reliable memory (Capability 2), and a proven workflow engine (Capability 4) before they can operate usefully. Shipping agents before these foundations are solid produces unreliable, hallucinatory outputs that erode teacher trust.

**What We Learned**
1. The teacher AI agent context for Nigerian secondary schools is well-defined: it needs access to the student's memory profile, the curriculum topic graph, the WAEC past question bank, and the school's lesson note history. An agent without these as tools is a general-purpose chatbot, not an educational agent.
2. CrewAI's role-based agent model (each agent has a role, backstory, goal, and tool list) is a useful conceptual framework for decomposing complex educational tasks. However, CrewAI is Python-only and tightly coupled to LangChain, which creates the same dependency problem as Langflow.
3. Tool definition is the hardest part of agent design — not orchestration. Define the tool schemas (what the agent can call, what it returns, what errors it surfaces) before choosing an orchestration framework.

**TeachNexis-Native Replacement Plan**
Phase 3: Build the `TeachNexisAgentPlatform` — a native TypeScript agent execution runtime with:
- Tool registry: typed tool definitions that agents can invoke (search knowledge base, retrieve student memory, generate a lesson section, create a quiz question, look up past exam frequency)
- Agent definition store: versioned agent configurations specifying role, goal, available tools, and model routing
- Execution runtime: ReAct-style loop (Reason → Act → Observe) implemented natively, calling tools via the existing service layer
- Audit log: every agent decision (tool selected, tool output, reasoning step) logged with a trace ID for debugging and compliance

No CrewAI, AutoGen, or LangChain in production. These frameworks are studied for their orchestration patterns; the execution is native TypeScript calling TeachNexis services.

Phase 4: Agent specialization — Teacher Agent (lesson planning, question bank curation, student monitoring), Student Agent (personalized revision, practice quiz generation, explanation generation), Parent Agent (progress summaries, attendance alerts, fee reminders in preferred language).

**Estimated Replacement Phase**
Phase 3 core platform (Month 10–14). Phase 4 specialized agents (Month 14–18).

**Risks**
- Agent reliability in educational contexts is a hard problem. An agent that confidently generates an incorrect WAEC answer or provides wrong curriculum guidance damages teacher trust permanently. Implement a confidence threshold below which agents defer to human review.
- Tool call failures in a multi-step agent loop can cascade. Each tool must fail gracefully with a structured error that the agent can reason about, not a raw exception that halts execution.
- Cost control: agents that loop excessively before producing output can generate 10x the expected token cost of a structured workflow. Implement a maximum step budget per agent run.

**Success Criteria**
- Teacher Agent completes a lesson plan for a given subject, topic, and class level in ≤ 60 seconds with ≥ 85% educator satisfaction rating (human evaluation)
- Agent audit log captures 100% of tool calls with inputs, outputs, and latency — zero gaps in trace
- Agent cost per run within 20% of pre-deployment estimate based on average step budget
- Agent step budget exceeded in < 1% of runs (indicates runaway agent loops)

---

## Capability 12: Embedding Model

**Current Implementation**
OpenAI `text-embedding-3-small` (1536 dimensions) via OpenRouter for document chunks stored in the Knowledge Service vector store. Teacher preferences and student memory entries use the same model for consistency. No offline embedding capability exists in Phase 1.

**External Dependency**
OpenAI embedding API (proprietary, per-token pricing) via OpenRouter.

**Why It Was Chosen**
`text-embedding-3-small` offers the best accuracy-to-cost ratio among cloud embedding models at Phase 1 corpus sizes. For a corpus of ≤ 1M chunks, per-token embedding cost is manageable. The model's 1536-dimension output and strong multilingual performance (which handles Yoruba, Hausa, and Igbo code-switching in educational content) were deciding factors.

**What We Learned**
1. Embedding model choice is a long-term commitment. Changing the embedding model requires re-embedding the entire corpus (potentially millions of chunks), rebuilding all vector indexes, and validating retrieval quality. Choose conservatively and plan model migration carefully.
2. Nomic Embed (`nomic-ai/nomic-embed-text-v1.5`, Apache 2.0) runs on CPU with acceptable performance for batch embedding and matches `text-embedding-3-small` on most English benchmarks. It is the correct offline embedding choice for schools with no cloud access.
3. Nigerian educational content has domain-specific vocabulary (subject names like "Further Mathematics," "Agricultural Science"; exam-specific terms like "WAEC," "NECO," "SS3") that may be underrepresented in general embedding model training data. A domain-specific fine-tuned embedding model would improve retrieval relevance.
4. Matryoshka Representation Learning (MRL) embeddings (which OpenAI's `text-embedding-3-small` supports) allow truncating to lower dimensions without significant accuracy loss. This is useful for reducing storage and compute costs if corpus size grows beyond 10M chunks.

**TeachNexis-Native Replacement Plan**
Phase 2: Deploy Nomic Embed as an offline embedding backend for schools operating without cloud connectivity. Maintain `text-embedding-3-small` as the primary cloud backend. Route embedding requests based on school deployment profile (cloud-first vs. offline-capable).
Phase 3: Evaluate fine-tuning a small embedding model (`nomic-embed-text-v1.5` or a similar 137M parameter model) on Nigerian educational text. The training corpus comes from the knowledge service's indexed content. A domain-adapted embedding model improves retrieval precision on Nigerian curriculum queries — the primary use case for TeachNexis's knowledge engine.
Phase 4: Ship `TeachNexis-Embed-v1` — a self-hosted embedding model trained on Nigerian secondary school content, deployed on school servers or dedicated cloud GPU. This eliminates the per-token embedding cost entirely and provides complete data sovereignty for embedding operations.

**Estimated Replacement Phase**
Phase 2 offline Nomic backend (Month 4–6). Phase 3 fine-tuning evaluation (Month 9–12). Phase 4 `TeachNexis-Embed-v1` (Month 14–18).

**Risks**
- Embedding model migration requires re-embedding the full corpus. At 10M chunks × 1536 dimensions × 4 bytes = ~60GB of vector data. Migration must be scripted, checksummed, and run with the old index serving queries until the new index passes quality benchmarks.
- Fine-tuning an embedding model requires high-quality contrastive pairs (query + relevant chunk + irrelevant chunk). Generating 100,000 such pairs from TeachNexis curriculum data requires either human annotation or synthetic generation (using a teacher LLM to generate queries for known chunks).
- Nigerian languages (Yoruba, Hausa, Igbo): no embedding model has been fine-tuned specifically on Nigerian secondary school multilingual content. This is a genuine research gap; fine-tuning may not close it without native-language annotation data.

**Success Criteria**
- Retrieval Recall@5 ≥ 0.80 on Nigerian secondary school curriculum evaluation set (500 human-annotated queries)
- Offline Nomic Embed backend produces retrieval quality within 5% of cloud `text-embedding-3-small` on the same evaluation set
- `TeachNexis-Embed-v1` embedding latency ≤ 50ms per chunk on an A10G GPU (batch of 128 chunks)
- Zero OpenAI API embedding calls for schools in offline deployment mode

---

## 30-Day Implementation Plan

**Focus: OCR Service (production-ready) + Knowledge Service (ingestion pipeline live)**

### Week 1 — OCR Service

| Day | Task | Owner |
|---|---|---|
| 1–2 | Deploy olmOCR Docker service on Modal GPU instance. Expose `/extract` REST endpoint with async job queue backed by PostgreSQL. | Backend |
| 3 | Implement `OllamaVisionBackend` in TypeScript — calls Ollama local REST API with crafted OCR prompt. Test against 10 sample WAEC pages. | Backend |
| 4–5 | Implement `TeachNexisOCRService` TypeScript adapter with backend routing logic (olmOCR for cloud, Ollama for offline). Confidence scoring stub. | Backend |
| 6–7 | Implement file upload route: `POST /api/documents/upload` — validates file type, enforces size limit, submits to OCR queue, returns jobId. | Backend |

### Week 2 — Knowledge Service Foundation

| Day | Task | Owner |
|---|---|---|
| 8–9 | Define knowledge corpus schema in Prisma: `KnowledgeChunk` (id, sourceUrl, sourceType, subject, topic, examBoard, content, embedding, createdAt, schoolId). Run migration. | Backend |
| 10 | Create pgvector index on `KnowledgeChunk.embedding`. Configure IVFFlat with `lists = 100` for initial corpus size. | DBA / Backend |
| 11–12 | Implement chunking pipeline: markdown from OCR → subject-aware chunker (paragraph boundaries for prose, question-boundary chunker for past papers) → chunk objects ready for embedding. | Backend |
| 13–14 | Implement embedding pipeline: chunk objects → OpenAI `text-embedding-3-small` via AI Router → write to pgvector. Batch embeddings (100 chunks/call). Add Nomic Embed path stub. | Backend |

### Week 3 — Crawl4AI Integration + SSRF/PII Hardening

| Day | Task | Owner |
|---|---|---|
| 15–16 | Deploy Crawl4AI Docker service on internal network (no public port). Implement `KnowledgeCollectorAdapter` TypeScript class with SSRF domain allowlist, `submitCrawl()`, `getJobStatus()`, `streamResults()`. | Backend |
| 17–18 | Build WAEC extraction schema (`WAECPastQuestion` Pydantic model). Submit first crawl job against WAEC past question site. Review extraction quality. Iterate on schema. | Backend + Curriculum |
| 19–20 | Implement PII filter step: post-extraction scan for NIN patterns, phone numbers, student ID formats before any chunk reaches the vector store. | Security / Backend |
| 21 | End-to-end test: crawl → extract → chunk → embed → store → retrieve. Verify no PII in indexed chunks. | QA |

### Week 4 — Knowledge Retrieval + Integration Test

| Day | Task | Owner |
|---|---|---|
| 22–23 | Implement `TeachNexisKnowledgeService.retrieve()`: hybrid search (pgvector dense + pg_trgm fuzzy + ts_vector FTS), RRF fusion, return top-5 chunks with source attribution. | Backend |
| 24–25 | Implement `TeachNexisKnowledgeService.buildContext()`: formats retrieved chunks as prompt context for the Workflow Service. Includes source citations for attribution. | Backend |
| 26–27 | Wire OCR Service → Knowledge Service: OCR-processed document automatically enters chunking → embedding → indexing pipeline. | Backend |
| 28–30 | Integration test: teacher uploads a WAEC past paper PDF → OCR extracts → chunks indexed → lesson note generation workflow retrieves relevant past questions → outputs note with citations. Review with one curriculum expert. | Full team |

---

## 90-Day Implementation Plan

**By Day 90, TeachNexis has:**

### Month 2 (Days 31–60)

- **Memory Service (complete):** `TeachNexisMemoryService` fully implemented. `processEvent()` live for quiz submissions (extracts weak topics using Claude Haiku). `buildMemoryContext()` injecting student memory into lesson-note and CBT workflows. `forgetActor()` tested and operational. Audit log on all memory writes.
- **Workflow Service (expanded):** All 6 initial workflow types implemented natively in TypeScript: lesson-note-generation, cbt-question-generation, report-card-narrative, curriculum-mapping, student-revision-plan, parent-progress-report. Streaming SSE for all long-running workflows.
- **AI Router (hardened):** Direct Anthropic SDK integration alongside OpenRouter. Groq path active for latency-sensitive workflows. Cost ledger capturing all model calls with token counts. Provider fallback tested with synthetic failures.
- **Identity Service (formalized):** Clerk adapter fully compliant with `TeachNexisIdentityService` interface. Native student PIN JWT auth live in production. Zero Clerk SDK imports outside `lib/auth/adapters/clerk.ts`. schoolId claim enforced in API middleware.

### Month 3 (Days 61–90)

- **WAEC/NECO Corpus (v1 indexed):** 20,000+ past questions indexed across Mathematics, English, Physics, Chemistry, Biology, Economics. Retrieval quality benchmarked against 100 manual queries. First teacher feedback on AI context relevance collected.
- **Notification Service (Phase 2 MVP):** Multi-channel notification service live: email (Resend), SMS (Termii), WhatsApp (pending Meta approval — fallback to SMS). Delivery tracking and retry logic operational. Per-school notification preferences stored.
- **Analytics Service (MVP):** Per-student performance dashboard live. Class average vs. school average computed. End-of-term report narrative generation operational. Nightly pre-computation cron for principal dashboard.
- **Developer Infrastructure:** Workflow Definition Registry with versioned workflow configurations. Background job queue (PostgreSQL-backed) for long-running tasks. Full test coverage on all service interfaces. Staging environment with production data shape (anonymized).

---

## 12-Month Independence Milestones

### 3 Months (September 2026)

TeachNexis natively owns:
- Memory Service (100% native, no Mem0 dependency)
- Workflow Engine (native TypeScript, Langflow retired from critical path)
- Student Auth (native JWT, independent of Clerk)
- AI Router (direct provider integrations, OpenRouter for fallback only)
- OCR Service interface (olmOCR and Ollama-Vision backends, no direct dependency leakage into feature code)

Monitoring for replacement:
- Crawl4AI (Phase 2 native scrapers for predictable sources beginning)
- Clerk (Logto adapter in development, not deployed)

### 6 Months (December 2026)

TeachNexis natively owns:
- Knowledge Engine for high-volume predictable sources (WAEC, NECO, NERDC — TypeScript-native scrapers, Crawl4AI retired for these source types)
- Notification Service (multi-channel, all adapters native)
- Analytics Service (native PostgreSQL + materialized views)
- Search (hybrid retrieval with re-ranking, fully native)
- Offline embedding path (Nomic Embed backend deployed, OpenAI dependency for cloud-connected schools only)

### 9 Months (March 2027)

TeachNexis natively owns:
- Workflow Definition Registry (versioned, config-driven, curriculum team can update without code deploys)
- Knowledge Engine (full replacement of Crawl4AI, native ingestion pipeline for all source types)
- Identity Service (Logto adapter complete and tested in staging; migration plan finalized)
- Background job execution (durable queue, checkpoint resumption, no Langflow in any environment)

OCR fine-tuning data collection: 50,000+ Nigerian educational document pages annotated, corpus assembled.

### 12 Months (June 2027)

TeachNexis natively owns:
- Agent Platform (Phase 3 core runtime with tool registry, ReAct loop, audit log)
- AI Router (optimizer layer selecting provider/model based on empirical cost and latency data)
- OCR fine-tuning begun (TeachNexis-OCR-2B training pipeline operational)
- Embedding fine-tuning evaluation (50,000 contrastive pairs assembled from knowledge corpus)
- Identity migration complete or formally deferred (decision made with data: MAU count, Clerk costs, NDPR status)

External dependencies remaining (justified):
- Clerk or Logto (not both — migration complete)
- Resend / Termii / WhatsApp API (provider adapters, interface is native)
- PostgreSQL + pgvector (infrastructure, not product dependency)
- Vercel (deployment platform, replaceable at the infrastructure level)

---

## Principles for Evaluating Future Dependencies

**Rule 1: Interface First, Dependency Second**
Before integrating any external tool, write the `TeachNexis[Capability]Service` interface in TypeScript. If you cannot define a clean interface without exposing the dependency's types, the dependency is not yet understood well enough to adopt. The interface must be completable without knowing which tool implements it.

**Rule 2: License Decides Before Architecture**
Before evaluating any repository, check its license. AGPL-3.0 is an immediate hard reject — any AGPL code that runs in the same process as TeachNexis requires TeachNexis to be open-sourced. SSPL is a hard reject for the same reason. GPL is a hard reject for linked libraries. MIT, Apache 2.0, BSD, and MPL-2.0 are acceptable (MPL-2.0 only for tools used unmodified as infrastructure). Check the license of ALL transitive dependencies, not just the top-level repo.

**Rule 3: Self-Hostable or Rejected**
Any dependency that requires sending data to a vendor-controlled server must either offer a complete self-hosted alternative or be classified as a temporary vendor relationship with a defined migration path. Educational data (student performance, lesson content, school documents) cannot have a permanent external data flow without an explicit data processing agreement, NDPR compliance documentation, and school principal consent.

**Rule 4: Measure the Replacement Cost Before You Integrate**
For every dependency, estimate the engineering cost to remove it at the point of adoption. If the answer exceeds 2 weeks of effort, the interface design is insufficient. Tighten the interface until removal is a 2–5 day adapter swap. If that is architecturally impossible (the dependency would be too deeply embedded to isolate), do not adopt it.

**Rule 5: No Direct SDK Imports in Feature Code**
A dependency SDK import in a feature route, middleware handler, or workflow step is a boundary violation. Merge review is the enforcement mechanism. No exceptions. CI linting rules enforce import boundaries from day one.

**Rule 6: Evaluate the June CVE, Not the June Release**
Before adopting any actively developed open-source tool, read its CVE history for the past 18 months. Multiple CVSS ≥ 7.0 vulnerabilities in that window indicate either an immature security posture or an attack surface that will be a maintenance burden. For tools running in your production environment (not just studied), a CVSS ≥ 9.0 unpatched vulnerability is an immediate hard reject.

**Rule 7: Cloud Economics Must Hold at Nigerian School Scale**
Any tool with a cloud-managed tier must be evaluated at 10,000 students × realistic usage patterns, not the toy example in the README. Mem0 Cloud's failure mode (60× over Pro tier capacity) is the canonical example. Self-hosted economics must also be evaluated: a tool that requires a dedicated $500/month GPU to match the cloud tier's performance is not self-hosted in any meaningful sense for a school that cannot afford that infrastructure.

**Rule 8: Nigerian Infrastructure Constraints Are Not Edge Cases**
Network latency from Lagos to AWS us-east-1 is 180–220ms. Cold start latency for a Python service on a shared VPS is 2–5 seconds. Intermittent power outages mean school servers may restart unexpectedly. Any dependency that fails ungracefully on these conditions fails the Nigerian infrastructure test. Evaluate all dependencies under these conditions: slow network, cold start, unexpected restart.

**Rule 9: Community Activity Is a Maintenance Signal, Not a Quality Signal**
GitHub stars measure marketing ability, not engineering quality. Evaluate: the frequency of security patch releases (fast response = good), whether breaking changes are accompanied by migration guides (yes = good), whether the issue tracker shows critical bugs unaddressed for more than 60 days (yes = bad). A tool with 500 stars and a responsive maintainer is preferable to a tool with 50,000 stars and a 6-month backlog of critical bug reports.

**Rule 10: Prototype in the Lab, Decide With Production Data**
No architecture decision that commits TeachNexis to a dependency for more than 12 months should be made on prototype performance alone. Prototype in a sandboxed environment, collect quality and cost data, then decide. Langflow is the correct model: prototype visually, measure prompt quality, extract to native code, retire the tool from the production path. Never promote a prototype to production without this cycle.

---
*Last updated: 2026-07-04. Next scheduled review: 2026-10-01 (Phase 2 midpoint). Owner: Principal Architect.*

---

## 30-Day Implementation Plan

**Goal:** Knowledge Service and OCR Service operational. First lesson note generated end-to-end.

**Week 1 — Foundation**
- [ ] Enable pgvector extension on Supabase/Neon (`CREATE EXTENSION IF NOT EXISTS vector`)
- [ ] Add `KnowledgeDocument`, `KnowledgeChunk`, `OcrJob`, `OcrPage`, `OcrBackendLog` Prisma models; run migration
- [ ] Deploy Ollama with `llama3.2-vision:11b` on a development server (local or cloud VM)
- [ ] Implement `TeachNexisOCRService.extractSync()` using Ollama-Vision backend
- [ ] Wire `POST /api/documents/upload` route to OCR Service (replace direct `pdf-parse` call)
- [ ] Implement `TeachNexisKnowledgeService.ingest()` for plain-text input (no OCR path yet)

**Week 2 — Embedding and Retrieval**
- [ ] Implement OpenAI `text-embedding-3-small` embedding call with batching (100 chunks/call)
- [ ] Implement `KnowledgeService.retrieve()` with pgvector cosine search
- [ ] Implement `KnowledgeService.buildContext()` — format top-K chunks for prompt injection
- [ ] Wire `ingest()` PDF path: uploaded PDF → OCR Service → extract text → chunk → embed → store
- [ ] Manual end-to-end test: upload a WAEC 2023 Mathematics paper, retrieve "quadratic formula" query

**Week 3 — First Workflow**
- [ ] Implement `WorkflowService.stream("lesson-note-generation", input)` — 8-step pipeline
- [ ] Wire `buildContext()` from Knowledge Service into lesson note step 1 (retrieveKnowledgeContext)
- [ ] Implement SSE streaming from workflow step to Next.js API route to frontend
- [ ] Test lesson note generation for SS2 Mathematics topic "Differentiation" with uploaded textbook context

**Week 4 — Memory Service Bootstrap**
- [ ] Add `MemoryEntry`, `MemoryEvent`, `MemoryAuditLog` Prisma models
- [ ] Implement `MemoryService.remember()` and `MemoryService.recall()`
- [ ] Implement `MemoryService.buildMemoryContext()` — format memories for prompt injection
- [ ] Wire teacher memory into lesson note generation (teacher preference context)
- [ ] Implement `processEvent("quiz_submitted")` — extract weak topics from quiz results

---

## 90-Day Implementation Plan

**Month 1** (Days 1–30): As above — Knowledge Service, OCR Service, first workflow, memory bootstrap.

**Month 2 — CBT, Reports, Crawling**
- [ ] Implement `WorkflowService.run("cbt-question-generation")` — uses Knowledge Service past questions
- [ ] Implement `WorkflowService.run("report-card-narrative")` — uses student result data + memory
- [ ] Deploy Crawl4AI Docker service on internal infrastructure
- [ ] Implement `KnowledgeCollectorAdapter` in TypeScript — POST to Crawl4AI API
- [ ] First WAEC past question crawl: 5 years × 9 subjects indexed into Knowledge Service
- [ ] Implement `KnowledgeService.getPastQuestions()` with structured query
- [ ] Identity Service: implement student PIN login (studentCode + bcrypt PIN → TeachNexis JWT)
- [ ] Identity Service: formalise `TeachNexisIdentityService` interface and ClerkAdapter

**Month 3 — Quality, Hardening, Monitoring**
- [ ] olmOCR backend: deploy Python wrapper on cloud GPU (Modal or RunPod), expose REST API
- [ ] Route PDF uploads to olmOCR for cloud-connected schools (higher quality than Ollama-Vision)
- [ ] Implement confidence scoring on OCR results; add quality warning UI for low-confidence pages
- [ ] Add memory hybrid retrieval: pg_trgm keyword search alongside pgvector cosine
- [ ] Implement `WorkflowService.submit()` and `getRunStatus()` — background job queue
- [ ] Deploy Langflow internally for curriculum team — begin prototyping curriculum-gap-analysis
- [ ] Set up monitoring: Grafana/Datadog dashboards for all five services (ingest latency, vector search p95, OCR queue depth, memory write latency, workflow completion rate)
- [ ] Security audit: confirm schoolId scoping on every DB query across all five services
- [ ] NDPR review: confirm PII filter in Knowledge Service, forgetActor() in Memory Service, audit logs active

---

## 12-Month Independence Milestones

**3 Months**
- Knowledge Service: WAEC/NECO/JAMB past questions indexed (10+ years × 9 core subjects)
- OCR Service: olmOCR + Ollama-Vision dual backend operational
- Memory Service: teacher preferences and student weak topics functional
- Identity Service: student PIN login live
- Workflow Service: lesson note + CBT generation streaming to teachers
- Langflow: 3+ workflows prototyped, 2 ported to native TypeScript

**6 Months**
- Knowledge Service: 50+ school textbooks indexed; Crawl4AI crawling weekly
- OCR Service: DeepSeek OCR added as third backend; confidence routing live
- Memory Service: hybrid retrieval (pgvector + pg_trgm) live; parent communication prefs active
- Identity Service: ClerkAdapter fully formalised; LogtoAdapter spec-complete (not deployed)
- Workflow Service: all 8 workflows live; human approval gates active; scheduled workflows running
- Analytics: per-school usage dashboard; per-workflow cost tracking live
- Notification Service: SMS (Africa's Talking) + email live behind TeachNexis abstraction

**9 Months**
- Knowledge Service: citation engine live; curriculum mapping against WAEC syllabus operational
- OCR Service: 95th-percentile latency < 30s for 10-page document; formula accuracy ≥ 90%
- Memory Service: memory conflict resolution with audit trail; auto-purge for expired memories
- Identity Service: bulk teacher import via CSV; school admin org management UI complete
- Workflow Service: multi-step parallel DAG (some steps run concurrently); BullMQ integration
- TeachNexis Knowledge Corpus: publicly queryable API for TeachNexis-licensed schools

**12 Months**
- OCR: TeachNexis-OCR-2B fine-tuning underway on Nigerian textbook corpus
- Memory: entity linking for subject/topic graph; performance trend analysis
- Identity: LogtoAdapter tested in shadow mode; migration playbook written and rehearsed
- Knowledge: knowledge graph planning underway; content versioning for textbook updates
- Workflow: school-customisable report card templates; AI agent prototypes in development
- Embedding: Nomic Embed live as offline backend; TeachNexis-Embed fine-tuning dataset assembled

---

## Principles for Evaluating Future Dependencies

These rules apply to every external tool, library, or service considered for TeachNexis. Violation of any principle requires explicit documented exception with Principal Architect sign-off.

1. **Interface First.** Before evaluating any dependency, name the TeachNexis service that will own the capability. If no service owns it, it doesn't get added. The service interface is written before the dependency is adopted.

2. **License Gate.** AGPL or SSPL licenses are automatic rejections — they require open-sourcing TeachNexis if we distribute modified versions. MIT, Apache 2.0, MPL-2.0, and BSD are acceptable. Proprietary licenses require explicit legal review.

3. **Self-Hosting Requirement.** Any dependency that cannot be self-hosted (cloud-only, no OSS version) must have a documented exit plan. Clerk is the current exception: allowed because the Identity Service adapter makes exit cost minimal.

4. **Data Sovereignty.** Student data and school documents may not transit infrastructure outside TeachNexis's control without explicit opt-in. If a dependency requires sending data to a third-party API, the service must implement an offline/local alternative path.

5. **Scale Economics.** At 10,000 students, calculate the monthly cost of the dependency at realistic usage volumes. If cost exceeds $500/month, the dependency needs a native replacement plan within 12 months. Document this at adoption time, not at cost surprise time.

6. **Security History.** Any dependency with unpatched critical CVEs (CVSSv3 ≥ 9.0) is rejected until patched. Dependencies with 3+ critical CVEs in the past 12 months require isolation (containerised, no direct call from product code) and a replacement plan.

7. **Replacement Readiness.** Before adopting any dependency, document: (a) what the native replacement looks like, (b) estimated engineering cost to build it, (c) which phase it targets. This is written into the repo evaluation, not deferred to "someday."

8. **No Transitive Coupling.** Dependency types must not leak into TeachNexis application code. No Crawl4AI result types in `apps/web`. No Clerk `userId` in business logic. No Mem0 memory types in feature routes. The service interface is the only boundary.

9. **Operational Overhead Budget.** Each new self-hosted dependency adds operational overhead. Infrastructure managed by TeachNexis engineering is capped at: 1 primary database (Postgres), 1 cache (Redis, Phase 2+), 2 background workers (OCR, Knowledge). Additional self-hosted services require decommissioning an existing one or explicit team capacity allocation.

10. **Prototype Boundary.** Prototyping tools (Langflow, Open WebUI, LibreChat) run on developer machines or isolated internal environments. They never receive real student or school data. They never appear in the production dependency graph. Violation of this is a security incident, not a configuration mistake.
