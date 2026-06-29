# Implementation Review: CUR-003 — Lesson Generator CIG Integration

**Date:** 2026-06-29
**Sprint:** CUR-003 — Curriculum Intelligence → Lesson Generator
**Capability:** Curriculum Intelligence Graph (CUR-001) × Lesson Generator
**Impl Version:** 1.0

---

## What Was Built

Connected the existing lesson generation pipeline to the Curriculum Intelligence Graph so that every generated lesson is anchored in CIG node data rather than generated from topic name alone.

### Files Changed

| File | Change |
|---|---|
| `packages/ai-prompts/src/index.ts` | Added `CIGContext` interface; extended `LessonInput` with optional `cigContext`; added `buildCIGBlock()` helper; injected CIG block into prompt header |
| `apps/web/lib/curriculum-graph.ts` | Added `getTopicByLabel()` — looks up a TOPIC node by label + subject + classLevel + term (global nodes only) |
| `apps/web/app/api/lessons/generate/route.ts` | After input validation, looks up CIG node via `getTopicByLabel()`, calls `getTopicContext()`, maps result to `CIGContext`, passes to `buildLessonPrompt()` |

---

## What the AI Now Receives

For any topic that exists in the CIG, the lesson prompt now includes:

```
CURRICULUM INTELLIGENCE CONTEXT — use this data to anchor every section:
• Topic description: [from CIG node]
• Bloom's taxonomy levels to address: [e.g. Remember, Understand, Apply]
• Examination alignment: [WAEC, NECO]
• Key terms to define and use: [keywords from CIG]
• Difficulty level: [EASY / MEDIUM / HARD]
• Common student misconceptions — address EACH explicitly in Teaching Content:
  1. [misconception 1]
  2. [misconception 2]
• Key formulae to include in Worked Examples:
  – [label]: [formula]
• Entry Behaviour — students should already know: [prerequisite labels]
• Cross-subject connections to mention: [topic (subject), ...]
```

For topics NOT in the CIG (e.g. school-specific topics, JSS topics not yet seeded), generation falls back to the existing prompt-only path with no change in behaviour.

---

## Design Decisions

**CIG lookup is best-effort.** Any error in the lookup (DB timeout, node not found, schema mismatch) is silently caught and generation continues without CIG context. This ensures the lesson generator never fails due to CIG issues.

**Lookup by label (not ID).** The UI passes `{subject, classLevel, topic}` strings — it doesn't know node IDs. `getTopicByLabel()` uses a case-insensitive label match + subject + classLevel filter against global nodes (`schoolId IS NULL`). No UI change required.

**`CIGContext` defined in `ai-prompts` package with plain types.** The prompts package must not depend on `@prisma/client`. The route maps Prisma types → `CIGContext` at the boundary.

**`buildCIGBlock()` is a pure function.** Returns empty string if no context provided. The prompt is unchanged for non-CIG topics.

---

## Model Used

- Primary: `qwen/qwen3-next-80b-a3b-instruct:free` (Qwen3 80B via OpenRouter)
- Fallback chain: minimax-m3 → claude-sonnet-4.5 → gpt-oss-120b → nemotron → hermes → gemma-4

---

## Next Sprints

| Sprint | Description |
|---|---|
| AIO-001 | AI model routing — formalise intent-based routing with explicit model assignments per task type |
| 4c | JSS1–JSS3 curriculum seed |
