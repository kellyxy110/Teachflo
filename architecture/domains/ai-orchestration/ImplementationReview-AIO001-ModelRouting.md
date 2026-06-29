# Implementation Review: AIO-001 — AI Model Routing

**Date:** 2026-06-29
**Sprint:** AIO-001 — AI Model Routing
**Impl Version:** 1.0

---

## What Was Built

Consolidated the AI routing layer and removed duplication. No new behaviour introduced — the same models in the same order, with a single source of truth.

---

## Files Changed

| File | Change |
|---|---|
| `apps/web/lib/ai.ts` | Removed duplicate `getGroqClient`, `getOpenRouterClient`, and `MODEL_KEY_MAP` implementations. Now re-exports from `lib/ai/providers/`. Updated `LESSON_MODELS`, `EXAM_MODELS`, `DOCUMENT_MODELS` to reference `OPENROUTER_MODELS` constants instead of raw strings. |
| `apps/web/lib/ai/router.ts` | Removed dead `tutoringFallbackChain()` — both branches returned the same value. `getFallbackChain()` now handles all intents uniformly. |

---

## Model Assignments (Single Source of Truth)

| Task | Primary Model | Provider | Fallback |
|---|---|---|---|
| Lesson generation | Qwen3 80B (`REASONING`) | OpenRouter | minimax → sonnet → gpt-oss → nemotron → hermes → gemma |
| Exam generation | DeepSeek V4 Flash (`EXAM`) | OpenRouter | minimax → sonnet → gpt-oss → nemotron-ultra → qwen3 → hermes |
| Document analysis | Gemma 4 31B (`MULTIMODAL`) | OpenRouter | minimax → sonnet → gpt-oss → nemotron-12b → gemma-26b → hermes |
| Tutoring / chat | Cerebras Llama 70B (if key set) else Groq | Cerebras / Groq | general → complex |
| Curriculum planning | Qwen3 80B (`REASONING`) | OpenRouter | general → complex |
| Automation / agents | Kimi K2.6 (`AGENT`) | OpenRouter | general → complex |
| General | Llama 3.3 70B (`GENERAL`) | OpenRouter | complex |
| Emergency pool | minimax → sonnet → gpt-oss → nemotron-ultra → nemotron-reason → gemma-26b → nemotron-30b → llama-3b | OpenRouter | — |

---

## Architecture

```
API Route
  └─ Task-specific (lessons, exams, documents)
       └─ lib/ai.ts → openRouterStream / openRouterCompletion
            └─ LESSON_MODELS / EXAM_MODELS / DOCUMENT_MODELS
                 └─ OPENROUTER_MODELS constants (lib/ai/providers/openrouter.ts)
                      └─ getOpenRouterClient() → OpenAI SDK → openrouter.ai/api/v1
                           └─ Groq fallback (lib/ai/providers/groq.ts)

API Route
  └─ Chat / Study Buddy / Knowledge Studio
       └─ lib/ai/router.ts → routedChat / routedChatStream
            └─ classifyIntent() → routeToModel() → provider client
                 └─ getFallbackChain() → EMERGENCY_MODELS pool
```

---

## What Was NOT Changed

- No model swaps — same models in same order
- No API contract changes — all existing imports continue to work
- `openRouterStream` and `openRouterCompletion` signatures unchanged
- Router intent classification patterns unchanged
