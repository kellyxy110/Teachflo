# TeachNexis Knowledge Service — Architecture Reference

**Document Type:** Principal Engineer RFC  
**Service:** `TeachNexisKnowledgeService`  
**Version:** 1.0  
**Date:** 2026-07-04  
**Status:** Phase 1 — Implementation Ready  
**Author:** TeachNexis Platform Engineering

---

## Table of Contents

1. [Responsibilities](#1-responsibilities)
2. [Internal Modules](#2-internal-modules)
3. [Public API](#3-public-api)
4. [Database Schema](#4-database-schema)
5. [Event Flow](#5-event-flow)
6. [Queue and Background Jobs](#6-queue-and-background-jobs)
7. [Security Model](#7-security-model)
8. [Privacy Model](#8-privacy-model)
9. [Scaling Strategy](#9-scaling-strategy)
10. [Failure Handling](#10-failure-handling)
11. [Testing Strategy](#11-testing-strategy)
12. [Monitoring](#12-monitoring)
13. [Replacement Roadmap](#13-replacement-roadmap)
14. [Phase 1 Implementation Checklist](#14-phase-1-implementation-checklist)

---

## 1. Responsibilities

### What This Service Owns

The Knowledge Service is the single source of truth for all indexed educational content in TeachNexis. It owns the full pipeline from raw source material to ranked, context-ready chunks, and the data stores those chunks live in.

**Ingestion pipeline:**
- Accepting uploaded files (PDF, DOCX, images) from the web layer and handing them to the OCR Service
- Receiving crawl results from the Crawl4AI adapter and normalising them into `KnowledgeDocument` records
- Accepting raw text ingest (teacher-typed notes, API-submitted content)
- Chunking extracted text using strategy-appropriate algorithms per content type
- Submitting chunk batches to the embedding provider and storing resulting vectors
- Managing ingest job lifecycle: pending → processing → indexed or failed
- Content versioning: retaining previous document versions so a re-upload does not silently discard prior chunks used in past lesson notes

**Storage and indexing:**
- Owning the `knowledge_documents`, `knowledge_chunks`, `crawl_jobs`, `curriculum_mappings`, and `past_questions` tables
- Maintaining HNSW indexes on all embedding columns
- Enforcing `schoolId` partitioning at the database query level — no cross-school data leakage
- Storing document metadata: subject, class level, exam body, year, source URL, citation anchor

**Retrieval:**
- Semantic similarity search via pgvector cosine distance
- Keyword-boosted hybrid search (pgvector + PostgreSQL full-text search combined)
- Past question lookup (structured query, not semantic — by exam body, year, subject, topic)
- Building prompt-injection context strings with citation metadata attached
- Curriculum mapping: resolving a query topic to curriculum nodes in the CIG graph

**Administrative:**
- `listDocuments()` and `deleteDocument()` endpoints with schoolId enforcement
- Per-school storage statistics and chunk counts
- Crawl job scheduling and status reporting
- Audit log entries for every ingest and delete operation

### What This Service Does NOT Own

Understanding the boundaries is as important as understanding the responsibilities.

| Concern | Owner | Reason |
|---|---|---|
| Raw file storage (S3/Supabase buckets) | Storage Service | KnowledgeService receives file buffers or presigned URLs; it does not manage object storage |
| PDF/image → text conversion | OCR Service (`TeachNexisOCRService`) | Knowledge Service calls OCR Service and receives `OCRResult`; it does not invoke olmOCR or Ollama directly |
| Web crawling execution | Crawl4AI adapter (`KnowledgeCollectorAdapter`) | Knowledge Service submits URLs and receives `ExtractedDocument`; it does not drive Playwright |
| LLM generation (lesson notes, CBT questions) | Workflow Service | Knowledge Service provides context; it does not generate content |
| Student memory and weakness tracking | Memory Service | A student's weak topics are stored in Memory Service; Knowledge Service answers retrieval queries without knowing who asked |
| Authentication and RBAC | Identity Service | Routes authenticate before calling Knowledge Service; the service trusts `schoolId` claims from verified JWT context |
| Curriculum graph traversal (pathfinding) | CIG module in Workflow Service | Knowledge Service maps chunks to curriculum nodes; CIG traversal logic lives in the Workflow Service |
| AI model routing and spend tracking | AI Router | Knowledge Service calls the embedding provider directly using its own API key config; it does not use the AI Router |

---

## 2. Internal Modules

The Knowledge Service is a single Next.js API boundary (`packages/knowledge-service/`) composed of six internal modules. No module is separately deployed in Phase 1. Each module has a defined input contract, output contract, and a single named function file.

```
packages/knowledge-service/
├── src/
│   ├── modules/
│   │   ├── crawl/          # CrawlModule
│   │   ├── ingest/         # IngestModule
│   │   ├── chunk/          # ChunkModule
│   │   ├── embed/          # EmbedModule
│   │   ├── search/         # SearchModule
│   │   ├── curriculum/     # CurriculumModule
│   │   └── citation/       # CitationModule
│   ├── adapters/
│   │   ├── crawl4ai.adapter.ts
│   │   ├── openai-embed.adapter.ts
│   │   └── nomic-embed.adapter.ts
│   ├── queue/
│   │   ├── embed.queue.ts
│   │   └── crawl.queue.ts
│   ├── db/
│   │   └── knowledge.prisma-client.ts
│   ├── index.ts            # Public API surface — re-exports only
│   └── types.ts            # Shared internal types
```

---

### 2.1 CrawlModule

**Purpose:** Accept a URL submission, validate it against the SSRF allowlist, submit a crawl job to the Crawl4AI adapter, and store the resulting `ExtractedDocument` as a raw `KnowledgeDocument` record ready for ChunkModule.

**Inputs:**
- `CrawlRequest`: `{ url, sourceType, schoolId, subject, classLevel?, year?, examBody? }`
- Crawl4AI `ExtractedDocument` callback (delivered by queue worker)

**Outputs:**
- `CrawlJob` record with status updates
- Raw `KnowledgeDocument` record (status: `PROCESSING`) populated with extracted markdown

**Key functions:**

```typescript
// modules/crawl/crawl.module.ts

/**
 * Validates URL against per-domain SSRF allowlist, enqueues a Crawl4AI job,
 * and creates a CrawlJob + KnowledgeDocument record with status QUEUED.
 */
async function submitCrawl(request: CrawlRequest): Promise<{ crawlJobId: string; documentId: string }>

/**
 * Called by the queue worker when Crawl4AI returns results.
 * Runs PII scan, normalises markdown, updates KnowledgeDocument.fullText,
 * then publishes to ChunkModule queue.
 */
async function onCrawlComplete(crawlJobId: string, result: ExtractedDocument): Promise<void>

/**
 * Updates CrawlJob.status to FAILED, stores error, marks KnowledgeDocument.status = FAILED.
 * Triggers teacher notification event.
 */
async function onCrawlFailed(crawlJobId: string, error: CrawlError): Promise<void>
```

**SSRF allowlist** (enforced before any URL reaches Crawl4AI — see Section 7):
```
waec.gov.ng, waecdirect.org
neco.gov.ng
jamb.gov.ng
nerdc.gov.ng (National Educational Research and Development Council)
bece.edu.ng
education.gov.ng
nabteb.gov.ng
jupeb.edu.ng
naijalearn.com, prepclass.com.ng (curated educational blogs)
```

---

### 2.2 IngestModule

**Purpose:** The main entry point for all document ingestion. Routes incoming `IngestRequest` to the correct sub-pipeline: OCR Service (for files), CrawlModule (for URLs), or direct text processing (for plain text).

**Inputs:**
- `IngestRequest` from the public API

**Outputs:**
- `{ documentId, jobId? }` returned immediately
- `KnowledgeDocument` record created with status `PROCESSING`

**Key functions:**

```typescript
// modules/ingest/ingest.module.ts

/**
 * Dispatcher. Creates KnowledgeDocument record, then routes:
 *   content.type === "file"  → submitToOCR()
 *   content.type === "url"   → CrawlModule.submitCrawl()
 *   content.type === "text"  → publishToChunkQueue() directly
 */
async function ingest(request: IngestRequest): Promise<{ documentId: string; jobId?: string }>

/**
 * Uploads file buffer to OCR Service, stores OcrJobId on KnowledgeDocument,
 * registers a callback so onOCRComplete() is called when OCR finishes.
 */
async function submitToOCR(documentId: string, buffer: Buffer, mimeType: string, schoolId: string): Promise<void>

/**
 * Called by OCR Service webhook or polling worker when OCR is done.
 * Stores fullText from OCRResult.fullMarkdown, then queues chunking.
 */
async function onOCRComplete(documentId: string, ocrResult: OCRResult): Promise<void>

/**
 * Called by OCR Service on failure. Marks document FAILED with error.
 */
async function onOCRFailed(documentId: string, error: string): Promise<void>
```

---

### 2.3 ChunkModule

**Purpose:** Split a document's full text into variable-strategy chunks appropriate to its content type. Output is an array of raw text chunks with position metadata, ready for EmbedModule.

**Inputs:**
- `documentId`, `fullText: string`, `sourceType: KnowledgeSourceType`, `metadata: ChunkMetadata`

**Outputs:**
- `RawChunk[]`: `{ content, chunkIndex, pageNumber?, sectionTitle?, tokenCount }`

**Chunking strategies by content type:**

| Source Type | Strategy | Chunk Size | Overlap |
|---|---|---|---|
| `textbook` | Sliding window, sentence-aware boundary | 512 tokens | 64 tokens |
| `waec-past-question` / `neco-past-question` / `jamb-past-question` | Question-boundary split (regex: numbered items, lettered options) | 1 question + options + answer per chunk | 0 (questions are atomic) |
| `lesson-note` / `teacher-note` | Section-header split (Markdown H2/H3) then sliding window | 400 tokens | 50 tokens |
| `curriculum-document` | Topic-boundary TextTiling algorithm | 600 tokens | 80 tokens |
| `moe-circular` | Paragraph-level fixed-length | 300 tokens | 30 tokens |

**Key functions:**

```typescript
// modules/chunk/chunk.module.ts

/**
 * Selects chunking strategy from sourceType, runs chunker, normalises output.
 * Returns RawChunk[] ready for embedding.
 */
async function chunk(documentId: string, text: string, sourceType: KnowledgeSourceType, metadata: DocumentMetadata): Promise<RawChunk[]>

/**
 * Question-boundary chunker for WAEC/NECO/JAMB structured past questions.
 * Regex: /^\d+\.\s/ for question starts; /^[A-E]\.\s/ for options.
 * Each question becomes one atomic chunk — never split mid-question.
 */
function chunkPastQuestion(text: string): RawChunk[]

/**
 * Sliding window chunker with sentence-aware splits.
 * Uses tiktoken to count tokens; never breaks mid-sentence.
 */
function chunkSliding(text: string, maxTokens: number, overlapTokens: number): RawChunk[]
```

---

### 2.4 EmbedModule

**Purpose:** Convert `RawChunk[]` to vector embeddings and persist `KnowledgeChunk` records. Manages batch sizing, rate limiting, provider failover, and the circuit breaker.

**Inputs:**
- `documentId`, `schoolId`, `RawChunk[]`, `DocumentMetadata`

**Outputs:**
- `KnowledgeChunk[]` persisted to database with embedding vectors
- `KnowledgeDocument.status` updated to `READY` and `chunkCount` set

**Key functions:**

```typescript
// modules/embed/embed.module.ts

/**
 * Main entry. Batches chunks by EMBEDDING_CONFIG.batchSize (100),
 * calls embedding adapter with retry, persists results, updates document status.
 */
async function embedAndPersist(documentId: string, schoolId: string, chunks: RawChunk[], metadata: DocumentMetadata): Promise<void>

/**
 * Calls primary embedding provider (OpenAI text-embedding-3-small).
 * On failure (5xx, timeout, circuit open), falls back to NomicEmbedAdapter.
 * Returns float32[] vectors aligned to input chunks.
 */
async function getEmbeddings(texts: string[]): Promise<number[][]>

/**
 * Bulk-inserts KnowledgeChunk rows including embedding vector.
 * Uses Prisma.$executeRawUnsafe for pgvector::vector cast.
 */
async function persistChunks(documentId: string, schoolId: string, chunks: RawChunk[], embeddings: number[][], metadata: DocumentMetadata): Promise<void>
```

**Embedding configuration:**

```typescript
// modules/embed/embed.config.ts
export const EMBEDDING_CONFIG = {
  primary: {
    provider: "openai",
    model: "text-embedding-3-small",
    dimensions: 1536,
    maxBatchSize: 100,       // OpenAI allows up to 2048 inputs per call; cap at 100 for latency
    maxTokensPerInput: 8191,
    rateLimit: {
      requestsPerMinute: 500,
      tokensPerMinute: 1_000_000,
    },
  },
  fallback: {
    provider: "nomic",
    model: "nomic-embed-text",
    endpoint: process.env.NOMIC_OLLAMA_ENDPOINT, // http://localhost:11434
    dimensions: 1536,        // Matryoshka truncation to 1536 for schema compatibility
    maxBatchSize: 32,        // Ollama local; smaller batches to avoid OOM
  },
  storage: {
    dimensions: 1536,        // Canonical dimension. NEVER change without re-indexing all chunks.
  },
} as const;
```

---

### 2.5 SearchModule

**Purpose:** Execute semantic and hybrid searches against the pgvector store, applying all `schoolId` filters, similarity thresholds, and metadata filters.

**Inputs:**
- `KnowledgeQuery`

**Outputs:**
- `KnowledgeChunk[]` ranked by similarity (descending), filtered to `minSimilarity`

**Key functions:**

```typescript
// modules/search/search.module.ts

/**
 * Embeds the query string (single call, not batched — latency-sensitive path).
 * Runs pgvector cosine search with all filters applied.
 * Applies hybrid re-ranking if fullText search also returns results.
 */
async function retrieve(query: KnowledgeQuery): Promise<KnowledgeChunk[]>

/**
 * Executes the pgvector similarity search using raw SQL (Prisma.$queryRawUnsafe).
 * ALWAYS includes AND kd.school_id = $schoolId — never omitted.
 */
async function vectorSearch(queryEmbedding: number[], schoolId: string, filters: SearchFilters, topK: number, minSimilarity: number): Promise<RawSearchResult[]>

/**
 * PostgreSQL tsvector full-text search for keyword boosting.
 * Results are merged with vectorSearch results using Reciprocal Rank Fusion.
 */
async function keywordSearch(queryText: string, schoolId: string, filters: SearchFilters, limit: number): Promise<RawSearchResult[]>

/**
 * Reciprocal Rank Fusion: merges vector and keyword ranked lists.
 * RRF score = 1/(k + rank_v) + 1/(k + rank_kw) where k=60.
 */
function rerankRRF(vectorResults: RawSearchResult[], keywordResults: RawSearchResult[]): KnowledgeChunk[]
```

**Core search SQL:**

```sql
-- knowledge-service/src/modules/search/search.sql.ts
SELECT
  kc.id,
  kc.document_id,
  kc.school_id,
  kc.content,
  kc.chunk_index,
  kc.metadata,
  1 - (kc.embedding <=> $1::vector) AS similarity
FROM knowledge_chunks kc
INNER JOIN knowledge_documents kd ON kd.id = kc.document_id
WHERE
  kd.school_id         = $2
  AND kd.status        = 'READY'
  AND ($3::text        IS NULL OR kd.subject = $3)
  AND ($4::text        IS NULL OR kd.class_level = $4)
  AND ($5::text[]      IS NULL OR kd.source_type = ANY($5))
  AND ($6::text        IS NULL OR kd.exam_body = $6)
  AND ($7::int         IS NULL OR kd.year >= $7)
  AND ($8::int         IS NULL OR kd.year <= $8)
  AND 1 - (kc.embedding <=> $1::vector) >= $9
ORDER BY kc.embedding <=> $1::vector
LIMIT $10;
```

---

### 2.6 CurriculumModule

**Purpose:** Map a retrieval query or a `KnowledgeChunk` to nodes in the Curriculum Intelligence Graph (CIG), enabling lesson generation to pull context that is curriculum-aligned rather than just semantically similar.

**Inputs:**
- Query text or `KnowledgeChunk[]`
- `CurriculumMapping` records linking chunks to `CurriculumNode` IDs

**Outputs:**
- `CurriculumMapping[]` linking chunk IDs to curriculum node IDs
- Subject/topic/week resolution for a given chunk

**Key functions:**

```typescript
// modules/curriculum/curriculum.module.ts

/**
 * For a newly indexed chunk, finds the best-matching CurriculumNode
 * using semantic similarity between chunk content and node.description + node.keywords.
 * Stores result as CurriculumMapping with confidence score.
 * Called async after embedding — not in the hot ingest path.
 */
async function mapChunkToCurriculum(chunkId: string, schoolId: string): Promise<CurriculumMapping | null>

/**
 * Returns curriculum context (term, week, topic) for chunks used in a retrieve() call.
 * Used by buildContext() to annotate citations with curriculum position.
 */
async function getCurriculumContext(chunkIds: string[], schoolId: string): Promise<Map<string, CurriculumNodeRef>>

/**
 * Retrieves past questions aligned to specific CurriculumNode IDs.
 * Joins PastQuestion → CurriculumMapping → CurriculumNode.
 */
async function getPastQuestionsForNodes(nodeIds: string[], examBody?: ExamBody, limit?: number): Promise<PastQuestion[]>
```

---

### 2.7 CitationModule

**Purpose:** Format `KnowledgeChunk[]` into structured citations for prompt injection and for display in the teacher-facing UI. Ensures every AI-generated output can be traced back to its source document.

**Inputs:**
- `KnowledgeChunk[]` with metadata

**Outputs:**
- `FormattedContext`: a string ready for LLM prompt injection
- `Citation[]`: structured citation objects for frontend display

**Key functions:**

```typescript
// modules/citation/citation.module.ts

/**
 * Builds a context string from ranked chunks.
 * Format: "[SOURCE: {title}, {examBody} {year}, pg.{pageNumber}]\n{content}\n\n"
 * Truncates to maxTokens (default 3000) preserving highest-similarity chunks first.
 * Returns truncated=true if any chunks were dropped.
 */
function buildContextString(chunks: KnowledgeChunk[], maxTokens: number): { context: string; used: KnowledgeChunk[]; truncated: boolean }

/**
 * Generates a human-readable citation for UI display.
 * Example: "WAEC 2023 Mathematics Past Questions, Question 14"
 */
function formatCitation(chunk: KnowledgeChunk): Citation

/**
 * Deduplicates chunks by documentId + chunkIndex before context building.
 * Prevents the same passage appearing twice when multiple query paths return it.
 */
function deduplicateChunks(chunks: KnowledgeChunk[]): KnowledgeChunk[]
```

---

## 3. Public API

This is the complete TypeScript interface exported from `packages/knowledge-service/src/index.ts`. All internal modules are hidden. No caller imports from module subdirectories.

```typescript
// packages/knowledge-service/src/types.ts

// ── Enumerations ──────────────────────────────────────────────────────────────

export type KnowledgeSourceType =
  | "waec-past-question"
  | "neco-past-question"
  | "jamb-past-question"
  | "textbook"
  | "lesson-note"
  | "curriculum-document"
  | "moe-circular"
  | "teacher-note"
  | "school-policy";

export type ClassLevel = "JS1" | "JS2" | "JS3" | "SS1" | "SS2" | "SS3";

export type ExamBody = "WAEC" | "NECO" | "JAMB" | "JUPEB" | "NABTEB";

export type DocumentStatus = "QUEUED" | "PROCESSING" | "READY" | "FAILED" | "DELETED";

export type ContentInput =
  | { type: "text"; text: string }
  | { type: "url"; url: string }
  | { type: "file"; buffer: Buffer; mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp" | "application/vnd.openxmlformats-officedocument.wordprocessingml.document" };

// ── Core domain types ─────────────────────────────────────────────────────────

export interface KnowledgeDocument {
  id: string;
  schoolId: string;
  sourceType: KnowledgeSourceType;
  title: string;
  subject: string;
  classLevel: ClassLevel | null;
  year: number | null;
  examBody: ExamBody | null;
  sourceUrl: string | null;
  /** Stored as fulltext; NOT returned in list responses to reduce payload size */
  fullText?: string;
  chunkCount: number;
  status: DocumentStatus;
  error: string | null;
  version: number;
  indexedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  schoolId: string;
  content: string;
  /** Cosine similarity score [0.0, 1.0] — only present after a search query */
  similarity: number;
  metadata: {
    subject: string;
    classLevel: ClassLevel | null;
    sourceType: KnowledgeSourceType;
    examBody: ExamBody | null;
    year: number | null;
    documentTitle: string;
    pageNumber: number | null;
    chunkIndex: number;
    /** Curriculum node ID if CurriculumModule mapped this chunk */
    curriculumNodeId: string | null;
    /** e.g. "Term 2, Week 4" if mapped */
    curriculumRef: string | null;
  };
}

export interface PastQuestion {
  id: string;
  examBody: ExamBody;
  year: number;
  subject: string;
  classLevel: ClassLevel;
  questionText: string;
  /** MCQ options — null for essay/structured questions */
  options: { A: string; B: string; C: string; D: string; E?: string } | null;
  correctAnswer: string | null;
  explanation: string | null;
  topic: string | null;
  /** Source chunk ID linking back to KnowledgeChunk */
  sourceChunkId: string;
}

export interface Citation {
  chunkId: string;
  documentId: string;
  documentTitle: string;
  sourceType: KnowledgeSourceType;
  examBody: ExamBody | null;
  year: number | null;
  subject: string;
  pageNumber: number | null;
  /** Display-ready label: "WAEC 2022 Chemistry, Question 7" */
  label: string;
  /** URL to source document in Supabase Storage, if available */
  sourceUrl: string | null;
}

// ── Request / Response shapes ─────────────────────────────────────────────────

export interface IngestRequest {
  schoolId: string;
  sourceType: KnowledgeSourceType;
  title: string;
  subject: string;
  classLevel?: ClassLevel;
  year?: number;
  examBody?: ExamBody;
  content: ContentInput;
  /**
   * If true, a new version of the document is created and the old chunks are
   * retained until the new version reaches READY status. Prevents gap in RAG
   * coverage during re-indexing. Default: false.
   */
  versionOnConflict?: boolean;
}

export interface IngestResponse {
  documentId: string;
  /**
   * Present when content.type === "url" (crawl job ID) or "file" (OCR job ID).
   * Poll getDocumentStatus() for completion.
   * Absent when content.type === "text" (sync path completes within 5s).
   */
  jobId: string | null;
  status: DocumentStatus;
}

export interface KnowledgeQuery {
  query: string;
  schoolId: string;
  filters?: {
    subject?: string;
    classLevel?: ClassLevel;
    sourceTypes?: KnowledgeSourceType[];
    examBody?: ExamBody;
    yearFrom?: number;
    yearTo?: number;
  };
  /** Number of chunks to return. Default: 5. Max: 20. */
  topK?: number;
  /** Minimum cosine similarity threshold. Default: 0.70. */
  minSimilarity?: number;
  /** Enable hybrid re-ranking (RRF). Default: true. Adds ~20ms. */
  hybridSearch?: boolean;
}

export interface BuildContextResult {
  /** Formatted context string — inject directly into LLM prompt */
  context: string;
  /** Source chunks included in the context, for citation UI */
  citations: Citation[];
  /** True when topK results exceeded maxTokens and some were dropped */
  truncated: boolean;
  /** Approximate token count of the context string */
  tokenCount: number;
}

export interface SchoolStats {
  documentCount: number;
  chunkCount: number;
  subjectBreakdown: Record<string, number>;      // subject → chunk count
  sourceTypeBreakdown: Record<string, number>;   // sourceType → document count
  statusBreakdown: Record<DocumentStatus, number>;
  lastIndexedAt: Date | null;
  /** Approximate storage in bytes (sum of content column lengths) */
  storageBytes: number;
}

// ── Main service interface ────────────────────────────────────────────────────

export interface TeachNexisKnowledgeService {

  // ── Ingestion ──────────────────────────────────────────────────────────────

  /**
   * Ingest a document into the knowledge base.
   *
   * - content.type === "text":  synchronous chunking + embedding. Returns
   *   status: READY within one call (embedding is fast for small text).
   * - content.type === "file":  submits to OCR Service. Returns status: PROCESSING.
   *   Poll getDocumentStatus() for READY.
   * - content.type === "url":   validates URL against SSRF allowlist, enqueues
   *   crawl job. Returns status: QUEUED. Poll getDocumentStatus().
   *
   * Throws KnowledgeServiceError with code SSRF_BLOCKED if URL is not allowlisted.
   * Throws KnowledgeServiceError with code UNSUPPORTED_MIME if file type is rejected.
   */
  ingest(request: IngestRequest): Promise<IngestResponse>;

  /**
   * Poll document ingestion status. Includes error message if status === FAILED.
   * Scoped to schoolId — throws NOT_FOUND if documentId does not belong to school.
   */
  getDocumentStatus(documentId: string, schoolId: string): Promise<KnowledgeDocument>;

  /**
   * List all documents for a school. Does NOT include fullText to keep response small.
   * Results are ordered by createdAt DESC.
   */
  listDocuments(
    schoolId: string,
    filters?: {
      subject?: string;
      sourceType?: KnowledgeSourceType;
      status?: DocumentStatus;
      examBody?: ExamBody;
      limit?: number;
      offset?: number;
    }
  ): Promise<{ documents: KnowledgeDocument[]; total: number }>;

  /**
   * Hard-delete a document and all its KnowledgeChunk rows (CASCADE).
   * If the document is PROCESSING, the in-flight job is cancelled first.
   * Writes an audit log entry: { action: "DOCUMENT_DELETED", documentId, schoolId, actorId }.
   * Throws NOT_FOUND if documentId does not belong to schoolId.
   */
  deleteDocument(documentId: string, schoolId: string, actorId: string): Promise<void>;

  // ── Retrieval ──────────────────────────────────────────────────────────────

  /**
   * Core retrieval function. Embeds the query, runs pgvector cosine search,
   * optionally re-ranks with RRF hybrid search, and returns ranked chunks.
   *
   * Always filters to schoolId — no cross-school results possible.
   * Queries against status = READY chunks only — PROCESSING documents are excluded.
   */
  retrieve(query: KnowledgeQuery): Promise<KnowledgeChunk[]>;

  /**
   * Structured past-question lookup. Uses SQL filter queries (not semantic search)
   * against the PastQuestion table. Returns questions sorted by year DESC, random
   * shuffle within year for variety.
   *
   * topic filter: if provided, performs ILIKE match against PastQuestion.topic.
   * For semantic topic match, call retrieve() with sourceTypes: ["waec-past-question"].
   */
  getPastQuestions(params: {
    schoolId: string;
    subject: string;
    classLevel: ClassLevel;
    examBody?: ExamBody;
    year?: number;
    yearFrom?: number;
    yearTo?: number;
    topic?: string;
    limit?: number;  // Default: 10. Max: 50.
  }): Promise<PastQuestion[]>;

  /**
   * Retrieve chunks and format them as an LLM-injection context string.
   * Deduplicates chunks, truncates to maxTokens (default: 3000 tokens),
   * and attaches structured Citation objects for UI display.
   *
   * This is the function called by Workflow Service for lesson generation,
   * CBT question generation, and student tutoring features.
   */
  buildContext(
    query: KnowledgeQuery,
    options?: {
      maxTokens?: number;            // Default: 3000
      includePageNumbers?: boolean;  // Default: true
      includeCurriculumRef?: boolean; // Default: true
    }
  ): Promise<BuildContextResult>;

  // ── Admin / School ─────────────────────────────────────────────────────────

  /**
   * Per-school storage and indexing statistics.
   * Results are cached for 5 minutes — not real-time.
   */
  getSchoolStats(schoolId: string): Promise<SchoolStats>;
}

// ── Error types ───────────────────────────────────────────────────────────────

export type KnowledgeErrorCode =
  | "NOT_FOUND"
  | "UNAUTHORIZED"              // schoolId mismatch
  | "SSRF_BLOCKED"              // URL not on allowlist
  | "UNSUPPORTED_MIME"          // File type not accepted
  | "OCR_FAILED"                // OCR Service returned failure
  | "CRAWL_FAILED"              // Crawl4AI returned failure
  | "EMBED_FAILED"              // Both primary and fallback embedders failed
  | "CHUNK_TOO_LARGE"           // Single chunk exceeded max tokens after all splitting
  | "QUOTA_EXCEEDED"            // School has exceeded storage quota
  | "DOCUMENT_PROCESSING"       // deleteDocument() attempted on PROCESSING document
  | "PII_DETECTED";             // PII scan blocked ingestion

export class KnowledgeServiceError extends Error {
  constructor(
    public readonly code: KnowledgeErrorCode,
    message: string,
    public readonly documentId?: string
  ) {
    super(message);
    this.name = "KnowledgeServiceError";
  }
}
```

---

## 4. Database Schema

These are the Prisma schema additions to `packages/database/prisma/schema.prisma`. They extend the existing schema without modifying existing models. The existing `Document` model and `DocumentChunk` model remain but are deprecated — new code uses `KnowledgeDocument` and `KnowledgeChunk`.

```prisma
// ─────────────────────────────────────────────────────────────────────────────
// KNOWLEDGE SERVICE MODELS
// Added to: packages/database/prisma/schema.prisma
// Migration: 0008_knowledge_service
// ─────────────────────────────────────────────────────────────────────────────

// ── KnowledgeDocument ─────────────────────────────────────────────────────────

model KnowledgeDocument {
  id         String   @id @default(cuid())
  schoolId   String

  // Content classification
  sourceType String   // KnowledgeSourceType enum value
  title      String
  subject    String
  classLevel String?  // ClassLevel enum value
  year       Int?
  examBody   String?  // ExamBody enum value

  // Source tracking
  sourceUrl      String?
  crawlJobId     String?   // FK to CrawlJob if URL source
  ocrJobId       String?   // FK to OcrJob if file source (existing OcrJob model)
  storageKey     String?   // Supabase Storage object key for the original file

  // Content
  fullText   String    // Full extracted/crawled text (not returned in list queries)

  // Status tracking
  status     String    @default("QUEUED")   // DocumentStatus enum value
  error      String?                        // Last error message if status = FAILED
  version    Int       @default(1)          // Incremented on re-ingest

  // Derived counts
  chunkCount Int       @default(0)

  // Timestamps
  indexedAt  DateTime?
  createdAt  DateTime  @default(now())
  updatedAt  DateTime  @updatedAt

  school     School             @relation(fields: [schoolId], references: [id])
  chunks     KnowledgeChunk[]
  crawlJob   CrawlJob?          @relation(fields: [crawlJobId], references: [id])
  mappings   CurriculumMapping[]
  pastQs     PastQuestion[]

  @@index([schoolId])
  @@index([schoolId, subject])
  @@index([schoolId, sourceType])
  @@index([schoolId, status])
  @@index([examBody, year, subject])
  @@map("knowledge_documents")
}

// ── KnowledgeChunk ────────────────────────────────────────────────────────────

// NOTE: The embedding column is intentionally NOT declared as a Prisma relation
// field. pgvector's vector type is Unsupported in Prisma. All embedding reads
// and writes go through Prisma.$queryRawUnsafe / $executeRawUnsafe.

model KnowledgeChunk {
  id         String   @id @default(cuid())
  documentId String
  schoolId   String

  content    String   // The raw chunk text
  chunkIndex Int      // Position within document (0-indexed)
  tokenCount Int      // Approximate token count of content

  // Embedding stored as pgvector vector(1536)
  // DDL managed via raw SQL migration — Prisma schema uses Unsupported type
  embedding  Unsupported("vector(1536)")?

  // Denormalised metadata for fast filtering without JOIN to KnowledgeDocument
  subject    String
  classLevel String?
  sourceType String
  examBody   String?
  year       Int?
  pageNumber Int?     // For file-sourced documents; null for crawled content
  documentTitle String

  createdAt  DateTime @default(now())

  document   KnowledgeDocument  @relation(fields: [documentId], references: [id], onDelete: Cascade)
  mappings   CurriculumMapping[]

  @@index([schoolId])
  @@index([documentId])
  @@index([schoolId, subject])
  @@index([schoolId, sourceType])
  @@map("knowledge_chunks")
}

// ── CrawlJob ──────────────────────────────────────────────────────────────────

model CrawlJob {
  id         String   @id @default(cuid())
  schoolId   String
  url        String
  sourceType String

  // Crawl4AI job tracking
  externalJobId  String?   // Job ID returned by Crawl4AI API
  status         String    @default("QUEUED")
  // QUEUED | RUNNING | COMPLETED | FAILED | RETRYING | DEAD_LETTER

  attemptCount   Int       @default(0)
  maxAttempts    Int       @default(3)
  lastError      String?
  nextRetryAt    DateTime?

  // Results
  pagesVisited   Int       @default(0)
  chunksExtracted Int      @default(0)
  piiBlocked     Boolean   @default(false)  // true if PII scan blocked any content

  // Timing
  startedAt    DateTime?
  completedAt  DateTime?
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  school       School              @relation(fields: [schoolId], references: [id])
  documents    KnowledgeDocument[]

  @@index([schoolId])
  @@index([status])
  @@index([nextRetryAt])
  @@map("crawl_jobs")
}

// ── CurriculumMapping ─────────────────────────────────────────────────────────

model CurriculumMapping {
  id               String   @id @default(cuid())
  chunkId          String
  documentId       String
  schoolId         String

  // References CurriculumNode from the existing CIG schema
  curriculumNodeId String
  nodeLabel        String   // Denormalised for display without JOIN
  nodeSubject      String?
  nodeTerm         String?
  nodeWeek         Int?

  // Mapping confidence from CurriculumModule.mapChunkToCurriculum()
  confidence       Float    // 0.0–1.0 cosine similarity at time of mapping

  createdAt        DateTime @default(now())

  chunk            KnowledgeChunk    @relation(fields: [chunkId], references: [id], onDelete: Cascade)
  document         KnowledgeDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)
  node             CurriculumNode    @relation(fields: [curriculumNodeId], references: [id])

  @@unique([chunkId, curriculumNodeId])
  @@index([chunkId])
  @@index([documentId])
  @@index([curriculumNodeId])
  @@index([schoolId])
  @@map("curriculum_mappings")
}

// ── PastQuestion ──────────────────────────────────────────────────────────────

model PastQuestion {
  id           String   @id @default(cuid())
  documentId   String
  schoolId     String   // schoolId = "GLOBAL" for shared WAEC/NECO corpus

  examBody     String   // ExamBody enum value
  year         Int
  subject      String
  classLevel   String

  questionText String
  optionA      String?
  optionB      String?
  optionC      String?
  optionD      String?
  optionE      String?
  correctAnswer String?
  explanation  String?
  topic        String?

  // Source tracking back to the indexed chunk
  sourceChunkId String

  // Validation
  isVerified   Boolean  @default(false)  // True when manually reviewed
  confidence   Float    @default(1.0)    // LLM extraction confidence

  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt

  document     KnowledgeDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([schoolId, examBody, year, subject])
  @@index([schoolId, subject, classLevel])
  @@index([topic])
  @@index([sourceChunkId])
  @@map("past_questions")
}
```

### Raw SQL Migrations Required

These cannot be expressed in Prisma schema and must be in `packages/database/prisma/migrations/`:

```sql
-- migration: 0008_knowledge_service_pgvector.sql

-- Enable pgvector (idempotent)
CREATE EXTENSION IF NOT EXISTS vector;

-- HNSW index on knowledge_chunks embedding
-- ef_construction=128 balances index build time vs recall at this scale
-- m=16 is the standard connection parameter for HNSW
CREATE INDEX CONCURRENTLY knowledge_chunks_embedding_hnsw_idx
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 128);

-- GIN index for full-text search hybrid queries
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS tsv tsvector
  GENERATED ALWAYS AS (to_tsvector('english', content)) STORED;

CREATE INDEX knowledge_chunks_tsv_gin_idx
  ON knowledge_chunks USING gin(tsv);

-- Partial index: only READY document chunks are ever searched
CREATE INDEX knowledge_chunks_ready_school_idx
  ON knowledge_chunks (school_id)
  WHERE EXISTS (
    SELECT 1 FROM knowledge_documents kd
    WHERE kd.id = knowledge_chunks.document_id
    AND kd.status = 'READY'
  );

-- Add CurriculumNode relation to CurriculumMapping
-- (CurriculumNode.id already exists from CIG sprint)
ALTER TABLE curriculum_mappings
  ADD CONSTRAINT fk_curriculum_mappings_node
  FOREIGN KEY (curriculum_node_id)
  REFERENCES curriculum_nodes(id)
  ON DELETE CASCADE;
```

---

## 5. Event Flow

### 5.1 Teacher Uploads a PDF Textbook

```
1. Teacher submits: POST /api/knowledge/ingest
   Body: { sourceType: "textbook", title: "New General Mathematics SS2",
           subject: "Mathematics", classLevel: "SS2",
           content: { type: "file", buffer: <Buffer>, mimeType: "application/pdf" } }

2. IngestModule.ingest():
   - Validates schoolId from JWT (must match teacher's schoolId)
   - Creates KnowledgeDocument record { status: "QUEUED", schoolId, subject, ... }
   - Uploads file buffer to Supabase Storage → stores storageKey on document
   - Returns { documentId, jobId: null, status: "QUEUED" }

3. IngestModule.submitToOCR():
   - Calls TeachNexisOCRService.submitDocument({ fileBuffer, documentId, schoolId, documentType: "textbook" })
   - OCR Service returns { jobId: "ocr_abc123" }
   - Stores ocrJobId on KnowledgeDocument, updates status: "PROCESSING"

4. [Background] OCR Service processes PDF via olmOCR
   - Estimated 60–90s for a 300-page textbook on GPU

5. OCR Service calls back: POST /api/knowledge/ocr-webhook
   Body: { jobId: "ocr_abc123", status: "ready", result: OCRResult }
   (or polling: IngestModule polls OCR Service every 10s)

6. IngestModule.onOCRComplete():
   - Validates { ocrResult.schoolId === document.schoolId } — reject if mismatch
   - Stores ocrResult.fullMarkdown → KnowledgeDocument.fullText
   - Updates KnowledgeDocument.status = "PROCESSING"
   - Publishes embed job to BullMQ embed-queue: { documentId, schoolId }

7. [Background] EmbedQueueWorker picks up job:
   ChunkModule.chunk():
   - Selects strategy: sliding window (sourceType = "textbook")
   - Tokenizes fullText, splits into ~512-token chunks with 64-token overlap
   - Returns RawChunk[] (typically 200–800 chunks for a 300-page textbook)

8. EmbedModule.embedAndPersist():
   - Batches RawChunk[] into groups of 100
   - Calls OpenAI text-embedding-3-small API per batch
   - For each batch: $executeRawUnsafe INSERT INTO knowledge_chunks(..., embedding) VALUES (...)::vector
   - After all batches: UPDATE knowledge_documents SET status='READY', chunk_count=N, indexed_at=NOW()

9. [Background] CurriculumModule.mapChunkToCurriculum():
   - Queued as a separate low-priority job after embed completes
   - For each chunk, finds nearest CurriculumNode using pgvector similarity
   - Inserts CurriculumMapping rows with confidence scores

10. Document is now READY.
    Teacher polls GET /api/knowledge/documents/{documentId}/status → { status: "READY", chunkCount: 487 }
```

### 5.2 WAEC Past Question URL is Submitted for Crawl

```
1. Admin/teacher submits: POST /api/knowledge/ingest
   Body: { sourceType: "waec-past-question", subject: "Chemistry",
           classLevel: "SS3", year: 2023,
           content: { type: "url", url: "https://waecdirect.org/questions/chemistry/2023" } }

2. IngestModule.ingest():
   - Validates schoolId from JWT
   - SSRF check: CrawlModule validates url against SSRF allowlist
     → waecdirect.org is in allowlist → PASS
     → Private IP ranges (10.x, 172.16.x, 192.168.x, 127.x, 169.254.x) blocked
     → Internal hostnames (*.internal, *.local) blocked
   - Creates KnowledgeDocument { status: "QUEUED" }
   - Creates CrawlJob { url, schoolId, status: "QUEUED" }
   - Returns { documentId, jobId: crawlJobId, status: "QUEUED" }

3. CrawlModule publishes to BullMQ crawl-queue:
   { crawlJobId, documentId, url, sourceType: "waec-past-question",
     extractionSchema: WAECPastQuestionSchema,
     crawlOptions: { delayMs: 3000, maxPages: 5 } }

4. [Background] CrawlQueueWorker picks up job:
   - Updates CrawlJob.status = "RUNNING", CrawlJob.startedAt = NOW()
   - Calls Crawl4AI adapter: POST http://crawl4ai-internal:8000/crawl
     Body: { url, extraction_schema: WAECPastQuestionSchema, mean_delay: 3000 }

5. Crawl4AI processes page (Playwright renders JS, BM25 filters noise, LLM extracts structured data)
   - Returns: { markdown, structured: { questions: [{ number, stem, options, answer }] } }

6. CrawlModule.onCrawlComplete():
   - PII scan on markdown: regex scan for NIN patterns (/\b\d{11}\b/), phone numbers,
     student IDs, BVN patterns. If found: log, redact field, set piiBlocked=true on CrawlJob
   - Stores markdown in KnowledgeDocument.fullText
   - Updates CrawlJob { status: "COMPLETED", pagesVisited, chunksExtracted }

7. Structured extraction: IngestModule reads CrawlJob.structured.questions[]
   - For each question: INSERT INTO past_questions (documentId, schoolId, examBody,
     year, subject, classLevel, questionText, optionA..E, correctAnswer, topic)

8. ChunkModule.chunkPastQuestion():
   - Each question becomes its own chunk (atomic — never split)
   - Returns RawChunk[] where each chunk = formatted question + options + answer

9. EmbedModule.embedAndPersist() — same as textbook flow above

10. CurriculumModule maps each past question chunk to CurriculumNode:
    - Chemistry SS3 2023 WAEC past questions → maps to curriculum_nodes
      WHERE subject='Chemistry' AND class_level='SS3'
    - Stores CurriculumMapping per chunk

11. Document READY. PastQuestion records queryable via getPastQuestions().
```

### 5.3 Lesson Generation Calls retrieve()

```
1. Workflow Service invokes: buildContext({
     query: "equilibrium constant and Le Chatelier's principle",
     schoolId: "school_xyz",
     filters: { subject: "Chemistry", classLevel: "SS2",
                sourceTypes: ["textbook", "waec-past-question"] },
     topK: 8,
     minSimilarity: 0.72
   })

2. SearchModule.retrieve():
   a. EmbedModule.getEmbeddings(["equilibrium constant and Le Chatelier's principle"])
      → single embedding call to OpenAI (not batched — this is the retrieval hot path)
      → returns float32[1536]

   b. SearchModule.vectorSearch():
      Executes core search SQL (see Section 2.5) with params:
      $1 = queryEmbedding::vector
      $2 = "school_xyz"
      $3 = "Chemistry"
      $4 = "SS2"
      $5 = ARRAY["textbook","waec-past-question"]
      $6 = NULL (no examBody filter)
      $7 = NULL, $8 = NULL (no year range)
      $9 = 0.72 (minSimilarity)
      $10 = 16 (topK * 2 — over-fetch for RRF merge)

   c. SearchModule.keywordSearch():
      SELECT ... FROM knowledge_chunks WHERE school_id = 'school_xyz'
      AND tsv @@ plainto_tsquery('english', 'equilibrium constant Le Chatelier principle')
      AND source_type = ANY(ARRAY['textbook','waec-past-question'])
      LIMIT 16

   d. SearchModule.rerankRRF(vectorResults, keywordResults)
      → Merges by chunk ID, scores by RRF formula, returns top 8

3. CurriculumModule.getCurriculumContext(chunkIds, schoolId)
   → Looks up CurriculumMapping for each returned chunkId
   → Attaches { curriculumRef: "Term 2, Week 6", curriculumNodeId: "..." } to each chunk

4. CitationModule.buildContextString(chunks, maxTokens: 3000)
   → Deduplicates chunks (same documentId + chunkIndex)
   → Formats context string with source labels
   → Truncates if total token count > 3000
   → Returns { context, used: KnowledgeChunk[], truncated: false }

5. CitationModule.formatCitation() called for each used chunk
   → Returns Citation[] for the Workflow Service to attach to lesson note output

6. buildContext() returns {
     context: "[SOURCE: New General Mathematics SS2, pg.47]\nThe equilibrium constant Kc ...\n\n[SOURCE: WAEC 2022 Chemistry, Question 12]\n...",
     citations: [{ label: "New General Mathematics SS2, p.47", ... }, ...],
     truncated: false,
     tokenCount: 2340
   }

7. Workflow Service injects context into LLM prompt:
   "Given the following educational context, generate a lesson note...\n\n{context}"
```

---

## 6. Queue and Background Jobs

### Technology Decision: BullMQ

BullMQ (Redis-backed) is used for Phase 1. Rationale:

- Crawl4AI already requires Redis in its Docker stack — no new infrastructure dependency
- BullMQ provides atomic job dequeue, built-in retry with exponential backoff, dead-letter queues, and a monitoring UI (Bull Board)
- The alternative (DB-backed queue via Prisma polling) adds 500ms–2s latency and table lock contention on a shared PostgreSQL instance under load
- BullMQ can be replaced with a DB-backed queue without changing worker code — the queue abstraction sits behind `queue/embed.queue.ts` and `queue/crawl.queue.ts`

### Queue Definitions

```typescript
// packages/knowledge-service/src/queue/queues.ts

import { Queue, Worker, Job } from "bullmq";
import { Redis } from "ioredis";

const redisConnection = new Redis({
  host: process.env.REDIS_HOST,
  port: Number(process.env.REDIS_PORT ?? 6379),
  password: process.env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,  // Required by BullMQ
  enableReadyCheck: false,
});

// ── Embed Queue ───────────────────────────────────────────────────────────────

export interface EmbedJobData {
  documentId: string;
  schoolId: string;
  priority: "normal" | "high";  // "high" for teacher-initiated uploads during lesson gen
}

export const embedQueue = new Queue<EmbedJobData>("knowledge:embed", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 4,
    backoff: {
      type: "exponential",
      delay: 2000,  // 2s, 4s, 8s, 16s
    },
    removeOnComplete: { count: 100, age: 3600 },    // Keep last 100 completed jobs, max 1h
    removeOnFail: { count: 500, age: 86400 * 7 },   // Keep failed jobs 7 days for audit
  },
});

// ── Crawl Queue ───────────────────────────────────────────────────────────────

export interface CrawlJobData {
  crawlJobId: string;
  documentId: string;
  schoolId: string;
  url: string;
  sourceType: string;
  extractionSchema: Record<string, unknown>;
  crawlOptions: {
    delayMs: number;
    maxPages: number;
  };
}

export const crawlQueue = new Queue<CrawlJobData>("knowledge:crawl", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 10_000,  // 10s, 20s, 40s — crawl jobs are slow; don't hammer target sites
    },
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 200, age: 86400 * 14 },
  },
});

// ── Curriculum Map Queue ──────────────────────────────────────────────────────

export interface CurriculumMapJobData {
  documentId: string;
  schoolId: string;
  chunkIds: string[];
}

export const curriculumMapQueue = new Queue<CurriculumMapJobData>("knowledge:curriculum-map", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: "fixed", delay: 5000 },
    priority: 10,  // Lower than embed (higher number = lower priority in BullMQ)
    removeOnComplete: { count: 50 },
    removeOnFail: { count: 100 },
  },
});

// ── Re-index Queue ────────────────────────────────────────────────────────────
// Used when embedding model changes and all chunks must be re-embedded

export interface ReindexJobData {
  schoolId: string | "ALL";    // "ALL" triggers global re-index (admin-only)
  reason: string;
  newModel: string;
}

export const reindexQueue = new Queue<ReindexJobData>("knowledge:reindex", {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 1,   // No retry — re-index jobs are triggered manually with monitoring
    removeOnComplete: { count: 10 },
    removeOnFail: { count: 10 },
  },
});
```

### Dead-Letter Handling

```typescript
// packages/knowledge-service/src/queue/workers/embed.worker.ts

export const embedWorker = new Worker<EmbedJobData>(
  "knowledge:embed",
  async (job: Job<EmbedJobData>) => {
    const { documentId, schoolId } = job.data;

    try {
      await embedModule.processDocument(documentId, schoolId);
    } catch (error) {
      if (job.attemptsMade >= (job.opts.attempts ?? 4) - 1) {
        // Final attempt failed — move to dead letter
        await db.knowledgeDocument.update({
          where: { id: documentId },
          data: {
            status: "FAILED",
            error: `Embedding failed after ${job.attemptsMade + 1} attempts: ${error.message}`,
          },
        });

        // Audit log
        await auditLog.write({
          action: "EMBED_DEAD_LETTER",
          documentId,
          schoolId,
          error: error.message,
          jobId: job.id,
        });

        // Notify: insert event for notification service to pick up
        await db.notificationEvent.create({
          data: {
            schoolId,
            type: "DOCUMENT_FAILED",
            payload: { documentId, title: await getDocumentTitle(documentId) },
          },
        });
      }
      throw error;  // Re-throw so BullMQ applies backoff
    }
  },
  {
    connection: redisConnection,
    concurrency: 5,   // 5 concurrent embed workers — each calls OpenAI in parallel
    limiter: {
      max: 10,        // Max 10 jobs started per second across all workers
      duration: 1000,
    },
  }
);

// Dead-letter events (job has exhausted all retries)
embedQueue.on("failed", async (job, error) => {
  // BullMQ event — job stays in failed set for 7 days per removeOnFail config
  logger.error({ jobId: job?.id, documentId: job?.data.documentId, error: error.message },
    "Embed job permanently failed");
});
```

### Retry Policy Summary

| Queue | Max Attempts | Backoff | Dead-Letter Action |
|---|---|---|---|
| knowledge:embed | 4 | Exponential 2s (2s/4s/8s/16s) | Document → FAILED, notify teacher |
| knowledge:crawl | 3 | Exponential 10s (10s/20s/40s) | CrawlJob → DEAD_LETTER, notify admin |
| knowledge:curriculum-map | 2 | Fixed 5s | Silent fail — chunks remain without curriculum mapping |
| knowledge:reindex | 1 | None | Manual intervention required; alert ops |

---

## 7. Security Model

### schoolId Enforcement

The `schoolId` claim is extracted from the verified Clerk JWT in the route middleware. It is passed as a parameter to every Knowledge Service method — it is never derived from request body or query string. The service does not trust caller-supplied schoolId without JWT verification upstream.

At the database layer, `schoolId` enforcement is redundant but mandatory. Every query that touches `knowledge_documents` or `knowledge_chunks` includes `WHERE school_id = $schoolId` in the SQL. This is not optional defensive programming — it is the security boundary. If a bug in the application layer passed the wrong `schoolId`, the database constraint would still prevent cross-school data access.

```typescript
// packages/knowledge-service/src/db/knowledge.prisma-client.ts

/**
 * Every public-facing query goes through this wrapper.
 * It is a compile-time contract that schoolId is always present.
 */
export async function getChunksForSchool(
  schoolId: string,  // Non-optional — no default, no fallback
  sql: string,
  params: unknown[]
): Promise<KnowledgeChunk[]> {
  // Verifies schoolId is a valid non-empty CUID before executing
  if (!isValidCuid(schoolId)) throw new KnowledgeServiceError("UNAUTHORIZED", "Invalid schoolId");
  return db.$queryRawUnsafe(sql, ...params);
}
```

### SSRF Protection

The URL allowlist is defined in a separate config file and validated before any URL is passed to Crawl4AI.

```typescript
// packages/knowledge-service/src/modules/crawl/ssrf.guard.ts

const ALLOWED_DOMAINS = new Set([
  "waec.gov.ng", "waecdirect.org",
  "neco.gov.ng",
  "jamb.gov.ng",
  "nerdc.gov.ng",
  "nabteb.gov.ng",
  "jupeb.edu.ng",
  "bece.edu.ng",
  "education.gov.ng",
  "naijalearn.com",
  "prepclass.com.ng",
]);

const BLOCKED_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^127\./,
  /^169\.254\./,
  /^::1$/,
  /^fc00:/,
  /^fe80:/,
];

/**
 * Validates a URL before it is forwarded to Crawl4AI.
 * Throws KnowledgeServiceError("SSRF_BLOCKED") if validation fails.
 */
export function assertCrawlUrlAllowed(rawUrl: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl);
  } catch {
    throw new KnowledgeServiceError("SSRF_BLOCKED", "Invalid URL format");
  }

  // Protocol must be https (not http, file://, ftp://)
  if (parsed.protocol !== "https:") {
    throw new KnowledgeServiceError("SSRF_BLOCKED", "Only HTTPS URLs are permitted");
  }

  // Hostname must be in allowlist (subdomain-aware)
  const hostname = parsed.hostname.toLowerCase();
  const isAllowed = [...ALLOWED_DOMAINS].some(
    domain => hostname === domain || hostname.endsWith(`.${domain}`)
  );
  if (!isAllowed) {
    throw new KnowledgeServiceError("SSRF_BLOCKED",
      `Domain not in crawl allowlist: ${hostname}`);
  }

  // Block private IP ranges — resolve hostname to IP and check
  // NOTE: DNS resolution is async; we do NOT resolve here to avoid TOCTOU.
  // Crawl4AI must be configured with its own SSRF guard enabled.
  // We provide defense-in-depth at this layer via domain allowlist.

  return parsed;
}
```

### API Key Handling

Embedding provider API keys are stored in environment variables and accessed only inside `adapters/openai-embed.adapter.ts`. They are never:
- Logged (strip from error messages before logging)
- Included in BullMQ job payloads
- Exposed in Knowledge Service API responses
- Passed through to Crawl4AI (Crawl4AI uses its own key for its LLM extraction pass — TeachNexis does not use Crawl4AI's LLM; it uses its own)

### Audit Logging

Every mutation (ingest, delete) writes an audit log entry synchronously before returning.

```typescript
// packages/knowledge-service/src/audit.ts

export interface AuditEntry {
  action: "DOCUMENT_INGESTED" | "DOCUMENT_DELETED" | "CRAWL_SUBMITTED"
        | "EMBED_DEAD_LETTER" | "PII_BLOCKED" | "SSRF_BLOCKED";
  schoolId: string;
  actorId?: string;      // Teacher or admin userId from JWT — null for system actions
  documentId?: string;
  crawlJobId?: string;
  metadata?: Record<string, unknown>;
  timestamp: Date;
}

// Written to knowledge_audit_log table — append-only, no soft delete
```

### Document Access Control

File buffers uploaded by teachers are stored in Supabase Storage with path `{schoolId}/{documentId}/{filename}`. Presigned URLs are generated server-side with a 15-minute TTL. The Storage bucket has no public access — every file access requires a server-generated signed URL. The Knowledge Service never hands the raw Supabase Storage URL to the client.

---

## 8. Privacy Model

### NDPR Compliance Requirements

The Nigerian Data Protection Regulation (NDPR) 2019 and its 2023 implementing guidelines impose specific obligations on TeachNexis as a data controller processing personal data of Nigerian students.

**Data minimisation:** The Knowledge Service indexes educational content, not personal data. PII filters are applied before any content enters the vector store. Student names, registration numbers, dates of birth, NIN, BVN, and phone numbers found in crawled content are redacted before storage.

**Purpose limitation:** Knowledge chunks are used solely for educational content retrieval. They are not used for profiling, advertising, or any purpose outside educational AI features. This is enforced architecturally — only the Workflow Service can call the Knowledge Service, and the Workflow Service context is limited to educational generation tasks.

**Data subject rights (Right to erasure):** When a school admin invokes `deleteDocument()`, all associated `KnowledgeChunk` rows are deleted by CASCADE. The embedding vectors are deleted with the chunk rows. The original file in Supabase Storage is deleted separately via the Storage Service. The deletion is logged in `knowledge_audit_log` with a timestamp. The `fullText` field of `KnowledgeDocument` is zeroed before the record is marked `DELETED` (soft-deleted for 30 days, then hard-deleted by a scheduled job).

### PII Filter

Applied in `CrawlModule.onCrawlComplete()` and `IngestModule.onOCRComplete()` before storing `fullText`.

```typescript
// packages/knowledge-service/src/modules/ingest/pii-filter.ts

const PII_PATTERNS: Array<{ name: string; pattern: RegExp; replacement: string }> = [
  { name: "NIN",      pattern: /\b\d{11}\b/g,                   replacement: "[NIN-REDACTED]" },
  { name: "BVN",      pattern: /\b\d{11}\b/g,                   replacement: "[BVN-REDACTED]" },
  { name: "phone_ng", pattern: /\b(?:\+234|0)[789]\d{9}\b/g,    replacement: "[PHONE-REDACTED]" },
  { name: "email",    pattern: /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/gi, replacement: "[EMAIL-REDACTED]" },
  { name: "student_id", pattern: /\b(?:REG|STD|SCH)\d{6,10}\b/gi, replacement: "[ID-REDACTED]" },
];

export interface PIIScanResult {
  cleanText: string;
  piiFound: boolean;
  detectedTypes: string[];
}

export function scanAndRedact(text: string): PIIScanResult {
  let cleanText = text;
  const detectedTypes: string[] = [];

  for (const { name, pattern, replacement } of PII_PATTERNS) {
    if (pattern.test(cleanText)) {
      cleanText = cleanText.replace(pattern, replacement);
      detectedTypes.push(name);
    }
  }

  return {
    cleanText,
    piiFound: detectedTypes.length > 0,
    detectedTypes,
  };
}
```

If `piiFound === true`, the `CrawlJob.piiBlocked` flag is set and an audit entry is written. The content is still indexed with the redacted text — it is not discarded — because the educational content surrounding the PII remains valuable. If `detectedTypes` includes a pattern with very high false-positive risk (email addresses in math problems, numeric sequences in chemistry), that specific pattern is logged but the content is indexed with redaction. The operations team reviews PII audit entries weekly.

### Data That Leaves Nigeria

In Phase 1, two data types leave Nigeria:

1. **Chunk text sent to OpenAI Embeddings API:** The content of each chunk is sent to OpenAI's API for embedding generation. By Phase 1 policy, chunk content must not contain student names, grades, or exam results. All content indexed is educational reference material (textbook passages, exam questions). This is documented in the school's data processing agreement with TeachNexis.

2. **Document files sent to olmOCR (if hosted outside Nigeria):** If olmOCR is hosted on a cloud GPU outside Nigeria, PDF pages are transmitted. Schools with data sovereignty requirements use the Ollama-Vision backend (local). The OCR Service's `dataSovereign` flag controls this — see OCR Service interface.

Phase 2 introduces Nomic offline embeddings — at that point, embedding generation can be kept entirely within Nigeria for all schools.

### Document Retention Policy

| Content Type | Retention | Trigger |
|---|---|---|
| `KnowledgeDocument.fullText` | Until school deletes document or school is deactivated | Admin `deleteDocument()` or account closure |
| `KnowledgeChunk` + embeddings | Same as document | Cascade from document deletion |
| `CrawlJob` (completed) | 90 days | Scheduled cleanup job |
| `OcrJob` results | 30 days | Scheduled cleanup job |
| `knowledge_audit_log` | 3 years | NDPR requirement for audit trails |
| Supabase Storage files | Same as `KnowledgeDocument` | Deleted on `deleteDocument()` |

---

## 9. Scaling Strategy

### Phase 1: 1–100 Schools

Single PostgreSQL instance (Neon or Supabase). Single pgvector table. Single BullMQ Redis. HNSW index with `ef_construction=128, m=16`. Expected chunk count: ~500,000 total (5,000 chunks per school × 100 schools). pgvector handles this comfortably on a single instance — HNSW search at this scale runs in 10–30ms.

### Phase 2: 100–1,000 Schools

**Connection pooling:** Add PgBouncer or Neon's built-in connection pooling. Next.js serverless functions create a new DB connection per cold start — without pooling, this saturates pg_max_connections.

**Read replica:** Separate read replica for `retrieve()` queries. Writes (ingest, chunk persist) go to primary. Reads (search, stats) go to replica. pgvector HNSW indexes are replicated. Expected lag: <1s, acceptable for retrieval.

**Embedding cache:** Redis cache on query embeddings. The cache key is `embed:{hash(queryText)}:{model}`. TTL: 1 hour. Hit rate estimate: 20–30% for common curriculum topics (photosynthesis, quadratic equations, etc.). This reduces OpenAI API spend by ~25% and cuts retrieve() latency by ~60ms on cache hits.

**Queue scaling:** Scale BullMQ embed workers horizontally. At 1,000 schools with concurrent uploads, embed throughput becomes the bottleneck. Run 3 embed worker processes with concurrency=5 each → 15 concurrent OpenAI embed calls. OpenAI rate limit: 1M tokens/min on Tier 2. A 100-chunk batch of 500-token chunks = 50,000 tokens. 15 concurrent batches = 750,000 tokens/min → within limit.

### Phase 3: 1,000–10,000 Schools

**pgvector table partitioning:** Partition `knowledge_chunks` by `school_id` hash. 10,000 schools × 5,000 chunks = 50M rows. At this scale, HNSW index scans without partitioning degrade significantly. Partition by 256 hash buckets of `school_id`.

```sql
-- Declarative hash partitioning
CREATE TABLE knowledge_chunks_partitioned (
  LIKE knowledge_chunks INCLUDING ALL
) PARTITION BY HASH (school_id);

-- 256 hash partitions
CREATE TABLE knowledge_chunks_p000 PARTITION OF knowledge_chunks_partitioned
  FOR VALUES WITH (modulus 256, remainder 0);
-- ... (generate remaining 255 partitions via script)

-- HNSW index per partition — each partition has its own HNSW graph
-- This is critical: a single global HNSW graph at 50M rows is impractical
CREATE INDEX ON knowledge_chunks_p000 USING hnsw (embedding vector_cosine_ops)
  WITH (m=16, ef_construction=128);
```

**Dedicated embedding service:** Extract `EmbedModule` into a standalone Next.js API route or a separate Python FastAPI service with GPU support. Route BullMQ embed jobs to this service. At 10,000 schools with concurrent ingestion, the embedding throughput need is ~50M tokens/day. At OpenAI pricing this is feasible, but latency p99 degrades. Phase 3 introduces Nomic offline as the primary embedder (cost $0, latency 2–5ms on GPU) with OpenAI as quality fallback.

**CDN for document storage:** Supabase Storage behind Cloudflare CDN for file delivery. OCR result caching on CDN: the processed Markdown of a WAEC 2022 Chemistry paper is the same for every school that ingests it — cache at CDN layer with schoolId-neutral key `ocr:{sha256(fileContent)}`.

**Shared corpus:** Global documents (WAEC/NECO past questions, NERDC curriculum) are stored once with `schoolId = "GLOBAL"` and returned in searches alongside school-specific content. The search SQL includes `(kd.school_id = $schoolId OR kd.school_id = 'GLOBAL')`. This avoids re-embedding identical content per school.

```sql
-- Phase 3 hybrid search with shared global corpus
WHERE (kd.school_id = $1 OR kd.school_id = 'GLOBAL')
AND kd.status = 'READY'
```

### Caching Strategy

| Cache Target | Key | TTL | Store |
|---|---|---|---|
| Query embeddings | `embed:{sha256(query)}:{model}` | 1 hour | Redis |
| `getSchoolStats()` | `stats:{schoolId}` | 5 minutes | Redis |
| `listDocuments()` | `docs:{schoolId}:{filterHash}` | 2 minutes | Redis |
| `getPastQuestions()` | `pq:{schoolId}:{subject}:{level}:{examBody}:{year}:{topic}` | 24 hours | Redis |
| HNSW `ef_search` result sets | `search:{schoolId}:{queryHash}:{filterHash}` | 10 minutes | Redis |

Search result caching is intentionally short (10 min) because new documents can be indexed at any time, invalidating cached results. `getSchoolStats()` is cached longer because counting 50M rows is expensive and stats are display-only.

---

## 10. Failure Handling

### Circuit Breaker Pattern

The circuit breaker wraps the OpenAI embeddings adapter. It uses a simple in-memory state machine with three states: CLOSED (normal), OPEN (failing, reject fast), HALF-OPEN (test recovery).

```typescript
// packages/knowledge-service/src/adapters/circuit-breaker.ts

type CircuitState = "CLOSED" | "OPEN" | "HALF_OPEN";

export class CircuitBreaker {
  private state: CircuitState = "CLOSED";
  private failureCount = 0;
  private lastFailureTime: number | null = null;

  constructor(
    private readonly threshold = 5,      // Failures before opening
    private readonly resetTimeoutMs = 30_000  // 30s before trying HALF_OPEN
  ) {}

  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "OPEN") {
      if (Date.now() - (this.lastFailureTime ?? 0) > this.resetTimeoutMs) {
        this.state = "HALF_OPEN";
      } else {
        throw new Error("Circuit OPEN — embedding provider unavailable");
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    this.state = "CLOSED";
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    if (this.failureCount >= this.threshold) {
      this.state = "OPEN";
      logger.warn({ failureCount: this.failureCount }, "Embedding circuit OPEN — switching to fallback");
    }
  }
}

export const openaiCircuitBreaker = new CircuitBreaker(5, 30_000);
```

### Failure Scenarios

#### Scenario A: OpenAI Embedding API is Down

```
1. EmbedModule.getEmbeddings() calls openaiCircuitBreaker.call(openaiAdapter.embed)
2. Circuit is CLOSED. OpenAI returns 503.
3. Failure count increments: 1/5.
4. BullMQ retries embed job with exponential backoff (2s, 4s, 8s, 16s).
5. On 5th consecutive failure, circuit OPEN.
6. Subsequent embed jobs immediately fall through to NomicEmbedAdapter (Ollama local).
7. Nomic embed runs locally — same 1536 dimensions (Matryoshka truncation).
8. Circuit enters HALF_OPEN after 30s. Next embed call tests OpenAI.
9. On success, circuit CLOSED, OpenAI resumes as primary.
10. Metric: openai_circuit_state emitted to Prometheus. Alert fires when state = OPEN > 2min.
```

**Fallback quality note:** Nomic embed-text produces semantically meaningful embeddings but with different geometry than OpenAI text-embedding-3-small. Chunks indexed under Nomic embeddings will have lower retrieval precision when queried with an OpenAI-embedded query, and vice versa. In Phase 1, the fallback is acceptable for continuity but a re-index task is queued automatically when OpenAI resumes to normalize all Nomic-indexed chunks to OpenAI geometry.

#### Scenario B: Crawl4AI Service is Unavailable

```
1. CrawlQueueWorker calls Crawl4AI adapter: HTTP request times out (30s timeout).
2. Worker throws; BullMQ applies backoff: retry in 10s, then 20s, then 40s.
3. After 3 attempts: CrawlJob.status = "DEAD_LETTER", KnowledgeDocument.status = "FAILED"
4. Admin notified via notification event.
5. CrawlJob.lastError stores: "Crawl4AI unreachable after 3 attempts at {timestamps}"
6. Admin can retry via POST /api/knowledge/crawl-jobs/{id}/retry — requeues job.
7. Root cause investigation: check Docker container health, Redis connection, Playwright startup.
```

#### Scenario C: pgvector Query Timeout

```
1. SearchModule.retrieve() issues pgvector cosine search.
2. Query times out at 5000ms (statement_timeout per connection).
3. SearchModule catches TimeoutError.
4. Fallback: keyword-only search (tsvector GIN index) without embedding similarity.
   Returns results ranked by BM25-equivalent tf-idf from PostgreSQL full-text search.
5. KnowledgeChunk.similarity is set to 0.0 for keyword-fallback results.
6. BuildContextResult.context is populated but citations have reduced confidence.
7. Metric: vector_search_timeout_total increments. Alert fires at >5 in 60s.
8. Root cause: likely HNSW index corrupted or ef_search parameter too high.
   Run REINDEX CONCURRENTLY on the HNSW index.
```

**Statement timeout configuration:**

```sql
-- Set per connection in prisma db URL or connection config
-- Normal queries: 5s
-- Reindex operations: unlimited (issued with separate connection)
ALTER ROLE teachnexis_knowledge SET statement_timeout = '5000ms';
```

#### Scenario D: Document Fails OCR

```
1. OCR Service returns: { status: "failed", error: "PDF is password-protected" }
2. IngestModule.onOCRFailed() called:
   - UPDATE knowledge_documents SET status='FAILED', error='OCR failed: PDF is password-protected'
   - No chunks created; chunkCount remains 0
3. Audit log: { action: "OCR_FAILED", documentId, schoolId, error }
4. Notification event: { type: "DOCUMENT_FAILED", documentId, title, error }
   → Notification Service pushes to teacher's dashboard: "Upload failed: your PDF appears to be
     password-protected. Please remove password protection and re-upload."
5. Teacher can delete the failed document via UI and re-upload.
6. Failed documents are automatically hard-deleted after 30 days.
```

---

## 11. Testing Strategy

### Unit Tests (per module)

Located in `packages/knowledge-service/src/modules/{module}/__tests__/`.

**CrawlModule:**
- `assertCrawlUrlAllowed` passes for all domains in allowlist (parametrised)
- `assertCrawlUrlAllowed` blocks private IP ranges: 192.168.1.1, 10.0.0.1, localhost, 0.0.0.0
- `assertCrawlUrlAllowed` blocks non-https: http:// URLs, ftp://, file://
- `onCrawlComplete` calls PII scanner before persisting text
- `onCrawlComplete` with PII-containing text: sets `piiBlocked=true` on CrawlJob

**ChunkModule:**
- `chunkPastQuestion` correctly identifies WAEC question boundaries (numbered items)
- `chunkPastQuestion` with a 2019 WAEC Chemistry paper fixture: returns N questions, each chunk contains complete question + all options
- `chunkSliding` never breaks a sentence mid-way (verify by splitting on `.` boundaries)
- `chunkSliding` produces overlapping chunks: last 64 tokens of chunk N === first 64 tokens of chunk N+1
- `chunk` dispatches correct strategy for each `sourceType`

```typescript
// packages/knowledge-service/src/modules/chunk/__tests__/chunk-past-question.test.ts

import { chunkPastQuestion } from "../chunk.module";
import { waec2023ChemistryFixture } from "../../../__fixtures__/waec-2023-chemistry.txt";

test("WAEC Chemistry 2023: each chunk is a complete question", () => {
  const chunks = chunkPastQuestion(waec2023ChemistryFixture);
  expect(chunks.length).toBeGreaterThan(40); // WAEC Chemistry has 50 questions
  for (const chunk of chunks) {
    // Every chunk must contain at least the question stem and one option
    expect(chunk.content).toMatch(/\d+\./);  // numbered question
    expect(chunk.content).toMatch(/[A-D]\./); // at least one option
  }
});

test("Question chunks are atomic — no mid-question breaks", () => {
  const chunks = chunkPastQuestion(waec2023ChemistryFixture);
  for (const chunk of chunks) {
    // A chunk should not start with an option letter (would indicate split mid-question)
    expect(chunk.content.trimStart()).not.toMatch(/^[A-E]\./);
  }
});
```

**SearchModule:**
- `vectorSearch` returns results only for the specified schoolId (mock DB returning mixed schoolIds)
- `rerankRRF` correctly merges overlapping results and ranks by combined score
- `retrieve` with `minSimilarity: 0.70` excludes results below threshold
- `keywordSearch` with Yoruba educational terms: "ẹkọ", "mathematiki" — verify no crash on non-ASCII

**EmbedModule:**
- `embedAndPersist` falls back to Nomic when OpenAI circuit is OPEN
- Chunks are batch-inserted: 247 chunks → 3 batches (100, 100, 47) — verify exactly 3 OpenAI calls
- `persistChunks` stores embedding as pgvector literal: `'[0.12, 0.34, ...]'::vector`

### Integration Tests (full round-trip)

```typescript
// packages/knowledge-service/src/__tests__/integration/ingest-retrieve.test.ts

// Uses a real PostgreSQL test DB with pgvector extension
// Uses a real Redis instance (Testcontainers or docker-compose test profile)

describe("Ingest → Retrieve round-trip", () => {
  test("Text ingest: retrieve returns relevant chunk within 2s", async () => {
    const { documentId } = await knowledgeService.ingest({
      schoolId: TEST_SCHOOL_ID,
      sourceType: "lesson-note",
      title: "Photosynthesis: Light Reactions",
      subject: "Biology",
      classLevel: "SS2",
      content: { type: "text", text: PHOTOSYNTHESIS_FIXTURE_TEXT },
    });

    // Wait for sync embed (text path is synchronous)
    const doc = await knowledgeService.getDocumentStatus(documentId, TEST_SCHOOL_ID);
    expect(doc.status).toBe("READY");

    const chunks = await knowledgeService.retrieve({
      query: "what is the role of chlorophyll in photosynthesis",
      schoolId: TEST_SCHOOL_ID,
      filters: { subject: "Biology" },
      topK: 3,
      minSimilarity: 0.65,
    });

    expect(chunks.length).toBeGreaterThan(0);
    expect(chunks[0].similarity).toBeGreaterThan(0.65);
    expect(chunks[0].content.toLowerCase()).toContain("chlorophyll");
  });

  test("schoolId isolation: school A cannot retrieve school B documents", async () => {
    // Ingest into School A
    await knowledgeService.ingest({ schoolId: SCHOOL_A_ID, ..., content: { type: "text", text: UNIQUE_PHRASE_TEXT } });

    // Retrieve as School B
    const chunks = await knowledgeService.retrieve({
      query: UNIQUE_PHRASE_QUERY,
      schoolId: SCHOOL_B_ID,
    });

    expect(chunks.length).toBe(0);  // Must return nothing
  });

  test("buildContext returns non-empty context for WAEC Chemistry topic", async () => {
    // Pre-seeded: WAEC Chemistry past questions already in test DB
    const result = await knowledgeService.buildContext({
      query: "oxidation number rules",
      schoolId: TEST_SCHOOL_ID,
      filters: { subject: "Chemistry", sourceTypes: ["waec-past-question"] },
    });

    expect(result.context.length).toBeGreaterThan(100);
    expect(result.citations.length).toBeGreaterThan(0);
    expect(result.citations[0].examBody).toBe("WAEC");
  });
});
```

### Contract Tests (against OCR Service)

The Knowledge Service makes HTTP calls to OCR Service. Contract tests verify the request/response shape matches the OCR Service interface without running the full OCR pipeline.

```typescript
// packages/knowledge-service/src/__tests__/contracts/ocr-service.contract.test.ts
// Uses MSW (Mock Service Worker) to intercept HTTP calls to OCR Service

import { setupServer } from "msw/node";
import { http, HttpResponse } from "msw";

const server = setupServer(
  http.post("http://ocr-service:3001/ocr/submit", ({ request }) => {
    // Verify request shape matches OCR Service interface
    const body = await request.json();
    expect(body).toMatchObject({
      documentId: expect.any(String),
      schoolId: expect.any(String),
      documentType: expect.stringMatching(/textbook|past-question|lesson-note/),
    });
    return HttpResponse.json({ jobId: "mock-ocr-job-1", status: "pending" });
  }),
  http.get("http://ocr-service:3001/ocr/status/:jobId", ({ params }) => {
    return HttpResponse.json({
      jobId: params.jobId,
      status: "ready",
      fullMarkdown: "# Chapter 1\n\nThis is extracted text.",
      pageCount: 3,
      backend: "olmocr",
    });
  })
);
```

### Load Tests

Run with k6 against a staging environment with a pre-seeded database (100k chunks across 20 test schools).

**Embedding throughput test:**
```javascript
// k6/embed-throughput.js
// Target: ingest 100 plain-text documents in parallel; measure time to READY

export default function () {
  const response = http.post(`${BASE_URL}/api/knowledge/ingest`, JSON.stringify({
    schoolId: SCHOOL_IDS[__VU % 20],
    sourceType: "lesson-note",
    content: { type: "text", text: generateUniqueText(__VU, __ITER) },
    subject: "Mathematics", classLevel: "SS1", title: `Load Test ${__ITER}`,
  }));
  check(response, { "ingest accepted": (r) => r.status === 200 });
}

export const options = {
  vus: 100,
  duration: "60s",
  thresholds: {
    http_req_duration: ["p95<500"],  // Ingest response (not full embed) < 500ms
  },
};
```

**Vector search latency test:**
```javascript
// k6/vector-search.js
// Target: 200 concurrent retrieve() calls; measure latency

export const options = {
  vus: 200,
  duration: "120s",
  thresholds: {
    http_req_duration: ["p50<100", "p95<300", "p99<800"],
  },
};
```

**Nigerian content test scenarios:**

These fixtures must be in the test suite — they cover real-world challenges unique to Nigerian educational content:

1. **Yoruba Hausa Igbo subject names:** Ingest a document titled "Yorùbá Language SS1" — verify chunking does not corrupt diacritical marks
2. **WAEC 2023 Mathematics:** Fixture with LaTeX-style math (`x² + 2x - 15 = 0`) — verify ChunkModule does not split equations mid-expression
3. **NECO result checker page:** Crawl fixture page containing student names and registration numbers — verify PII scanner redacts all identifiers
4. **Scanned WAEC OBJ paper:** Low-quality scan with skewed text — verify OCR gracefully fails and marks document FAILED rather than indexing garbage text
5. **Chemistry equations with subscripts:** H₂SO₄, CaCO₃ in OCR output — verify embeddings capture chemical formula semantics

---

## 12. Monitoring

### Metrics

All metrics are emitted via `prom-client` (Node.js Prometheus client). Scraped by Prometheus, visualised in Grafana.

| Metric | Type | Labels | Alert Threshold |
|---|---|---|---|
| `knowledge_ingest_duration_ms` | Histogram | `source_type`, `status` | p99 > 60,000ms (1 min) |
| `knowledge_embed_batch_duration_ms` | Histogram | `provider`, `batch_size` | p95 > 5,000ms |
| `knowledge_embed_api_errors_total` | Counter | `provider`, `error_code` | rate(5m) > 10 |
| `knowledge_embed_circuit_state` | Gauge (0/1/2) | `provider` | state = OPEN > 120s |
| `knowledge_retrieve_duration_ms` | Histogram | `hybrid`, `filter_count` | p50 > 100ms, p99 > 800ms |
| `knowledge_vector_search_timeouts_total` | Counter | `school_id` | rate(5m) > 5 |
| `knowledge_crawl_success_total` | Counter | `domain`, `source_type` | — |
| `knowledge_crawl_failure_total` | Counter | `domain`, `error_type` | rate(1h) > 10 per domain |
| `knowledge_crawl_pii_blocked_total` | Counter | `domain` | any > 0 (requires review) |
| `knowledge_chunk_count` | Gauge | `school_id`, `subject` | — |
| `knowledge_document_count` | Gauge | `school_id`, `status` | — |
| `knowledge_storage_bytes` | Gauge | `school_id` | per-school quota alert at 80% |
| `knowledge_queue_depth` | Gauge | `queue_name` | embed_queue > 1000 |
| `knowledge_queue_job_age_seconds` | Gauge | `queue_name` | embed_queue oldest job > 600s |
| `knowledge_ocr_callback_duration_ms` | Histogram | `backend` | p95 > 120,000ms |

### Dashboard Panels (Grafana)

**Panel 1 — Ingest Health:** Time series of `ingest_duration_ms` p50/p95/p99 by source_type. Threshold line at 60s.

**Panel 2 — Embedding Provider:** Gauge showing circuit state (green=CLOSED, yellow=HALF_OPEN, red=OPEN). Stacked bar of embedding calls by provider (OpenAI vs Nomic).

**Panel 3 — Search Performance:** Heatmap of `retrieve_duration_ms` by time of day (identifies peak load). Single-stat of p99 search latency for the last hour.

**Panel 4 — Crawl Reliability:** Success rate per domain (bar chart). Failed crawl counts by error type (pie: timeout, HTTP error, PII blocked, parse error).

**Panel 5 — Knowledge Base Growth:** Line chart of total chunk count per day, broken down by subject. Storage bytes by school (top 10 schools).

**Panel 6 — Queue Health:** BullMQ queue depth for all four queues. Oldest job age. Dead-letter count (should always be 0; alert if > 0).

**Panel 7 — Error Rate:** Combined error rate across all modules. Knowledge service 5xx rate from API router. Top 5 error codes in the last hour.

### Alert Configuration

```yaml
# alerting/knowledge-service.yaml

groups:
  - name: knowledge-service
    rules:
      - alert: EmbeddingCircuitOpen
        expr: knowledge_embed_circuit_state{provider="openai"} == 1
        for: 2m
        annotations:
          summary: "OpenAI embedding circuit breaker OPEN — using Nomic fallback"
          action: "Check OpenAI status page. Verify Nomic Ollama is running locally."

      - alert: VectorSearchSlow
        expr: histogram_quantile(0.99, knowledge_retrieve_duration_ms) > 800
        for: 5m
        annotations:
          summary: "Vector search p99 > 800ms — check HNSW index health"
          action: "Run EXPLAIN ANALYZE on a sample query. Check if REINDEX needed."

      - alert: EmbedQueueBacklog
        expr: knowledge_queue_depth{queue="knowledge:embed"} > 1000
        for: 10m
        annotations:
          summary: "Embed queue backlog > 1000 jobs"
          action: "Scale embed workers. Check OpenAI API latency."

      - alert: CrawlDomainFailures
        expr: rate(knowledge_crawl_failure_total[1h]) > 10
        for: 0m
        annotations:
          summary: "High crawl failure rate for {{ $labels.domain }}"
          action: "Verify domain is reachable. Check if IP blocking has occurred. Increase delay."

      - alert: PIIDetected
        expr: increase(knowledge_crawl_pii_blocked_total[1h]) > 0
        for: 0m
        severity: warning
        annotations:
          summary: "PII detected in crawled content"
          action: "Review audit log. Verify redaction was applied. Consider domain blocklist."
```

---

## 13. Replacement Roadmap

### Phase 1 — Foundation (Current)

**Crawl4AI + OpenAI Embeddings + pgvector**

- Crawl4AI Docker microservice handles all URL ingestion
- OpenAI `text-embedding-3-small` (1536 dim) for all embeddings
- Single pgvector table with HNSW index
- BullMQ on Redis for job queuing
- OCR: olmOCR (cloud GPU) as primary, Ollama-Vision as fallback

**Limitations to track:**
- OpenAI dependency for every embed call — cost and availability risk
- Crawl4AI Python service is operationally heavy (Playwright, Redis, 500MB container)
- No fine-tuning for Nigerian educational content — generic English embeddings miss domain-specific semantics (e.g., "WAEC" as exam context vs word meaning)

### Phase 2 — Resilience and Cost Reduction

**Target: Q1 2027 | Trigger: 1,000+ schools or OpenAI spend > $500/month**

1. **Nomic embed-text as primary embedder (offline):**
   - Deploy Nomic via Ollama on DigitalOcean Lagos GPU droplet
   - Route all new ingestion through Nomic; OpenAI retained as quality fallback only
   - One-time re-index job: re-embed all existing chunks with Nomic (run over 1 week, low priority queue)
   - Cost reduction: ~95% reduction in embedding API spend

2. **DeepSeek OCR as secondary backend:**
   - Add DeepSeek OCR adapter to OCR Service
   - Benchmark all three backends (olmOCR, DeepSeek, Ollama-Vision) on a standard corpus of 100 WAEC papers
   - Route based on benchmarked accuracy × cost score

3. **Native TypeScript scrapers for high-volume stable sources:**
   - WAEC and NECO past question pages have predictable structure. Build lightweight Playwright-for-Node scrapers
   - Route these away from Crawl4AI via the `KnowledgeCollectorAdapter`
   - Crawl4AI retained for long-tail sources (government circulars, blogs)

4. **Shared WAEC/NECO corpus:**
   - Index all available WAEC/NECO/JAMB past questions once into `school_id = "GLOBAL"` partition
   - Schools query the shared corpus; no per-school re-indexing of the same content
   - Reduces chunk duplication by estimated 60–70%

### Phase 3 — Native Model and Advanced Retrieval

**Target: Q3 2027 | Trigger: 5,000+ schools, retrieval quality feedback from teachers**

1. **TeachNexis-Embed-1 (fine-tuned embedding model):**
   - Fine-tune a base embedding model (e.g., `bge-large-en-v1.5` or `e5-large`) on Nigerian educational content
   - Training corpus: all indexed WAEC/NECO/JAMB content + Nigeria-specific curriculum texts
   - Evaluation: MTEB-style retrieval benchmarks using hand-labelled relevance pairs from teachers
   - Deploy on dedicated GPU infrastructure (Lagos or South Africa region)
   - Expected improvement: +8–12 NDCG@5 over generic English embeddings on Nigerian exam content

2. **Hybrid ColBERT retrieval:**
   - Add late-interaction retrieval (ColBERT) for high-value query paths (lesson generation, exam creation)
   - Store per-token embeddings for top documents; full ColBERT on candidates from HNSW first-pass
   - Two-stage retrieval: HNSW (fast, approximate) → ColBERT re-rank (slow, precise)

3. **Knowledge graph queries:**
   - Connect `CurriculumMapping` to enable graph-traversal queries: "find all chunks related to topics that prerequisite-link to this chunk's topic"
   - Implementation: pgvector similarity + CIG graph traversal in a single query using PostgreSQL CTEs
   - Enables `buildContext()` to pull prerequisite knowledge automatically

4. **pgvector partitioning** (described in Section 9, Phase 3)

### Phase 4 — TeachNexis-Native Crawler

**Target: Q1 2028 | Trigger: Crawl4AI upgrade costs or availability issues**

1. Build a minimal Python async crawler: raw Playwright-for-Python, no Crawl4AI layer
2. Purpose-built extraction schemas for each stable source (WAEC, NECO, JAMB, NERDC)
3. Retains JavaScript rendering capability (Playwright) but removes BM25, LiteLLM, and other Crawl4AI overhead
4. Estimated implementation: 6–8 weeks (single senior engineer)
5. All long-tail crawling (blogs, circulars) still uses simplified Crawl4AI wrapper or is deprecated

---

## 14. Phase 1 Implementation Checklist

### Week 1 — Database Foundation

- [ ] Write Prisma migration `0008_knowledge_service`: add `KnowledgeDocument`, `KnowledgeChunk`, `CrawlJob`, `CurriculumMapping`, `PastQuestion` models
- [ ] Write raw SQL migration: `CREATE EXTENSION IF NOT EXISTS vector`, HNSW index, GIN tsvector index
- [ ] Run `prisma migrate dev` on local; verify `knowledge_chunks.embedding` column is type `vector(1536)` via `\d knowledge_chunks` in psql
- [ ] Add `School` relation to `KnowledgeDocument` and `CrawlJob` — run `prisma generate`
- [ ] Seed test database with 3 test schools (SCHOOL_A, SCHOOL_B, GLOBAL) and 50 sample chunks for integration test setup

### Week 1–2 — Types, Modules, and IngestModule

- [ ] Create `packages/knowledge-service/` package with `package.json`, `tsconfig.json`, `src/index.ts`
- [ ] Write `src/types.ts` with all types from Section 3 (copy verbatim, validate with `tsc --noEmit`)
- [ ] Implement `KnowledgeServiceError` class
- [ ] Implement `IngestModule.ingest()` dispatcher: routes `text` → ChunkModule, `file` → OCR, `url` → CrawlModule
- [ ] Implement `IngestModule.getDocumentStatus()` with schoolId validation
- [ ] Implement `IngestModule.listDocuments()` with filters and pagination
- [ ] Implement `IngestModule.deleteDocument()` with schoolId check and CASCADE
- [ ] Wire `POST /api/knowledge/ingest` API route — auth middleware extracts schoolId from Clerk JWT

### Week 2 — ChunkModule and EmbedModule

- [ ] Implement `ChunkModule.chunkSliding()`: tiktoken tokenisation, sentence-boundary splits, 512-token / 64-overlap
- [ ] Implement `ChunkModule.chunkPastQuestion()`: regex question-boundary parser for WAEC format
- [ ] Implement `ChunkModule.chunk()` dispatcher routing by `sourceType`
- [ ] Add test fixtures: `__fixtures__/waec-2023-chemistry.txt`, `__fixtures__/photosynthesis-textbook.txt`
- [ ] Unit test: all ChunkModule tests from Section 11 passing
- [ ] Implement `openai-embed.adapter.ts`: calls OpenAI `/v1/embeddings`, handles 429 rate limit with retry
- [ ] Implement `nomic-embed.adapter.ts`: calls Ollama REST API `POST /api/embeddings`
- [ ] Implement `CircuitBreaker` class
- [ ] Implement `EmbedModule.getEmbeddings()` with circuit breaker and fallback
- [ ] Implement `EmbedModule.persistChunks()` using `$executeRawUnsafe` with `vector` cast
- [ ] Unit test: embedding fallback to Nomic when circuit OPEN

### Week 2–3 — SearchModule and buildContext

- [ ] Implement `SearchModule.vectorSearch()` with the core SQL from Section 2.5
- [ ] Implement `SearchModule.keywordSearch()` using `tsv @@ plainto_tsquery`
- [ ] Implement `SearchModule.rerankRRF()` fusion
- [ ] Implement `SearchModule.retrieve()` as the public entry point
- [ ] Implement `CitationModule.buildContextString()` with token counting and truncation
- [ ] Implement `CitationModule.formatCitation()`
- [ ] Implement `TeachNexisKnowledgeService.buildContext()` end-to-end
- [ ] Integration test: Text ingest → retrieve → buildContext round-trip (from Section 11)
- [ ] Wire `POST /api/knowledge/retrieve` API route (used internally by Workflow Service)
- [ ] Verify schoolId isolation test passes (cross-school query returns empty)

### Week 3 — BullMQ Queues and OCR Integration

- [ ] Add Redis to local Docker Compose (`docker-compose.dev.yml`)
- [ ] Implement `queue/queues.ts`: define all four BullMQ queues with configs from Section 6
- [ ] Implement `queue/workers/embed.worker.ts` with dead-letter handling
- [ ] Implement `queue/workers/crawl.worker.ts`
- [ ] Move embed path out of sync IngestModule — `text` content type now goes async via queue (except for small text < 500 tokens: keep sync for responsiveness)
- [ ] Implement OCR Service webhook handler: `POST /api/knowledge/ocr-webhook`
- [ ] Implement `IngestModule.onOCRComplete()` and `onOCRFailed()`
- [ ] Test: Upload a real PDF (20-page textbook chapter) end-to-end → status polling → READY
- [ ] Add `pii-filter.ts` with all patterns from Section 8; wire into `onOCRComplete` and `onCrawlComplete`

### Week 4 — Crawl4AI Adapter and getPastQuestions

- [ ] Deploy Crawl4AI Docker service to dev environment (local docker-compose and staging)
- [ ] Implement `adapters/crawl4ai.adapter.ts`: `POST /crawl`, `GET /jobs/{id}` with auth header
- [ ] Implement `CrawlModule.submitCrawl()` with SSRF guard
- [ ] Implement `CrawlModule.onCrawlComplete()` with PII scan
- [ ] Test: Submit a real WAEC past question URL → crawl job → KnowledgeDocument READY
- [ ] Implement structured extraction: parse `CrawlJob.structured.questions[]` → insert `PastQuestion` rows
- [ ] Implement `SearchModule.getPastQuestions()` (SQL filter, not semantic)
- [ ] Test `getPastQuestions()`: query by subject + classLevel + examBody → returns correct structured questions
- [ ] Wire `GET /api/knowledge/past-questions` API route

### Week 5 — CurriculumModule and Admin API

- [ ] Implement `CurriculumModule.mapChunkToCurriculum()`: pgvector similarity against `curriculum_nodes` description + keywords
- [ ] Implement `queue/workers/curriculum-map.worker.ts` (low-priority, runs after embed completes)
- [ ] Implement `CurriculumModule.getCurriculumContext()`: join KnowledgeChunk → CurriculumMapping → CurriculumNode
- [ ] Update `buildContext()` to attach `curriculumRef` to citations
- [ ] Implement `getSchoolStats()` with Redis caching (5-minute TTL)
- [ ] Wire `GET /api/knowledge/schools/{schoolId}/stats` route
- [ ] Implement audit logging: write to `knowledge_audit_log` table on ingest and delete
- [ ] Wire `deleteDocument()` to also delete file from Supabase Storage

### Week 6 — Observability, Testing, and First Integration

- [ ] Add `prom-client` instrumentation to all key paths (metrics from Section 12)
- [ ] Set up Grafana dashboard with panels from Section 12
- [ ] Add alert rules to Prometheus config
- [ ] Run load tests from Section 11 against staging environment; document p50/p95/p99 baselines
- [ ] Add contract tests for OCR Service using MSW (from Section 11)
- [ ] Connect Knowledge Service to Workflow Service lesson note generation:
  - Workflow Service calls `knowledgeService.buildContext()` before LLM prompt assembly
  - Verify citations appear in generated lesson note metadata
- [ ] Ship internal demo: teacher uploads one PDF textbook, generates a lesson note that cites it
- [ ] Document all environment variables required: `OPENAI_API_KEY`, `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `NOMIC_OLLAMA_ENDPOINT`, `CRAWL4AI_URL`, `CRAWL4AI_API_KEY`, `SUPABASE_STORAGE_URL`
- [ ] Add `KNOWLEDGE_SERVICE_ENABLED=true` feature flag — gates all ingest/retrieve routes so the service can be disabled per environment

---

*This document supersedes the interface sketch in `docs/service-interfaces/knowledge-service.md`. That file is retained as a summary reference. All implementation decisions and type definitions in this architecture document take precedence.*

**EmbedModule:**
- Embedding call returns array of length equal to input chunk count
- Batch of 101 chunks is split into two calls (100 + 1)
- Failed embedding call triggers retry with exponential backoff
- `storeChunkEmbeddings` writes correct `schoolId` on every chunk record

**SearchModule:**
- `retrieve()` with `schoolId: A` never returns chunks from `schoolId: B` (cross-school isolation test)
- `retrieve()` with `minSimilarity: 0.8` filters out low-similarity results
- `retrieve()` with `topK: 5` returns exactly 5 results when ≥ 5 results exist
- `buildContext()` truncates output when combined chunk length exceeds `maxTokens`
- `buildContext()` orders chunks by similarity (highest first)

**CurriculumModule:**
- `mapToWAECSyllabus("Mathematics", "SS2")` returns all WAEC topics for that level
- Coverage calculation: 3 covered out of 10 topics = 30% coverage
- Gap identification returns topics in syllabus but not in `coveredTopics`

### Integration Tests — Full Round-Trip

```typescript
it("ingest PDF → retrieve returns relevant chunks", async () => {
  // Ingest a known WAEC 2023 Mathematics paper
  const { documentId } = await knowledgeService.ingest({
    schoolId: testSchoolId,
    sourceType: "waec-past-question",
    title: "WAEC 2023 Mathematics",
    subject: "Mathematics",
    content: { type: "file", buffer: waec2023MathsPDF, mimeType: "application/pdf" },
  });

  // Wait for indexing
  await waitForDocumentReady(documentId, testSchoolId);

  // Retrieve
  const chunks = await knowledgeService.retrieve({
    query: "quadratic formula roots discriminant",
    schoolId: testSchoolId,
    filters: { subject: "Mathematics" },
    topK: 5,
  });

  expect(chunks.length).toBeGreaterThan(0);
  expect(chunks[0].similarity).toBeGreaterThan(0.75);
  expect(chunks[0].content.toLowerCase()).toContain("quadratic");
});
```

### Security Tests

```typescript
it("retrieve() cannot access documents from another school", async () => {
  const chunks = await knowledgeService.retrieve({
    query: "algebra",
    schoolId: schoolBId,   // School B querying
    topK: 10,
  });
  // Verify no chunks from School A are returned
  chunks.forEach(chunk => {
    expect(chunk.metadata.schoolId).toBe(schoolBId);
  });
});
```

### Load Tests

- Concurrent embedding: 10 parallel ingest calls each producing 50 chunks → 500 embedding API calls. Measure: batch deduplication fires correctly, no embedding API 429 errors.
- Vector search under load: 50 concurrent `retrieve()` calls. Measure: p95 < 200ms.

---

## 12. Monitoring

### Key Metrics

| Metric | Description | Alert Threshold |
|---|---|---|
| `knowledge.ingest_latency_p95` | Time from ingest() call to status READY | > 120s |
| `knowledge.embed_api_error_rate` | % of embedding API calls that fail | > 2% |
| `knowledge.vector_search_p95` | pgvector cosine query latency | > 300ms |
| `knowledge.crawl_success_rate` | % of crawl jobs that succeed per domain | < 80% per domain |
| `knowledge.chunk_count_growth` | Chunks added per day per school | Tracked only |
| `knowledge.storage_bytes` | Total pgvector storage per school | Alert at 80% of quota |
| `knowledge.pii_blocked_rate` | % of crawl results blocked by PII filter | Spike > 5% |

### Dashboard Panels

1. **Ingest pipeline status**: today's ingest jobs by status (pending/processing/ready/failed)
2. **Embedding throughput**: chunks embedded per minute, embedding API latency p50/p95
3. **Search performance**: vector search latency distribution, queries per minute
4. **Crawl health**: success rate per domain (WAEC, NECO, JAMB, MoE), last crawl time
5. **School knowledge growth**: chunk count per school, top subjects by coverage
6. **Cost tracking**: embedding API spend per day, projected monthly cost

---

## 13. Replacement Roadmap

| Phase | Knowledge Service State |
|---|---|
| **Phase 1** | Crawl4AI adapter + OpenAI embeddings + pgvector. Manual WAEC/NECO URL submission. |
| **Phase 2** | Nomic Embed as offline embedding backend. Scheduled weekly crawls (5 priority domains). DeepSeek OCR added to ingest pipeline for better formula handling. |
| **Phase 3** | Fine-tune `TeachNexis-Embed-v1` on Nigerian educational corpus. Replace OpenAI embedding for indexed content. Citation engine live (chunk → source document + page). |
| **Phase 4** | Native TypeScript crawler replaces Crawl4AI for WAEC/NECO (regular structure, no LLM extraction needed). Knowledge graph: topic → subtopic → past question links. Content versioning: track textbook edition changes. |

---

## Phase 1 Implementation Checklist

**Week 1 — Database and Schema**
- [ ] Enable pgvector extension: `CREATE EXTENSION IF NOT EXISTS vector` in Supabase SQL Editor
- [ ] Add `KnowledgeDocument`, `KnowledgeChunk`, `CrawlJob` Prisma models; run migration
- [ ] Add `KnowledgeChunk.embedding Unsupported("vector(1536)")` column; create HNSW index manually in Supabase SQL Editor
- [ ] Add `CurriculumMapping`, `PastQuestion` models for structured content
- [ ] Verify pgvector cosine search works: insert 5 test embeddings, run similarity query

**Week 2 — Ingestion Pipeline**
- [ ] Implement `IngestModule.ingestText()` — chunk plain text, generate embeddings, store chunks
- [ ] Implement `ChunkModule` — sliding window + past-question boundary strategies
- [ ] Implement `EmbedModule` — batch OpenAI text-embedding-3-small with retry
- [ ] Implement `IngestModule.ingestFile()` — route PDF to OCR Service, then to ingestText
- [ ] Wire `/api/documents/upload` route to `KnowledgeService.ingest()` (replace pdf-parse)
- [ ] End-to-end test: upload a 10-page WAEC paper → verify chunk count and embeddings in DB

**Week 3 — Retrieval**
- [ ] Implement `SearchModule.retrieve()` with pgvector cosine similarity query
- [ ] Implement `SearchModule.buildContext()` — format top-K chunks for prompt injection
- [ ] Implement `SearchModule.getPastQuestions()` — structured query on PastQuestion model
- [ ] Add `schoolId` enforcement test: confirm cross-school query returns empty
- [ ] Wire `buildContext()` into lesson note generation workflow Step 1

**Week 4 — Crawling**
- [ ] Deploy Crawl4AI Docker service on internal infrastructure (developer VM or DigitalOcean droplet)
- [ ] Implement `CrawlModule` TypeScript adapter — POST to Crawl4AI REST API
- [ ] Implement SSRF allowlist validation before any URL reaches Crawl4AI
- [ ] Implement PII filter on crawl results before indexing
- [ ] First live crawl: submit 5 WAEC past question page URLs, verify indexed into Knowledge Service
- [ ] Implement `CrawlJob` status tracking and teacher-facing progress UI

**Week 5 — Curriculum and Quality**
- [ ] Implement `CurriculumModule` — load WAEC syllabus fixtures, compute coverage %
- [ ] Implement `KnowledgeService.getSchoolStats()` for admin dashboard
- [ ] Implement `KnowledgeService.deleteDocument()` with cascade chunk deletion
- [ ] Add WAEC domain to crawl allowlist; run 2019–2023 Mathematics past questions crawl
- [ ] Implement confidence threshold filtering: exclude chunks with similarity < 0.65 from buildContext()

**Week 6 — Hardening and Monitoring**
- [ ] Security audit: confirm `schoolId` on every DB query (grep for raw Prisma queries without schoolId filter)
- [ ] Implement circuit breaker for embedding API: after 5 consecutive failures, fall back to Nomic
- [ ] Set up monitoring: ingest latency p95, vector search p95, crawl success rate per domain
- [ ] Add embedding cost tracking: log tokens consumed per embedding call, aggregate daily spend
- [ ] Load test: 10 concurrent ingest calls + 50 concurrent retrieve calls → confirm p95 targets met
- [ ] Documentation: write runbook for "how to re-index a school's documents" and "how to add a new crawl domain"
