# TeachNexis OCR Service — Internal Architecture

**Document Type:** Principal Engineer RFC  
**Version:** 1.0  
**Date:** 2026-07-04  
**Status:** Phase 1 Design — Implementation Ready  
**Owner:** Core Infrastructure  
**Supersedes:** `docs/service-interfaces/ocr-service.md` (interface spec only)

---

## Table of Contents

1. [Responsibilities](#1-responsibilities)
2. [Internal Modules](#2-internal-modules)
3. [Public API](#3-public-api)
4. [OCR Provider Abstraction](#4-ocr-provider-abstraction)
5. [Database Schema](#5-database-schema)
6. [PDF Pipeline — Step by Step](#6-pdf-pipeline--step-by-step)
7. [Formula Extraction](#7-formula-extraction)
8. [Table Extraction](#8-table-extraction)
9. [Queue and Background Jobs](#9-queue-and-background-jobs)
10. [Security Model](#10-security-model)
11. [Privacy Model](#11-privacy-model)
12. [Scaling Strategy](#12-scaling-strategy)
13. [Failure Handling](#13-failure-handling)
14. [Testing Strategy](#14-testing-strategy)
15. [Monitoring](#15-monitoring)
16. [Replacement Roadmap](#16-replacement-roadmap)
17. [Phase 1 Implementation Checklist](#17-phase-1-implementation-checklist)

---

## 1. Responsibilities

### What This Service Owns

The OCR Service owns the complete transformation of unstructured document input into clean, structured, machine-readable output. Concretely:

- **Ingest:** Accepting file buffers (PDF, JPEG, PNG, WEBP) over its internal API and validating them before any processing begins.
- **Job lifecycle:** Creating, persisting, tracking, and terminating OCR jobs. The authoritative job state lives here — no other service writes to `OcrJob`.
- **Page rendering:** Converting PDF files to per-page raster images at appropriate DPI using pypdfium2 (called via Python subprocess or the olmOCR microservice).
- **Vision inference:** Routing pages to the appropriate OCR backend (olmOCR, Ollama-Vision, Tesseract) and receiving raw token output.
- **Post-processing:** Parsing raw model output into structured `OCRPage` records: extracting LaTeX math blocks, converting table structures to Markdown/JSON, isolating diagram regions and captions.
- **Output generation:** Assembling per-page results into full-document Markdown; generating DOCX, HTML, and JSON exports on request.
- **Delivery:** Storing results in the database, notifying callers of job completion or failure via internal event or webhook.
- **Retention and purge:** Enforcing the 30-day result retention policy and purging file buffers immediately after processing.

### Strict Non-Responsibilities (Boundary Enforcement)

| Concern | Owner |
|---|---|
| Storing uploaded files long-term | Storage Service (Supabase Storage) |
| Embedding OCR output into vectors | Knowledge Service |
| Surfacing OCR results in the UI | Frontend / API routes |
| User authentication and school-level RBAC | Identity Service |
| Generating lesson notes from OCR output | Workflow Service |
| Virus scan infrastructure | DevOps / platform (OCR Service calls the hook, does not implement it) |
| AI model management (weights, updates) | ML Infrastructure |

The OCR Service never calls the Knowledge Service, never writes embeddings, and never reads from the student or teacher tables directly. Its only database writes are to `OcrJob`, `OcrPage`, and `OcrBackendLog`.

---

## 2. Internal Modules

Each module is a TypeScript class (or Python class for GPU-side code) with a single-responsibility boundary. Modules communicate through typed function calls, not through shared database access.

### 2.1 PDFPipelineModule

**Location:** `packages/ocr-service/src/modules/pdf-pipeline.ts` (orchestrator) + `services/olmocr-worker/pipeline/pdf_pipeline.py` (rendering)

**Inputs:**
- `fileBuffer: Buffer` — raw PDF bytes
- `jobId: string`
- `options: OCROptions`

**Outputs:**
- `Array<{ pageNumber: number; imageBuffer: Buffer; dpi: number; anchorText?: string }>`

**Key Functions:**

```typescript
async function renderPDFPages(
  fileBuffer: Buffer,
  options: { dpi?: number; maxPages?: number; pageRange?: [number, number] }
): Promise<RenderedPage[]>
```

1. Validates magic bytes (`%PDF-`) before any rendering. Throws `InvalidFileError` if absent.
2. Calls `pypdfium2.PdfDocument` to render each page at 150 DPI (fast mode) or 300 DPI (quality mode). 300 DPI is the default for `past-question` and `textbook` document types.
3. Extracts the pdfminer text layer (anchor text) if present. This is passed to the olmOCR backend as a hallucination-reduction hint — the vision model output must be consistent with the anchor text character distribution.
4. Batches pages into groups of 8 (configurable via `PDF_BATCH_SIZE` env var) before handing off to the vision pipeline.
5. If `maxPages` is set and the document exceeds it, truncates and records `truncatedAt` on the job record.

**Failure Behavior:**
- Corrupted PDF (pypdfium2 exception): sets job status to `FAILED` with `error: "PDF_CORRUPT"`. Does not retry.
- Partial render (some pages fail): records per-page errors, marks those pages as `status: "failed"` in `OcrPage`, continues remaining pages. Job completes with `status: "partial"`.
- DPI upscale rejection (file too large after render): halves DPI, retries once. If still too large, logs warning and proceeds.

---

### 2.2 ImagePipelineModule

**Location:** `packages/ocr-service/src/modules/image-pipeline.ts`

**Inputs:**
- `fileBuffer: Buffer`
- `mimeType: "image/jpeg" | "image/png" | "image/webp"`
- `jobId: string`
- `options: OCROptions`

**Outputs:**
- `Array<{ pageNumber: 1; imageBuffer: Buffer; normalizedBuffer: Buffer }>`

**Key Functions:**

```typescript
async function normalizeImage(
  fileBuffer: Buffer,
  mimeType: string
): Promise<NormalizedImageResult>
```

1. Decodes the image using `sharp`. Checks dimensions — minimum 300×400px, maximum 8000×10000px. Rejects outside bounds with `InvalidImageDimensionsError`.
2. Applies pre-processing: deskew (rotation correction up to ±15°), adaptive histogram equalization for contrast normalization on dark or underexposed scans (common in Nigerian school photocopies), binarization if the image is already greyscale.
3. Converts to PNG for consistent backend input regardless of original format.
4. No batching needed — images are always single-page inputs. Wraps in a single-element array to satisfy the shared `RenderedPage[]` interface consumed downstream.

**Failure Behavior:**
- Image decode fails (sharp error): `status: "FAILED"`, `error: "IMAGE_CORRUPT"`.
- Dimensions out of range: `status: "FAILED"`, `error: "IMAGE_DIMENSIONS_INVALID"`. Returns actionable message: "Image must be between 300×400 and 8000×10000 pixels."
- Pre-processing degrades quality (deskew angle > 15° detected): skips deskew, logs warning on job record, proceeds with raw image.

---

### 2.3 FormulaExtractionModule

**Location:** `packages/ocr-service/src/modules/formula-extraction.ts`

**Inputs:**
- `rawMarkdown: string` — model output text from a single page
- `pageNumber: number`
- `documentType: DocumentType`

**Outputs:**
```typescript
interface FormulaExtractionResult {
  processedMarkdown: string;       // Markdown with confirmed LaTeX blocks
  formulas: ExtractedFormula[];
  hasMath: boolean;
  mathDensity: number;             // 0.0–1.0, ratio of math tokens to total tokens
}

interface ExtractedFormula {
  id: string;
  raw: string;                     // Original text as model produced it
  latex: string;                   // Cleaned LaTeX string
  displayMode: boolean;            // true = block ($$), false = inline ($)
  position: number;                // Character offset in processedMarkdown
  renderStatus: "valid" | "failed" | "unverified";
  failureReason?: string;
}
```

Full implementation detail is in Section 7.

**Failure Behavior:**
- KaTeX render fails for a formula: sets `renderStatus: "failed"`, preserves raw text in an HTML comment `<!-- FORMULA_FAILED: <raw> -->`, continues processing the page. Does not throw.
- Module throws internally (regex catastrophic backtrack, memory): caught at module boundary, page continues without formula extraction. `hasMath: false` is returned. A warning is emitted to monitoring.

---

### 2.4 TableExtractionModule

**Location:** `packages/ocr-service/src/modules/table-extraction.ts`

**Inputs:**
- `rawMarkdown: string`
- `pageImageBuffer?: Buffer` — optional for visual line detection

**Outputs:**
```typescript
interface TableExtractionResult {
  processedMarkdown: string;
  tables: ExtractedTable[];
  hasTables: boolean;
}

interface ExtractedTable {
  id: string;
  markdownTable: string;
  jsonData: string[][];            // Row-first, header row at index 0
  htmlTable: string;
  confidence: number;
  columnCount: number;
  rowCount: number;
  hasMergedCells: boolean;        // If true, JSON fallback only; markdown will be approximate
  position: number;
}
```

Full implementation detail is in Section 8.

**Failure Behavior:**
- Table parse yields fewer than 2 columns or fewer than 2 rows: discards table candidate, returns text as prose.
- Merged cell detection: sets `hasMergedCells: true`, continues with best-effort Markdown, includes full JSON. Caller is responsible for UI treatment.

---

### 2.5 DiagramExtractionModule

**Location:** `packages/ocr-service/src/modules/diagram-extraction.ts`

**Inputs:**
- `rawMarkdown: string`
- `pageImageBuffer: Buffer`
- `documentType: DocumentType`

**Outputs:**
```typescript
interface DiagramExtractionResult {
  processedMarkdown: string;       // Diagrams replaced with placeholder blocks
  diagrams: ExtractedDiagram[];
}

interface ExtractedDiagram {
  id: string;
  captionText: string;            // Text the model produced near the diagram region
  boundingBoxHint?: string;       // Rough spatial description: "top-left quadrant"
  diagramType: DiagramType;       // "biology" | "chemistry" | "geography" | "physics" | "unknown"
  flaggedForReview: boolean;      // Always true in Phase 1
  pageNumber: number;
  placeholderMarkdown: string;    // e.g. "![Diagram: Mitosis Phase 1 — requires review](diagram-abc123)"
}

type DiagramType = "biology" | "chemistry" | "geography" | "physics" | "unknown";
```

**Key Functions:**

Detection heuristics used in Phase 1 (vision model output analysis, not pixel analysis):
1. Scan model output for structural markers: figure captions (`Fig.`, `Figure`, `Diagram`, `Illustration`), label clusters (multiple short tokens spatially isolated), arrow descriptions (`→`, `↑`, directional words).
2. Classify diagram type from adjacent text: biology (cell, organelle, mitosis, anatomy keywords), chemistry (benzene, ring, structural formula, reaction arrow context), geography (contour, latitude, map, river keywords), physics (circuit, force, vector diagram keywords).
3. Replace diagram region in Markdown with a placeholder block containing the ID, caption, and a human-review flag.

In Phase 3, this module will be upgraded to use a pixel-level region extractor (YOLO or LayoutParser) that can detect diagram bounding boxes before the OCR pass, enabling per-region vision model calls.

**Failure Behavior:** Module is non-blocking. If diagram classification throws, the raw text is preserved and no diagram records are emitted. `flaggedForReview: false` is never set in Phase 1.

---

### 2.6 MarkdownGeneratorModule

**Location:** `packages/ocr-service/src/modules/markdown-generator.ts`

**Inputs:**
- `pages: ProcessedPage[]` — array of per-page results from all upstream modules
- `documentType: DocumentType`
- `jobId: string`

**Outputs:**
- `fullMarkdown: string` — complete document Markdown
- `fullText: string` — Markdown stripped of all markup, for embedding/search

**Key Functions:**

```typescript
function assembleDocumentMarkdown(pages: ProcessedPage[]): string
```

1. Iterates pages in order. Prepends a page separator comment: `<!-- Page 1 -->`.
2. Applies document-type-specific post-processing:
   - `past-question`: Detects question numbering patterns (`1.`, `(a)`, `(i)`) and enforces consistent ordered list Markdown.
   - `textbook`: Promotes first heading on each page if none exists (uses first line as H2 if it reads like a section title by heuristic).
   - `curriculum`: Strips ministerial boilerplate headers (detected by keyword list).
3. Normalizes whitespace: collapses 3+ consecutive blank lines to 2, trims trailing whitespace from every line.
4. Produces plain text by stripping LaTeX delimiters, Markdown table pipes, heading markers, and bullet characters. This is the version stored in `OcrJob.fullText` for use by the Knowledge Service embedder.

**Failure Behavior:** If a page's `markdown` field is empty and `rawText` is non-empty, falls back to `rawText` with a comment: `<!-- markdown generation failed for page N; raw text follows -->`. Never throws — always returns a string.

---

### 2.7 DOCXGeneratorModule

**Location:** `packages/ocr-service/src/modules/docx-generator.ts`

**Inputs:**
- `fullMarkdown: string`
- `jobId: string`
- `metadata: { title: string; schoolName: string; generatedAt: Date }`

**Outputs:**
- `docxBuffer: Buffer`

**Key Functions:**

Uses `docx` npm package (pure TypeScript, no LibreOffice dependency) to convert the assembled Markdown into a `.docx` file. The conversion pipeline:

1. Parses Markdown AST using `unified` + `remark-parse`.
2. Maps AST nodes to `docx` Document elements:
   - Headings → Word Heading styles (Heading1, Heading2, Heading3)
   - Paragraphs → Normal paragraph style
   - Ordered/unordered lists → List styles with correct indentation
   - LaTeX blocks → Rendered to PNG via `katex.renderToString()` + `canvas` → embedded as inline image (this avoids Word equation editor dependency)
   - Markdown tables → `docx` Table objects with header row styling
   - Diagram placeholders → Greyed-out text block with review notice
3. Applies TeachNexis document template: school logo placeholder, margins, font (Calibri 11pt body, Calibri 14pt headings).
4. Sets document metadata: author (`TeachNexis OCR Service`), title from job metadata.

Generated DOCX is stored in Supabase Storage under `schools/{schoolId}/ocr-exports/{jobId}.docx`. The URL is returned in `OCRResult.exportUrls.docx`.

**Failure Behavior:** DOCX generation is non-blocking relative to the core OCR result. If generation fails, `OCRResult.exportUrls.docx` is `null`. An async retry is scheduled. The core Markdown result is unaffected.

---

### 2.8 HTMLGeneratorModule

**Location:** `packages/ocr-service/src/modules/html-generator.ts`

**Inputs:**
- `fullMarkdown: string`
- `jobId: string`
- `options: { includePageBreaks: boolean; theme: "print" | "screen" }`

**Outputs:**
- `htmlString: string`

**Key Functions:**

Uses `unified` + `remark-parse` + `remark-rehype` + `rehype-stringify` pipeline. Adds:
- KaTeX CSS and JS inline (for math rendering in browser without network dependency)
- `rehype-katex` plugin to render `$...$` and `$$...$$` blocks to KaTeX HTML in-place
- Syntax highlighting for code blocks (`rehype-highlight`) — relevant for CS/ICT exam papers
- Table of contents injection if the document has more than 3 H1/H2 headings
- Page break `<div class="page-break"></div>` inserted at `<!-- Page N -->` comments if `includePageBreaks: true`

Output is a self-contained HTML fragment (not a full document), intended for embedding in the web preview panel. The CDN-stripped KaTeX render is inlined so it works in the strict CSP environment of the TeachNexis frontend.

**Failure Behavior:** Falls back to a plain `<pre>` block containing the raw Markdown text if the pipeline throws. Always returns a string.

---

### 2.9 JSONExportModule

**Location:** `packages/ocr-service/src/modules/json-export.ts`

**Inputs:**
- `result: OCRResult`
- `options: { includeRawText: boolean; includePageImages: boolean }`

**Outputs:**
- `json: string` — serialized `OCRExportJSON`

**Key Functions:**

```typescript
interface OCRExportJSON {
  version: "1.0";
  jobId: string;
  documentId: string;
  schoolId: string;
  documentType: DocumentType;
  processedAt: string;             // ISO 8601
  backend: OCRBackend;
  pages: OCRPageExport[];
  formulas: ExtractedFormula[];    // All formulas across all pages
  tables: ExtractedTable[];        // All tables across all pages
  diagrams: ExtractedDiagram[];    // All diagrams across all pages
  fullMarkdown: string;
  fullText?: string;               // Omitted if includeRawText: false
  confidence: {
    overall: number;
    perPage: number[];
    formulaAccuracy: number;
    tableAccuracy: number;
  };
}
```

This JSON is the canonical structured format consumed by the Knowledge Service when ingesting OCR output into the RAG pipeline. The Knowledge Service reads `pages`, `formulas`, and `tables` separately to produce contextually-typed chunks: math formulas become math-typed chunks, tables become tabular chunks with separate column-header metadata.

**Failure Behavior:** Cannot fail independently — it serializes an already-computed `OCRResult`. If `JSON.stringify` throws (circular reference from upstream bug), catches and returns a safe fallback JSON with `{ error: "JSON_SERIALIZATION_FAILED", jobId }`.

---

### 2.10 OCRProviderAbstraction

**Location:** `packages/ocr-service/src/providers/`

This is the backend router and adapter layer. Full design is in Section 4.

---

## 3. Public API

This is the TypeScript interface that all callers (Next.js API routes, background workers, the Knowledge Service ingestor) use. No caller imports from any module below this interface.

```typescript
// ── Enumerations ─────────────────────────────────────────────────────────────

export type OCRBackend =
  | "olmocr"
  | "ollama-vision"
  | "deepseek-ocr"
  | "tesseract"
  | "teachnexis-ocr-2b";    // Phase 3+

export type OCRJobStatus =
  | "pending"        // In queue, not yet picked up
  | "processing"     // Worker is actively processing
  | "ready"          // Complete, result available
  | "partial"        // Complete, but some pages failed
  | "failed"         // Job-level failure, no usable result
  | "cancelled";     // Cancelled by caller before completion

export type DocumentType =
  | "past-question"
  | "textbook"
  | "lesson-note"
  | "curriculum"
  | "worksheet"
  | "school-circular"
  | "student-record"         // Triggers data-sovereign routing
  | "generic";

export type OCRPriority = "fast" | "quality";

export type OCRSelectionMode =
  | "auto"           // Service decides (default)
  | "offline"        // Force Ollama-Vision regardless of availability
  | "data-sovereign" // Force Ollama-Vision; document must not leave local infra
  | "quality-first"  // Force olmOCR or best available cloud backend
  | "fast";          // Prefer lowest-latency backend

// ── Core Types ────────────────────────────────────────────────────────────────

export interface OCROptions {
  backend?: OCRBackend;
  selectionMode?: OCRSelectionMode;
  extractMath?: boolean;           // default: true
  extractTables?: boolean;         // default: true
  extractDiagrams?: boolean;       // default: true (Phase 1: detection + flag only)
  language?: "en" | "yo" | "ha" | "ig";
  dpi?: 150 | 300;                 // default: 300 for past-question/textbook, 150 otherwise
  maxPages?: number;               // default: 200
  priority?: OCRPriority;
  notifyWebhook?: string;          // URL to POST on job completion/failure
  generateDocx?: boolean;          // default: false (on-demand export)
  generateHtml?: boolean;          // default: true
}

export interface OCRPage {
  pageNumber: number;
  markdown: string;
  rawText: string;
  confidence: number;              // 0.0–1.0
  hasMath: boolean;
  hasTables: boolean;
  hasDiagrams: boolean;
  processingTimeMs: number;
  backendUsed: OCRBackend;        // May differ per page if fallback triggered
  formulas: ExtractedFormula[];
  tables: ExtractedTable[];
  diagrams: ExtractedDiagram[];
  status: "ready" | "failed";
  error?: string;
}

export interface OCRResult {
  jobId: string;
  documentId: string;
  schoolId: string;
  status: OCRJobStatus;
  pages: OCRPage[];
  fullMarkdown: string;
  fullText: string;
  pageCount: number;
  pagesSucceeded: number;
  pagesFailed: number;
  backend: OCRBackend;             // Primary backend used
  totalProcessingTimeMs: number;
  overallConfidence: number;
  exportUrls: {
    html: string | null;
    docx: string | null;
    json: string | null;
  };
  error?: string;
  errorCode?: OCRErrorCode;
  createdAt: Date;
  completedAt: Date | null;
}

export type OCRErrorCode =
  | "PDF_CORRUPT"
  | "IMAGE_CORRUPT"
  | "IMAGE_DIMENSIONS_INVALID"
  | "UNSUPPORTED_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "VIRUS_DETECTED"
  | "ALL_BACKENDS_UNAVAILABLE"
  | "ZERO_TEXT_RESULT"
  | "QUOTA_EXCEEDED"
  | "JOB_TIMEOUT"
  | "INTERNAL_ERROR";

export interface OCRJob {
  jobId: string;
  documentId: string;
  schoolId: string;
  status: OCRJobStatus;
  documentType: DocumentType;
  pageCount: number | null;        // null until PDF is parsed
  pagesProcessed: number;
  backend: OCRBackend | null;
  priority: number;               // Queue priority: lower = higher priority
  createdAt: Date;
  startedAt: Date | null;
  estimatedCompletionAt: Date | null;
  notifyWebhook: string | null;
}

export interface OCRBackendStatus {
  backend: OCRBackend;
  available: boolean;
  healthy: boolean;
  avgLatencyMs: number;
  p95LatencyMs: number;
  pagesPerMinute: number;
  gpuUtilization: number | null;   // null for CPU backends
  supportsOffline: boolean;
  costPerPage: number;             // USD
  lastCheckedAt: Date;
}

export interface OCRQueueStatus {
  depth: number;
  pendingJobs: number;
  processingJobs: number;
  avgWaitMs: number;
  estimatedNewJobWaitMs: number;
  workerCount: number;
  activeWorkers: number;
}

// ── Service Interface ─────────────────────────────────────────────────────────

export interface TeachNexisOCRService {
  /**
   * Submit a document for async OCR processing. Returns immediately with a job
   * handle. Use getJobResult() to poll for completion, or set notifyWebhook in
   * options to receive a POST callback.
   *
   * Validation (magic bytes, file size, virus scan) happens synchronously before
   * the Promise resolves. If validation fails, an error is thrown — no job record
   * is created.
   */
  submitDocument(input: {
    fileBuffer: Buffer;
    fileName: string;
    mimeType: string;
    documentId: string;
    schoolId: string;
    documentType: DocumentType;
    uploadedByUserId: string;
    options?: OCROptions;
  }): Promise<OCRJob>;

  /**
   * Get the current status and (when ready) full result of a job.
   * Throws NotFoundError if jobId does not belong to the given schoolId.
   * schoolId is required to enforce school-level isolation — never omit it.
   */
  getJobResult(jobId: string, schoolId: string): Promise<OCRResult>;

  /**
   * Synchronous path for ≤3 pages. Validates and processes inline; does not
   * create a persistent job record (or creates one with status "ready"
   * immediately after). Use only for real-time interactive flows. Throws
   * SyncNotAllowedError if the input exceeds 3 pages.
   */
  extractSync(input: {
    fileBuffer: Buffer;
    fileName: string;
    mimeType: string;
    schoolId: string;
    documentType?: DocumentType;
    options?: Omit<OCROptions, "notifyWebhook">;
  }): Promise<OCRPage[]>;

  /**
   * Cancel a pending or processing job. Returns silently if the job is already
   * in a terminal state (ready, failed, cancelled). Throws NotFoundError if
   * the job does not belong to the given schoolId.
   */
  cancelJob(jobId: string, schoolId: string): Promise<void>;

  /**
   * Returns live status for all registered OCR backends. Used by the admin
   * dashboard and the backend selection logic. Performs a lightweight health
   * check on each backend before returning.
   */
  getBackends(): Promise<OCRBackendStatus[]>;

  /**
   * Returns current queue depth and estimated wait times. Used for admission
   * control (warn the teacher if the queue is backed up before they upload).
   */
  getJobQueue(schoolId?: string): Promise<OCRQueueStatus>;
}
```

---

## 4. OCR Provider Abstraction

### The Adapter Pattern

Every OCR backend implements a single interface. The core service never calls backend APIs directly — it calls `provider.processPage(...)`. Swapping from olmOCR to TeachNexis-OCR-2B requires changing one adapter file and one line in the provider registry.

```typescript
// packages/ocr-service/src/providers/types.ts

export interface OCRProviderConfig {
  id: OCRBackend;
  displayName: string;
  supportsOffline: boolean;
  supportsMath: boolean;
  supportsTables: boolean;
  supportsHandwriting: boolean;
  maxBatchSize: number;
  timeoutMs: number;
  costPerPage: number;
}

export interface PageInput {
  pageNumber: number;
  imageBuffer: Buffer;           // PNG, normalized by pipeline module
  anchorText?: string;           // pdfminer text layer (PDF inputs only)
  documentType: DocumentType;
  language: string;
  options: OCROptions;
}

export interface RawPageResult {
  pageNumber: number;
  rawMarkdown: string;           // Model output, before post-processing
  rawText: string;
  confidence: number;
  processingTimeMs: number;
  modelVersion: string;
  tokensConsumed?: number;
}

export interface OCRProvider {
  readonly config: OCRProviderConfig;

  /**
   * Check if the backend is reachable and can accept work.
   * Must return within 3 seconds.
   */
  healthCheck(): Promise<{ healthy: boolean; latencyMs: number; detail?: string }>;

  /**
   * Process a single page. Throws OCRProviderError on timeout or backend failure.
   * Must not throw on low-confidence results — return them with confidence < 0.5.
   */
  processPage(input: PageInput): Promise<RawPageResult>;

  /**
   * Process a batch of pages in a single API call (where the backend supports it).
   * Falls back to sequential processPage() calls if not supported.
   */
  processBatch(inputs: PageInput[]): Promise<RawPageResult[]>;

  /**
   * Gracefully shut down any connections or processes held by this provider.
   */
  teardown(): Promise<void>;
}
```

### olmOCR Adapter

```typescript
// packages/ocr-service/src/providers/olmocr-provider.ts

export class OlmOCRProvider implements OCRProvider {
  readonly config: OCRProviderConfig = {
    id: "olmocr",
    displayName: "olmOCR (Allen AI / Qwen2-VL-7B)",
    supportsOffline: false,
    supportsMath: true,
    supportsTables: true,
    supportsHandwriting: false,
    maxBatchSize: 8,
    timeoutMs: 120_000,         // 2 minutes per batch
    costPerPage: 0.004,          // ~$0.004/page on A10G spot instance
  };

  private readonly baseUrl: string;    // e.g. http://olmocr-worker:8080

  constructor(config: { baseUrl: string }) {
    this.baseUrl = config.baseUrl;
  }

  async healthCheck() {
    const start = Date.now();
    const res = await fetch(`${this.baseUrl}/health`, { signal: AbortSignal.timeout(3000) });
    return { healthy: res.ok, latencyMs: Date.now() - start };
  }

  async processPage(input: PageInput): Promise<RawPageResult> {
    return (await this.processBatch([input]))[0];
  }

  async processBatch(inputs: PageInput[]): Promise<RawPageResult[]> {
    // Encodes each page as base64 PNG, sends to olmOCR Python worker's
    // POST /ocr/batch endpoint. The worker calls sglang internally.
    const payload = {
      pages: inputs.map(p => ({
        page_number: p.pageNumber,
        image_b64: p.imageBuffer.toString("base64"),
        anchor_text: p.anchorText ?? null,
        document_type: p.documentType,
        language: p.language,
      })),
    };
    const res = await fetch(`${this.baseUrl}/ocr/batch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
    if (!res.ok) throw new OCRProviderError("olmocr", res.status, await res.text());
    const data = await res.json();
    return data.results.map((r: any) => ({
      pageNumber: r.page_number,
      rawMarkdown: r.markdown,
      rawText: r.plain_text,
      confidence: r.confidence,
      processingTimeMs: r.processing_time_ms,
      modelVersion: r.model_version,
    }));
  }

  async teardown() {}
}
```

### Ollama-Vision Adapter

```typescript
// packages/ocr-service/src/providers/ollama-vision-provider.ts

export class OllamaVisionProvider implements OCRProvider {
  readonly config: OCRProviderConfig = {
    id: "ollama-vision",
    displayName: "Ollama Vision (llama3.2-vision:11b — local)",
    supportsOffline: true,
    supportsMath: true,         // Adequate for printed formulas; not reliable for handwritten
    supportsTables: true,
    supportsHandwriting: false,
    maxBatchSize: 1,            // Ollama processes pages sequentially
    timeoutMs: 180_000,         // 3 minutes — CPU inference is slower
    costPerPage: 0.0,           // No per-call cost; infra cost only
  };

  private readonly ollamaUrl: string;  // e.g. http://localhost:11434
  private readonly model: string;      // e.g. "llama3.2-vision:11b"

  constructor(config: { ollamaUrl: string; model?: string }) {
    this.ollamaUrl = config.ollamaUrl;
    this.model = config.model ?? "llama3.2-vision:11b";
  }

  async healthCheck() {
    const start = Date.now();
    const res = await fetch(`${this.ollamaUrl}/api/tags`, { signal: AbortSignal.timeout(3000) });
    if (!res.ok) return { healthy: false, latencyMs: Date.now() - start };
    const { models } = await res.json();
    const loaded = models.some((m: any) => m.name.startsWith(this.model.split(":")[0]));
    return { healthy: loaded, latencyMs: Date.now() - start, detail: loaded ? undefined : `Model ${this.model} not found in Ollama` };
  }

  async processPage(input: PageInput): Promise<RawPageResult> {
    const prompt = buildOCRPrompt(input.documentType, input.language, input.anchorText);
    const start = Date.now();
    const res = await fetch(`${this.ollamaUrl}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: this.model,
        prompt,
        images: [input.imageBuffer.toString("base64")],
        stream: false,
        options: { temperature: 0.0, num_predict: 4096 },
      }),
      signal: AbortSignal.timeout(this.config.timeoutMs),
    });
    if (!res.ok) throw new OCRProviderError("ollama-vision", res.status, await res.text());
    const data = await res.json();
    return {
      pageNumber: input.pageNumber,
      rawMarkdown: data.response,
      rawText: stripMarkdown(data.response),
      confidence: estimateConfidence(data.response, input.anchorText),
      processingTimeMs: Date.now() - start,
      modelVersion: this.model,
    };
  }

  async processBatch(inputs: PageInput[]): Promise<RawPageResult[]> {
    // Sequential — Ollama does not support batch vision inference
    return Promise.all(inputs.map(i => this.processPage(i)));
  }

  async teardown() {}
}
```

### Future TeachNexis-OCR-2B Adapter

When the fine-tuned model ships in Phase 3, it requires only a new adapter that satisfies the same interface:

```typescript
// packages/ocr-service/src/providers/teachnexis-ocr-provider.ts
export class TeachNexisOCR2BProvider implements OCRProvider {
  readonly config: OCRProviderConfig = {
    id: "teachnexis-ocr-2b",
    displayName: "TeachNexis-OCR-2B (Nigerian edu fine-tune)",
    supportsOffline: true,
    supportsMath: true,
    supportsTables: true,
    supportsHandwriting: true,   // Fine-tuned on handwritten Nigerian school docs
    maxBatchSize: 16,
    timeoutMs: 60_000,           // 2B model is faster
    costPerPage: 0.001,          // Cheapest option at scale
  };
  // ... implements processPage, processBatch, healthCheck, teardown
}
```

### Backend Selection Logic

```typescript
// packages/ocr-service/src/providers/backend-selector.ts

interface SelectionContext {
  schoolConfig: {
    offlineMode: boolean;
    dataSovereign: boolean;
    tier: "free" | "standard" | "pro";
  };
  documentType: DocumentType;
  options: OCROptions;
  availableBackends: OCRBackendStatus[];
}

export function selectBackend(ctx: SelectionContext): OCRBackend {
  const { schoolConfig, documentType, options, availableBackends } = ctx;

  const isAvailable = (b: OCRBackend) =>
    availableBackends.find(x => x.backend === b)?.available ?? false;

  // Hard overrides: data boundary constraints always win
  if (schoolConfig.offlineMode || options.selectionMode === "offline") {
    if (isAvailable("ollama-vision")) return "ollama-vision";
    throw new NoBackendAvailableError("Offline mode required but Ollama-Vision is unavailable");
  }

  if (schoolConfig.dataSovereign || documentType === "student-record" || options.selectionMode === "data-sovereign") {
    if (isAvailable("ollama-vision")) return "ollama-vision";
    throw new NoBackendAvailableError("Data-sovereign mode required but local backend is unavailable");
  }

  // Explicit selection mode
  if (options.selectionMode === "fast" || options.priority === "fast") {
    // Fastest cloud backend first
    if (isAvailable("deepseek-ocr")) return "deepseek-ocr";
    if (isAvailable("olmocr")) return "olmocr";
    if (isAvailable("ollama-vision")) return "ollama-vision";
  }

  if (options.selectionMode === "quality-first") {
    if (isAvailable("olmocr")) return "olmocr";
    if (isAvailable("deepseek-ocr")) return "deepseek-ocr";
    if (isAvailable("ollama-vision")) return "ollama-vision";
  }

  // Auto mode: document-type-aware routing
  if (documentType === "past-question" || documentType === "textbook") {
    // These have the most math and tables — use olmOCR for best accuracy
    if (isAvailable("olmocr")) return "olmocr";
    if (isAvailable("deepseek-ocr")) return "deepseek-ocr";
  }

  if (documentType === "school-circular" || documentType === "lesson-note") {
    // Mostly prose — deepseek is fast and adequate
    if (isAvailable("deepseek-ocr")) return "deepseek-ocr";
    if (isAvailable("olmocr")) return "olmocr";
  }

  // Free tier: steer toward cheaper backends
  if (schoolConfig.tier === "free") {
    if (isAvailable("ollama-vision")) return "ollama-vision";
    if (isAvailable("deepseek-ocr")) return "deepseek-ocr";
  }

  // Final fallback: any available backend
  const any = availableBackends.find(b => b.available);
  if (any) return any.backend;

  throw new NoBackendAvailableError("No OCR backend is currently available");
}
```

---

## 5. Database Schema

```prisma
// In: packages/database/prisma/schema.prisma
// Add to the existing schema — these models reference the existing Document and School models.

enum OcrJobStatus {
  PENDING
  PROCESSING
  READY
  PARTIAL
  FAILED
  CANCELLED
}

enum OcrBackendEnum {
  OLMOCR
  OLLAMA_VISION
  DEEPSEEK_OCR
  TESSERACT
  TEACHNEXIS_OCR_2B
}

enum DocumentTypeEnum {
  PAST_QUESTION
  TEXTBOOK
  LESSON_NOTE
  CURRICULUM
  WORKSHEET
  SCHOOL_CIRCULAR
  STUDENT_RECORD
  GENERIC
}

model OcrJob {
  id                    String           @id @default(cuid())

  // Ownership
  documentId            String
  schoolId              String
  uploadedByUserId      String

  // Status tracking
  status                OcrJobStatus     @default(PENDING)
  errorCode             String?          // OCRErrorCode enum value
  errorMessage          String?

  // Configuration
  documentType          DocumentTypeEnum @default(GENERIC)
  backend               OcrBackendEnum?
  options               Json?            // Serialized OCROptions

  // Progress
  pageCount             Int?             // null until PDF parsed
  pagesProcessed        Int              @default(0)
  pagesSucceeded        Int              @default(0)
  pagesFailed           Int              @default(0)

  // Results (stored inline for jobs with few pages; large results stored in Supabase Storage)
  fullMarkdown          String?          @db.Text
  fullText              String?          @db.Text
  overallConfidence     Float?
  resultStorageKey      String?          // Supabase Storage key if result was offloaded

  // Export URLs
  htmlStorageKey        String?
  docxStorageKey        String?
  jsonStorageKey        String?

  // Timing
  queuePriority         Int              @default(50)   // Lower = higher priority
  createdAt             DateTime         @default(now())
  startedAt             DateTime?
  completedAt           DateTime?
  purgeAfter            DateTime?        // Set to now() + 30 days on completion

  // Notifications
  notifyWebhook         String?
  notifiedAt            DateTime?

  // Relations
  document              Document         @relation(fields: [documentId], references: [id])
  school                School           @relation(fields: [schoolId], references: [id])
  pages                 OcrPage[]
  backendLogs           OcrBackendLog[]

  @@index([schoolId, status])
  @@index([schoolId, createdAt(sort: Desc)])
  @@index([status, queuePriority, createdAt])   // Queue worker query index
  @@index([purgeAfter])                          // Purge job index
}

model OcrPage {
  id                    String           @id @default(cuid())
  jobId                 String
  pageNumber            Int

  // Content
  markdown              String?          @db.Text
  rawText               String?          @db.Text

  // Quality
  confidence            Float
  status                String           @default("ready")  // "ready" | "failed"
  errorMessage          String?

  // Detected content flags
  hasMath               Boolean          @default(false)
  hasTables             Boolean          @default(false)
  hasDiagrams           Boolean          @default(false)

  // Structured content (stored as JSON arrays)
  formulasJson          Json?            // ExtractedFormula[]
  tablesJson            Json?            // ExtractedTable[]
  diagramsJson          Json?            // ExtractedDiagram[]

  // Backend used for THIS page (may differ from job.backend if fallback occurred)
  backendUsed           OcrBackendEnum?

  // Timing
  processingTimeMs      Int?
  createdAt             DateTime         @default(now())

  // Relations
  job                   OcrJob           @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@unique([jobId, pageNumber])
  @@index([jobId])
}

model OcrBackendLog {
  id                    String           @id @default(cuid())
  jobId                 String
  pageNumber            Int?             // null = job-level event (health check, routing decision)

  backend               OcrBackendEnum
  eventType             String           // "page_processed" | "page_failed" | "batch_start" | "fallback_triggered" | "health_check"
  success               Boolean
  latencyMs             Int?
  confidence            Float?
  tokensConsumed        Int?
  costUsd               Float?
  errorMessage          String?          // Never includes file content
  modelVersion          String?

  createdAt             DateTime         @default(now())

  // Relations
  job                   OcrJob           @relation(fields: [jobId], references: [id], onDelete: Cascade)

  @@index([jobId])
  @@index([backend, createdAt(sort: Desc)])   // Cost analytics query
  @@index([createdAt(sort: Desc)])             // Monitoring query
}
```

**Schema notes:**

- `OcrJob.fullMarkdown` and `fullText` use `@db.Text` to avoid Prisma's default 191-character varchar limit. For documents > 1 MB of text, the result is offloaded to Supabase Storage and only `resultStorageKey` is set; the inline fields are null.
- `OcrJob.purgeAfter` is indexed to allow an efficient cron query: `WHERE purgeAfter < NOW() AND status IN ('READY', 'PARTIAL', 'FAILED')`.
- `OcrBackendLog.errorMessage` must never include file content, base64 images, or extracted text. This is enforced at the logging call site by sanitization.
- Cascade delete on `OcrPage` and `OcrBackendLog` means deleting a job cleans up all child records automatically.

---

## 6. PDF Pipeline — Step by Step

This is the complete walkthrough for a teacher uploading a scanned WAEC past question paper PDF.

```
Step 1: File received at API route
─────────────────────────────────
POST /api/documents/upload
  → Identity Service: requirePermission("documents:upload", teacherId, schoolId)
  → Extract fileBuffer from multipart/form-data
  → Pass to OCR Service: ocrService.submitDocument(...)
```

```
Step 2: Synchronous validation (before job creation)
─────────────────────────────────────────────────────
FileValidator.validate(fileBuffer, mimeType, fileName):
  1. Magic bytes check: first 4 bytes must match %PDF- (0x25 0x50 0x44 0x46 0x2D).
     Reject if absent. Error: UNSUPPORTED_FILE_TYPE.
  2. File size check: fileBuffer.length <= MAX_FILE_SIZE (default 100 MB).
     Reject if exceeded. Error: FILE_TOO_LARGE.
  3. MIME vs content agreement: declared mimeType must be "application/pdf".
     If mimeType is image/* but bytes are PDF, reject. Error: UNSUPPORTED_FILE_TYPE.
  4. Virus scan hook: POST fileBuffer to internal ClamAV API endpoint.
     If INFECTED: Error: VIRUS_DETECTED. Never store the file.
     If scan service unavailable: log warning, proceed (configurable via SKIP_VIRUS_SCAN).
  5. School quota check: verify schoolId has remaining monthly page quota.
     If exceeded: Error: QUOTA_EXCEEDED.
  All errors above throw before any DB write.
```

```
Step 3: Job creation in database
──────────────────────────────────
Prisma transaction:
  1. CREATE OcrJob { status: PENDING, schoolId, documentId, documentType, options }
  2. Return OCRJob handle to caller immediately.
     The upload API route returns HTTP 202 Accepted with { jobId }.
```

```
Step 4: Job enqueued
──────────────────────
  enqueueOCRJob({
    jobId,
    priority: computePriority(pageCount, schoolTier, documentType),
    // Priority formula:
    //   base: 50
    //   past-question or textbook with ≤10 pages: -30 (higher priority)
    //   school tier "pro": -10
    //   school tier "free": +20
    //   school tier "standard": 0
  });
  Queue implementation: BullMQ (Redis-backed). Queue name: "ocr-jobs".
  Job data: { jobId, schoolId } only — no file content in queue.
```

```
Step 5: Worker picks up the job
──────────────────────────────────
  OCRWorker (Node.js process, 2–4 concurrent workers in Phase 1):
    1. Fetch OcrJob from database by jobId (includes documentId).
    2. Fetch file buffer from Supabase Storage using documentId.
       File was stored by the upload route before calling submitDocument().
    3. UPDATE OcrJob SET status = PROCESSING, startedAt = NOW().
```

```
Step 6: PDF rendering (Python subprocess)
──────────────────────────────────────────
  PDFPipelineModule.renderPDFPages(fileBuffer, { dpi: 300, maxPages: 200 }):
    Calls olmOCR Python worker's POST /render endpoint, which:
      1. Writes buffer to a temp file (tmpfs, never persists to disk).
      2. Opens with pypdfium2.PdfDocument(path).
      3. Extracts pdfminer text layer per page (anchor text).
      4. Renders each page: page.render(scale=300/72).to_pil().convert("PNG").
      5. Returns list of { pageNumber, pngBase64, anchorText, width, height }.
      6. Deletes temp file immediately.
    Worker receives list. Updates OcrJob.pageCount.
```

```
Step 7: Pages batched and sent to vision model
────────────────────────────────────────────────
  Batch pages into groups of 8 (PDF_BATCH_SIZE env var).
  For each batch:
    1. BackendSelector.selectBackend(ctx) → "olmocr"
    2. OlmOCRProvider.processBatch(batch):
       POST /ocr/batch to olmOCR worker → sglang inference → Markdown per page
    3. CREATE OcrBackendLog records for each page.
    4. UPDATE OcrJob.pagesProcessed += batch.length.
```

```
Step 8: Per-page post-processing
──────────────────────────────────
  For each RawPageResult from the vision model:
    1. FormulaExtractionModule.extract(rawMarkdown, pageNumber, documentType)
       → confirms LaTeX blocks, validates with KaTeX, flags failures
    2. TableExtractionModule.extract(rawMarkdown)
       → detects and structures tables
    3. DiagramExtractionModule.extract(rawMarkdown, pageImageBuffer, documentType)
       → detects diagram regions, extracts captions, generates placeholders
    4. CREATE OcrPage {
         jobId, pageNumber, markdown, rawText, confidence,
         hasMath, hasTables, hasDiagrams,
         formulasJson, tablesJson, diagramsJson,
         backendUsed, processingTimeMs
       }
```

```
Step 9: Document assembly
──────────────────────────
  MarkdownGeneratorModule.assembleDocumentMarkdown(pages):
    → fullMarkdown (all pages with separators and document-type normalization)
    → fullText (Markdown-stripped, for embedding)

  HTMLGeneratorModule.generate(fullMarkdown):
    → HTML with KaTeX-rendered math, stored to Supabase Storage
    → OcrJob.htmlStorageKey set

  JSONExportModule.export(result):
    → OCRExportJSON stored to Supabase Storage
    → OcrJob.jsonStorageKey set
```

```
Step 10: Result stored and job finalized
──────────────────────────────────────────
  Prisma transaction:
    UPDATE OcrJob SET {
      status: READY (or PARTIAL if any pages failed),
      fullMarkdown: <text if < 1MB, else null>,
      fullText: <text>,
      overallConfidence: mean(page.confidence),
      completedAt: NOW(),
      purgeAfter: NOW() + 30 days
    }
  File buffer: already in Supabase Storage. OCR Service purges its in-memory copy.
  Intermediate PNG page buffers: freed immediately after processBatch() returns.
```

```
Step 11: Caller notified
─────────────────────────
  If OcrJob.notifyWebhook is set:
    POST notifyWebhook { jobId, status, schoolId, completedAt }
    (no file content in notification payload)
  If webhook is null:
    Caller polls getJobResult(jobId, schoolId).
  Frontend: the document page polls every 5 seconds when status !== "ready".
    WebSocket push is a Phase 2 optimization.
```

---

## 7. Formula Extraction

### Detection Heuristics

Detection runs on the raw Markdown string from the vision model, before any other post-processing. The model is prompted to emit LaTeX but does not always delimit it consistently. The module applies layered detection:

**Layer 1 — Explicit delimiter detection:**

The model frequently emits correct LaTeX in `$...$` (inline) or `$$...$$` (display) delimiters. These are captured first with:

```typescript
const DISPLAY_MATH_RE = /\$\$([\s\S]+?)\$\$/g;
const INLINE_MATH_RE  = /\$([^$\n]+?)\$/g;
```

These patterns are applied in order (display first to avoid `$$` being parsed as two inline `$`). All captured groups are candidates.

**Layer 2 — Symbol density heuristics:**

For regions not captured by explicit delimiters, a sliding window of 50 tokens is scanned for math signal:

- **Greek letters:** `α β γ δ ε ζ η θ ι κ λ μ ν ξ π ρ σ τ υ φ χ ψ ω` and their uppercase
- **Operator symbols:** `∫ ∑ ∏ √ ± ≠ ≤ ≥ ∞ ∂ ∇ ×`
- **Superscript/subscript patterns:** `x^2`, `x_n`, `H_2O`
- **Fraction patterns:** `a/b` within a prose-isolated region (not URL-like)
- **Alignment patterns (WAEC):** numbered sub-questions followed by expressions like `3x + 4y = 12`

If a window has symbol density > 0.15 (more than 15% math tokens), it is flagged as an undelimited math region and wrapped in `$...$` for inline or `$$...$$` for standalone lines.

**Layer 3 — WAEC-specific patterns:**

WAEC past questions use highly predictable math formats. Dedicated regex patterns for:

```typescript
// WAEC fraction format: "3" over "4" rendered as stacked numbers
const WAEC_FRACTION_RE = /(\d+)\s*[─—]\s*(\d+)/g;  // → $\frac{3}{4}$

// Vector notation: "OA" in bold or with arrow over
const VECTOR_RE = /\b([A-Z]{1,2})\s*→/g;  // → $\vec{OA}$

// Matrix: rows of numbers aligned with spaces, detected by pattern
// This triggers DiagramExtractionModule cooperation for 3×3+ matrices
```

### LaTeX Output Format

All detected math is normalized to valid LaTeX. Common normalization steps:

| Raw Model Output | Normalized LaTeX |
|---|---|
| `x^2 + y^2 = r^2` | `x^2 + y^2 = r^2` (no change) |
| `3/4` (in math context) | `\frac{3}{4}` |
| `sqrt(x)` | `\sqrt{x}` |
| `sum from n=1 to inf` | `\sum_{n=1}^{\infty}` |
| `log base 2 of x` | `\log_2 x` |
| `2 x 3 matrix` | `\begin{pmatrix} ... \end{pmatrix}` |

### KaTeX Validation Pass

Every captured formula is validated by attempting to render it with KaTeX server-side:

```typescript
import katex from "katex";

function validateLatex(formula: string, displayMode: boolean): ValidationResult {
  try {
    katex.renderToString(formula, {
      displayMode,
      throwOnError: true,
      strict: false,           // Allow some non-standard LaTeX
      trust: false,
    });
    return { valid: true };
  } catch (e: any) {
    return { valid: false, reason: e.message };
  }
}
```

- **Valid formulas:** stored as-is, `renderStatus: "valid"`.
- **Invalid formulas with fixable errors:** a correction pass attempts common fixes (missing `\` prefixes, unclosed braces, `*` → `\times`). If the corrected version validates, it is used.
- **Irreparably invalid:** `renderStatus: "failed"`. The raw text is preserved in the Markdown as `<!-- FORMULA_FAILED: sin^2θ + cos^2θ = 1 -->` immediately followed by the raw text in plain form. The teacher sees the plain text; a reviewer can correct the LaTeX later.

### Math Density Metric

```typescript
const mathDensity = formulaChars / totalChars;
// Where formulaChars = sum of lengths of all extracted formula strings
```

- `mathDensity > 0.3`: page marked `hasMath: true`, high-confidence math page
- `mathDensity > 0.05`: page marked `hasMath: true`
- `mathDensity <= 0.05`: page marked `hasMath: false`

This metric is stored in `OcrPage` and used by the Knowledge Service to route math-heavy pages to the math-aware chunk processor.

---

## 8. Table Extraction

### Detection Strategy

Tables in Nigerian educational documents appear in four visual forms, each requiring a different detection strategy on the model output text:

**Type 1 — Markdown pipe tables (ideal case):**
The vision model correctly emits `| col1 | col2 |` syntax. Detected by:

```typescript
const MARKDOWN_TABLE_RE = /^\|.+\|$/m;
```

If 3+ consecutive lines match this pattern, the region is parsed as a Markdown table directly. Confidence: 0.95.

**Type 2 — Whitespace-aligned tables:**
Common in scanned textbooks and mark sheets. The model emits aligned columns separated by 2+ spaces:

```
Subject       Score   Grade
Mathematics   78      B2
English       65      C4
```

Detection: run a column-alignment heuristic over consecutive lines. If 3+ lines share the same whitespace-delimiter positions (±2 chars), extract as table. Use the first line as the header row if it contains no numeric tokens. Confidence: 0.80.

**Type 3 — Explicitly labeled rows:**
Pattern `Row N: value1, value2, value3` (common in chemistry data tables in WAEC). Detected by labeled-row heuristic. Confidence: 0.70.

**Type 4 — Grid patterns from visual description:**
The vision model sometimes describes a grid: "a table with 4 columns and 6 rows...". This is a signal that the image contained a ruled table that the model could not perfectly OCR. These are flagged `hasMergedCells: true` and returned as best-effort Markdown plus JSON.

### Output Formats

For every detected table, three representations are generated and stored:

```typescript
// Markdown table (always generated)
const markdownTable = `| Subject | Score | Grade |\n|---|---|---|\n| Mathematics | 78 | B2 |\n...`;

// JSON array of arrays (row-first, header at index 0)
const jsonData = [
  ["Subject", "Score", "Grade"],
  ["Mathematics", "78", "B2"],
  ["English", "65", "C4"],
];

// HTML table (with class for TeachNexis styling)
const htmlTable = `<table class="tn-table"><thead><tr>...</tr></thead><tbody>...</tbody></table>`;
```

### Confidence Scoring

```typescript
function scoreTableConfidence(table: ParsedTable): number {
  let score = 0.5;
  score += table.detectionType === "markdown" ? 0.45 : 0;
  score += table.detectionType === "whitespace" ? 0.30 : 0;
  score += table.columnCount >= 2 ? 0.05 : -0.3;    // At least 2 columns
  score += table.rowCount >= 2 ? 0.05 : -0.3;        // At least 2 data rows
  score += table.headerRowDetected ? 0.10 : 0;
  score += table.hasMergedCells ? -0.15 : 0;
  score += table.numericColumns > 0 ? 0.05 : 0;       // Tables with numbers are reliable
  return Math.max(0, Math.min(1, score));
}
```

Tables with `confidence < 0.5` are not included in the structured `tables` array but are preserved in the Markdown text as-is for human review.

### Merged Cell Fallback

When `hasMergedCells: true`:
1. Markdown table is still generated (best effort — merged cells represented as the value in the leftmost position, repeated).
2. A warning comment is inserted: `<!-- TABLE_HAS_MERGED_CELLS: downstream JSON may be more accurate -->`.
3. JSON `jsonData` uses `null` for cells that belong to a merged parent.
4. `htmlTable` uses `colspan`/`rowspan` attributes where the merger can be inferred from repeated values.

---

## 9. Queue and Background Jobs

### Technology

**Queue backend:** BullMQ (backed by Redis). Redis runs as a sidecar service (`redis:7-alpine`, 256 MB memory limit). In Phase 1, a single Redis instance is acceptable — add Redis Cluster in Phase 3 if queue depth regularly exceeds 500.

**Queue name:** `ocr-jobs`

**Worker process:** A dedicated Node.js process (`apps/ocr-worker/src/index.ts`) separate from the Next.js application. Runs as a separate Render/Railway service (or Kubernetes Deployment).

### Worker Concurrency

```typescript
const worker = new Worker("ocr-jobs", processJob, {
  connection: redisConnection,
  concurrency: parseInt(process.env.WORKER_CONCURRENCY ?? "2"),
  // Phase 1: 2 concurrent jobs per worker instance
  // Phase 2: Scale to 4 with better GPU utilization tracking
  lockDuration: 300_000,          // 5 minutes — jobs should complete well before this
  lockRenewTime: 60_000,          // Renew lock every 60 seconds for long jobs
});
```

Phase 1 target: 2 worker instances × 2 concurrency = 4 simultaneous OCR jobs. Each job processes pages in batches of 8 serially within the job.

### Priority Queue

Jobs are assigned a numeric priority when enqueued. BullMQ uses lower numbers = higher priority.

```typescript
function computeJobPriority(input: {
  pageCount: number | null;
  schoolTier: "free" | "standard" | "pro";
  documentType: DocumentType;
  isSync: boolean;
}): number {
  let priority = 50;
  if (input.isSync) return 1;                       // extractSync() always highest
  if (input.schoolTier === "pro") priority -= 15;
  if (input.schoolTier === "free") priority += 25;
  if (input.documentType === "past-question") priority -= 10;
  if (input.pageCount !== null && input.pageCount <= 5) priority -= 10;  // Small docs first
  if (input.pageCount !== null && input.pageCount > 50) priority += 20; // Large docs last
  return Math.max(1, Math.min(100, priority));
}
```

### Retry on GPU Timeout

```typescript
const jobOptions: JobsOptions = {
  attempts: 3,
  backoff: {
    type: "exponential",
    delay: 30_000,   // 30s, 60s, 120s
  },
  removeOnComplete: false,   // Keep for audit; purge via purgeAfter cron
  removeOnFail: false,
};
```

On attempt 2+, the worker halves the batch size (`PDF_BATCH_SIZE / 2`) to reduce GPU memory pressure. If batch size < 2 and the job still fails, the third attempt uses `processBatch` with `maxBatchSize: 1` (one page at a time).

### Dead-Letter Queue

Jobs that exhaust all attempts (3 tries) are moved to BullMQ's failed state. A separate `dead-letter-processor` checks the failed queue every hour:

1. If the failure was `ALL_BACKENDS_UNAVAILABLE`: re-enqueue the original job with priority 50. Emit a teacher notification: "Your document is queued. We'll process it as soon as our servers are available."
2. If the failure was `PDF_CORRUPT`, `IMAGE_CORRUPT`, or `VIRUS_DETECTED`: mark the job `FAILED` permanently. Notify teacher with a specific error message.
3. All other permanent failures: mark `FAILED`. Log to monitoring. Create a support ticket in the admin dashboard.

### User Notification

On job completion (status `READY` or `PARTIAL`):
- If `notifyWebhook` is set: `POST webhook { jobId, status, pageCount, pagesSucceeded, pagesFailed }`.
- Database record updated — the frontend polls every 5 seconds via `GET /api/documents/{documentId}/ocr-status`.
- Phase 2: Replace polling with WebSocket push from the worker via Redis pub/sub.

On job failure (status `FAILED`):
- Same webhook mechanism.
- If no webhook: the next poll from the frontend returns `status: "failed"` with `errorCode` and a human-readable `error` message.
- Teacher-visible message examples:
  - `PDF_CORRUPT`: "We couldn't open this PDF — it may be corrupted. Try re-exporting from the original source."
  - `ALL_BACKENDS_UNAVAILABLE`: "Our processing servers are temporarily unavailable. We'll retry in 1 hour."
  - `ZERO_TEXT_RESULT`: "No readable text was found. If this is a handwritten document, please type it manually."

---

## 10. Security Model

### File Type Validation

File type is validated by **magic bytes**, not by the `Content-Type` header or file extension. MIME type declarations are untrusted.

```typescript
const MAGIC_BYTES: Record<string, Uint8Array[]> = {
  "application/pdf": [new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D])],  // %PDF-
  "image/jpeg":      [new Uint8Array([0xFF, 0xD8, 0xFF])],
  "image/png":       [new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A])],
  "image/webp":      [new Uint8Array([0x52, 0x49, 0x46, 0x46])],  // RIFF header; verify "WEBP" at offset 8
};

function validateMagicBytes(buffer: Buffer, declaredMime: string): boolean {
  const magic = MAGIC_BYTES[declaredMime];
  if (!magic) return false;  // Unlisted MIME type rejected
  return magic.some(sig => sig.every((byte, i) => buffer[i] === byte));
}
```

If magic bytes do not match the declared MIME type, the upload is rejected with `400 UNSUPPORTED_FILE_TYPE` before any processing.

### File Size Limits

| Document Type | Limit |
|---|---|
| PDF | 100 MB |
| JPEG / PNG | 20 MB |
| WEBP | 20 MB |
| Single sync request | 10 MB, max 3 pages |

Limits are enforced at the API route level (before the buffer reaches the OCR Service) and again inside `FileValidator` as defense-in-depth.

### Virus Scanning Hook

The OCR Service calls an internal ClamAV HTTP adapter before processing any file:

```typescript
async function scanForVirus(fileBuffer: Buffer): Promise<ScanResult> {
  const form = new FormData();
  form.append("file", new Blob([fileBuffer]));
  const res = await fetch(process.env.CLAMAV_API_URL!, {
    method: "POST",
    body: form,
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json();
  return { clean: data.result === "OK", threat: data.threat ?? null };
}
```

If `CLAMAV_API_URL` is not set or the scan service is unreachable:
- Production: reject the file with `503 Virus scan unavailable`.
- Staging/dev: skip scan, log warning. Controlled by `SKIP_VIRUS_SCAN=true` env var.

### School ID Scoping

Every database query in the OCR Service includes `schoolId` in the `WHERE` clause:

```typescript
// CORRECT — always scope by schoolId
const job = await prisma.ocrJob.findFirst({
  where: { id: jobId, schoolId },  // schoolId MUST be from the authenticated session
});
if (!job) throw new NotFoundError("Job not found");  // 404 hides the existence of other schools' jobs

// NEVER do this
const job = await prisma.ocrJob.findUnique({ where: { id: jobId } });
```

The `schoolId` in all OCR Service calls comes from the Identity Service session — it is never taken from the request body.

### GPU Service VPC Isolation

The olmOCR Python worker runs in the same VPC as the main application but is **not internet-accessible**. Communication is over private networking only:

- olmOCR worker: bound to `0.0.0.0:8080` within the VPC
- Firewall rule: port 8080 accepts traffic only from the application server's private IP range
- No public DNS for the worker service
- TLS is not required between VPC-internal services (encrypted at the network layer by the VPC)

Ollama Vision: bound to `127.0.0.1:11434` on the school server. Never exposed to the internet. The school server's Next.js proxy calls Ollama on localhost.

### No File Content in Logs

All logging call sites are audited to ensure:
- File buffers are never logged
- Extracted text is never included in log messages or error messages
- `OcrBackendLog.errorMessage` stores only error codes and HTTP status codes, never content

ESLint rule `no-file-content-in-logs` (custom rule in `packages/eslint-config/rules/`) enforces this at lint time by flagging any `console.log` or `logger.` call that references variables named `fileBuffer`, `imageBuffer`, `markdown`, `rawText`, or `content`.

---

## 11. Privacy Model

### Student Documents Never Leave the Data Boundary

Documents of type `student-record` are **always** routed to the Ollama-Vision backend, regardless of school configuration or performance preferences. This is a hard-coded invariant, not a configurable option:

```typescript
// In backend-selector.ts — this check runs BEFORE all other logic
if (documentType === "student-record") {
  if (!isAvailable("ollama-vision")) {
    throw new DataSovereigntyError(
      "Student records cannot be processed without a local OCR backend. " +
      "Ensure the Ollama service is running on your school server."
    );
  }
  return "ollama-vision";
}
```

Schools with `dataSovereign: true` in their configuration get the same treatment for **all** document types.

### Encrypted Storage at Rest

- Supabase Storage encrypts all files at rest using AES-256.
- `OcrJob.fullMarkdown` and `fullText` stored in PostgreSQL are protected by Neon/Supabase's at-rest encryption.
- The application does not manage encryption keys directly — this is delegated to the storage platform's KMS. Phase 2 may add application-level encryption for student record content.

### File Buffer Purge After Processing

The OCR Service holds file buffers in memory only during active processing. No file content is persisted to the OCR Service's own disk or temporary storage. The canonical copy lives in Supabase Storage, uploaded by the API route before calling `submitDocument()`.

In the worker:
```typescript
let fileBuffer: Buffer | null = await fetchFromStorage(documentId, schoolId);
try {
  await processJob(jobId, fileBuffer, options);
} finally {
  fileBuffer = null;   // Eligible for GC immediately after processing
  // In-process PNG page buffers are also nulled inside PDFPipelineModule
}
```

### Result Retention Policy

- `OcrJob.purgeAfter` is set to `NOW() + 30 days` on job completion.
- A cron job runs daily at 02:00 UTC:
  ```sql
  DELETE FROM "OcrJob" WHERE "purgeAfter" < NOW();
  -- Cascade deletes OcrPage and OcrBackendLog.
  ```
- Supabase Storage files (HTML, DOCX, JSON exports) are purged by a separate Supabase Storage lifecycle policy: `delete objects older than 30 days in the ocr-exports/ prefix`.
- The original uploaded document (in the `documents/` prefix) is **not** purged by the OCR Service — that is the Storage Service's responsibility.

### NDPR Audit Trail

Nigeria Data Protection Regulation (NDPR) compliance requires that data processing activities are logged. The `OcrBackendLog` table serves as the audit trail:

- Every page processed is logged with: `backend`, `eventType: "page_processed"`, `createdAt`, `schoolId` (via the job relation), `success`, `processingTimeMs`.
- Logs never include document content.
- A school admin can request an export of all processing logs for their school via `GET /api/admin/ocr-audit?schoolId=&from=&to=`.
- Log retention: `OcrBackendLog` records are purged together with their parent `OcrJob` (cascade delete). Log export is the school admin's responsibility for NDPR compliance.

---

## 12. Scaling Strategy

### GPU Capacity Planning

Target throughput: **200 pages/minute** at steady state (Phase 1 launch target).

| Backend | Pages/min (single A10G GPU) | Cost/page | Use case |
|---|---|---|---|
| olmOCR (Qwen2-VL-7B, batched) | 40–60 | $0.004 | Quality default |
| Ollama-Vision (llama3.2-11b, GPU) | 20–30 | $0.000 | Offline / data-sovereign |
| Ollama-Vision (CPU only) | 2–5 | $0.000 | Fallback only |
| DeepSeek OCR (Phase 2) | 80–120 | $0.002 | Fast mode |
| TeachNexis-OCR-2B (Phase 3) | 100–150 | $0.001 | Primary |

Phase 1 with 2 worker instances and 1 A10G GPU per worker: 80–120 pages/minute sustainable, 200 pages/minute burst.

**Monthly capacity estimate (Phase 1 100-school launch):**
- Average school: 500 pages/month
- 100 schools: 50,000 pages/month
- At 60 pages/min: 833 minutes of GPU time = ~14 GPU-hours/month
- A10G spot instance on AWS: ~$0.60/hr = **$8.40/month GPU cost** at this scale

Cost is negligible at 100 schools. Re-evaluate at 1,000 schools.

### Horizontal Scaling

The worker service is stateless (all state in Redis/PostgreSQL). Add worker instances by scaling the `ocr-worker` service in Render/Railway.

Auto-scaling trigger (Phase 2):
- Monitor `queue.depth` every 30 seconds
- If `depth > 50` for 2 consecutive checks: add 1 worker instance
- If `depth < 10` for 10 consecutive checks AND active workers > minimum: remove 1 worker instance
- Minimum: 1 worker. Maximum: 8 workers (Phase 1 limit).

### Cost Model

```
Monthly cost per school (estimated):
  - 500 pages × $0.004 (olmOCR default)     = $2.00
  - Redis (shared)                            = $0.10
  - PostgreSQL storage (30-day retention)     = $0.05
  - Supabase Storage (exports, 30-day)        = $0.05
  ─────────────────────────────────────────────────────
  Total per school                            = ~$2.20/month

At 1,000 schools: ~$2,200/month OCR infrastructure cost.
This should represent < 5% of total infrastructure cost at that scale.
```

### CDN for Rendered Output

Generated HTML previews are cached at the CDN edge (Vercel Edge Network / Cloudflare):

- Cache key: `ocr-html/{jobId}` (content is immutable once job is `READY`)
- Cache-Control: `public, max-age=2592000` (30 days — matches retention policy)
- DOCX and JSON exports: served via Supabase Storage signed URLs (not CDN-cached, as they are private per school)

---

## 13. Failure Handling

This section is an exhaustive enumeration of every failure mode, its detection, and its recovery path.

### GPU Timeout

**Detection:** `fetch()` to olmOCR worker times out after `timeoutMs: 120_000`.

**Immediate response:**
1. Log to `OcrBackendLog`: `{ eventType: "page_failed", errorMessage: "GPU_TIMEOUT" }`.
2. The BullMQ job fails the current attempt.
3. BullMQ retries after 30s (attempt 2). Worker halves batch size.
4. Attempt 3: batch size = 1 (one page at a time).

**If all 3 attempts time out:**
- Job moves to dead-letter queue.
- Dead-letter processor re-enqueues in 1 hour.
- Teacher notification: "Processing is taking longer than expected. We'll retry automatically."

### olmOCR Service Down

**Detection:** `healthCheck()` returns `healthy: false` OR connection refused from worker.

**Immediate response:**
1. `BackendSelector` marks `olmocr` as unavailable in the in-memory backend status cache (TTL: 60 seconds).
2. Re-runs `selectBackend()` without olmOCR in `availableBackends`.
3. Falls back to `deepseek-ocr` (Phase 2+) or `ollama-vision`.

**If Ollama-Vision is available:**
- Job continues on Ollama-Vision. `OcrBackendLog` records `{ eventType: "fallback_triggered" }`.
- `OcrPage.backendUsed` reflects the actual backend used per page.
- Teacher is not notified — the document still processes successfully.

**If only Tesseract is available (Phase 1 last resort):**
- Tesseract is reserved for simple, typed-text-only documents.
- Math-heavy pages (detected by anchor text heuristics) are flagged: `hasMath: true`, but `formulasJson: []`. A warning is added to the page Markdown: `<!-- FORMULA_EXTRACTION_UNAVAILABLE: Tesseract cannot extract math. Review this page manually. -->`.

### Both Cloud Backends Down

**Detection:** olmOCR and DeepSeek-OCR both `healthy: false`.

**Response:**
1. If `ollama-vision` available: route all jobs there. Log warning to monitoring.
2. If `ollama-vision` also unavailable:
   - Cancel all currently processing jobs (return pages already processed, mark `PARTIAL`).
   - Stop accepting new submissions: return `503 Service Temporarily Unavailable` at the API route.
   - All pending jobs remain in the queue. BullMQ retry backoff applies.
   - Monitoring alert fires immediately (see Section 15).
   - Dead-letter processor re-enqueues failed jobs every 1 hour.
   - Teacher notification: "Document processing is unavailable. We'll process your document as soon as our servers recover."

### Corrupted PDF

**Detection:** pypdfium2 throws on `PdfDocument(path)`, OR fewer than 1 page renders successfully.

**Response:**
- Job status: `FAILED`, `errorCode: "PDF_CORRUPT"`.
- No retry — retrying a corrupt file will always fail.
- Teacher message: "We couldn't open this PDF. It may be damaged or use an unsupported format. Try re-exporting from the original application, or convert to images and upload as JPEG."

### Zero-Text Result

**Detection:** After all pages are processed, `fullText.trim().length === 0` AND `formulas.length === 0`.

**Response:**
- Job status: `FAILED`, `errorCode: "ZERO_TEXT_RESULT"`.
- Teacher message: "No readable text was found in this document. This usually means the document contains only images or is hand-written. For hand-written documents, please type the content manually. For image-only documents, try a higher-quality scan."
- No retry — the input data is the problem.

### Partial Success (Some Pages Failed)

**Detection:** `pagesFailed > 0` AND `pagesSucceeded > 0`.

**Response:**
- Job status: `PARTIAL`.
- `fullMarkdown` contains successfully processed pages only, with a comment at each failed page: `<!-- Page N: OCR failed — content unavailable -->`.
- Teacher can download the DOCX and manually fill in the missing pages.
- No automatic retry for individual page failures (the cost of retrying one page is low, but the retry logic adds complexity; revisit in Phase 2).

---

## 14. Testing Strategy

### Test Corpus

The canonical test corpus is stored at `packages/ocr-service/test/fixtures/` and versioned in git (binary files tracked via Git LFS). It consists of:

| File | Source | Description | Expected Output |
|---|---|---|---|
| `waec-2019-maths-p1.pdf` | Public WAEC archive | SS3 Mathematics Paper 1, 50 questions, heavy LaTeX | 50 MCQ items, formulas extracted |
| `waec-2021-chemistry-p2.pdf` | Public WAEC archive | SS3 Chemistry Paper 2, includes organic structure diagrams | 30 items, diagrams flagged for review |
| `neco-2020-biology.pdf` | Public NECO archive | SS3 Biology, includes cell diagrams and classification tables | Tables extracted, diagrams flagged |
| `ss2-maths-textbook-ch3.pdf` | Lagos SUBEB scanned textbook | Chapter 3: Quadratic Equations, printed text, good quality | Clean Markdown, formulas extracted |
| `school-circular-2024.jpg` | Anonymized school circular | Low-quality phone photo of typed circular | Plain text extracted, no formulas |
| `scanned-worksheet-2024.png` | Anonymized worksheet | Blurry scan, handwritten student answers | Partial extraction, low confidence expected |
| `waec-2022-geography.pdf` | Public WAEC archive | Includes data tables, maps described in text | Tables extracted, map regions flagged |
| `corrupted.pdf` | Fabricated | Invalid PDF bytes | Deterministic FAILED + PDF_CORRUPT |
| `zero-text.png` | Fabricated | Blank white image | Deterministic FAILED + ZERO_TEXT_RESULT |

### Accuracy Benchmarks

Benchmarks are run on every backend upgrade as a required CI gate. Thresholds:

| Metric | Minimum Pass | Target | Measurement Method |
|---|---|---|---|
| Plain text extraction accuracy (%) | 97% | 99% | Character error rate vs. manually verified ground truth |
| Formula extraction recall (%) | 90% | 95% | # correctly extracted formulas / # total formulas in ground truth |
| Formula extraction precision (%) | 88% | 93% | # correctly extracted formulas / # total extracted formulas |
| Table extraction F1 score | 85% | 90% | Cell-level accuracy on 5 test tables |
| Diagram detection recall (%) | 80% | 90% | # flagged diagram regions / # actual diagram regions |
| Per-page confidence (mean) | 0.75 | 0.85 | Mean `OcrPage.confidence` across corpus |
| Processing time per page (p95 ms) | < 8,000 | < 4,000 | Wall-clock time from page render to `OcrPage` record written |

### Regression Suite

```bash
# Run on every PR that touches packages/ocr-service/
pnpm test:ocr:regression

# Tests included:
# 1. Each fixture file processed with olmOCR backend (mocked via VCR cassettes)
# 2. Each fixture file processed with Ollama-Vision backend (mocked)
# 3. All error code paths (corrupted PDF, zero-text, timeout) verified
# 4. KaTeX validation pass: all formulas in the WAEC Maths fixture render without error
# 5. Table extraction: spot-check the NECO Biology table against expected JSON
# 6. Magic bytes validation: all 6 supported file types verified; 5 rejection cases verified
# 7. schoolId isolation: cross-school job query returns NotFoundError
```

A golden file test compares the full Markdown output of `waec-2019-maths-p1.pdf` against `test/fixtures/golden/waec-2019-maths-p1.md`. The golden file is updated manually when the backend model changes; the update PR requires explicit approval from the ML owner.

---

## 15. Monitoring

### Metrics (exported to Prometheus / Grafana)

All metrics include `backend` and `schoolId` labels where applicable.

```
# Throughput
ocr_pages_processed_total{backend, status}          Counter
ocr_jobs_completed_total{status}                    Counter
ocr_pages_per_minute{backend}                       Gauge

# Latency
ocr_page_processing_duration_seconds{backend}       Histogram (buckets: 1, 2, 5, 10, 30, 60, 120)
ocr_job_total_duration_seconds{document_type}       Histogram

# Quality
ocr_page_confidence_score{backend}                  Histogram (buckets: 0.1 intervals)
ocr_formula_detection_rate                          Gauge (formulas detected / pages with math)
ocr_table_detection_rate                            Gauge
ocr_diagram_detection_rate                          Gauge

# Queue
ocr_queue_depth                                     Gauge
ocr_queue_wait_seconds                              Histogram
ocr_worker_count                                    Gauge
ocr_worker_active                                   Gauge

# Backends
ocr_backend_health{backend}                         Gauge (1=healthy, 0=unhealthy)
ocr_backend_latency_ms{backend}                     Gauge (p50 of recent health checks)
ocr_gpu_utilization_percent{backend}                Gauge

# Cost
ocr_cost_usd_total{backend}                         Counter
ocr_cost_usd_per_document{document_type}            Histogram

# Errors
ocr_error_total{error_code}                         Counter
ocr_fallback_triggered_total{from_backend, to_backend}  Counter
```

### Alert Rules

| Alert | Condition | Severity | Action |
|---|---|---|---|
| QueueDepthHigh | `ocr_queue_depth > 100` for 5 minutes | Warning | Notify on-call; consider scaling workers |
| QueueDepthCritical | `ocr_queue_depth > 500` for 5 minutes | Critical | Page on-call; auto-scale workers |
| P95LatencyHigh | `p95(ocr_page_processing_duration_seconds) > 60` for 10 minutes | Warning | Investigate GPU utilization |
| BackendDown | `ocr_backend_health{backend="olmocr"} == 0` for 2 minutes | Critical | Immediate investigation; verify fallback is active |
| AllBackendsDown | `sum(ocr_backend_health) == 0` for 1 minute | Critical (P0) | Page entire on-call chain; activate incident protocol |
| ConfidenceDropped | `avg(ocr_page_confidence_score) < 0.6` for 15 minutes | Warning | May indicate model degradation or new document format |
| HighErrorRate | `rate(ocr_error_total[5m]) / rate(ocr_pages_processed_total[5m]) > 0.1` | Warning | 10%+ error rate requires investigation |
| CostSpike | `rate(ocr_cost_usd_total[1h]) > $5/hour` | Warning | Unexpected volume or mis-routing to expensive backend |

### Dashboard Layout

Grafana dashboard `TeachNexis OCR Service` (provisioned via `infra/grafana/dashboards/ocr-service.json`):

- **Row 1 (Health):** Backend health status tiles, queue depth gauge, active workers
- **Row 2 (Throughput):** Pages/minute by backend (line), jobs completed/hour (bar)
- **Row 3 (Latency):** P50/P95/P99 page processing latency by backend (line)
- **Row 4 (Quality):** Confidence score distribution (histogram), formula detection rate (line), table detection rate (line)
- **Row 5 (Errors):** Error count by code (bar), fallback trigger rate (line)
- **Row 6 (Cost):** Cost/hour by backend (stacked area), cost/document by type (bar)

---

## 16. Replacement Roadmap

### Phase 1 (Months 1–6): Dual Backend — olmOCR + Ollama-Vision

**Status:** Active build.

**What's deployed:**
- olmOCR Python worker running on a single cloud GPU (A10G or equivalent)
- Ollama-Vision on-premise backend for offline and data-sovereign schools
- Tesseract as last-resort fallback (typed text only, no math)
- All 10 internal modules as described in Section 2
- BullMQ queue with 2 worker instances

**Limitations accepted in this phase:**
- DiagramExtractionModule uses text-only heuristics (no pixel-level detection)
- Handwriting is unsupported
- No real-time WebSocket updates (frontend polls)
- DOCX LaTeX rendered to PNG (not native Word equations)

**Exit criteria for Phase 2:** Processing > 1,000 documents/day with < 5% error rate.

---

### Phase 2 (Months 7–12): DeepSeek OCR Added

**What changes:**
- `DeepSeekOCRProvider` adapter added, satisfying the `OCRProvider` interface with no other changes to the codebase
- Backend selector updated: `fast` mode and free-tier schools routed to DeepSeek (lower cost, adequate quality)
- All three backends benchmarked on the full test corpus; benchmark results committed to `docs/benchmarks/ocr-backends.md`
- WebSocket push notification replaces polling (Redis pub/sub → Next.js server-sent events)
- DiagramExtractionModule upgraded: YOLOv8 bounding box detection runs before the OCR pass, enabling per-diagram vision model calls
- Auto-scaling implemented for worker instances

**Exit criteria for Phase 3:** ≥ 500 schools onboarded. DeepSeek OCR cost/quality profile validated in production.

---

### Phase 3 (Months 13–24): TeachNexis-OCR-2B Fine-Tuned

**What changes:**
- TeachNexis-OCR-2B: a 2B parameter vision model fine-tuned on a corpus of Nigerian educational documents:
  - WAEC past papers (2000–2025), digitized and LaTeX-annotated
  - SS1–SS3 NERDC-approved textbooks (scanned and annotated)
  - Handwritten student answer scripts (acquired with consent)
  - School circulars, administrative documents
- Training data: target 500,000 page-markdown pairs
- Fine-tuning infrastructure: LoRA fine-tune on Qwen2-VL-2B base; 4× A100 80GB for 1 week of training
- `TeachNexisOCR2BProvider` adapter added — same interface, smaller and faster model
- Ollama-compatible export: TeachNexis-OCR-2B packaged as an Ollama model for school-server offline deployment
- Handwriting support added (scanned student answer scripts become processable)

**Exit criteria for Phase 4:** TeachNexis-OCR-2B achieves ≥97% text accuracy on the full test corpus and ≥90% formula extraction recall, matching or exceeding olmOCR.

---

### Phase 4 (Months 25+): Full Native Pipeline — olmOCR Retired

**What changes:**
- `olmocr` backend removed from `OCRBackend` enum (breaking change — versioned API bump to `v2`)
- `TeachNexisOCR2BProvider` becomes the default for all auto-routing
- olmOCR Python worker service decommissioned (cost savings, reduced operational surface)
- `OllamaVisionProvider` updated to use TeachNexis-OCR-2B (the fine-tuned model is the Ollama model)
- Cloud GPU infrastructure simplified: single inference server running TeachNexis-OCR-2B on sglang
- Benchmark suite remains; TeachNexis-OCR-2B output is the new golden reference

**Migration path for existing integrations:**
- API v1 (`/api/v1/ocr/...`) continues to accept `backend: "olmocr"` but silently routes to `teachnexis-ocr-2b`. A deprecation warning header is included in responses.
- API v2 removes the `olmocr` backend option entirely.
- Schools are notified 90 days before the API v1 sunset date.

---

## 17. Phase 1 Implementation Checklist

Ordered, concrete, week-by-week. Each task has a single owner and a definition of done.

### Week 1: Foundation

- [ ] **Create `packages/ocr-service/` directory structure.** Set up `src/modules/`, `src/providers/`, `src/queue/`, `src/types.ts`. Add to `pnpm-workspace.yaml`. Configure `tsconfig.json` extending the root config.
- [ ] **Define all TypeScript types.** `src/types.ts`: `OCRBackend`, `OCRJobStatus`, `DocumentType`, `OCROptions`, `OCRPage`, `OCRResult`, `OCRJob`, `OCRBackendStatus`, `OCRQueueStatus`, `OCRErrorCode`. No implementation yet.
- [ ] **Define `OCRProvider` interface.** `src/providers/types.ts`: `OCRProviderConfig`, `PageInput`, `RawPageResult`, `OCRProvider`. No implementation yet.
- [ ] **Define `TeachNexisOCRService` interface.** `src/index.ts`: the public interface. Export only types and the interface — no implementation. This file is what callers import.
- [ ] **Add Prisma models.** Add `OcrJob`, `OcrPage`, `OcrBackendLog` to `packages/database/prisma/schema.prisma`. Run `pnpm prisma migrate dev --name add-ocr-models`. Verify migration is clean.
- [ ] **Create Redis connection module.** `packages/ocr-service/src/queue/redis.ts`: create and export a BullMQ `Connection` from `REDIS_URL` env var. Add `REDIS_URL` to `.env.example`.

---

### Week 2: File Validation and Queue

- [ ] **Implement `FileValidator`.** `src/validation/file-validator.ts`: magic bytes check, file size limits, MIME agreement check. 100% unit test coverage on validation paths. Include all rejection cases: wrong magic, oversized, mismatched MIME.
- [ ] **Implement `submitDocument()`.** `src/service.ts`: validation → `OcrJob` creation → BullMQ enqueue → return `OCRJob`. The queue payload is `{ jobId, schoolId }` only.
- [ ] **Implement `cancelJob()`.** Fetch job, verify schoolId, update status to `CANCELLED`, remove from BullMQ queue if still pending.
- [ ] **Implement `getJobResult()`.** Fetch `OcrJob` + all `OcrPage` records. Assemble and return `OCRResult`. Enforce schoolId scoping — throw `NotFoundError` on mismatch.
- [ ] **Implement `getJobQueue()`.** Query BullMQ queue counts. Return `OCRQueueStatus`.
- [ ] **Wire ClamAV hook.** `src/validation/virus-scanner.ts`: call `CLAMAV_API_URL`, handle timeout, handle service-unavailable. Use `SKIP_VIRUS_SCAN=true` for local dev.
- [ ] **Write integration tests for `submitDocument()` and `getJobResult()`.** Use a test database and a test Redis instance. Verify the full synchronous path (validation → job creation → queue entry → status poll).

---

### Week 3: Ollama-Vision Provider and Worker Skeleton

- [ ] **Implement `OllamaVisionProvider`.** `src/providers/ollama-vision-provider.ts`: `healthCheck()`, `processPage()`, `processBatch()` (sequential). Build the OCR prompt for each `DocumentType`. Use `buildOCRPrompt(documentType, language, anchorText)`.
- [ ] **Implement `BackendSelector`.** `src/providers/backend-selector.ts`: full `selectBackend()` logic including all modes (offline, data-sovereign, quality-first, fast, auto). Unit test every branch.
- [ ] **Create `apps/ocr-worker/` application.** Set up `src/index.ts`: BullMQ `Worker`, concurrency from `WORKER_CONCURRENCY` env var, graceful shutdown handling (SIGTERM → drain queue → exit).
- [ ] **Implement worker job handler (skeleton).** `src/worker.ts: processJob(jobId)`: fetch job from DB, fetch file from Supabase Storage, dispatch to pipeline, update job status. No real OCR yet — stub returns a placeholder `OcrPage`.
- [ ] **Implement `ImagePipelineModule`.** `src/modules/image-pipeline.ts`: decode with `sharp`, validate dimensions, deskew, normalize to PNG. Unit test with the `school-circular-2024.jpg` fixture.
- [ ] **End-to-end test: image upload → worker → Ollama-Vision → result.** Use a real local Ollama instance with `llama3.2-vision:11b`. Submit the `school-circular-2024.jpg` fixture. Verify `OcrJob.status` reaches `READY` and `OcrPage.rawText` is non-empty.

---

### Week 4: olmOCR Provider and PDF Pipeline

- [ ] **Build olmOCR Python worker service.** `services/olmocr-worker/`: FastAPI app with `POST /health`, `POST /render` (PDF → page PNGs), `POST /ocr/batch` (page PNGs → Markdown). Use pypdfium2 for rendering, sglang for inference. Wrap in Dockerfile.
- [ ] **Implement `OlmOCRProvider`.** `src/providers/olmocr-provider.ts`: `healthCheck()`, `processBatch()` calling the Python worker's `/ocr/batch` endpoint. Handle timeout, parse response.
- [ ] **Implement `PDFPipelineModule`.** `src/modules/pdf-pipeline.ts`: call olmOCR worker's `/render` endpoint to get page PNGs + anchor text. Return `RenderedPage[]`. Handle the partial-render failure case.
- [ ] **Implement full worker job handler.** Replace the stub: dispatch to `PDFPipelineModule` or `ImagePipelineModule` based on MIME type. Loop through pages with `processBatch()`. Write `OcrPage` records incrementally (one batch at a time) so partial results are visible during processing.
- [ ] **End-to-end test: PDF upload → worker → olmOCR → result.** Use `waec-2019-maths-p1.pdf`. Verify all pages processed, `OcrJob.status === "READY"`, `pageCount` matches PDF page count.
- [ ] **Test GPU timeout retry.** Mock the olmOCR worker to time out on attempt 1. Verify BullMQ retries with halved batch size. Verify success on attempt 2.

---

### Week 5: Post-Processing Modules and Output Generation

- [ ] **Implement `FormulaExtractionModule`.** All three detection layers (explicit delimiters, symbol density, WAEC patterns). KaTeX validation pass. Unit test with pages from `waec-2019-maths-p1.pdf` ground truth. Verify formula recall ≥ 90%.
- [ ] **Implement `TableExtractionModule`.** All four table types. Markdown + JSON + HTML output. Confidence scoring. Merged cell fallback. Unit test with `neco-2020-biology.pdf` table pages.
- [ ] **Implement `DiagramExtractionModule`.** Text-heuristic detection (Phase 1). Caption extraction. Diagram type classification. Placeholder generation. Unit test with `waec-2021-chemistry-p2.pdf`.
- [ ] **Implement `MarkdownGeneratorModule`.** Page assembly, document-type normalization, plain text stripping. Unit test with multi-page job result.
- [ ] **Implement `HTMLGeneratorModule`.** unified pipeline with rehype-katex. Self-contained output (KaTeX CSS inlined). Store to Supabase Storage on job completion.
- [ ] **Implement `JSONExportModule`.** Serialize `OCRExportJSON`. Store to Supabase Storage.
- [ ] **Run full regression suite.** All 9 test fixtures processed. Check all accuracy benchmarks. Fix failures before proceeding to Week 6.

---

### Week 6: Security, Monitoring, and Hardening

- [ ] **Implement `DOCXGeneratorModule`.** Markdown AST → docx Document. LaTeX formulas rendered to PNG and embedded. Tables as `docx` Table objects. Store to Supabase Storage.
- [ ] **Implement `getBackends()`.** Call `healthCheck()` on all registered providers. Return `OCRBackendStatus[]` with live latency measurements. Cache results for 30 seconds.
- [ ] **Implement `extractSync()`.** Validate input ≤ 3 pages, validate `SyncNotAllowedError`. Run synchronously. Create `OcrJob` and immediately mark `READY`.
- [ ] **Add ESLint rule `no-file-content-in-logs`.** Custom rule in `packages/eslint-config/rules/`. Audit all existing `console.log` calls in `ocr-service`. Fix violations.
- [ ] **Implement purge cron.** `apps/ocr-worker/src/cron/purge.ts`: runs daily, deletes `OcrJob` records with `purgeAfter < NOW()`. Log count of purged records to monitoring.
- [ ] **Provision Prometheus metrics.** Export all metrics listed in Section 15. Add `packages/ocr-service/src/metrics.ts` using `prom-client`. Mount `/metrics` endpoint on the worker's internal HTTP server.
- [ ] **Set up Grafana dashboard.** Import `infra/grafana/dashboards/ocr-service.json`. Verify all panels have data flowing from real jobs processed in staging.
- [ ] **Configure all Grafana alert rules.** All 8 alerts from Section 15. Test by deliberately taking the olmOCR worker down and verifying `BackendDown` alert fires within 5 minutes.
- [ ] **Conduct security review.** Verify: magic bytes validation cannot be bypassed, schoolId is always from session (never from request body), no file content appears in any log output, olmOCR worker is not internet-accessible. Sign off before production deploy.
- [ ] **Deploy to staging. Smoke test with 10 real school documents (mix of PDF and image, mix of document types).** Verify end-to-end flow: upload → job creation → worker pickup → processing → result available → HTML preview renders in browser → DOCX download produces a valid Word document.

---

*End of document. Next iteration: update DiagramExtractionModule spec when YOLOv8 region detection is implemented in Week 1 of Phase 2.*

  fileBuffer = null; // explicit GC hint
}
```

Workflow: API route uploads file to Supabase Storage → passes `documentId` to OCR worker → worker fetches from Supabase Storage → processes → stores result → deletes its local reference. File never touches the worker's disk.

### Result Retention and Redaction

| Field | Retention | Reason |
|---|---|---|
| `OcrJob.fullMarkdown` | Until teacher deletes document | Source of truth for Knowledge Service indexing |
| `OcrJob.fullText` | Until teacher deletes document | Used for keyword search fallback |
| `OcrJob.structuredData` | Until teacher deletes document | Parsed questions, formulas, diagram positions |
| `OcrJob.errorLog` | 30 days | Debugging only; purged automatically |
| `OcrJob.rawBackendOutput` | Never stored | Backend API response is parsed immediately; raw payload discarded |

If a document contains detected PII (student names, contact details) in a scanned form:
- Flag `OcrJob.hasPiiDetected = true`
- Trigger a teacher notification: "This document may contain student data. Review before indexing."
- Do not auto-index flagged documents — require explicit teacher approval

### NDPR Audit Trail

Every OCR processing event is logged:

```typescript
await auditLog.write({
  event: "ocr.document_processed",
  schoolId: job.schoolId,
  documentId: job.documentId,
  backend: selectedBackend,
  pageCount: result.pageCount,
  processingDurationMs: elapsed,
  piiDetected: result.hasPii,
  timestamp: new Date(),
  // IP is NOT logged here — OCR is internal service, no user IP involved
});
```

Audit logs retained for 1 year per NDPR requirements.

---

## 12. Scaling

### Horizontal Scaling

The OCR worker is a BullMQ consumer and scales horizontally by adding worker instances. Each instance independently fetches jobs from the Redis queue.

| Load | Recommended Workers |
|---|---|
| < 50 documents/day | 1 worker (shared with app server) |
| 50–500 documents/day | 2–4 workers (dedicated OCR VM) |
| 500–5,000 documents/day | 4–8 workers + Cloudflare Workers AI for overflow |
| > 5,000 documents/day | Dedicated GPU node for olmOCR; Cloudflare Workers AI for standard documents |

### Queue Priority

BullMQ supports priority queues. OCR jobs use three priority levels:

| Priority | Trigger | Example |
|---|---|---|
| HIGH (1) | Teacher manually uploads during active class | Exam paper upload during period 3 |
| NORMAL (5) | Standard teacher document upload | Lesson note attachment |
| LOW (10) | Scheduled bulk re-indexing | Background re-OCR after backend upgrade |

### Rate Limiting

- Cloudflare Workers AI: 10,000 requests/day on free tier → switch to paid or add secondary backend at 80% usage
- OpenAI Vision: $0.01/page — log cost per job; alert when monthly spend > $50
- olmOCR GPU: throughput-limited by GPU memory; queue depth alerts if job wait time > 5 minutes

---

## 13. Failure Handling

### Retry Strategy

| Failure Type | Retry | Delay | Max Attempts |
|---|---|---|---|
| Backend API timeout | Yes | 30s, 90s, 270s (exponential) | 3 |
| Backend API 429 (rate limit) | Yes | 60s, 120s, 300s | 3 |
| Backend API 500 | Yes | 30s, 60s, 120s | 3 |
| Invalid document (corrupt PDF) | No | — | 1 |
| Storage fetch error | Yes | 15s, 30s, 60s | 3 |
| GPU OOM (olmOCR) | No — fall back to next backend | — | 1 (then backend switch) |

### Backend Fallback Chain

If the primary backend fails after retries:

```
olmOCR → Cloudflare Workers AI → OpenAI Vision → FAIL (manual review required)
```

The fallback decision is logged with reason code. Teachers see "Processed with backup OCR engine" if a fallback occurred.

### Dead Letter Queue

After max retries exhausted, job moves to `ocr:dead-letter` queue. This triggers:
1. `OcrJob.status = "failed"`
2. Teacher notification: "Document processing failed. You can retry or upload a clearer scan."
3. Retry available from teacher UI (re-queues with HIGH priority)
4. Jobs in dead-letter queue older than 7 days are archived (metadata kept, file reference only)

### Circuit Breaker

Each backend has a circuit breaker with 3 states:

| State | Condition | Behavior |
|---|---|---|
| CLOSED | < 5 errors in 60s | Normal routing |
| OPEN | ≥ 5 errors in 60s | Skip this backend; route to next |
| HALF-OPEN | After 5-minute cooldown | Try one probe request; if success → CLOSED, if failure → OPEN |

---

## 14. Testing Strategy

### Unit Tests

**DocumentProcessor:**
- PDF with 3 pages → `extract()` returns `pageCount: 3`
- DOCX → `extract()` converts to text (mocked Mammoth)
- Image (JPEG) → `extract()` returns image buffer for vision backends

**BackendRouter:**
- `GPU_AVAILABLE=false` → never routes to olmOCR
- `DATA_SOVEREIGN=true` for school → always routes to Ollama Vision
- Cloudflare Workers AI circuit breaker OPEN → routes to OpenAI Vision
- All backends OPEN → throws `AllBackendsUnavailableError`

**ResultParser:**
- Raw Cloudflare Workers AI response with `\n---\n` page delimiter → splits into 3 page objects
- WAEC question pattern detected → `isStructuredQuestions: true`
- LaTeX formula `$x^2 + y^2 = r^2$` detected → `hasFormulas: true`

### Integration Tests

```typescript
it("submit PDF → poll status → get result", async () => {
  const { jobId } = await ocrService.submitDocument({
    schoolId: testSchoolId,
    documentId: testDocumentId,
    sourceType: "teacher-upload",
    options: { backend: "cloudflare-workers-ai" }, // force backend for test
  });

  await waitForJobComplete(jobId, testSchoolId);

  const result = await ocrService.getResult(jobId, testSchoolId);
  expect(result.status).toBe("complete");
  expect(result.fullText.length).toBeGreaterThan(100);
  expect(result.pageCount).toBe(testPdfPageCount);
});
```

### Failure Path Tests

```typescript
it("backend failure falls back to secondary", async () => {
  mockBackend("cloudflare-workers-ai", { fail: true });

  const { jobId } = await ocrService.submitDocument({
    schoolId: testSchoolId,
    documentId: testDocumentId,
    sourceType: "teacher-upload",
  });

  await waitForJobComplete(jobId, testSchoolId);
  const result = await ocrService.getResult(jobId, testSchoolId);

  expect(result.backend).toBe("openai-vision"); // fell back
  expect(result.status).toBe("complete");
});
```

### Load Tests

- Submit 20 concurrent OCR jobs → all complete within 3 minutes
- Simulate Cloudflare rate limit (429 on request 6+) → remaining jobs fall back and complete
- Submit 100 jobs sequentially → measure average processing time per backend

---

## 15. Monitoring

### Key Metrics

| Metric | Description | Alert Threshold |
|---|---|---|
| `ocr.job_queue_depth` | Jobs waiting for a worker | > 20 jobs waiting > 5 min |
| `ocr.processing_latency_p95` | Time from job start to complete | > 120s for single-page; > 8min for 10-page |
| `ocr.backend_error_rate` | % of calls that fail per backend | > 5% per backend per hour |
| `ocr.fallback_rate` | % of jobs that use a non-primary backend | > 20% (indicates primary backend degraded) |
| `ocr.dead_letter_rate` | % of jobs hitting dead-letter queue | > 1% |
| `ocr.cloudflare_quota_usage` | Daily requests to Workers AI | Alert at 80% of quota |
| `ocr.openai_daily_spend` | Estimated cost ($) | Alert at > $40/day |
| `ocr.pii_detection_rate` | % of processed documents flagged for PII | Spike > 10% |

### Dashboard Panels

1. **Queue health**: queue depth over time, worker count, job throughput per hour
2. **Latency distribution**: p50/p95/p99 by backend and document type
3. **Backend reliability**: error rate and fallback rate per backend
4. **Cost tracking**: Cloudflare quota usage %, OpenAI Vision daily spend
5. **Document pipeline**: jobs by status (pending/processing/complete/failed/dead-letter)
6. **PII alerts**: flagged documents per school per day

---

## 16. Replacement Roadmap

| Phase | OCR Service State |
|---|---|
| **Phase 1** | Cloudflare Workers AI (primary) + OpenAI Vision (fallback). BullMQ job queue. SSRF-safe storage-mediated pipeline. |
| **Phase 2** | Add olmOCR on dedicated GPU node for GPU-eligible schools. DeepSeek-VL as alternative vision backend (cost reduction). Implement confidence scoring across backends. |
| **Phase 3** | Fine-tune `TeachNexis-OCR-v1` on Nigerian educational document corpus (WAEC papers, NECO papers, common textbook formats). Replace primary vision backend for structured educational documents. |
| **Phase 4** | Native TypeScript document processor for standard WAEC/NECO PDF formats (machine-generated, no vision needed). Vision backends retained only for handwritten work and non-standard scans. |

---

## Phase 1 Implementation Checklist

**Week 1 — Queue Infrastructure**
- [ ] Install and configure BullMQ with Redis (Upstash Redis on Vercel)
- [ ] Create `OcrJob` Prisma model; run migration
- [ ] Implement `OcrQueue` class with `submitJob()` and `getJobStatus()` methods
- [ ] Implement `OcrWorker` that picks jobs from queue and calls `DocumentProcessor`
- [ ] End-to-end smoke test: submit a job, worker processes it, job status → complete

**Week 2 — Backend Integration**
- [ ] Implement `CloudflareWorkersAIBackend` adapter (`lib/ocr/backends/cloudflare.ts`)
- [ ] Implement `OpenAIVisionBackend` adapter (`lib/ocr/backends/openai.ts`)
- [ ] Implement `BackendRouter` with `DATA_SOVEREIGN` flag and circuit breaker
- [ ] Implement retry logic with exponential backoff (3 attempts per backend)
- [ ] Test: submit WAEC PDF → Cloudflare Workers AI → parsed result stored in DB

**Week 3 — Document Processing Pipeline**
- [ ] Implement `DocumentProcessor` — PDF page splitting, DOCX conversion, image pass-through
- [ ] Implement `ResultParser` — WAEC question detection, formula detection, page delimiter parsing
- [ ] Wire `OcrService.submitDocument()` to `KnowledgeService.ingest()` on job completion
- [ ] Implement SSE progress endpoint: `GET /api/ocr/jobs/[jobId]/progress` streams status updates
- [ ] Test: upload 10-page PDF → teacher sees progress (1/10, 2/10... 10/10) in UI

**Week 4 — Failure Paths**
- [ ] Implement dead-letter queue: failed jobs after max retries → `ocr:dead-letter`
- [ ] Implement teacher notification on job failure
- [ ] Implement retry-from-UI (re-queue dead-letter job with HIGH priority)
- [ ] Implement backend fallback chain: test each fallback path end-to-end
- [ ] Test: all backends mocked to fail → job lands in dead-letter within 3 retry cycles

**Week 5 — Security and Privacy**
- [ ] Implement storage-mediated fetch: worker fetches from Supabase Storage using service key (no direct URL from client)
- [ ] Implement SSRF allowlist: block any URL not in Supabase Storage domain
- [ ] Implement PII detection: flag documents with student-form PII patterns
- [ ] Implement file buffer purge: verify `fileBuffer = null` after processing completes
- [ ] NDPR audit log: all processing events logged with schoolId, documentId, backend, piiDetected

**Week 6 — Monitoring and Hardening**
- [ ] Set up queue depth alerts, processing latency alerts, dead-letter alerts
- [ ] Implement Cloudflare quota usage tracking (log requests, alert at 80% daily quota)
- [ ] Implement OpenAI Vision daily spend tracking
- [ ] Load test: 20 concurrent jobs → all complete within 3 minutes
- [ ] Runbook: "How to clear the dead-letter queue", "How to switch primary backend", "How to add a new OCR backend"
