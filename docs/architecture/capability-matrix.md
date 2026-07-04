# TeachNexis Capability Matrix

**Version:** 1.0  
**Last Updated:** 2026-07-04  
**Owner:** TeachNexis Architecture Team

---

## Purpose

This matrix is the single source of truth for every technology decision in the TeachNexis platform. For any capability, it answers:

1. **What are we using today?** (Current)
2. **What are the alternatives we evaluated?** (Alternatives)
3. **What is the verdict?** (Decision)
4. **When do we reconsider?** (Trigger to revisit)

Use this before adding any new dependency. If a technology is not in this matrix, evaluate it and add a row before approving a PR that introduces it.

---

## Decision Legend

| Symbol | Meaning |
|---|---|
| **USE** | Approved for production use in TeachNexis |
| **WRAP** | Use behind a TeachNexis service layer; never expose directly to application code |
| **STUDY** | Evaluate; do not ship until evaluation is complete |
| **BUILD** | Build a TeachNexis-native implementation instead |
| **AVOID** | Do not use; documented here to prevent re-evaluation |
| **PROTOTYPE** | Approved for prototyping and internal tooling only; never production |
| **MIGRATE** | Currently in use; plan to migrate away; document trigger conditions |

---

## Fast-Reject Criteria

Any technology failing one or more of these criteria is immediately rejected without further evaluation:

| Criterion | Reason |
|---|---|
| AGPL-3.0 or similar copyleft license | Forces TeachNexis code to be open-sourced |
| No security audit in 18+ months (for security-critical components) | Unacceptable risk for student data |
| Vendor lock-in to a single cloud with no migration path | Violates platform sovereignty |
| Stores Nigerian student data outside Nigeria without explicit consent mechanism | NDPR violation |
| No active maintenance (last commit > 12 months for core dependency) | Long-term support risk |
| Requires direct internet access from within the classroom (for classroom-mode features) | Excludes low-connectivity schools |

---

## Matrix

### 1. Authentication and Identity

| Capability | Current | Alternatives Evaluated | Decision | Trigger to Revisit |
|---|---|---|---|---|
| Teacher/Admin auth | Clerk | Logto, Auth.js, Supabase Auth, custom | USE Clerk (MIGRATE → Logto at 40k MAU) | MAU > 40,000; NDPR data residency; Clerk pricing unworkable |
| Student PIN login | TeachNexis-native (RS256 JWT + bcrypt) | Clerk passkeys, Supabase Auth, Magic Link | BUILD (done) | Never — this is core IP; students must not depend on external identity services |
| OIDC provider | Clerk (Phase 1) / Logto (Phase 2) | Keycloak, Dex, Auth0, Firebase Auth | WRAP Clerk; MIGRATE to Logto | See above |
| Session storage | Redis (Upstash) | In-memory, DB-backed | USE Redis | Redis cost > $200/month at scale → evaluate Valkey self-hosted |
| Multi-tenancy isolation | `schoolId` JWT claim + DB-layer enforcement | Row-level security (RLS) only | BUILD (done) | If Supabase RLS matures enough to be sole enforcement layer |

---

### 2. AI Language Models

| Capability | Current | Alternatives Evaluated | Decision | Trigger to Revisit |
|---|---|---|---|---|
| Primary LLM (lesson generation, grading) | Claude Sonnet 4.6 (Anthropic API) | GPT-4o, Gemini 1.5 Pro, Llama 3.1, Mistral | USE Claude Sonnet 4.6 | Claude pricing > $0.02/1k output tokens; Nigerian curriculum accuracy degrades |
| Offline/low-connectivity LLM | Ollama (llama3.1:8b) | LM Studio, llamafile, GPT4All | WRAP Ollama (TeachNexis Offline Service) | Better quantized model available; Ollama license changes |
| Embedding model (cloud) | OpenAI text-embedding-3-small | Cohere Embed v3, Voyage AI, Jina Embeddings | USE text-embedding-3-small | Cost > $0.002/1M tokens changes; Nomic matures for production |
| Embedding model (offline) | Nomic Embed (v1.5) | all-MiniLM, BGE-M3, E5-Large | STUDY → USE for offline schools | Accuracy benchmark on Nigerian educational text |
| LLM Router | TeachNexis-native (`lib/ai/router.ts`) | LiteLLM, PortKey, Helicone | BUILD (done) | LiteLLM adds Nigeria-specific features or dramatically reduces cost |
| AI Gateway | Direct API calls via router | Vercel AI Gateway, PortKey, Helicone | STUDY Vercel AI Gateway | When observability requirements exceed current router capabilities |

---

### 3. OCR and Document Processing

| Capability | Current | Alternatives Evaluated | Decision | Trigger to Revisit |
|---|---|---|---|---|
| Cloud OCR (primary) | Cloudflare Workers AI (llama-3.2-11b-vision) | AWS Textract, Google Document AI, Azure Form Recognizer | WRAP (OCR Service adapter) | Cloudflare accuracy on handwritten Nigerian text < 85%; quota exhaustion |
| Cloud OCR (fallback) | OpenAI Vision (gpt-4o-mini) | Mistral Pixtral, Anthropic Vision, Gemini Vision | WRAP (OCR Service fallback) | Cost > $0.01/page; better open-source vision model available |
| GPU OCR | olmOCR (Qwen2-VL-7B) | Surya OCR, Nougat, PaddleOCR | WRAP (olmOCR adapter) for GPU-enabled schools | Phase 2 — not Phase 1 |
| Offline OCR | Ollama Vision (llama3.2-vision:11b) | Tesseract, EasyOCR, Moondream | WRAP (Ollama Vision adapter) | Accuracy on exam papers < 90%; better offline model available |
| PDF parsing | Supabase Storage → fetch → OCR pipeline | pdf-parse, pdfjs-dist, pdf2pic | BUILD pipeline (done); avoid pdf-parse in Turbopack | If native PDF text extraction quality matches OCR output |
| DOCX → text | Mammoth.js | Pandoc, docx.js | USE Mammoth | License issues or bundle size concerns |
| Formula detection | Regex + heuristic (Phase 1) | MathPix, Pix2Text, LaTeX-OCR | BUILD heuristic (Phase 1); STUDY MathPix for Phase 3 | When 20%+ of processed documents contain formulas |

---

### 4. Vector Search and Knowledge

| Capability | Current | Alternatives Evaluated | Decision | Trigger to Revisit |
|---|---|---|---|---|
| Vector database | pgvector (PostgreSQL extension) | Pinecone, Weaviate, Qdrant, Chroma, Milvus | USE pgvector | Index exceeds 10M vectors per school; Qdrant may be needed |
| Vector index type | HNSW (pgvector) | IVFFlat, exact search | USE HNSW | Recall accuracy drops below 90% on benchmarks |
| Chunking strategy | Sliding window (512 tokens, 128 overlap) | Sentence boundary, paragraph, semantic | BUILD TeachNexis chunker (done) | Retrieval quality benchmarks show better strategy |
| RAG framework | TeachNexis-native (Knowledge Service) | LlamaIndex, LangChain, Haystack | BUILD native (done) | Never — knowledge retrieval is core IP |
| Web crawling | Crawl4AI (Python, Docker) | Firecrawl, Jina Reader, Scrapy | WRAP Crawl4AI behind TeachNexis Crawl API | SSRF vulnerabilities not patched; Crawl4AI license changes from Apache 2.0 |
| Crawl allowlist | TeachNexis-native (SSRF guard) | None — no library handles this | BUILD (required before production) | N/A — this is a security control, never remove |
| Semantic deduplication | alibaba/zvec (Phase 6+) | SimHash, MinHash, LLM-based | STUDY zvec | Phase 6 — not current priority |
| Nigerian curriculum mapping | TeachNexis-native (WAEC/NECO fixtures) | None available externally | BUILD (required for Phase 1) | MoE publishes machine-readable syllabus API |

---

### 5. Memory and Personalization

| Capability | Current | Alternatives Evaluated | Decision | Trigger to Revisit |
|---|---|---|---|---|
| Student learning memory | TeachNexis-native (Memory Service, pgvector + BM25) | Mem0 (cloud), Zep, MotherDuck, Graphiti | BUILD native (done) | At 10k students, Mem0 cloud = 60× over Pro tier capacity. Never viable. |
| Teacher preference memory | TeachNexis-native (Memory Service) | Mem0, raw DB | BUILD native | Same as above |
| BM25 keyword search | Custom implementation (PostgreSQL FTS) | Elasticsearch, Meilisearch, Typesense | BUILD with PostgreSQL FTS (ts_rank) | Typesense evaluated if school-level search needs advanced ranking |
| Entity extraction | spaCy (Python microservice, Phase 3) | Claude extraction, NER models, Flair | STUDY spaCy for Phase 3 | Phase 3 — not current priority |
| Conflict resolution (memory) | Recency wins + confidence decay | LLM arbitration | BUILD (done — Section 7 of Memory Service Architecture) | Accuracy of recency heuristic drops below 80% in A/B test |

---

### 6. Workflow Orchestration

| Capability | Current | Alternatives Evaluated | Decision | Trigger to Revisit |
|---|---|---|---|---|
| Workflow engine | TeachNexis-native (Workflow Service, TypeScript) | Langflow, n8n, Temporal, Prefect, Airflow | BUILD native (done) | Never — educational workflow logic is core IP |
| Visual workflow editor (internal) | Langflow (PROTOTYPE only) | n8n, Flowise, Windmill | PROTOTYPE Langflow | Any Langflow visual design promoted to production must be reimplemented in TypeScript |
| Job queue (async tasks) | BullMQ + Redis | Inngest, Trigger.dev, Vercel Queues | USE BullMQ | If Vercel Queues GA becomes cost-competitive and reduces Redis dependency |
| Job queue (serverless) | Vercel Queues (evaluation) | Inngest, Trigger.dev | STUDY Vercel Queues | GA + NDPR-compliant data residency |
| Human approval gate | TeachNexis-native (HumanApprovalGate step) | Slack approval, email approval | BUILD (done) | N/A |
| Streaming (SSE) | Server-Sent Events (native Next.js) | WebSockets, long polling | USE SSE | When bidirectional communication required → evaluate WebSockets |
| Cron scheduling | Vercel Cron | BullMQ scheduler, node-cron, GitHub Actions | USE Vercel Cron | When school-level cron customization needed → BullMQ scheduler |

---

### 7. Database and Storage

| Capability | Current | Alternatives Evaluated | Decision | Trigger to Revisit |
|---|---|---|---|---|
| Primary database | Supabase PostgreSQL | Neon, PlanetScale, CockroachDB, Turso | USE Supabase | Data residency outside Nigeria mandated by NDPR → evaluate Neon Lagos region |
| ORM | Prisma | Drizzle ORM, TypeORM, Knex | USE Prisma | Prisma v6 performance issues persist; Drizzle has better type inference |
| File storage | Supabase Storage | Cloudflare R2, AWS S3, Vercel Blob | USE Supabase Storage | Storage cost > R2 at 1TB; Supabase Lagos region unavailable forces R2 evaluation |
| Cache / session store | Upstash Redis | Railway Redis, Render Redis, self-hosted Valkey | USE Upstash Redis | Monthly cost > $200 → evaluate Valkey self-hosted |
| Full-text search | PostgreSQL FTS (ts_rank, tsvector) | Typesense, Meilisearch, Elasticsearch | USE PostgreSQL FTS | Search quality benchmarks fail for teacher-facing lesson search |
| Migrations | Prisma Migrate | Flyway, Liquibase, raw SQL | USE Prisma Migrate | If Prisma baseline migrations become unreliable at team scale |

---

### 8. Frontend and UI

| Capability | Current | Alternatives Evaluated | Decision | Trigger to Revisit |
|---|---|---|---|---|
| Framework | Next.js 16 (App Router) | Remix, SvelteKit, Nuxt, Astro | USE Next.js | Vercel deploys another framework better; App Router instability |
| Build system | Turbopack | Webpack, Vite | USE Turbopack | Turbopack production stability issues |
| UI components | Shadcn/UI + Tailwind CSS | Radix UI, Chakra, MUI, Ant Design | USE Shadcn/UI | Accessibility audit fails; better component quality needed |
| Animation | Framer Motion | GSAP, CSS animations, Motion One | USE Framer Motion (landing page: GSAP) | Bundle size > 50KB for non-landing pages |
| Landing page 3D | Three.js + GSAP | Spline, Rive, CSS 3D | USE Three.js | Performance on low-end Android phones fails Core Web Vitals |
| Smooth scrolling | Lenis | Locomotive Scroll, native scroll | USE Lenis | Library abandoned |
| Form handling | React Hook Form + Zod | Formik, TanStack Form | USE React Hook Form + Zod | N/A — mature and stable |
| Data fetching | TanStack Query | SWR, React Query (same), Zustand | USE TanStack Query | N/A |
| State management | Zustand + TanStack Query | Redux Toolkit, Jotai, Valtio | USE Zustand | App complexity requires more structure → evaluate Jotai |

---

### 9. Infrastructure and Deployment

| Capability | Current | Alternatives Evaluated | Decision | Trigger to Revisit |
|---|---|---|---|---|
| Hosting (web app) | Vercel | Railway, Render, Fly.io, AWS | USE Vercel | Vercel pricing > Railway at scale; NDPR requires Nigeria hosting |
| Monorepo tooling | Turborepo | Nx, Lerna, Bazel | USE Turborepo | Build times exceed 15 minutes on CI |
| Package manager | pnpm | npm, Yarn, Bun | USE pnpm | pnpm workspace bugs affect monorepo reliability |
| CI/CD | GitHub Actions | Vercel CI, CircleCI, Buildkite | USE GitHub Actions | Cost > $500/month on GHA; self-hosted runners needed |
| Container orchestration | None (Phase 1) / Docker Compose (offline) | Kubernetes, Nomad, Fly Machines | STUDY Kubernetes for Phase 3 GPU nodes | olmOCR GPU nodes require orchestration |
| Secrets management | Vercel Environment Variables | HashiCorp Vault, Doppler, AWS Secrets Manager | USE Vercel + Doppler (STUDY Doppler) | Team > 10 engineers needing secret rotation workflows |
| CDN | Vercel Edge Network | Cloudflare, Fastly | USE Vercel CDN | Media assets > 10GB/month → evaluate Cloudflare R2 + CDN |

---

### 10. Observability and Monitoring

| Capability | Current | Alternatives Evaluated | Decision | Trigger to Revisit |
|---|---|---|---|---|
| Error tracking | Sentry | Datadog, Honeybadger, BugSnag | USE Sentry | Sentry pricing > $100/month; evaluate self-hosted Sentry |
| Logging | Structured JSON logs → Vercel Log Drains | Datadog, Axiom, Logtail, Papertrail | USE Vercel Log Drains + Axiom | Log volume > 50GB/month → evaluate Axiom pricing vs Loki |
| Metrics | Vercel Analytics + custom events | Datadog, Prometheus/Grafana, PostHog | USE Vercel Analytics + PostHog | Product analytics needs funnel analysis → PostHog |
| Performance monitoring | Vercel Speed Insights | Sentry Performance, Datadog RUM | USE Vercel Speed Insights | Core Web Vitals debugging requires trace-level detail |
| Uptime monitoring | Vercel built-in | Better Uptime, Freshping, UptimeRobot | USE Better Uptime (evaluate) | N/A |
| AI cost tracking | Custom logging in LLM Router | Helicone, PortKey, LangSmith | BUILD custom (Phase 1); STUDY Helicone | AI spend > $500/month → observability justified |

---

### 11. Security

| Capability | Current | Alternatives Evaluated | Decision | Trigger to Revisit |
|---|---|---|---|---|
| SSRF protection | TeachNexis allowlist (URL validation before any external call) | None available as library | BUILD (required — not optional) | N/A — this is a security invariant |
| Rate limiting | Vercel Edge Rate Limiting + custom (Redis token bucket) | Upstash Rate Limit, nginx rate limit | USE Vercel + Redis hybrid | Edge rate limit insufficient for authenticated API abuse |
| WAF | Vercel built-in | Cloudflare WAF, AWS WAF | USE Vercel WAF | WAF bypass attacks detected; evaluate Cloudflare |
| Secret scanning | GitHub Advanced Security / Gitleaks | TruffleHog, detect-secrets | USE Gitleaks (pre-commit hook) | N/A |
| Dependency audit | pnpm audit + Dependabot | Snyk, Socket.dev | USE Dependabot + pnpm audit | Critical CVE in student-facing dependency → Socket.dev for real-time |
| JWT validation | RS256 + jti replay protection | HMAC (HS256), opaque tokens | BUILD RS256 (done) | N/A — RS256 is the correct choice for distributed validation |
| PII detection (OCR output) | Regex heuristics (Phase 1) | AWS Comprehend, spaCy NER, Azure PII | BUILD heuristic (Phase 1); STUDY spaCy NER for Phase 3 | False negative rate > 5% on exam papers |

---

### 12. Phase 2 Candidates (Evaluated but Not Yet Approved)

| Capability | Repository/Tool | License | Evaluation Status | Planned Phase |
|---|---|---|---|---|
| Structured data extraction | Instructor (Python) | MIT | STUDY | Phase 2 |
| Async task orchestration | Temporal | MIT/BSL | STUDY | Phase 3 |
| Offline embedding | Nomic Embed v1.5 | Apache 2.0 | STUDY | Phase 2 |
| PDF → structured extraction | Nougat (Meta) | CC-BY-NC | AVOID — non-commercial license | — |
| Formula OCR | Pix2Text | Apache 2.0 | STUDY | Phase 3 |
| Nigerian NLP | AfroNLP models | Various | STUDY | Phase 3 |
| Search quality | Typesense | GPL-3.0 (server) | STUDY — license concern | Phase 2+ |
| Graph memory | Graphiti (Zep) | Apache 2.0 | STUDY | Phase 4 |
| Semantic deduplication | alibaba/zvec | Apache 2.0 | STUDY | Phase 6 |
| AI observability | Helicone | MIT | STUDY | Phase 2 |

---

### 13. Phase 3 AI Research Candidates (Early Evaluation)

| Capability | Repository/Tool | License | Notes |
|---|---|---|---|
| Speech-to-text (classroom) | Whisper (OpenAI) | MIT | Offline use case; evaluate whisper.cpp |
| Text-to-speech (accessibility) | Kokoro TTS | Apache 2.0 | Nigerian English accent support TBD |
| Handwriting recognition | TrOCR (Microsoft) | MIT | Complement to OCR Service for handwritten student work |
| Question generation | QuestionWell alternative | Build | WAEC-style question generation requires TeachNexis fine-tuning |
| Plagiarism detection | Custom (pgvector cosine similarity) | Build | Compare student submissions against Knowledge Service index |
| Adaptive quiz engine | Custom | Build | Core IP — never delegate to third-party |

---

## Architecture Review Checklist

Before approving any new dependency, the introducing engineer must answer all questions:

### License
- [ ] What is the SPDX license identifier?
- [ ] Does it allow commercial use without open-sourcing TeachNexis code?
- [ ] If MPL-2.0: is the dependency isolated from TeachNexis code via a service boundary?
- [ ] If AGPL: REJECT immediately.

### Data and Privacy
- [ ] Does this dependency process student data? If yes:
  - [ ] Where is data stored (region)?
  - [ ] What is the data retention policy?
  - [ ] Does it comply with NDPR requirements?
- [ ] Does it make outbound network calls? If yes:
  - [ ] Is SSRF possible? Is an allowlist implemented?
  - [ ] Can it be air-gapped for offline schools?

### Security
- [ ] When was the last security audit?
- [ ] Are there open CVEs? Check NVD and the repo's security advisories.
- [ ] What is the attack surface added? (new HTTP endpoints, new network calls, new file parsing)

### Architecture Fit
- [ ] Is this behind a TeachNexis service interface? (Never expose third-party interfaces directly to application code)
- [ ] Is there a fallback if this dependency fails or is removed?
- [ ] Does this create vendor lock-in? What is the migration path?
- [ ] Does this work offline / on low-bandwidth connections (for classroom-mode features)?

### Operational
- [ ] What monitoring is added for this dependency?
- [ ] What is the estimated cost at 1,000 schools / 50,000 students?
- [ ] Who maintains this? Last commit date? Bus factor?

---

## Matrix Maintenance Rules

1. **Every new production dependency gets a row.** No exceptions. "It's just a utility" is not an exemption.
2. **Verdicts are reviewed quarterly.** The architecture team reviews all STUDY rows and promotes or rejects them.
3. **Trigger conditions are actionable.** Each trigger must be a measurable threshold (MAU, cost $, accuracy %) — not vague phrases like "when we scale."
4. **AVOID is permanent documentation.** When a technology is rejected, it stays in the matrix as AVOID with the reason, so future engineers don't re-evaluate it.
5. **This matrix does not replace service architecture docs.** It is a decision index. Full rationale, interface design, and implementation details live in the service architecture documents in `docs/architecture/`.
6. **Violations are blocking.** A PR that introduces a dependency not in this matrix (or that contradicts an AVOID verdict) must not be merged without updating this matrix first.

---

*This document is owned by the TeachNexis Architecture Team. Changes require review from the platform lead.*
