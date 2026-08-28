# TeachNexis Assessment Builder UI Reference (F7)

## Scope and evidence

F7 reviews the existing `Exam` workflow and adapts presentation only. The current container is `Exam`; creation is available through AI generation, manual entry, spreadsheet import, and Exam V2. The review route is `/exams/[examId]`. Reusable questions enter an editable exam through the verified F6C `Question -> QuestionVersion -> AssessmentItem` bridge. `Exam` has no persisted publish status, instructions, schedule, autosave state, or section model beyond each question's `Section` value. An exam becomes immutable to the bridge once an `ExamAttempt` exists.

### Assessment builder capability map

| Capability | Evidence | Classification | F7 decision |
|---|---|---|---|
| Create exam | `/exams/new`, `saveExam` | IMPLEMENTED | Retain and present as a staged generate-review-save flow. |
| Manual questions | `/exams/questions/new`, `saveManualQuestion` | IMPLEMENTED / LEGACY | Retain; no risky editor extraction. |
| AI generation | `/api/exams/generate`, `ExamGeneratorClient` | IMPLEMENTED | Retain explicit teacher review before save. |
| Question Bank reuse | `/question-bank`, F6C bridge | IMPLEMENTED | Use as the canonical reuse action. |
| Version pinning | `AssessmentItem.questionVersionId` | IMPLEMENTED | Surface pinned version in review. |
| Assessment marks override | `AssessmentItem.marksOverride` | IMPLEMENTED | Surface in review; mutation remains in F6C chooser. |
| Legacy question ordering | `Question.section`, `Question.number` | IMPLEMENTED | Preserve current ordering. |
| Reusable item ordering | `AssessmentItem.order` | IMPLEMENTED | Display deterministic order; no new reorder mutation. |
| Duration | `Exam.duration` | IMPLEMENTED | Surface in settings/readiness. |
| Publication lifecycle | no `Exam.status` | NOT_IMPLEMENTED | Do not show a fake Publish action or state. |
| Schedule/attempt settings | no matching persisted contract | NOT_IMPLEMENTED | Do not expose dead controls. |
| Autosave | no update/autosave contract | NOT_IMPLEMENTED | Do not claim saving states. |
| Assessment sections | no section entity/settings | PARTIAL | Display existing A/B/C question groupings only. |
| Completed immutability | attempt-based F6C guard | IMPLEMENTED | Show locked status when attempts exist. |
| Delete confirmation | direct server form on detail route | PARTIAL | Preserve behavior in F7; flag for a separately reviewed destructive-action phase. |
| QuestionBuilder decomposition | 1,300+ line client with coupled export/editor state | UNSAFE_TO_CHANGE | Defer functional extraction; F7 changes only surrounding orientation. |

## Reference decisions

| Source | Pattern | Decision | TeachNexis use | Accessibility and mobile reasoning |
|---|---|---|---|---|
| shadcn/ui Tabs, Sheet, Forms | Clear stateful navigation, constrained overlays, explicit field composition | ADAPT | Existing F1 `WorkflowStepper`, `Drawer`, `FormField`, and buttons remain the owned equivalents. | Reuse semantic labels, focus rings, `aria-expanded`, and viewport-safe overlays without importing another component system. |
| ReUI Stepper | Compact labelled stages with completed/current states | ADAPT | Creation communicates Details -> Questions -> Review -> Save using the existing F1 stepper. | Horizontally scrollable stage labels remain readable at 320px and retain `aria-current`. |
| 21st.dev component catalogue | Contextual action surfaces and progressive disclosure | INSPIRE ONLY | Keep primary actions near the assessment context and move secondary export/review controls into the content workspace. | Avoid hidden critical actions and preserve minimum control heights. |
| Refero product references | Summary-first editor layouts with task context and an adjacent readiness panel | ADAPT | Assessment review uses a main question workspace plus a compact readiness/settings rail on large screens, stacked on mobile. | DOM order remains logical on mobile; the rail is not a separate navigation trap. |
| Design System Checklist | Consistent tokens, states, focus, responsive and content rules | ADOPT AS REVIEW CRITERIA | F1 tokens/primitives are the acceptance boundary for F7. | Status uses text and icon, focus remains visible, reduced motion is preserved. |
| Transitions.dev, beUI, Rare UI, Beautiful UI | Rich animated transitions and decorative interactions | REJECT for operational builder | No new animation system or ornamental motion. | Routine teacher work stays fast and respects reduced motion. |
| Gooey, Beam, Metal, Orbs experiments | Expressive visual effects | REJECT | Effects do not improve assessment correctness or speed. | Avoid motion sensitivity, contrast, bundle, and interaction ambiguity risks. |
| Coss UI / Base UI patterns | Headless accessible primitive composition | INSPIRE ONLY | Existing owned primitives already cover the needed surface. | No dependency cost or competing interaction contract. |

Some supplied inspiration domains were unavailable from the current network (`designsystemchecklist.com`, `amua.ai`, `land-book.com`, and `siteinspire.com`). Their named areas were therefore not treated as implementation evidence.

## Adopted F7 composition

1. **Creation orientation:** Details -> Questions -> Review -> Save mirrors actual AI generation state; it is presentation, not a second workflow engine.
2. **Assessment context:** title, subject, class, type, difficulty, duration, attempt state, question count, and known marks are visible before the question paper.
3. **Progressive actions:** Add from Question Bank is the primary editable-assessment action. Manual creation and AI generation remain existing routes rather than duplicated editors.
4. **Readiness, not a score:** explicit checks cover questions, known marks, answer evidence, duration, and immutability. TeachNexis does not invent a readiness percentage.
5. **Question review:** legacy questions keep the existing printable/answer-key view; reusable items show pinned versions and assessment-specific marks.

## Rejected or deferred patterns

- No giant multi-step wizard: existing persistence is not stage-based.
- No fake Publish/Scheduled/Draft state: `Exam` has no lifecycle field.
- No autosave indicator: there is no update/autosave mutation.
- No drag-and-drop: no dependency is justified and no reviewed reorder mutation exists.
- No desktop-only fixed builder sidebar: the summary rail stacks below the main context on narrow viewports.
- No new modal, animation, icon, or form library.
- No QuestionBuilderClient decomposition in F7: its state, export, preview, and persistence paths need a dedicated behavior-preserving phase.

## Future safe boundary

A later assessment-lifecycle phase may add reviewed persistence for draft/publish/schedule/settings and then enable editable Details, Settings, readiness validation, and Publish. That phase would require schema, authorization, migration, historical-integrity, and student-delivery review and is explicitly outside F7.

## F8A lifecycle clarification

F8A recommends a phased hybrid: keep `Exam` as the editable aggregate, persist only a small authoring lifecycle (`DRAFT`, `PUBLISHED`, `ARCHIVED`), derive scheduled/active/closed delivery phases from server-authoritative time, and create immutable publication revisions for student delivery. The builder must therefore distinguish draft state from publication state and must never infer availability merely from an Exam record existing.

Future lifecycle UI should adapt these patterns without adding a competing component system:

- grouped settings with explicit labels/help/errors;
- a validation summary separating blockers, warnings, and information;
- a consequential Publish confirmation describing student visibility and immutability;
- explicit Save Draft/dirty/conflict states before autosave is considered;
- separate authoring status and derived delivery phase;
- timezone-aware schedule presentation with server time as authority;
- Archive/Delete actions separated from routine editing.

See `ASSESSMENT_LIFECYCLE_CONTRACT.md` and `F8_ASSESSMENT_LIFECYCLE_MIGRATION_PLAN.md`. No F8A UI or persistence change was implemented.

### F8A reference decisions

| Source | Pattern | Decision | Lifecycle/settings use |
|---|---|---|---|
| shadcn/ui Forms and Alert Dialog | Explicit field composition and consequential confirmation with title, description, cancel, and action | ADAPT | Use owned `FormField`/Dialog primitives for grouped settings and Publish confirmation; do not install shadcn. |
| Coss UI Field, Fieldset, Date Picker, Alert Dialog | Semantic grouping, accessible validation, date selection, and response-required dialogs | ADAPT | Preserve native labels/fieldsets and viewport-safe scheduling/publish interactions using existing primitives. |
| UI Skills playbook | Consistent interface evidence and practical 44px touch targets | ADOPT AS REVIEW CRITERIA | Apply to mobile settings and consequential actions; it is not a dependency. |
| 21st.dev registry | Broad catalogue of contextual actions and component compositions | INSPIRE ONLY | Evaluate interaction ideas against TeachNexis tokens and education workflow; do not copy community styling or prompts wholesale. |
| Refero | Summary-first product workflow references | ADAPT | Keep readiness/status context adjacent on desktop and in logical document order on mobile. |

ReUI, Beautiful UI, beUI, Rare UI, Transitions.dev, Better Design, and Design System Checklist remain part of the approved reference pool, but inaccessible pages or decorative examples were not treated as new F8A implementation evidence.
