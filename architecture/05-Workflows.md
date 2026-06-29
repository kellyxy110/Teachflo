# TeachNexis — Workflows

## Architecture Review Sequence

Every major capability follows this sequence before implementation begins. Decisions are logged continuously throughout, not as a discrete phase.

```
1. Vision
   Define the educational purpose. What problem does this solve for teachers or students?

2. Architecture
   Define the capability contract, dependencies, and system interactions.

3. Workflow
   Document the exact execution flow, including validation, AI calls, storage, and failure paths.

4. UI/UX
   Design the teacher-facing interface before writing component code.

5. Implementation
   Build the capability as specified. No scope expansion during implementation.

6. Validation
   Verify the implementation satisfies the contract. Test edge cases and failure behaviour.

7. Integration
   Connect the capability to dependent systems. Verify event contracts and orchestration readiness.
```

Decisions are appended to the relevant `Decisions.md` at any point in this sequence when a significant choice is made.

---

## Standard Module Execution Workflow

When a module runs (whether triggered by a teacher action or by the orchestrator):

```
1. Validate Inputs
   — Type-check all inputs against the contract schema
   — Validate enums, date formats, string lengths
   — Reject with a descriptive error if validation fails

2. Authenticate & Authorise
   — Confirm authenticated session via requireSchool()
   — Verify resource ownership against schoolId
   — Reject with 403 if ownership check fails

3. Retrieve Context
   — Load curriculum data, student data, or prior content as required
   — Check cache before hitting database or AI

4. Execute Core Logic
   — Database queries, AI calls, or computation
   — AI calls route through the AI Infrastructure domain

5. Validate Output
   — Confirm output satisfies contract quality guarantees
   — For AI content: check for truncation, format compliance, factual plausibility

6. Store
   — Persist results with appropriate schoolId scoping
   — Update related records (counts, timestamps, summaries)

7. Emit Events
   — Produce any events declared in the capability contract
   — Events consumed by other modules are dispatched here

8. Notify & Respond
   — Revalidate affected Next.js paths
   — Return structured response to the caller
   — Surface appropriate UI feedback to the teacher
```

---

## AI Content Generation Workflow

Specific to modules that generate educational content via AI:

```
1. Validate Request
   — Confirm subject, class level, term, topic are all present and valid
   — Confirm the requesting teacher belongs to the school

2. Retrieve Curriculum Context
   — Load topic metadata from Curriculum Intelligence domain
   — Load learning objectives, Bloom's mapping, WAEC/NECO alignment
   — Load any existing content for this topic (avoid duplication)

3. Select AI Model
   — Route to appropriate model based on content type (see 06-AI-Models.md)
   — Confirm model is available; activate fallback if not

4. Plan Content
   — Determine content sections to generate
   — For long-form content: divide into sections to prevent truncation

5. Generate
   — Execute prompt with full curriculum context injected
   — Generate section by section if content exceeds model capacity
   — Merge sections into unified output

6. Quality Review
   — Check for truncation (content cuts off mid-sentence)
   — Check for hallucination markers (unrecognised curriculum content)
   — Check format compliance (headings, structure, length)
   — Flag for human review if quality score is below threshold

7. Package
   — Assemble full Knowledge Package from generated sections
   — Associate metadata: subject, class, term, week, topic, generated date, model used

8. Store
   — Persist to database with schoolId and teacherId
   — Cache for reuse by other teachers in the same school

9. Notify Teacher
   — Surface preview in UI
   — Provide edit, approve, or regenerate options
```

---

## Attendance Recording Workflow

```
Teacher selects class and date
→ System loads existing attendance records for that date
→ Teacher marks each student (Present / Late / Absent / Excused)
→ Quick actions available: Mark All Present, Mark All Absent
→ Teacher reviews summary bar (counts per status)
→ Teacher saves
→ System validates: date format, class ownership, student IDs against schoolId, status values
→ System upserts attendance records (creates or updates)
→ System revalidates /attendance path
→ Chronic absenteeism detection runs on save (flagging students absent > 20% of recorded days)
```

---

## Health Record Workflow

```
Teacher navigates to student health profile
→ System loads existing health record or presents empty form
→ Teacher edits: blood group, genotype, allergies, conditions, medications, emergency contacts
→ Teacher saves
→ System validates ownership (student belongs to teacher's school)
→ System upserts health record
→ Clinic Visit tab: teacher logs visit (date, reason, treatment, notes)
→ System prepends visit to clinicVisits array (capped at 200 entries)
→ System revalidates /health paths
```

---

## Exam & Assessment Workflow

```
Teacher creates exam (subject, class, type, topic)
→ Option A: Manual question entry via Question Builder
   → KaTeX editor with LaTeX toolbar (18 symbol shortcuts)
   → Preview renders mixed LaTeX/text in real time
   → Teacher saves question (validated: exam ownership, schoolId)
→ Option B: Excel bulk import
   → Teacher downloads template
   → Teacher fills questions in Excel with symbol support
   → Teacher uploads file
   → System parses, previews 10 questions
   → Teacher confirms import (capped at 200 questions)
→ Exam exported to Excel, CSV, JSON, Moodle XML, QTI (planned)
→ CA Report Cards generated from Score records
   → Class, term, session selected
   → Students ranked by total score with ordinal position
   → Per-student export to Excel
```

---

## Architecture & Capability Audit Workflow

Used when assessing existing features for AOS compliance:

```
1. Identify capability (existing feature to assess)
2. Determine which Domain it belongs to
3. Score across 10 dimensions (1–5 scale):
   — Business Value
   — Code Quality
   — UI/UX Quality
   — Performance
   — Security
   — Test Coverage
   — Contract Compliance
   — AI Readiness
   — Orchestration Readiness
   — Scalability
4. Answer the 7 compliance questions:
   — Does it satisfy its intended responsibility?
   — Does it expose a clear contract?
   — Can another capability depend on it safely?
   — Is it reusable?
   — Is it independently testable?
   — Is it AI-ready?
   — Is it orchestration-ready?
5. Assign classification:
   — Keep as-is (scores 4–5 across all dimensions)
   — Upgrade (strong core, specific dimensions need improvement)
   — Refactor (architecture sound, code quality needs improvement)
   — Merge (overlaps with another capability)
   — Replace (fundamental design issues)
   — Deprecate (no longer needed)
6. Log classification and rationale in domain Decisions.md
7. Add improvement tasks to 08-Roadmap.md
```
