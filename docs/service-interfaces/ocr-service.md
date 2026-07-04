# TeachNexis OCR Service — Interface Design

**Service Name:** `TeachNexisOCRService`  
**Capability Gap It Closes:** Document intelligence for textbooks, scanned notes, exam papers, past questions  
**Backed By (Phase 1):** olmOCR + Ollama-Vision  
**Owned By:** TeachNexis (interface is ours; backends are swappable)  
**Document:** 2026-07-04  

---

## Purpose

TeachNexis handles a wide variety of educational documents:
- Scanned WAEC/NECO/JAMB past question papers (PDF, image)
- Uploaded school textbooks (multi-page PDF)
- Teacher-scanned lesson notes (photo, PDF)
- Ministry of Education curriculum documents (PDF)
- Student worksheets and assignments (image)

These must be converted to clean, searchable, LLM-ready text before they can enter the knowledge base or RAG pipeline. The OCR Service owns that conversion — regardless of what model or backend performs it.

---

## Design Principles

1. **Backend-agnostic.** The caller never knows if olmOCR, DeepSeek OCR, Tesseract, or Ollama-Vision processed the document.
2. **Async-first.** Large documents (100+ pages) are processed as background jobs with status polling.
3. **School-isolated.** Documents from one school cannot be accessed or leaked to another.
4. **Structured output.** Results include page-level Markdown, confidence scores, and metadata — not just a raw string.
5. **Offline capable.** The Ollama-Vision backend enables processing without cloud connectivity.

---

## TypeScript Interface

```typescript
// ── Core types ──────────────────────────────────────────────────────────────

export type OCRBackend = "olmocr" | "deepseek-ocr" | "ollama-vision" | "tesseract";

export type OCRJobStatus = "pending" | "processing" | "ready" | "failed" | "cancelled";

export type DocumentType =
  | "past-question"
  | "textbook"
  | "lesson-note"
  | "curriculum"
  | "worksheet"
  | "generic";

export interface OCROptions {
  backend?: OCRBackend;          // If omitted, auto-selected based on context
  extractMath?: boolean;         // Preserve LaTeX for math expressions (default: true)
  extractTables?: boolean;       // Convert tables to Markdown table format (default: true)
  language?: "en" | "yo" | "ha" | "ig"; // Primary document language hint
  maxPages?: number;             // Page limit (default: 200)
  priority?: "fast" | "quality"; // Affects backend and model selection
}

export interface OCRPage {
  pageNumber: number;
  markdown: string;             // Extracted content as Markdown
  rawText: string;              // Plain text without formatting
  confidence: number;           // 0.0–1.0 confidence score
  hasMath: boolean;
  hasTables: boolean;
  processingTimeMs: number;
}

export interface OCRResult {
  jobId: string;
  documentId: string;
  schoolId: string;
  status: OCRJobStatus;
  pages: OCRPage[];
  fullMarkdown: string;         // All pages concatenated
  fullText: string;             // Plain text version
  pageCount: number;
  backend: OCRBackend;
  totalProcessingTimeMs: number;
  error?: string;               // Only set if status === "failed"
}

export interface OCRJob {
  jobId: string;
  documentId: string;
  schoolId: string;
  status: OCRJobStatus;
  pageCount?: number;
  pagesProcessed: number;
  createdAt: Date;
  estimatedCompletionAt?: Date;
}

// ── Service interface ────────────────────────────────────────────────────────

export interface TeachNexisOCRService {
  /**
   * Submit a document for OCR processing. Returns a job handle immediately.
   * Poll getJobStatus() or subscribe to events for completion.
   */
  submitDocument(input: {
    fileBuffer: Buffer;
    mimeType: "application/pdf" | "image/jpeg" | "image/png" | "image/webp";
    documentId: string;
    schoolId: string;
    documentType: DocumentType;
    options?: OCROptions;
  }): Promise<OCRJob>;

  /**
   * Get the current status and (if ready) full result of a job.
   */
  getJobResult(jobId: string, schoolId: string): Promise<OCRResult>;

  /**
   * Synchronous extraction for single-page or small inputs (< 3 pages).
   * Use only for real-time flows; prefer submitDocument for larger files.
   */
  extractSync(input: {
    fileBuffer: Buffer;
    mimeType: "application/pdf" | "image/jpeg" | "image/png";
    schoolId: string;
    options?: OCROptions;
  }): Promise<OCRPage[]>;

  /**
   * Cancel a pending or in-progress job.
   */
  cancelJob(jobId: string, schoolId: string): Promise<void>;

  /**
   * List available backends and their status.
   */
  getBackends(): Promise<{
    backend: OCRBackend;
    available: boolean;
    avgLatencyMs: number;
    supportsOffline: boolean;
  }[]>;
}
```

---

## Backend Selection Logic

```typescript
function selectBackend(context: {
  schoolConfig: SchoolConfig;
  documentType: DocumentType;
  priority: "fast" | "quality";
  pageCount: number;
}): OCRBackend {
  // Offline schools always use local Ollama
  if (context.schoolConfig.offlineMode) return "ollama-vision";

  // Data-sovereign schools (government, sensitive) use local Ollama
  if (context.schoolConfig.dataSovereign) return "ollama-vision";

  // Fast priority + cloud available → DeepSeek OCR
  if (context.priority === "fast") return "deepseek-ocr";

  // Math-heavy documents → olmOCR (best math accuracy)
  if (context.documentType === "past-question") return "olmocr";

  // Default quality path
  return "olmocr";
}
```

---

## Phase 1 Implementation Plan

| Component | What to Build | Timeline |
|---|---|---|
| Service interface + types | TypeScript types as above | Day 1 |
| Job queue | Store jobs in existing Prisma DB (`OcrJob` model) | Day 1-2 |
| olmOCR backend adapter | Python microservice exposing `POST /ocr/submit`, `GET /ocr/status/:id` | Week 1-2 |
| Ollama-Vision backend adapter | TypeScript calling Ollama REST API directly | Week 1 |
| Backend router | Auto-selects backend per `selectBackend()` logic | Week 2 |
| File upload integration | Wire up to existing document upload route | Week 2 |

---

## Database Schema (Prisma)

```prisma
model OcrJob {
  id              String    @id @default(cuid())
  documentId      String
  schoolId        String
  status          String    @default("pending") // OCRJobStatus
  backend         String?
  pageCount       Int?
  pagesProcessed  Int       @default(0)
  resultJson      Json?     // OCRResult stored here when ready
  error           String?
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
  completedAt     DateTime?

  document        Document  @relation(fields: [documentId], references: [id])
  school          School    @relation(fields: [schoolId], references: [id])
}
```

---

## Security Requirements

- [ ] Documents are stored encrypted at rest
- [ ] Job results are scoped by `schoolId` — cross-school access returns 403
- [ ] Ollama service is bound to `127.0.0.1` only (never public)
- [ ] olmOCR Python service is in the same VPC as the Next.js app
- [ ] Job results are purged after 30 days
- [ ] File buffers are never logged

---

## Replacement Roadmap

| Phase | Action |
|---|---|
| Phase 1 | olmOCR + Ollama-Vision as dual backends |
| Phase 2 | Add DeepSeek OCR as third backend; benchmark all three |
| Phase 3 | Fine-tune a 2B vision model on Nigerian textbook data; publish as TeachNexis-OCR-2B |
| Phase 4 | TeachNexis-OCR-2B becomes the primary backend; retire olmOCR dependency |
