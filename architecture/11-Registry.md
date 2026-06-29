# TeachNexis — Capability Registry

This is the single index of every capability in TeachNexis. It is the authoritative source for capability ownership, version, health, dependencies, and lifecycle status.

**Rule:** No capability enters implementation without a Registry entry. No capability is retired without a Registry update.

---

## Registry Format

Each entry records:
- **ID** — Unique identifier (format: `DOMAIN-NNN`)
- **Name** — Human-readable capability name
- **Domain** — Owning domain
- **Layer** — Foundation / Application / Infrastructure
- **Version** — Semantic version of the specification (`spec: x.y`) and implementation (`impl: x.y`)
- **Lifecycle** — Current lifecycle stage (see `12-Lifecycle.md`)
- **Health** — Green / Amber / Red (assessed during monitoring)
- **Owner** — Responsible engineer or team
- **Dependencies** — Other capabilities this one depends on (by ID)
- **Consumers** — Capabilities that depend on this one (by ID)
- **Specification** — Path to the domain/module folder

---

## Platform Capabilities

| ID | Name | Domain | Layer | Spec | Impl | Lifecycle | Health |
|---|---|---|---|---|---|---|---|
| PLT-001 | Authentication & Session | Security | Infrastructure | 1.0 | 1.0 | Production | Green |
| PLT-002 | Data Isolation | Security | Infrastructure | 1.0 | 1.0 | Production | Green |
| PLT-003 | Input Validation | Security | Infrastructure | 1.0 | 1.0 | Production | Green |
| PLT-004 | Mobile Layout System | Platform | Infrastructure | 1.0 | 1.0 | Production | Green |
| PLT-005 | Database Connection (Supavisor) | Database | Infrastructure | 1.0 | 1.0 | Production | Green |

---

## Foundation Capabilities

### Curriculum & Content Intelligence (F1)

| ID | Name | Domain | Layer | Spec | Impl | Lifecycle | Health |
|---|---|---|---|---|---|---|---|
| CUR-001 | Curriculum Intelligence Graph (CIG) | Curriculum Intelligence | Foundation | 1.0 | — | Approved | — |
| CUR-002 | Topic Knowledge Package | Curriculum Intelligence | Foundation | — | — | Idea | — |
| CUR-003 | Lecture Note Generator | Curriculum Intelligence | Foundation | — | — | Idea | — |
| CUR-004 | Summary Generator | Curriculum Intelligence | Foundation | — | — | Idea | — |
| CUR-005 | Scheme of Work Engine | Curriculum Intelligence | Foundation | — | — | Idea | — |
| CUR-006 | Learning Objectives & Bloom's Mapping | Curriculum Intelligence | Foundation | — | — | Idea | — |
| CUR-007 | WAEC/NECO/JAMB Alignment | Curriculum Intelligence | Foundation | — | — | Idea | — |

### Assessment & Learning Intelligence (F2)

| ID | Name | Domain | Layer | Spec | Impl | Lifecycle | Health |
|---|---|---|---|---|---|---|---|
| ASS-001 | Question Bank | Assessment | Foundation | 1.0 | 1.0 | Production | Green |
| ASS-002 | Manual Question Builder | Assessment | Foundation | 1.0 | 1.0 | Production | Green |
| ASS-003 | Excel Bulk Import | Assessment | Foundation | 1.0 | 1.0 | Production | Green |
| ASS-004 | KaTeX Math Editor | Assessment | Foundation | 1.0 | 1.0 | Production | Green |
| ASS-005 | Exam Export (Excel) | Assessment | Foundation | 1.0 | 1.0 | Production | Green |
| ASS-006 | CA Report Cards | Assessment | Foundation | 1.0 | 1.0 | Production | Green |
| ASS-007 | AI Question Generation | Assessment | Foundation | — | — | Idea | — |
| ASS-008 | Flashcard Engine | Assessment | Foundation | — | — | Idea | — |
| ASS-009 | Spaced Repetition | Assessment | Foundation | — | — | Idea | — |
| ASS-010 | Infographic Generator | Assessment | Foundation | — | — | Idea | — |
| ASS-011 | Extended Symbol Palette (1,500+) | Assessment | Foundation | — | — | Idea | — |
| ASS-012 | CBT Export (Moodle XML, QTI, JSON) | Assessment | Foundation | — | — | Idea | — |
| ASS-013 | Learning Analytics | Assessment | Foundation | — | — | Idea | — |

### AI Infrastructure & Orchestration (F3)

| ID | Name | Domain | Layer | Spec | Impl | Lifecycle | Health |
|---|---|---|---|---|---|---|---|
| AIO-001 | Model Router | AI Infrastructure | Foundation | — | — | Specification | — |
| AIO-002 | Fallback Chain | AI Infrastructure | Foundation | — | — | Specification | — |
| AIO-003 | Prompt Library | AI Infrastructure | Foundation | — | — | Idea | — |
| AIO-004 | AI Output Validator | AI Infrastructure | Foundation | — | — | Idea | — |
| AIO-005 | Content Cache | AI Infrastructure | Foundation | — | — | Idea | — |
| AIO-006 | Context Manager | AI Infrastructure | Foundation | — | — | Idea | — |
| AIO-007 | Cost Optimiser | AI Infrastructure | Foundation | — | — | Idea | — |
| AIO-008 | Event Loop | AI Infrastructure | Foundation | — | — | Future | — |
| AIO-009 | Agent Orchestrator | AI Infrastructure | Foundation | — | — | Future | — |

---

## Application Capabilities

### Classroom Management (A1)

| ID | Name | Domain | Layer | Spec | Impl | Lifecycle | Health |
|---|---|---|---|---|---|---|---|
| CLS-001 | Digital Attendance Register | Classroom Management | Application | 1.0 | 1.0 | Production | Green |
| CLS-002 | Absenteeism Detection | Classroom Management | Application | 1.0 | 1.0 | Production | Green |
| CLS-003 | Student Health Records | Classroom Management | Application | 1.0 | 1.0 | Production | Green |
| CLS-004 | Clinic Visit Log | Classroom Management | Application | 1.0 | 1.0 | Production | Green |
| CLS-005 | Parent Notification | Classroom Management | Application | — | — | Future | — |

### Learning Studios (A2)

| ID | Name | Domain | Layer | Spec | Impl | Lifecycle | Health |
|---|---|---|---|---|---|---|---|
| STU-001 | Developer Studio | Learning Studios | Application | — | — | Future | — |
| STU-002 | Design Studio (Technical Drawing) | Learning Studios | Application | — | — | Future | — |
| STU-003 | Virtual Physics Lab | Learning Studios | Application | — | — | Future | — |
| STU-004 | Virtual Chemistry Lab | Learning Studios | Application | — | — | Future | — |
| STU-005 | Virtual Biology Lab | Learning Studios | Application | — | — | Future | — |
| STU-006 | Mathematics Workspace | Learning Studios | Application | — | — | Future | — |

### School Administration (A3)

| ID | Name | Domain | Layer | Spec | Impl | Lifecycle | Health |
|---|---|---|---|---|---|---|---|
| ADM-001 | School & Staff Management | School Administration | Application | — | — | Idea | — |
| ADM-002 | Enrolment & Class Assignment | School Administration | Application | — | — | Idea | — |
| ADM-003 | Performance Dashboard | School Administration | Application | — | — | Idea | — |

---

## Dependency Map

```
PLT-001 (Auth) ← all capabilities depend on this
PLT-002 (Data Isolation) ← all capabilities depend on this
PLT-003 (Input Validation) ← all capabilities depend on this

CUR-001 (Curriculum Hierarchy)
  ← CUR-002 (Knowledge Package)
  ← CUR-003 (Lecture Notes)
  ← ASS-007 (AI Question Generation)
  ← AIO-001 (Model Router)

AIO-001 (Model Router)
  ← CUR-003 (Lecture Notes)
  ← ASS-007 (AI Question Generation)
  ← ASS-008 (Flashcard Engine)
  ← ASS-010 (Infographic Generator)

ASS-001 (Question Bank)
  ← ASS-006 (Report Cards)
  ← ASS-012 (CBT Export)
  ← ASS-013 (Learning Analytics)
```

---

## Registry Governance

- A capability moves between lifecycle stages via a Decision Log entry in its domain's `Decision.md`.
- Health status (Green/Amber/Red) is assessed during Monitoring stage and updated here.
- Version increments: spec version increments when the contract changes; impl version increments when the implementation changes.
- A spec version ahead of impl version means implementation is pending or in progress.
- A spec version behind impl version is an architectural defect — the spec must be updated immediately.
