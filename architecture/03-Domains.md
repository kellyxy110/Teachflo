# TeachNexis — Capability Domains

## Domain Architecture Overview

TeachNexis is organised into three layers of Capability Domains. Each layer has a defined dependency relationship: Application Domains depend on Foundation Domains; Infrastructure Domains support all layers.

```
┌─────────────────────────────────────────────────────┐
│                  APPLICATION LAYER                   │
│  Classroom Management │ Learning Studios │ School Admin │
└─────────────────────────────────────────────────────┘
              ↓ depends on ↓
┌─────────────────────────────────────────────────────┐
│                  FOUNDATION LAYER                    │
│  Curriculum Intelligence │ Assessment │ AI Infrastructure │
└─────────────────────────────────────────────────────┘
              ↓ supported by ↓
┌─────────────────────────────────────────────────────┐
│                 INFRASTRUCTURE LAYER                 │
│  Security │ API │ Database │ Deployment │ Monitoring  │
└─────────────────────────────────────────────────────┘
```

---

## Foundation Domains

### F1 — Curriculum & Content Intelligence

**Purpose:** Define the complete educational knowledge graph that all other domains consume. This is the heart of TeachNexis.

**Responsibilities:**
- Maintain the curriculum hierarchy: Subject → Class → Term → Week → Topic
- Define learning objectives, Bloom's Taxonomy mappings, and WAEC/NECO/JAMB alignments
- Generate and store Topic Knowledge Packages (lecture notes, summaries, flashcards, infographics, quizzes, assignments, worksheets)
- Maintain schemes of work for each term
- Provide curriculum data as stable contracts to all consuming domains

**Status:** Specified, implementation pending
**Location:** `architecture/domains/curriculum-intelligence/`

---

### F2 — Assessment & Learning Intelligence

**Purpose:** Define how learning is measured, evidence is gathered, and progress is tracked across all formats.

**Responsibilities:**
- Question bank architecture (MCQ, Short Answer, Essay, Structured, Practical, Oral, Diagram Labelling, HOTS)
- CBT examination engine
- Marking schemes and rubrics
- Bloom's Taxonomy assessment mapping
- Learning analytics and progress tracking
- Flashcard engine with spaced repetition
- Infographic generation from lesson content
- Assignment and revision resource generation
- Report card generation with ordinal ranking

**Status:** Partially implemented (CBT question bank, Excel import/export, report cards), contract pending
**Location:** `architecture/domains/assessment-learning/`

---

### F3 — AI Infrastructure & Orchestration

**Purpose:** Provide the intelligent routing, orchestration, memory, and quality assurance layer that all AI-powered capabilities depend on.

**Responsibilities:**
- Model routing by capability type
- Fallback chains and error recovery
- Prompt library management and versioning
- Context management and memory
- Content validation and quality assurance
- Caching strategy for AI outputs
- Cost optimisation across model calls
- Event loop management
- Agent orchestration (future)

**Status:** Not yet specified or implemented
**Location:** `architecture/domains/ai-infrastructure/`

---

## Application Domains

### A1 — Classroom Management

**Purpose:** Support the daily operational work of teachers — attendance, health records, scheduling, and communication.

**Responsibilities:**
- Digital Attendance Register with chronic absenteeism detection
- Student Digital Health Records with clinic visit log
- Class and student management
- Teacher notifications and alerts
- Parent communication (future)

**Status:** Attendance and Health Records implemented, contract pending
**Location:** `architecture/domains/classroom-management/`

---

### A2 — Learning Studios

**Purpose:** Provide subject-specific professional environments for practical and creative learning.

**Studios Planned:**
- Developer Studio (Monaco IDE, terminal, live preview, AI coding mentor)
- Design Studio (Technical Drawing, infinite canvas, CAD-adjacent tools)
- Virtual Physics Lab
- Virtual Chemistry Lab
- Virtual Biology Lab
- Mathematics Workspace
- GIS & Mapping Studio
- Digital Art Studio
- Music Composition Studio
- Economics Data Studio
- Accounting Workspace
- Agricultural Science Simulation Studio

**Status:** Not yet specified or implemented
**Location:** `architecture/domains/learning-studios/`

---

### A3 — School Administration

**Purpose:** Support school leaders with data, reporting, compliance, and operational management.

**Responsibilities:**
- School and staff management
- Enrolment and class assignment
- Term and session configuration
- Results and performance dashboards
- Compliance and audit reporting

**Status:** Basic school/class structure exists; administration domain not yet specified
**Location:** `architecture/domains/school-administration/`

---

## Infrastructure Domains

### I1 — Security

**Purpose:** Enforce authentication, authorisation, data isolation, and privacy across the entire platform.

**Key Standards:**
- Clerk v6 authentication via `clerkMiddleware()` in `proxy.ts`
- Multi-tenant data isolation: every data query scoped by `schoolId`
- IDOR prevention: resource IDs validated against authenticated `schoolId`
- XSS prevention: HTML escaped in all user-controlled content
- Input validation at all server action boundaries
- Student and teacher data privacy

**Status:** Implemented and audited; contract pending
**Location:** `architecture/domains/security/`

---

### I2 — API

**Purpose:** Define and govern all internal and external API surfaces.

**Status:** Not yet formally specified
**Location:** `architecture/domains/api/`

---

### I3 — Database

**Purpose:** Define the canonical data schema, relationships, indexing, and migration strategy.

**Current Stack:** Prisma 5.22 + Supabase PostgreSQL via Supavisor pooler (port 6543, `?pgbouncer=true`)
**Constraint:** Direct connection port 5432 is IPv6-only; Vercel serverless cannot reach it. All connections use port 6543.
**Migration Strategy:** `prisma db push` fails on IPv6. Schema migrations are run manually in Supabase SQL Editor.

**Status:** Schema exists; formal domain specification pending
**Location:** `architecture/domains/database/`

---

### I4 — Deployment & Platform

**Purpose:** Define hosting, CI/CD, environments, monitoring, and scaling strategy.

**Current Stack:** Vercel (production), Next.js 16.2.7 + Turbopack, pnpm workspaces + Turbo monorepo
**Production URL:** `https://teachflow-oos.vercel.app` (to be updated post-rebrand)

**Status:** Deployed and operational; formal specification pending
**Location:** `architecture/domains/deployment/`

---

## Domain Specification Template

Every domain folder contains:

```
domains/[domain-name]/
    Architecture.md   — Purpose, responsibilities, system interactions
    Contract.md       — Formal capability contract (see 09-Contracts.md)
    Workflow.md       — Execution flows and decision points
    Decisions.md      — Domain-level decision log
    Modules/          — Individual module specifications
        [module-name]/
            Architecture.md
            Contract.md
            Workflow.md
            Prompt.md       — AI prompt only (no explanations)
            Database.md
            API.md
            UI.md
            Testing.md
```
