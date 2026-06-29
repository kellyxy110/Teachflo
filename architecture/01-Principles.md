# TeachNexis — Principles

## Governing Principle

**Architecture governs implementation. Implementation never governs architecture.**

If implementation exposes weaknesses in the architecture, the architecture is improved first. The implementation is then adjusted to follow. This principle is non-negotiable and applies at every level of the system.

## Product Principles

### 1. Solve real problems first
Every feature must address a specific, observable pain point in a teacher's or school's workflow. Features built for completeness or competitive parity without genuine user value will not be prioritised.

### 2. Educational contracts before technical implementation
Before any capability is built, its educational purpose must be defined. The curriculum structure, learning objectives, and assessment standards exist before the AI layer that serves them.

### 3. Evolutionary, not revolutionary
The existing codebase is the foundation. Working features are preserved and improved, not discarded. Architectural improvements are introduced incrementally without breaking what teachers already depend on.

### 4. AI is an instrument
TeachNexis uses AI to accelerate and improve educational work. AI is not a brand, not a headline feature, and not a substitute for sound curriculum design. AI outputs are always verifiable and correctable.

### 5. Composable by design
Every capability exposes a contract. Nothing depends on implementation details. The orchestration layer coordinates contracts, not code.

## Architectural Principles

### 6. Contracts over conventions
Every domain and module declares its purpose, inputs, outputs, dependencies, events, quality guarantees, and failure behaviour explicitly. Implicit coupling is an architectural defect.

### 7. Loose coupling, high cohesion
Capabilities within a domain are tightly related. Capabilities across domains interact only through published contracts. This makes individual domains independently deployable, testable, and replaceable.

### 8. Decisions are permanent record
Every architectural decision is recorded in the Decision log with its rationale, alternatives considered, and known trade-offs. Nothing is deleted. The log grows only forward.

### 9. Specifications precede implementation
Every major capability follows the Architecture Review sequence before a line of code is written:

```
Vision → Architecture → Workflow → UI/UX → Implementation → Validation → Integration
```

Decisions are logged continuously throughout, not as a discrete phase.

### 10. Prompt is a detail, not a design
AI prompts are implementation details inside a larger architectural contract. They appear last in module specifications, after purpose, workflow, inputs, outputs, and quality standards are fully defined. Swapping a model or rewriting a prompt must not require redesigning the surrounding system.

## Development Principles

### 11. Specification files are authoritative
The `/architecture/` layer is the source of truth. Code is the final expression of architecture. When code diverges from architecture, the architecture is updated or the code is corrected — the specification is never silently overridden by implementation convenience.

### 12. Security is not a feature
Authentication, authorisation, data isolation, and input validation are built into every capability from the beginning. Multi-tenant data boundaries (schoolId) are enforced at every data access point. Security is audited, not assumed.

### 13. No documentation drift
A specification that does not match the implementation is worse than no specification. Every implementation change that affects the architectural contract must update the specification before or alongside the code change.

### 14. Mobile first
The platform is designed for teachers who may access it on a mobile device in a classroom. Desktop capabilities are additive, not primary.

### 15. Nigerian infrastructure reality
The platform must be resilient to variable connectivity. Core functionality should degrade gracefully. Heavy assets are optimised. AI calls that fail should not block essential workflows.
