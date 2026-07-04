# TeachNexis Knowledge Service — Interface Design

**Service Name:** `TeachNexisKnowledgeService`  
**Capability Gap It Closes:** Educational knowledge base and RAG for WAEC, NECO, JAMB, school curriculum, uploaded textbooks, and teacher notes  
**Backed By (Phase 1):** Crawl4AI (ingestion) + pgvector (storage) + existing OpenRouter/Groq LLMs (retrieval)  
**Owned By:** TeachNexis  
**Document:** 2026-07-04  

---

## Purpose

TeachNexis's AI features — lesson generation, CBT question generation, student tutoring, curriculum mapping — are only as good as the knowledge they draw from. The Knowledge Service is the single source of truth for all indexed educational content:

- WAEC/NECO/JAMB past questions (crawled and indexed)
- School curriculum documents (uploaded by teachers or admins)
- Textbook content (OCR-processed and chunked)
- Ministry of Education circulars and syllabi
- Teacher-created lesson notes
- Educational web content (curated, filtered crawls)

The Knowledge Service owns the pipeline from raw source → chunked text → vector embeddings → retrieval. Every AI feature that needs context calls this service. No AI feature accesses the vector store directly.

---

## Architecture Overview

```
Sources                    Pipeline                        Storage
───────                    ────────                        ───────
WAEC/NECO sites        →   KnowledgeCollector             →  Prisma DB
                           (Crawl4AI adapter)               (Document model)
Uploaded PDFs/DOCX     →   OCR Service                    →  pgvector
                           + Chunker                         (embeddings)
Teacher lesson notes   →   Text extractor                 →  
                           + Chunker                         
                      
Retrieval: AI features call KnowledgeService.retrieve() 
→ KnowledgeService queries pgvector
→ Returns ranked chunks
→ AI feature builds prompt context
```

---

## TypeScript Interface

```typescript
// ── Source types ─────────────────────────────────────────────────────────────

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

// ── Knowledge document ────────────────────────────────────────────────────────

export interface KnowledgeDocument {
  id: string;
  schoolId: string;
  sourceType: KnowledgeSourceType;
  title: string;
  subject: string;
  classLevel?: ClassLevel;
  year?: number;
  examBody?: ExamBody;
  sourceUrl?: string;
  fullText: string;
  chunkCount: number;
  status: "indexing" | "ready" | "failed";
  indexedAt?: Date;
  createdAt: Date;
}

// ── Query and retrieval ───────────────────────────────────────────────────────

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
  topK?: number;              // Default: 5
  minSimilarity?: number;     // Default: 0.70
  includeMetadata?: boolean;
}

export interface KnowledgeChunk {
  id: string;
  documentId: string;
  content: string;
  similarity: number;
  metadata: {
    subject: string;
    classLevel?: ClassLevel;
    sourceType: KnowledgeSourceType;
    pageNumber?: number;
    chunkIndex: number;
    year?: number;
    examBody?: ExamBody;
    documentTitle: string;
  };
}

// ── Past question specific ────────────────────────────────────────────────────

export interface PastQuestion {
  id: string;
  examBody: ExamBody;
  year: number;
  subject: string;
  classLevel: ClassLevel;
  questionText: string;
  options?: { A: string; B: string; C: string; D: string; E?: string };
  correctAnswer?: string;
  explanation?: string;
  topic?: string;
}

// ── Ingestion ─────────────────────────────────────────────────────────────────

export interface IngestRequest {
  schoolId: string;
  sourceType: KnowledgeSourceType;
  title: string;
  subject: string;
  classLevel?: ClassLevel;
  year?: number;
  examBody?: ExamBody;
  content:
    | { type: "text"; text: string }
    | { type: "url"; url: string }          // Triggers Knowledge Collector (Crawl4AI)
    | { type: "file"; buffer: Buffer; mimeType: string }; // Triggers OCR Service
}

// ── Main service interface ────────────────────────────────────────────────────

export interface TeachNexisKnowledgeService {
  // ── Ingestion ──────────────────────────────────────────────────────────────

  /** Ingest a document into the knowledge base. Returns documentId for polling. */
  ingest(request: IngestRequest): Promise<{ documentId: string; jobId?: string }>;

  /** Get ingestion status of a document. */
  getDocumentStatus(documentId: string, schoolId: string): Promise<KnowledgeDocument>;

  /** List all indexed documents for a school. */
  listDocuments(schoolId: string, filters?: {
    subject?: string;
    sourceType?: KnowledgeSourceType;
    status?: "indexing" | "ready" | "failed";
  }): Promise<KnowledgeDocument[]>;

  /** Remove a document and all its chunks from the knowledge base. */
  deleteDocument(documentId: string, schoolId: string): Promise<void>;

  // ── Retrieval ──────────────────────────────────────────────────────────────

  /** Semantic similarity search — the core retrieval function. */
  retrieve(query: KnowledgeQuery): Promise<KnowledgeChunk[]>;

  /** Retrieve past questions for a given subject/level/examBody. */
  getPastQuestions(params: {
    schoolId: string;
    subject: string;
    classLevel: ClassLevel;
    examBody?: ExamBody;
    year?: number;
    limit?: number;
    topic?: string;
  }): Promise<PastQuestion[]>;

  /** Generate a RAG context string ready for LLM prompt injection. */
  buildContext(query: KnowledgeQuery): Promise<{
    context: string;              // Formatted for prompt injection
    citations: KnowledgeChunk[];  // Source chunks used
    truncated: boolean;           // True if context was trimmed to fit token limit
  }>;

  // ── Admin / School ─────────────────────────────────────────────────────────

  /** Get knowledge base stats for a school. */
  getSchoolStats(schoolId: string): Promise<{
    documentCount: number;
    chunkCount: number;
    subjectBreakdown: Record<string, number>;
    sourceTypeBreakdown: Record<string, number>;
    lastIndexedAt?: Date;
    storageBytes: number;
  }>;
}
```

---

## Embedding Strategy

```typescript
// Embedding config — centralized, never scattered across features
const EMBEDDING_CONFIG = {
  model: "text-embedding-3-small",      // OpenAI — 1536 dimensions
  fallback: "nomic-embed-text",         // Ollama local — offline fallback
  dimensions: 1536,
  chunkSize: 500,                        // tokens
  chunkOverlap: 50,                      // tokens
  batchSize: 100,                        // chunks per embedding API call
};
```

---

## Database Schema (Prisma additions)

```prisma
model KnowledgeDocument {
  id          String    @id @default(cuid())
  schoolId    String
  sourceType  String
  title       String
  subject     String
  classLevel  String?
  year        Int?
  examBody    String?
  sourceUrl   String?
  fullText    String
  chunkCount  Int       @default(0)
  status      String    @default("indexing")
  error       String?
  indexedAt   DateTime?
  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  school      School    @relation(fields: [schoolId], references: [id])
  chunks      KnowledgeChunk[]
}

model KnowledgeChunk {
  id           String    @id @default(cuid())
  documentId   String
  schoolId     String
  content      String
  chunkIndex   Int
  embedding    Unsupported("vector(1536)")?  // pgvector
  metadata     Json
  createdAt    DateTime  @default(now())

  document     KnowledgeDocument @relation(fields: [documentId], references: [id], onDelete: Cascade)

  @@index([schoolId])
}
```

---

## Retrieval SQL (pgvector)

```sql
-- Semantic search within school boundary
SELECT
  kc.id,
  kc.document_id,
  kc.content,
  kc.metadata,
  1 - (kc.embedding <=> $1::vector) AS similarity
FROM knowledge_chunks kc
JOIN knowledge_documents kd ON kd.id = kc.document_id
WHERE kd.school_id = $2
  AND ($3::text IS NULL OR kd.subject = $3)
  AND ($4::text IS NULL OR kd.class_level = $4)
  AND 1 - (kc.embedding <=> $1::vector) >= $5
ORDER BY kc.embedding <=> $1::vector
LIMIT $6;
```

---

## Phase 1 Implementation Plan

| Week | Task |
|---|---|
| 1 | Add `KnowledgeDocument` + `KnowledgeChunk` Prisma models. Enable pgvector extension. |
| 1–2 | Implement `ingest()` for text and file inputs. Wire to existing OCR Service. |
| 2 | Implement `retrieve()` with pgvector cosine search. |
| 2–3 | Implement `buildContext()` for prompt injection. |
| 3 | Wire Crawl4AI adapter for URL ingestion (WAEC/NECO URLs). |
| 4 | Build `getPastQuestions()` with structured extraction from indexed WAEC/NECO content. |
| 4 | Connect to first AI feature: lesson note generation uses `buildContext()`. |

---

## School Data Isolation

Every query and mutation is scoped by `schoolId`. The service enforces this at the database level — not just the application level:

- `retrieve()` always includes `WHERE school_id = $schoolId` 
- `deleteDocument()` verifies `schoolId` ownership before deletion
- Embedding API calls never include `schoolId` in the text — it is only a filter key

---

## Replacement Roadmap

| Phase | Action |
|---|---|
| Phase 1 | pgvector + OpenAI embeddings + Crawl4AI ingestion |
| Phase 2 | Add Nomic Embed as offline/local embedding fallback |
| Phase 3 | Fine-tune embedding model on Nigerian educational content (WAEC/NECO corpus) |
| Phase 4 | TeachNexis-native embedding model replaces OpenAI dependency for knowledge retrieval |
