# TeachNexis — Capability Lifecycle

Every capability in TeachNexis passes through a defined lifecycle. No capability skips stages. The lifecycle is the enforcement mechanism for "Architecture governs implementation."

---

## Lifecycle Stages

```
Idea
  ↓
Specification
  ↓
Architecture Review
  ↓
Approved
  ↓
Implementation
  ↓
Testing
  ↓
Integration
  ↓
Production
  ↓
Monitoring
  ↓
Optimisation
```

Capabilities may also be marked **Deprecated** or **Retired** from any post-Production stage.

---

## Stage Definitions

### 1. Idea
**What it means:** The capability has been identified as something TeachNexis should build.

**Entry criteria:** Any stakeholder may propose an idea.

**Required artefacts:** A brief entry in `08-Roadmap.md` with a name, owning domain, and one-sentence purpose.

**Exit criteria:** Decision to begin specification is recorded in the domain's `Decision.md`.

**Registry status:** Lifecycle = `Idea`, Spec = `—`, Impl = `—`

---

### 2. Specification
**What it means:** The capability's full specification is being written.

**Entry criteria:** Idea is approved for specification. Domain owner assigned.

**Required artefacts (all 10 files in the capability folder):**
- `Capability.md` — Overview, purpose, version, status
- `Architecture.md` — Responsibilities, system interactions, rationale
- `Workflow.md` — Execution flows, decision points, failure paths
- `Contract.md` — Inputs, outputs, events, quality guarantees, failure behaviour
- `Data.md` — Schema, relationships, indexes, migration notes
- `UI.md` — Wireframes, layouts, empty states, responsive behaviour
- `Testing.md` — Test cases, acceptance criteria, edge cases
- `Decision.md` — All decisions made during specification
- `Prompt.md` — AI prompt only (required only for AI-powered capabilities)
- `Lifecycle.md` — Current stage, history, next milestone

**Exit criteria:** All required files completed. Contract is fully defined with no open questions.

**Registry status:** Lifecycle = `Specification`, Spec = in progress

---

### 3. Architecture Review
**What it means:** The specification is reviewed against the AOS before implementation is authorised.

**Entry criteria:** All specification artefacts are complete.

**Review checklist:**
- [ ] Contract is complete (all fields populated)
- [ ] No circular dependencies
- [ ] Events produced and consumed are declared
- [ ] Failure behaviour is defined
- [ ] Data schema is consistent with `07-Database.md`
- [ ] UI design is consistent with `09-UIUX.md`
- [ ] Prompt (if any) follows `06-AI-Models.md` standards
- [ ] Security requirements follow `10-Security.md`
- [ ] Testing criteria follow `11-Testing.md`
- [ ] Registry entry is updated

**Exit criteria:** Architecture Review is passed. Review outcome recorded in capability's `Decision.md`.

**Registry status:** Lifecycle = `Architecture Review`

---

### 4. Approved
**What it means:** The capability is cleared for implementation.

**Entry criteria:** Architecture Review passed. No blocking issues remain.

**Required artefacts:** Architecture Review decision recorded. Implementation assigned.

**Exit criteria:** Implementation begins.

**Registry status:** Lifecycle = `Approved`, Spec = `x.0`

---

### 5. Implementation
**What it means:** The capability is being built.

**Entry criteria:** Approved status. Specification is stable (no changes during implementation without a Decision Log entry).

**Rules during implementation:**
- Specification changes require a Decision Log entry before the code changes.
- Scope expansion is prohibited. New requirements go back to Idea stage.
- Contract must not change without incrementing spec version and notifying all consumers.

**Exit criteria:** Implementation complete. All contract obligations satisfied. Ready for testing.

**Registry status:** Lifecycle = `Implementation`, Impl = in progress

---

### 6. Testing
**What it means:** The capability is being validated against its specification.

**Entry criteria:** Implementation complete.

**Required coverage:**
- All inputs validated against contract schema
- All outputs verified against contract guarantees
- All failure behaviours exercised
- Edge cases from `Testing.md` executed
- Security: IDOR, input injection, ownership boundary tested
- Performance: within acceptable thresholds for expected load

**Exit criteria:** All `Testing.md` acceptance criteria pass. No open Critical or High issues.

**Registry status:** Lifecycle = `Testing`

---

### 7. Integration
**What it means:** The capability is connected to its dependents and consumers.

**Entry criteria:** Testing complete.

**Required:**
- Events declared in contract are emitted and received correctly
- Dependent capabilities verified against the updated event surface
- Cache behaviour verified (hits and misses)
- Fallback behaviour verified (what happens if this capability fails)

**Exit criteria:** Integration tests pass. Dependent capabilities unaffected.

**Registry status:** Lifecycle = `Integration`

---

### 8. Production
**What it means:** The capability is live and serving real users.

**Entry criteria:** Integration complete. Deployment verified (READY status on Vercel).

**Required artefacts:** Deployment decision logged in domain `Decision.md`. Registry health set to Green.

**Registry status:** Lifecycle = `Production`, Impl = `x.0`, Health = Green

---

### 9. Monitoring
**What it means:** The capability is in active use and being observed.

**Health indicators:**
- **Green** — Operating within all contract guarantees. No errors.
- **Amber** — Minor issues detected. Contract guarantees met but performance or reliability concerns observed. Investigation underway.
- **Red** — Contract guarantee violated or capability unavailable. Immediate action required.

**Triggers for returning to Implementation:**
- Bug affecting contract guarantee → Red → back to Implementation
- Performance degradation → Amber → back to Implementation
- Contract change required → back to Architecture Review

**Registry status:** Lifecycle = `Monitoring`, Health updated per observation

---

### 10. Optimisation
**What it means:** The capability is stable and being improved without changing its contract.

**Permitted optimisation work:**
- Performance improvements
- Cache tuning
- Prompt improvements (minor version increment on Prompt.md)
- UI polish
- Test coverage improvements

**Not permitted without Architecture Review:**
- Contract changes
- New events added or removed
- New dependencies added
- Schema changes affecting other capabilities

**Registry status:** Lifecycle = `Optimisation`

---

## Deprecation & Retirement

A capability may be **Deprecated** when it is superseded by a newer capability or no longer needed.

**Deprecation process:**
1. Record deprecation decision in domain `Decision.md` and global `02-Decisions.md`
2. Update Registry: Lifecycle = `Deprecated`
3. Notify all consumers (by ID from Registry dependency map)
4. Provide migration path before removal
5. Set sunset date

**Retirement:** After all consumers have migrated, the capability is removed from active code. Its specification files are archived, not deleted. Registry entry updated to Lifecycle = `Retired`.

---

## Lifecycle Governance Rules

1. No capability moves from Approved to Implementation without a complete specification.
2. No capability moves from Implementation to Testing without satisfying all contract obligations.
3. No contract change happens without a spec version increment and a Decision Log entry.
4. A Red health status triggers immediate investigation — it is never left unresolved.
5. Specification files must match implementation at all times. Drift is an architectural defect.
6. The lifecycle stage in the Registry is the single source of truth — not comments in code, not verbal agreements.
