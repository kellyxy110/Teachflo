# Repository Evaluation: olmOCR

**Repository:** https://github.com/allenai/olmocr  
**Category:** Document Intelligence / OCR  
**TeachNexis Service Target:** TeachNexis OCR Service  
**Priority:** Phase 1 — Highest  
**Evaluated:** 2026-07-04  

---

## What It Does

olmOCR is Allen Institute for AI's pipeline for converting PDF pages into clean, structured Markdown using vision language models. It does not use classical OCR (no Tesseract-style character recognition). Instead, it renders each PDF page as an image and passes it through a fine-tuned vision model (`olmOCR-7B-0225-preview`, based on Qwen2-VL) that generates Markdown output including:

- Running prose and paragraphs
- Mathematical formulas (LaTeX)
- Tables (converted to Markdown table syntax)
- Headers and structure
- Figure captions

The pipeline uses **sglang** as the inference server and is designed for batch processing of large document collections at scale.

---

## Tech Stack

- **Language:** Python
- **Inference:** sglang (OpenAI-compatible server), Qwen2-VL-7B base + fine-tuned weights
- **PDF rendering:** `pypdfium2` for rasterizing PDF pages
- **Output format:** Markdown
- **Compute requirement:** GPU (NVIDIA, minimum A10G/24GB VRAM for practical throughput)

---

## License

Apache 2.0 — fully permissive for commercial use, modification, and redistribution.

---

## Production Readiness

- **GitHub stars:** ~11,000+ (strong community interest)
- **Maintainer:** Allen Institute for AI (well-funded research org)
- **Maturity:** Research-grade pipeline, not a hosted SaaS. Requires self-hosted GPU inference.
- **Known issues:** Cold start latency (model loading), requires GPU infra, no native REST API (you run the pipeline as a batch job or build a wrapper)
- **Model quality:** Significantly better than Tesseract on typeset documents; strong on math and tables; weaker on hand-written notes and very low-quality scans

---

## TeachNexis Use Cases

| Use Case | Relevance |
|---|---|
| Digitizing WAEC/NECO past question papers (scanned PDFs) | High |
| Extracting mathematical formulas from textbooks | High |
| Converting teacher-uploaded lesson notes to searchable text | High |
| Parsing school curriculum documents from Ministry of Education | High |
| Building searchable RAG index from uploaded school textbooks | High |
| Extracting structured tables from mark sheets and report formats | Medium |
| Processing hand-written student notes | Low (model not trained for handwriting) |

---

## What TeachNexis Can Learn

1. **Vision-first OCR approach:** Rendering PDF pages as images and using a VLM is the right architectural pattern for documents with mixed content (prose + math + tables). Avoid classical OCR pipelines for educational content.
2. **Anchored prompting:** olmOCR uses "anchor text" (pdfminer text layer) to guide the vision model — this reduces hallucinations significantly. TeachNexis OCR Service should implement this pattern.
3. **Sglang batching:** The pipeline batches pages efficiently. TeachNexis should design the OCR Service to process documents asynchronously, page by page, with progress tracking.
4. **Quality pipeline:** olmOCR includes a quality filtering step. Our OCR Service should include confidence scoring and fallback logic.

---

## What to Avoid

- **Direct sglang dependency in production:** sglang is fast but complex to operate. Wrap it behind an API.
- **GPU assumption:** The 7B model requires a GPU. TeachNexis cannot assume all deployments have GPU access. The service interface must abstract compute.
- **Batch-only thinking:** olmOCR is designed for bulk processing. TeachNexis needs real-time single-document processing for teacher uploads — design for both modes.
- **Model size lock-in:** The 7B model is large. Evaluate smaller quantized alternatives (e.g., Qwen2-VL-2B) for cost.

---

## Integration Risks

| Risk | Severity | Mitigation |
|---|---|---|
| GPU infrastructure cost | High | Use cloud GPU on-demand (Lambda Labs, RunPod, Modal) rather than always-on |
| Model loading latency (cold start ~30s) | High | Keep model warm with a heartbeat endpoint |
| Python service — different from Next.js stack | Medium | Expose as REST microservice behind TeachNexis OCR Service |
| No SLA or official support | Medium | Pin model version, maintain own fork of processing pipeline |
| Large file uploads (100MB+ PDFs) | Medium | Implement file size limits, page count limits, async queue |

---

## Security and Privacy

- Student exam papers and school documents must **not** leave the school's data boundary. If using cloud GPU, ensure data is encrypted in transit, not logged, and deleted after processing.
- Implement document-level access control: a teacher's uploaded document should not be accessible to another school.
- Consider on-premise GPU deployment for schools with strict data policies (government schools, federal schools).

---

## Dependency Risks

- `sglang` — actively maintained but evolving API; pin versions
- `Qwen2-VL` weights — depends on HuggingFace availability; mirror locally
- `pypdfium2` — stable, low risk

---

## Recommended Service Abstraction

**Service Name:** `TeachNexisOCRService`

```typescript
interface TeachNexisOCRService {
  // Submit a document for OCR processing
  extractDocument(input: {
    fileBuffer: Buffer;
    mimeType: "application/pdf" | "image/jpeg" | "image/png";
    schoolId: string;
    documentId: string;
    options?: { extractMath?: boolean; extractTables?: boolean; language?: "en" | "yo" | "ha" | "ig" };
  }): Promise<OCRJob>;

  // Get results of a processing job
  getJobResult(jobId: string): Promise<OCRResult>;

  // Extract text synchronously for small inputs (single page)
  extractPage(imageBuffer: Buffer, options?: OCROptions): Promise<string>;

  // List supported backends
  getBackends(): OCRBackend[];
}

interface OCRResult {
  jobId: string;
  status: "pending" | "processing" | "ready" | "failed";
  pages: {
    pageNumber: number;
    markdown: string;
    confidence: number;
    hasMath: boolean;
    hasTables: boolean;
  }[];
  fullText: string;
  processingTimeMs: number;
  backend: OCRBackend;
}

type OCRBackend = "olmocr" | "deepseek-ocr" | "tesseract" | "ollama-vision";
```

The service hides which backend processed the document. olmOCR, DeepSeek OCR, and Ollama-Vision are all valid backends behind the same interface.

---

## Build vs Wrap vs Study

**Recommendation: WRAP (Phase 1) → BUILD NATIVE (Phase 3)**

- **Phase 1:** Wrap olmOCR behind `TeachNexisOCRService` REST interface. Deploy on a cloud GPU instance (Modal or RunPod). Use async job queue (existing DB queue or Redis).
- **Phase 2:** Add DeepSeek OCR and Ollama-Vision as alternative backends behind the same interface. Add confidence scoring and automatic backend selection.
- **Phase 3:** Fine-tune a smaller vision model on Nigerian educational content (WAEC papers, textbook layouts). Replace olmOCR 7B with a TeachNexis-native 2B model.

---

## Benchmark Targets

| Metric | Target | Measurement Method |
|---|---|---|
| Pages per minute | ≥ 10 pages/min on A10G | Batch 100-page WAEC paper |
| Math formula accuracy | ≥ 90% on WAEC maths | Manual review of 50 questions |
| Table extraction accuracy | ≥ 85% | Compare against known ground truth |
| End-to-end latency (10-page doc) | ≤ 30 seconds | User upload → full Markdown |
| Cost per document | ≤ $0.05 for 10-page PDF | Track GPU minutes × cost |

---

## Replacement Strategy

1. Monitor `olmOCR-7B` → when fine-tuned 2B models emerge, evaluate
2. Build TeachNexis Textbook Dataset (annotated Nigerian textbook pages) for fine-tuning
3. Quarterly benchmark olmOCR vs DeepSeek OCR vs Tesseract on TeachNexis document types
4. When a lighter model matches olmOCR quality at ≤ 30% cost, migrate and remove olmOCR dependency

---

## Final Verdict

olmOCR is the strongest available open-source OCR pipeline for typeset educational documents with math and tables. **Wrap it behind the TeachNexisOCRService interface immediately** — do not use it directly in production code. Budget for GPU infra, implement an async job queue, and plan a fine-tuning track for Nigerian textbook content within 12 months.
