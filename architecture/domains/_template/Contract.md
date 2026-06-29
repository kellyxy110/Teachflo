# Contract: [Capability Name]

## Purpose
One sentence. What this capability promises to do.

## Responsibilities

**Owns:**
- [What this capability is accountable for]

**Does NOT own:**
- [Explicitly out of scope — prevents scope creep]

## Inputs

| Field | Type | Required | Validation |
|---|---|---|---|
| [field] | [type] | yes/no | [validation rule] |

## Outputs

| Field | Type | Guarantee |
|---|---|---|
| [field] | [type] | always / conditionally / never null |

## Dependencies
Capabilities this contract depends on (by name and ID, not by implementation detail).

| Capability | ID | Nature of Dependency |
|---|---|---|
| [Name] | [ID] | [What is needed from them] |

## Events Produced

| Event | Payload | Trigger |
|---|---|---|
| `[domain.action.past-tense]` | `{ field: type }` | [When this event fires] |

## Events Consumed

| Event | Source | Action Taken |
|---|---|---|
| `[domain.action.past-tense]` | [Producing capability] | [What this capability does on receipt] |

## Quality Guarantees
Explicit promises callers can rely on. Be specific.

- [Guarantee 1 — e.g., "All returned records belong to the authenticated school."]
- [Guarantee 2 — e.g., "Generated content will never truncate mid-sentence."]
- [Guarantee 3 — e.g., "Array results are capped at N items."]

## Failure Behaviour
What callers should expect when this capability fails.

| Failure Scenario | Behaviour |
|---|---|
| [Scenario] | [Throws / Returns null / Returns typed error] |
| Resource not found | Throws "[Resource] not found" — never reveals cross-tenant existence |
| Validation failure | Throws descriptive error naming field and constraint |
| AI model unavailable | [Specific behaviour for this capability] |

## Extension Points
Where future capabilities may attach without requiring contract changes.

- [Extension point 1 — e.g., "A future translation module may consume `topic.content.generated` without changes here."]
