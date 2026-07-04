# Repository Evaluation: Crawl4AI

**Repository:** https://github.com/unclecode/crawl4ai  
**Category:** Web Crawling / Knowledge Ingestion  
**TeachNexis Service Target:** TeachNexis Knowledge Collector  
**Priority:** Phase 1 — Highest  
**Evaluated:** 2026-07-04  

---

## What It Does

Crawl4AI is a Python async web crawler built on Playwright that turns any web page into LLM-ready Markdown. It is not a simple HTTP scraper. The full pipeline:

1. Browser launch (Chromium/Firefox/WebKit via Playwright)
2. Page render + JS execution
3. Shadow DOM flattening + lazy-load/infinite-scroll simulation
4. Content filtering via BM25 pruning
5. Markdown generation with citation anchors
6. Optional LLM extraction pass using a JSON schema you define
7. Structured Pydantic output

Ships a FastAPI-based Docker API server with JWT auth, Redis-backed job queue, and a real-time monitoring dashboard — meaning it can be run as a standalone microservice, not just a Python library.

**Security note:** v0.9.0 (June 2026) patched multiple CVSSv3 9.8 RCEs. The team's response was fast and mitigations are sound, but the volume of critical vulns is a caution flag for shared-environment deployments.

---

## Tech Stack

- **Language:** Python 3.10+, async-first (asyncio throughout)
- **Browser layer:** Playwright (Chromium default)
- **API server:** FastAPI + Uvicorn
- **LLM abstraction:** `unclecode-litellm` (wraps OpenAI, Anthropic, Groq, Ollama, DeepSeek)
- **Data validation:** Pydantic v2
- **Content filtering:** BM25Okapi
- **Caching/queue:** Redis
- **Auth:** JWT

---

## License

**Apache 2.0** — fully permissive for commercial use, modification, and redistribution.

---

## Production Readiness

- **GitHub stars:** ~70,900 | **Forks:** 7,300 | **Dependents:** 3,100
- **Latest release:** v0.9.0 (June 18, 2026) — actively maintained
- **Stability:** API still evolving (breaking changes in 0.9.0); version pinning mandatory
- **Assessment:** Beta-grade internal tool. Not hardened for public-facing deployment without additional controls.

---

## TeachNexis Use Cases

| Use Case | Relevance |
|---|---|
| WAEC/NECO/JAMB past-question pages — LLM schema extraction | High |
| Ministry of Education circulars and policy PDFs | High |
| Educational blogs (Nairalearn, PrepClass, etc.) — BM25-filtered | High |
| Scholarship portals with session auth (PTDF, Chevron, state govt) | High |
| Infinite-scroll / JS-rendered pages | Medium |
| Recurring crawls with adaptive pattern learning | Medium |
| Deep crawl with checkpoint resumption (for unstable Nigerian connectivity) | High |

---

## What TeachNexis Can Learn

1. **Declarative extraction schemas:** Define a Pydantic schema (`WAECPastQuestion`, `NECOSyllabusTopic`, `ScholarshipListing`) — Crawl4AI chunks, extracts, and merges. This pattern should inform TeachNexis's knowledge ingestion pipeline regardless of the underlying crawler.
2. **BM25 pre-filter before LLM calls:** Run relevance scoring first (cheap), then LLM extraction (expensive). Never send full page HTML to an LLM.
3. **Pipeline hook architecture:** 8 hook points (before request, after fetch, before LLM pass, after extraction). TeachNexis should intercept at "after Markdown generation" to run subject-matter tagging before the LLM extraction step.
4. **Browser pool with warm instances:** 3–5 warm Chromium instances vs. spawning fresh per job. Apply this in the TeachNexis Knowledge Collector for background ingestion jobs.
5. **Chunking strategy abstraction:** Five chunkers (Regex, Sentence NLP, Topic-based TextTiling, Fixed-length, Sliding Window). TeachNexis should implement the same abstraction — different strategies for different content types.
6. **Rate limiting with `mean_delay`/`max_range`:** Respect target server infrastructure, especially fragile Nigerian government sites.

---

## What to Avoid

- **Do not use `unclecode-litellm`.** TeachNexis already has LLM provider logic. Two competing LLM routers create confusion. Call your provider directly in the extraction pipeline.
- **Do not use CSS/XPath brittle selectors for long-lived production scrapers.** WAEC and government sites redesign without notice. Use LLM schema extraction (layout-agnostic) for recurring sources.
- **Do not deploy with network-accessible `execute_js`.** Disabled by default in 0.9.0 but was a CVSS 8.1 vector in 0.8.x. Audit Docker Compose to confirm ports are not published to host network.
- **Do not expose Crawl4AI's Docker API publicly.** Always behind a VPN or auth proxy, internal only.

---

## Integration Risks

| Risk | Severity | Mitigation |
|---|---|---|
| Language boundary (Python service vs TypeScript app) | Medium | HTTP API adapter — call Crawl4AI's FastAPI from TypeScript |
| Cold start latency (~800ms Playwright + 3–5s container) | High | Never use in synchronous user-facing path; background jobs only |
| Rate limiting / IP blocking on Nigerian govt sites | High | Set 3s+ delay per domain; use residential proxy for WAEC/NECO |
| Playwright binary size (~280MB → 500MB+ Docker image) | Medium | Cache in CI/CD; use DigitalOcean Lagos for proximity |
| Session loss on container restart | Medium | Re-auth on each ingestion run; no persistent session assumption |
| API breaking changes between versions | Medium | Pin version, test on upgrades, use adapter interface |

---

## Security and Privacy

- **SSRF:** Three SSRF CVEs patched between 0.8.7 and 0.9.0. **Never pass raw user-supplied URLs to Crawl4AI.** Validate and allowlist server-side before forwarding.
- **PII during ingestion:** Scholarship and results pages may include student names and IDs. Implement a PII filter step after extraction, before indexing into vector store. Scan for NIN patterns, phone numbers, student IDs.
- **LLM API keys:** Keys stored in env vars, never in crawl job definitions. Monitor for spend spikes from runaway crawl jobs.
- **Crawl result cache:** HTML/Markdown cached to disk. Mount cache volume with filesystem permissions and set a TTL — do not retain raw HTML indefinitely.
- **Log injection:** CRLF patch in 0.8.8. Ensure log aggregator does not capture crawled page content.

---

## Dependency Risks

| Dependency | Risk |
|---|---|
| Playwright | Large binary; Chromium security updates require Playwright bumps which can break Crawl4AI. Pin version. |
| unclecode-litellm | Fork of LiteLLM — do not use for TeachNexis LLM routing; bypass this dependency entirely |
| Redis | Required for Docker API job queue; adds operational complexity for small teams |
| Pydantic v2 | Stable; watch for ecosystem compatibility with other Python services |
| Python 3.10+ | Pin explicitly in Docker base image |

---

## Recommended Service Abstraction

**Service Name:** `TeachNexisKnowledgeCollector`

```typescript
interface KnowledgeCollectorService {
  submitCrawl(request: CrawlRequest): Promise<string>; // returns jobId
  getJobStatus(jobId: string): Promise<CrawlJobStatus>;
  streamResults(jobId: string): AsyncIterable<ExtractedDocument>;
  crawlNow(url: string, schema: ExtractionSchema): Promise<ExtractedDocument>;
}

interface CrawlRequest {
  url: string;
  sourceType: "waec" | "neco" | "jamb" | "moe_doc" | "scholarship" | "blog";
  extractionSchema: ExtractionSchema;
  sessionContext?: SessionContext;
  crawlOptions?: {
    maxDepth?: number;
    maxPages?: number;
    delayMs?: number;           // Per-domain rate limit — enforced here
    allowedDomains?: string[];  // SSRF allowlist — validated before reaching Crawl4AI
  };
}

interface ExtractedDocument {
  sourceUrl: string;
  sourceType: string;
  extractedAt: string;
  markdown: string;
  structured: Record<string, unknown>; // LLM-extracted structured fields
  chunks: TextChunk[];                 // Pre-chunked for vector store
  piiScanPassed: boolean;              // Must be true before indexing
}
```

**Critical design rule:** SSRF validation happens in TypeScript before the URL reaches Crawl4AI. PII scan happens on results before they reach the vector store. No Crawl4AI types (CrawlerRunConfig, CrawlResult) appear in the TeachNexis codebase.

---

## Build vs Wrap vs Study

**Recommendation: WRAP (Phase 1) → REPLACE SELECTIVELY (Phase 2–3)**

| Phase | Action |
|---|---|
| Phase 1 | Deploy Crawl4AI Docker microservice internally. Build TypeScript `KnowledgeCollectorAdapter` that calls its API. |
| Phase 2 | For highest-volume, predictable sources (WAEC past Qs, NECO syllabi), build lightweight TypeScript-native scrapers using Playwright for Node.js. These sources have regular structure — no LLM extraction needed. Route these in the adapter away from Crawl4AI. |
| Phase 3 | If Crawl4AI requires significant rework on upgrade, or crawl volume justifies a purpose-built service, replace with a minimal Python async crawler using raw Playwright + own chunker. |

Do not build from scratch now. Building a production-grade crawler with session management, crash recovery, checkpoint resumption, and anti-bot handling takes a senior engineer 2–3 months. Ship the product first.

---

## Replacement Strategy

The adapter IS the exit ramp. The critical success condition: no Crawl4AI-specific types appear in TeachNexis TypeScript code. If those types appear, replacing the underlying service will hurt.

Milestones:
1. Month 1: Crawl4AI adapter live, first WAEC/NECO ingestion running
2. Month 6: High-volume predictable sources migrated to native TypeScript scrapers
3. Month 12–18: If needed, full replacement with minimal Python service using raw Playwright

---

## Final Verdict

Crawl4AI is the most capable open-source educational content crawler available today. The browser automation, BM25 chunking pipeline, and LLM schema extraction save weeks of plumbing work. **Wrap it immediately behind a `TeachNexisKnowledgeCollector` interface with strict URL allowlisting and PII filtering on every result.** The June 2026 CVE history means it must never be exposed beyond your internal network. Study its architecture regardless of how long you use it — the patterns are directly applicable to TeachNexis's knowledge pipeline.
