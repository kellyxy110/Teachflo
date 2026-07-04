# Repository Evaluation: Mem0

**Repository:** https://github.com/mem0ai/mem0  
**Category:** AI Memory Layer / Knowledge Distillation Pipeline  
**TeachNexis Service Target:** TeachNexis Memory Service  
**Priority:** Phase 1 — Highest  
**Evaluated:** 2026-07-04  

---

## What It Does

Mem0 is not a database — it is a **knowledge distillation pipeline**. Every `ADD` call fires an LLM (default: GPT-4o-mini) to extract discrete facts from raw conversation text, embeds them, and writes to a hybrid index (vector store + entity linking + history store). `SEARCH` combines dense vector similarity, BM25 keyword search, and entity-boosted ranking.

The April 2026 algorithm switched to a single-pass ADD-only model — no mutable UPDATE/DELETE. Temporal reasoning decides recency instead of explicit mutations. This is architecturally elegant but means memory management (correction, expiry, erasure) must happen at the application layer.

**Pipeline per memory write:**
1. Raw text → LLM extraction → discrete fact list
2. Facts → embedding model → vectors
3. Vectors + entity links → hybrid index (pgvector + graph)
4. History store for temporal conflict resolution

---

## Tech Stack

- **Language:** Python
- **SDKs:** Python (primary), TypeScript (REST client only — no native TS SDK)
- **Storage backends:** pgvector (PostgreSQL), Qdrant, Chroma, Weaviate, Pinecone (pluggable)
- **Entity graph:** Neo4j (optional, for relationship memory)
- **Deployment:** PyPI package, self-hosted, or Mem0 Cloud (managed)
- **API:** REST + Python SDK

---

## License

Apache 2.0 — fully permissive for commercial use.

---

## Production Readiness

- **GitHub stars:** ~35,000+
- **Maturity:** Production-grade SDK; cloud tier is battle-tested
- **Self-hosted:** Viable on your existing PostgreSQL + pgvector stack
- **Known limitation:** No built-in PII scrubbing, no FERPA/NDPR compliance documentation
- **April 2026 change:** ADD-only algorithm (no UPDATE/DELETE) — a significant architectural shift worth understanding

---

## Scale Reality for TeachNexis

**At 10,000 students doing 5 memory writes + 10 memory reads per day:**

| Operation | Daily | Monthly |
|---|---|---|
| Memory ADDs | 50,000 | 1,500,000 |
| Memory SEARCHes | 100,000 | 3,000,000 |

Mem0's Pro cloud tier allows **50,000 retrievals/month**. That is **60× over capacity** before negotiating enterprise pricing.

**Conclusion: Mem0 Cloud is economically impossible at Nigerian school budgets.** The self-hosted OSS path on your existing Postgres/pgvector stack is the only viable route.

---

## TeachNexis Use Cases

| Use Case | Mem0 Pattern | TeachNexis Implementation |
|---|---|---|
| Student weak topic tracking | User memory: "student struggles with quadratic equations" | `processEvent("quiz_submitted", { wrongTopics })` |
| Student strength recognition | User memory: "student excels at organic chemistry" | Computed from repeated high scores |
| Teacher lesson preferences | User memory: "teacher prefers 5-step lesson format" | Extracted from corrections + explicit feedback |
| Teacher AI feedback | User memory: "teacher rejected abstract examples" | Stored on each explicit correction |
| Parent communication prefs | User memory: "parent prefers Yoruba, brief updates" | Stored on first parent interaction |
| Revision history | Session memory with expiry | Store with `expiresAt: 6 months` |
| Term-over-term performance | Long-term persistent memory | Aggregate from result data, not conversation |

---

## What TeachNexis Can Learn From Mem0

1. **Hybrid retrieval model:** Vector similarity alone is insufficient for memory. Mem0's combination of dense search + BM25 keyword + entity boosting is the right pattern. Implement all three layers in TeachNexis Memory Service.

2. **Memory type taxonomy:** Mem0 distinguishes semantic memory (facts), episodic memory (events/history), and procedural memory (how to do things). TeachNexis Memory Service should mirror this:
   - Semantic: "Student is weak at differential calculus"
   - Episodic: "Student got 35% in June 2026 Maths test"
   - Procedural: "Teacher generates lesson notes using 5 steps"

3. **LLM-powered fact extraction:** The pattern of using a small, cheap LLM (Haiku-class) to distill conversation into discrete facts before storage is far better than storing raw text. Raw text is noisy; discrete facts are searchable. Implement this in `processEvent()`.

4. **Entity linking:** Linking memories to named entities (subjects, topics, teachers) enables more precise retrieval than pure semantic search. TeachNexis should store `subject` and `topic` as first-class fields on every memory entry.

5. **Temporal conflict resolution:** When a new memory contradicts an old one ("student now excels at quadratic equations" vs. prior "student struggles with quadratic equations"), the recency + confidence model should determine which wins. Build this into `updateMemory()`.

6. **Confidence scoring:** Memories inferred from behaviour should have lower confidence than memories explicitly confirmed by the teacher. Low-confidence + old memories should be auto-purged.

---

## What to Avoid

- **Do not use Mem0 Cloud.** Economically impossible at scale for Nigerian school budgets. 60× over capacity.
- **Do not expose raw Mem0 API to students or teachers.** No auth, no school isolation, no PII controls built in.
- **Do not depend on Mem0's memory mutation model.** The April 2026 ADD-only shift means correction flows must be built at the application layer regardless.
- **Do not use Neo4j graph memory without a clear use case.** The vector + keyword hybrid is sufficient for Phase 1-2. Graph memory adds significant operational complexity.
- **Do not store conversation transcripts as memories.** Extract facts first (LLM pass), then store facts. Raw transcripts are noisy and expensive to search.

---

## Integration Risks

| Risk | Severity | Notes |
|---|---|---|
| Cloud economics — 60× over Pro tier capacity | Critical | Self-hosted only |
| No NDPR/FERPA compliance docs | High | Must build compliance layer on top |
| Python SDK — no native TypeScript | Medium | Call REST API from TypeScript or add Python service |
| Cross-school isolation relies on correct `user_id` prefixing | High | Library won't stop misrouted queries; enforce at service layer |
| LLM cost for fact extraction on every write | Medium | Use Haiku-class model; batch extraction where possible |

---

## Security and Privacy

**Privacy is your problem, not Mem0's.** Key gaps:

- No built-in PII scrubbing — student names, scores, and personally identifiable patterns can persist in memory entries
- Audit logs are Enterprise-cloud-only — not available in OSS
- Cross-school isolation is enforced only by your correct use of `user_id` prefixes — a misrouted query reaches another school's memories
- No right-to-erasure workflow built in — you must implement `forgetActor()` yourself

**Required additions for TeachNexis:**
- PII filter before any text enters the memory pipeline
- Audit log on all memory write/delete operations
- `schoolId` enforcement at the database query level (not just application level)
- `forgetActor()` called automatically on account deletion
- Memory expiry for sensitive entries (mistake patterns → 6 months, revision history → 3 months)

---

## Dependency Risks

| Dependency | Risk |
|---|---|
| OpenAI for fact extraction (default) | High cost at scale; switch to Haiku/Groq immediately |
| pgvector backend | Low — already in TeachNexis stack |
| Mem0 OSS version stability | Medium — April 2026 algorithm was a breaking change |

---

## Recommended Service Abstraction

**Service Name:** `TeachNexisMemoryService`

Full interface design in `docs/service-interfaces/memory-service.md`.

Key methods:
```typescript
remember(entry)             // Store a discrete memory fact
processEvent(event)         // LLM-extract facts from a behavioural event
search(query)               // Semantic + keyword search over actor memories
buildMemoryContext(params)  // Format memories for LLM prompt injection
forgetActor(actorId)        // Right to erasure — delete all memories
getStudentWeakTopics()      // Convenience method for CBT generation
getTeacherPreferences()     // Convenience method for lesson generation
```

---

## Three-Phase Strategy

**Phase 1 — Study + Validate (Now)**
- Study Mem0's architecture: hybrid retrieval, entity linking, memory type taxonomy, temporal conflict resolution
- Implement `TeachNexisMemoryService` natively in Prisma + pgvector
- For the pilot (< 500 students), optionally wrap Mem0 OSS self-hosted on existing Postgres

**Phase 2 — Native Extraction Pipeline**
- Replace any Mem0 dependency with a custom extraction pipeline:
  - Claude Haiku for fact distillation (cheap, fast)
  - pgvector for embeddings
  - `pg_trgm` + `ts_vector` for keyword search
- Service interface stays identical — nothing in product code changes

**Phase 3 — Scale and Enrich**
- Add entity graph for relationship memories (teacher → student performance links)
- Add memory federation across terms (carry forward academic year context)
- Evaluate fine-tuning a small extraction model on TeachNexis memory patterns

---

## Build vs Wrap vs Study

**Recommendation: STUDY the architecture → BUILD native from day one**

Do not wrap Mem0 in production. The privacy gaps, cloud economics, and Python-only SDK make it unsuitable as a production dependency. Instead:

1. Use Mem0's architecture as the design reference for `TeachNexisMemoryService`
2. Implement natively in Prisma + pgvector — you already have this infrastructure
3. Use Claude Haiku for fact extraction (cheaper than GPT-4o-mini, same quality for short educational context)
4. Optionally run Mem0 OSS in a dev environment to validate your extraction patterns against its output

**Implementation effort:** 2–3 weeks for a production-grade native implementation vs. 1 week for a Mem0 OSS wrapper that will need replacing within 6 months.

---

## Replacement Strategy

There is no Mem0 to replace — the recommendation is to build native. The native `TeachNexisMemoryService` is the implementation from day one. What gets replaced over time is the extraction model (GPT-4o-mini → Haiku → TeachNexis-fine-tuned) and the search strategy (pure vector → hybrid → entity-boosted hybrid).

---

## Final Verdict

Mem0 is the right thing to **study** and the wrong thing to **depend on in production**. Its architecture — hybrid retrieval, entity linking, LLM-powered fact distillation, temporal conflict resolution — is genuinely state-of-the-art for educational AI. Its cloud economics (60× over capacity at 10k students), privacy completeness (no NDPR/FERPA docs, no PII scrubbing), and Python-only SDK make it unsuitable as a TeachNexis production dependency. **Borrow the ideas, validate patterns with the OSS version in development, then own the full stack natively.**
