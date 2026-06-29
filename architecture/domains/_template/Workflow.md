# Workflow: [Capability Name]

## Primary Workflow — [Main Operation Name]

Triggered by: [what triggers this workflow — teacher action, event, schedule, API call]

```
Step 1: [Action]
        ↓
Step 2: [Action]
  → Branch A: [condition] → [outcome]
  → Branch B: [condition] → [outcome]
        ↓
Step 3: [Action]
        ↓
...
Final: [Completion action — notify, store, emit event]
```

### Step Details

**Step 1 — [Name]**
What happens. What is validated. What fails here and how.

**Step 2 — [Name]**
What happens. Decision points. Branch conditions.

[Continue for each step]

---

## Secondary Workflow — [Second Operation Name] (if applicable)

[Same structure as above]

---

## Failure Paths

| Failure Point | Cause | Behaviour | Recovery |
|---|---|---|---|
| [Step N] | [What went wrong] | [What the system does] | [How it recovers or surfaces to user] |

## Retry Logic
[If AI calls or external services are involved, define retry strategy here]
- Max retries: [N]
- Backoff: [strategy]
- After max retries: [what happens]

## Idempotency
Is this workflow safe to retry? Under what conditions?

## Caching
[If applicable]
- Cache key: [what determines the cache key]
- TTL: [how long results are cached]
- Invalidation: [what triggers cache invalidation]
