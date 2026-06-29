# Architecture: [Capability Name]

## Mission
What this capability is responsible for accomplishing within TeachNexis.

## Responsibilities
- [What it owns and is accountable for]
- [What it does NOT own — equally important]

## System Position
Where this capability sits in the platform and how it relates to adjacent capabilities.

```
[Diagram showing position in the domain and connections to dependents]
Example:
Curriculum Intelligence
        ↓
[This Capability]
        ↓
Assessment Intelligence  |  Teacher Dashboard
```

## Design Rationale
Why this architecture was chosen over alternatives. What trade-offs were accepted.

## Key Design Decisions
Reference entries in `Decision.md` for any significant choices made during architecture design.

## Inputs
What this capability receives from callers or upstream systems.

## Outputs
What this capability produces for callers or downstream systems.

## Dependencies
| Capability | ID | Reason |
|---|---|---|
| [Name] | [ID] | [Why this dependency exists] |

## Consumers
| Capability | ID | What they use |
|---|---|---|
| [Name] | [ID] | [What they consume from this capability] |

## Non-Functional Requirements
- **Performance:** [Target response time, throughput]
- **Availability:** [Uptime expectations, graceful degradation]
- **Scalability:** [Expected load, growth trajectory]
- **Security:** [Specific requirements beyond platform defaults]

## Future Expansion
How this capability is expected to grow. What extension points exist for future capabilities without requiring contract changes.
