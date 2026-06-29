# Contract: AI Infrastructure & Orchestration

## Purpose
Route all AI requests to the appropriate model with automatic fallback, validate outputs, and return typed results — never raw model responses.

## Responsibilities

**Owns:**
- Model selection based on content type (lesson, exam, document, code)
- Fallback chain activation when the primary model is unavailable
- Rate limiting enforcement per user per endpoint
- AI output validation before returning to callers
- Content caching via Upstash Redis (TTL 7 days)
- Prompt construction via the `@teachflow/ai-prompts` package

**Does NOT own:**
- Educational content decisions (which topic, which curriculum standard)
- Database persistence of AI-generated content
- UI rendering of AI content
- Billing or quota enforcement beyond per-user rate limiting

## Inputs

| Field | Type | Required | Validation |
|---|---|---|---|
| intent | `"lesson" \| "exam" \| "document" \| "code"` | yes | Must be a known intent |
| messages | `Message[]` | yes | At least 1 message; caller-provided |
| options.temperature | number | no | 0.0–1.0; default 0.7 |
| options.max_tokens | number | no | 1–8000; default model-specific |
| options.json | boolean | no | When true, validates response as JSON |

## Outputs

| Field | Type | Guarantee |
|---|---|---|
| completion | string | Always present on success; never empty |
| model | string | The model ID that produced the response |
| provider | string | `openrouter`, `groq`, or `cerebras` |

## Dependencies

| Capability | ID | Nature of Dependency |
|---|---|---|
| Authentication | Platform | `userId` required for per-user rate limiting |
| Rate Limiting | Platform | `rateLimit(key)` called before any model invocation |

## Events Produced

| Event | Payload | Trigger |
|---|---|---|
| `ai.content.ready` | `{ contentType, model, tokens }` | On successful completion |
| `ai.generation.failed` | `{ contentType, model, reason, attemptsExhausted }` | After all fallbacks are exhausted |

## Events Consumed

None. AI Infrastructure does not consume domain events — it is called directly by API routes and server actions.

## Quality Guarantees

- All responses come from a real model or explicit fallback — never mocked or stubbed.
- When `json: true` is specified, the response is validated as parseable JSON before returning to the caller. Markdown code fences are stripped automatically.
- Rate limiting is checked before any model API call — the AI provider is never charged if the user exceeds their budget.
- The fallback chain cycles through at least 3 models before declaring failure.
- Free-tier models are always preferred; paid models are not used without explicit opt-in.
- The content cache is checked before calling any model — a cache hit skips model invocation entirely.

## Failure Behaviour

| Failure Scenario | Behaviour |
|---|---|
| All models in chain fail | Throws with last provider's error message |
| Rate limit exceeded | Returns `{ ok: false }` — caller returns 429 to client |
| Invalid JSON (when `json: true`) | Throws JSON parse error; stripped fences first |
| Network timeout | Falls through to next model in chain |
| Token budget exceeded | Returns truncated response — validator may log a warning |

## Extension Points

- A future agent orchestration layer may compose multiple AI calls through this contract without callers being aware.
- A future cost optimiser may reorder the fallback chain at runtime based on real-time provider availability.
- A future multi-modal provider may be added to `LESSON_MODELS` without callers changing their interface.
