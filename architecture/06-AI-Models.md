# TeachNexis — AI Models

## Governing Constraint

No OpenAI APIs. No paid proprietary APIs without explicit authorisation.
All models accessed via Groq or OpenRouter free tier unless a specific exception is recorded in the Decision Log.

AI models are implementation details inside module contracts. Swapping a model must not require redesigning the surrounding architecture.

---

## Model Registry

### Kimi K2.6
**Provider:** NVIDIA DGX Cloud / OpenRouter
**Primary Role:** Long-form lesson generation and deep curriculum reasoning
**Strength:** Extended context window, deep reasoning, sustained coherence across long outputs
**Use For:**
- Full lecture note generation (Teacher and Student versions)
- Scheme of work generation
- Curriculum Knowledge Package assembly
- Long-form structured content where accuracy and depth matter

**Temperature:** 0.4
**Fallback:** DeepSeek
**Context Window:** Extended (verify current limit at runtime)
**Cost Tier:** Medium

---

### DeepSeek (V3 / V4 Flash)
**Provider:** Groq / OpenRouter
**Primary Role:** Mathematics, structured assessment, and calculation-heavy content
**Strength:** Precise reasoning, structured output, strong with formal notation and step-by-step solutions
**Use For:**
- Mathematics lesson generation
- Physics and Chemistry calculation problems
- Question bank generation for STEM subjects
- Mark scheme and solution generation
- Assessment items requiring formal structure

**Temperature:** 0.2
**Fallback:** Qwen
**Context Window:** Standard
**Cost Tier:** Free tier

---

### Qwen3
**Provider:** Groq / OpenRouter
**Primary Role:** Summaries, flashcards, educational transformations, short-form content
**Strength:** Efficient at condensing and transforming existing content into new formats
**Use For:**
- Flashcard generation from lecture notes
- Topic summaries
- Learning objective extraction
- Bloom's Taxonomy classification
- Quiz generation from lesson content
- Infographic content extraction (key points)

**Temperature:** 0.5
**Fallback:** Grok
**Context Window:** Standard
**Cost Tier:** Free tier

---

### Grok
**Provider:** OpenRouter
**Primary Role:** General writing, teacher communications, fallback tasks
**Strength:** Versatile, strong general writing, reliable fallback
**Use For:**
- Teacher-facing feedback and suggestions
- Assignment and worksheet prose
- General educational writing that doesn't require deep curriculum reasoning
- Fallback when primary model is unavailable

**Temperature:** 0.6
**Fallback:** Qwen
**Context Window:** Standard
**Cost Tier:** Free tier

---

### Ornith
**Provider:** TBD
**Primary Role:** Software engineering, code generation, testing, UI, refactoring
**Strength:** Code quality, architecture, debugging
**Use For:**
- Developer Studio (Coding Lab) AI mentor
- Code review and feedback in student coding assignments
- Test generation
- UI component suggestions

**Temperature:** 0.2
**Fallback:** DeepSeek
**Context Window:** Standard
**Cost Tier:** TBD

---

## Routing Logic

The AI Infrastructure domain is responsible for all model routing. No application domain calls a model directly — all AI calls go through the routing layer.

**Routing Factors:**
1. Content type (lesson, assessment, summary, code, general)
2. Subject domain (STEM vs. Humanities)
3. Output length (short-form vs. long-form)
4. Model availability (health check before routing)
5. Cost optimisation (prefer free tier for short tasks)

**Fallback Chain (default):**
```
Primary model unavailable
→ Fallback model
→ Secondary fallback
→ Queue for retry (up to 3 attempts)
→ Surface error to teacher with option to retry manually
```

---

## Quality Standards for AI Outputs

All AI-generated content must satisfy these criteria before being stored or presented to teachers:

| Criterion | Standard |
|---|---|
| Completeness | Content does not truncate mid-sentence or mid-section |
| Curriculum alignment | Topics recognisable from NERDC curriculum |
| Format compliance | Output matches requested structure (headings, sections, list format) |
| Length | Within 20% of target length |
| Language register | Appropriate for target audience (Teacher or Student version) |
| Factual plausibility | No obvious hallucinations (flagged for human review if uncertain) |

Content that fails any criterion is either regenerated automatically or flagged for teacher review before storage.

---

## Prompt Versioning

Every prompt is versioned. When a prompt is updated, the previous version is archived, not deleted.

Format: `Prompt-v{major}.{minor}.md`

The active prompt for each module is always `Prompt.md`. Historical versions are stored in `Prompt-Library/[module]/`.

Model changes that require prompt updates increment the minor version. Structural prompt redesigns increment the major version.

---

## Cost Optimisation

- Short-form tasks (summaries, flashcards, quiz items) always routed to free-tier models.
- Long-form generation uses free-tier first; falls back to paid tier only when free-tier is unavailable.
- Generated content is cached per `schoolId + subject + classLevel + term + topic` to avoid regenerating identical content.
- Cache TTL: 30 days for stable curriculum content; 7 days for assessment items.
