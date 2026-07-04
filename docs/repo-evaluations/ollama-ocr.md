# Repository Evaluation: Ollama-OCR

**Repository:** https://github.com/imanoop7/Ollama-OCR  
**Category:** Local Vision-Model OCR / Prototype  
**TeachNexis Service Target:** TeachNexis OCR Service (local/offline backend)  
**Priority:** Phase 1 — Supporting Reference  
**Evaluated:** 2026-07-04  

---

## What It Does

Ollama-OCR is a lightweight Python script that uses Ollama's locally-running vision models (primarily `llama3.2-vision` and `llava`) to perform OCR on images and PDFs. The workflow is:

1. Load an image or PDF page
2. Send it to a locally-running Ollama instance via the Ollama REST API
3. Use a vision model to extract text via a prompt
4. Return the extracted text as Markdown or plain text

This is effectively a thin wrapper around the Ollama vision API with some PDF-handling glue code.

---

## Tech Stack

- **Language:** Python
- **Inference:** Ollama (local model server, CPU or GPU)
- **Vision models:** `llama3.2-vision:11b`, `llava`, or any Ollama-compatible vision model
- **PDF handling:** `pdf2image` + `poppler`
- **Output:** Markdown or plain text
- **Interface:** Script / command-line (no REST API in the base repo)

---

## License

MIT — fully permissive.

---

## Production Readiness: HONEST ASSESSMENT

**This is a prototype/educational project, not production software.**

- **Stars:** ~1,500 (small community, primarily hobbyist interest)
- **Code quality:** Single-file script, no error handling, no tests, no API surface
- **Maintenance:** Infrequent updates, primarily documentation-driven
- **Missing for production:** No async processing, no batch queue, no confidence scoring, no retry logic, no auth, no rate limiting, no file type validation, no progress tracking

Do not wrap this specific codebase. Study the **concept** it demonstrates.

---

## What the Concept Demonstrates (Despite the Code Quality)

The core idea is valuable: **use a locally-running vision model for OCR, keeping all data on-premise.**

For TeachNexis, this translates to:

| Capability | Value |
|---|---|
| Offline OCR for schools with no cloud access | High strategic value |
| Data sovereignty — student documents never leave school | Critical for government school compliance |
| No per-page API cost | Significant at scale (10,000+ documents) |
| Works on CPU (slowly) with quantized models | Low barrier for resource-constrained schools |

---

## TeachNexis Use Cases

| Use Case | Relevant? | Notes |
|---|---|---|
| Offline OCR for rural/government schools | Yes | Key differentiator vs cloud-only tools |
| Scanned worksheet processing without internet | Yes | Core offline capability |
| Privacy-sensitive document OCR (student records) | Yes | Data never leaves school network |
| Math formula extraction from scanned papers | Partial | llama3.2-vision handles printed math; unreliable on handwriting |
| High-volume batch processing | No | Too slow on CPU for batch use; use olmOCR for bulk |

---

## Comparison: Ollama-OCR vs olmOCR

| Dimension | Ollama-OCR | olmOCR |
|---|---|---|
| Inference location | Local (school server / laptop) | Cloud GPU or self-hosted GPU server |
| Model size | 11B (vision, quantized ~6GB RAM) | 7B (requires GPU VRAM) |
| Speed (CPU) | ~30-120s per page | Not feasible on CPU |
| Speed (GPU) | ~5-15s per page | ~3-8s per page |
| Math accuracy | Good on clear typeset; poor on handwriting | Excellent on typeset, good on tables |
| Data sovereignty | Complete (fully local) | Requires network to GPU service |
| Setup complexity | Low (Ollama install + model pull) | High (sglang + GPU driver + model) |
| Production readiness | No (needs wrapping) | Research-grade (needs wrapping) |

**Decision rule:** Use Ollama-OCR backend for **offline / data-sovereign** scenarios. Use olmOCR backend for **quality-first / cloud-connected** scenarios. Both sit behind the same `TeachNexisOCRService` interface.

---

## What to Avoid

- **Do not use the Ollama-OCR codebase directly.** It is a script, not a service. Build a proper OCR backend using Ollama's API natively.
- **Do not use for high-volume batch processing on CPU.** At 60 seconds per page, a 200-page textbook takes 3+ hours. Use olmOCR or async cloud GPU for bulk work.
- **Prompt reliability:** The vision model can hallucinate text. Implement a confidence/validation layer.
- **Model availability:** `llama3.2-vision:11b` requires ~6GB RAM. Confirm target school servers can handle this.

---

## Integration Risks

| Risk | Severity | Notes |
|---|---|---|
| Slow CPU inference | High | Must warn users or queue async |
| Model download (~6GB first run) | Medium | Pre-install on school servers |
| Ollama version compatibility | Low | Ollama API is stable |
| No native batching | Medium | Build queue layer |

---

## Security and Privacy

**This is actually a privacy ADVANTAGE for sensitive use cases:**
- No data transmitted externally
- No API keys required
- No cloud logs
- Suitable for schools with strict data governance requirements

Ensure the Ollama service is bound to `localhost` only on school servers — never exposed to the public internet.

---

## Recommended Integration in TeachNexisOCRService

The `TeachNexisOCRService` interface (defined in the olmOCR evaluation) includes `backend: OCRBackend`. Ollama-Vision should be one of those backends:

```typescript
// Backend selection logic in TeachNexisOCRService
function selectBackend(context: OCRContext): OCRBackend {
  if (context.schoolConfig.offlineMode) return "ollama-vision";
  if (context.requiresDataSovereignty) return "ollama-vision";
  if (context.documentType === "math-heavy") return "olmocr";
  if (context.priority === "fast" && context.cloudAvailable) return "deepseek-ocr";
  return "olmocr"; // default
}
```

---

## Build vs Wrap vs Study

**Recommendation: STUDY the concept → BUILD a proper Ollama-Vision backend**

Do NOT wrap the `imanoop7/Ollama-OCR` codebase. Instead:

1. Study its approach to vision model prompting for OCR
2. Build a clean `OllamaVisionBackend` class as part of TeachNexisOCRService
3. This backend calls the Ollama REST API directly with a crafted OCR prompt
4. Add proper error handling, retry logic, page batching, and confidence scoring

**Implementation effort:** 2-3 days for a clean Ollama backend in the TeachNexisOCRService.

---

## Replacement Strategy

The Ollama-Vision backend is already the TeachNexis-native implementation — it's built from scratch using Ollama's API, not a fork of this repo. As better offline-capable models emerge (e.g., quantized versions of olmOCR-7B running on Ollama), swap the model while keeping the interface identical.

---

## Final Verdict

The `Ollama-OCR` repository is too immature to wrap, but the **concept it demonstrates — local vision model OCR for data-sovereign schools — is strategically important for TeachNexis**. Build a proper Ollama-Vision backend in TeachNexisOCRService from scratch, using Ollama's REST API directly. This becomes TeachNexis's offline OCR capability and a meaningful differentiator for schools without reliable internet or with strict data policies.
