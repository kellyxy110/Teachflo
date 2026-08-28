# TeachNexis Teacher Experience Blueprint

## Status and scope

- Phase: TX-1 — audit and implementation blueprint only
- Baseline: `d24785c291c14296a50c8b34812a4845644a6e03`
- Database or schema changes: none
- Application behavior changes: none
- Primary objective: make the authenticated Teacher experience feel like a focused teaching operating system while preserving the existing F6, F8, F9, STEM, import, authorization, and tenant contracts.

## 1. Evidence reviewed

The audit covered the authenticated Teacher shell and the principal routes for:

- dashboard and onboarding nudges;
- desktop sidebar, header, mobile drawer, and mobile bottom navigation;
- Student Data Hub, Classes, Students, Attendance, Scores, Reports, and Health Records;
- Lessons, Homework, Library, and Curriculum;
- Question Bank, Question Import, Exams, Assessment Builder, Grading, and assessment analytics;
- Study Buddy, Knowledge Studio, Intelligence, Code Lab, Math Workspace, Physics Lab, and Chemistry Lab;
- Settings, legacy import routes, shared UI primitives, theme tokens, authorization helpers, and route-level tenant queries.

Reference research used the requested sources as pattern libraries rather than templates to copy. In particular, [Refero](https://refero.design/) supports studying real screens and complete flows, while [shadcn/ui](https://ui.shadcn.com/) provides composable sidebar and data-display patterns. Accessibility decisions should be checked across component states and composed templates, not only default colours, as emphasized by the [Design System Checklist](https://www.designsystemchecklist.com/) and related accessibility checklists.

## 2. Teacher jobs to be done

### Daily operational jobs

1. See what requires action today.
2. Open the next relevant class or piece of work quickly.
3. Record attendance with minimal navigation and safe save feedback.
4. Continue an unfinished lesson, assessment, import, grading session, or score-entry task.
5. Review submitted work and release results according to policy.

### Planning and content jobs

1. Plan or edit a lesson for a class and curriculum context.
2. Set homework and monitor due work.
3. Find or upload reusable teaching material.
4. Create, import, review, and reuse questions.
5. Build, publish, and manage an assessment without losing lifecycle context.

### Student and record jobs

1. Create/import classes and students.
2. Find a student or class quickly.
3. Enter and verify scores.
4. Review attendance and performance trends.
5. Produce reports without confusing operational records with analytics.

### School and support jobs

1. Import or synchronize school data.
2. Maintain personal and school profile information within role permissions.
3. Use AI or STEM tools when they support a teaching task, not as the default destination.

## 3. Current information architecture

The current desktop navigation exposes the following structure:

- Today
  - Dashboard
- Students & records
  - Student Data Hub
  - Classes
  - Students
  - Attendance
  - Health Records
  - Scores
  - Report Cards
- Teaching
  - Lessons
  - Homework
  - Question Bank
  - Exams
  - Library
- AI & learning tools
  - Analytics
  - Study Buddy
  - Knowledge Studio
  - Intelligence
  - Code Lab
  - Math Workspace
  - Physics Lab
  - Chemistry Lab
- Administration
  - Smart Import
  - Beta Hub
- Persistent footer
  - Settings

The mobile bottom navigation independently prioritizes Home, Classes, AI, Analytics, and Profile. It does not reflect the desktop hierarchy or the most frequent operational tasks such as Students, Attendance, Assessments, or Grading.

## 4. Current-state findings

### What already works well

- The server-side Teacher shell proves authentication before rendering authenticated routes.
- Most operational queries are scoped by `schoolId`; sensitive services add Teacher ownership where required.
- `PageHeader`, `Button`, `StatusBadge`, `StatusMessage`, `EmptyState`, `LoadingState`, `ResponsiveTable`, and `WorkflowStepper` provide a useful starting component layer.
- Semantic colour tokens, light/dark tokens, focus-visible styling, reduced-motion behavior, safe-area support, and control-size tokens already exist.
- Attendance has a useful mobile sticky-save pattern.
- Question Bank selection, QI-4 single-flow review, assessment lifecycle controls, grading queues, and STEM rendering already embody task-specific workflows worth preserving.
- Assessment lifecycle and QuestionVersion immutability are represented clearly in the underlying services even where presentation is inconsistent.

### Navigation and wayfinding problems

1. More than twenty destinations compete at similar visual weight.
2. Student Data Hub duplicates Classes, Students, Scores, Analytics, Reports, and Import destinations already exposed elsewhere.
3. Three different import concepts are easy to confuse:
   - `/student-hub/import` for student/score data;
   - `/question-bank/import` for reviewed reusable questions;
   - `/exams/import` for legacy direct-to-exam import;
   - `/import` adds another legacy “Smart Import” label.
4. Assessment creation has several peer actions: Manual Builder, AI Generate, AI Exam 2.0, New Exam, Question Bank creation, and legacy import. The intended default path is unclear.
5. Analytics exists at school level, Student Hub level, and assessment level without a visible scope model.
6. AI and lab destinations receive more persistent navigation space than core grading and assessment work.
7. Grading is not in the sidebar even though it is a core Teacher job.
8. Curriculum exists as an authenticated route but is absent from Teacher navigation.
9. Beta Hub is exposed as a normal administrative destination.
10. The header title map omits several active routes, including Question Bank, Grading, Curriculum, Student Hub, and some tools, causing the fallback “TeachNexis” title and loss of context.
11. The notification bell is a visible, focusable dead end with no implemented destination or action.
12. Collapsed sidebar group summaries become effectively blank controls; hover-only tooltips are not an equivalent keyboard/focus experience.

### Dashboard problems

1. Setup and profile-completion nudges can dominate the top of the workspace long after the Teacher's immediate task has changed.
2. The main primary action is always “New Exam,” regardless of context.
3. Four equal quick-action cards elevate Study Buddy and Code Lab alongside lesson and assessment work.
4. Classes, Students, Lessons, and Homework are presented as equal stat cards rather than as context or actionable work.
5. “School Average” is a prompt to enter scores, not a computed dashboard value.
6. “At-Risk Students” can render a reassuring statement without evidence from the dashboard query. This should not appear as intelligence unless validated data is present.
7. Recent Lessons and Recent Exams are school-wide rather than explicitly Teacher-owned. That can be valid for a school-first workspace, but the scope is not communicated.
8. There is no date, academic session/term context, teaching-day sequence, attention queue, grading queue, import-review state, upcoming due work, or continue-working model.
9. The dashboard contains no reliable timetable source. It therefore cannot truthfully claim a “next class” today.
10. The repository does not implement mastery. “Class mastery” must not be shown as a dashboard metric.

### Surface consistency problems

1. Some routes use `PageHeader`; others hand-build headings with different sizes, weights, icons, and offsets.
2. Content widths range from `max-w-3xl` to unrestricted full width, while full-screen tools use hard-coded negative margins tied to desktop padding.
3. Many screens wrap every group, metric, filter, item, and nested preview in another rounded bordered card.
4. Hard-coded blue, green, purple, amber, and red utility classes compete with semantic design tokens and produce a rainbow-icon effect.
5. Radius tokens exist but are bypassed by repeated `rounded-xl` styling.
6. `tnx-panel` exists but is not the canonical surface primitive.
7. Status badges are used for metadata as well as state, creating excessive pills.
8. Loading primitives exist, but the authenticated route group has no route-level loading surfaces and only one shared error boundary.
9. List, row, table, and section-header patterns are independently recreated across features.
10. Internal links sometimes use plain anchors, losing consistent client navigation behavior.

### Mobile problems

1. Mobile bottom navigation prioritizes AI and Analytics while omitting Students, Attendance, Assessments, and Grading.
2. The mobile top bar shows the brand instead of the current page title, weakening orientation.
3. The sidebar drawer has a visual backdrop but no dialog semantics, focus trap, or Escape behavior.
4. The bottom nav and sticky action bars can compete for the same lower viewport area.
5. Several tables only become horizontally scrollable with `min-width` values of 42–48rem instead of transforming into task-focused rows.
6. Study Buddy and Knowledge Studio use desktop-specific `-m-6` layout assumptions that do not match the shell's mobile padding.
7. Some dense workflows use horizontal tab scrolling without an accompanying compact selector or overflow cue.
8. Small 10px navigation/status text and 36px filter controls are below the desired mobile reading/touch standard.
9. Large create forms remain permanently above or beside the primary list instead of moving into a focused mobile sheet/page.
10. Nested cards create long scroll journeys and make the current action hard to locate.

### Accessibility problems and strengths

Strengths:

- global focus-visible outline;
- reduced-motion override;
- semantic status components;
- accessible names on many icon buttons;
- safe-area handling;
- keyboard-focusable responsive table regions.

Problems:

- non-functional notification control;
- incomplete mobile drawer semantics and focus management;
- collapsed-sidebar information dependent on hover/title behavior;
- chart bars whose meaning is primarily visual and colour-based;
- inconsistent tab semantics and keyboard behavior;
- small status/navigation text and undersized controls in some feature surfaces;
- table-only mobile presentation for student, score, and analytic records;
- inconsistent announcements for async saves outside newer workflows;
- no systematic loading/failure state at route boundaries.

## 5. Recommended information architecture

Use a small persistent core and progressively disclose secondary tools. Labels describe Teacher jobs, not implementation modules.

### Desktop sidebar

**TODAY**

- Today — `/dashboard`

**TEACHING**

- Classes — `/classes`
- Lessons — `/lessons`
- Homework — `/homework`

**STUDENTS & RECORDS**

- Students — `/students`
- Attendance — `/attendance`
- Scores — `/scores`
- Reports — `/report-cards` or a clearly scoped reports landing
- Import & sync — `/student-hub` (renamed in navigation; existing route retained)

**ASSESSMENT**

- Question Bank — `/question-bank`
- Assessments — `/exams`
- Grading — `/grading`
- Assessment insights — enter through an assessment or an Insights sub-navigation, not a competing root workflow

**CONTENT**

- Library — `/library`
- Curriculum — `/curriculum`

**TOOLS** (collapsed by default and optionally searchable)

- Study Buddy
- Knowledge Studio
- Intelligence
- STEM Labs: Math, Physics, Chemistry
- Code Lab
- Insights — `/analytics`, labelled with its actual school/score scope

**ADMINISTRATION** (permission-aware)

- School settings and school-only operations when the server-authoritative role permits them
- Legacy tools only while still operationally required; label them “Legacy” and keep them out of the default Teacher path
- Beta Hub must not appear as a standard production navigation item

**ACCOUNT**

- Settings
- Help/support when implemented

### Navigation rules

1. Preserve all current routes during migration; TX-2 changes labels/grouping and adds aliases only where safe.
2. Do not infer administrative authority on the client. The server must provide a normalized capability/navigation model.
3. Do not hide an authorized route merely because it leaves the sidebar; provide it through contextual links or Tools/More.
4. Use “Assessment” consistently in navigation and Teacher-facing copy; keep route names such as `/exams` until a separate compatibility migration is justified.
5. Keep Question Bank import separate from legacy direct-to-exam import.
6. Resolve the two role vocabularies (`school_admin` metadata versus `ADMIN`/`SUPER_ADMIN` database roles) before relying on permission-filtered navigation. TX-1 does not redesign authentication.

## 6. Recommended dashboard product model

The dashboard should answer three questions in order:

1. What must I do now?
2. What was I already working on?
3. What is coming next?

### Evidence-safe dashboard data

Can be implemented from current models/services:

- submitted or partially graded attempts requiring review;
- held graded results requiring release;
- staged imports and candidate review counts;
- active homework with `dueDate`;
- assessments with `opensAt`/`closesAt` and lifecycle state;
- recent lessons (`updatedAt`), assessments (`updatedAt`), import jobs (`updatedAt`), and grading attempts;
- class/student counts;
- recorded attendance trends;
- assessment participation/progress from attempts/publications;
- score-based performance only when score data exists.

Cannot be truthfully presented yet:

- next lesson/class, because no timetable/schedule source exists;
- class mastery, because mastery is not implemented;
- generalized student-risk predictions without a validated rule and evidence;
- upcoming lesson dates, because Lesson has no scheduled date.

### Desktop wireframe

```text
┌──────────────────────────────────────────────────────────────────────┐
│ Good morning, Ada                 Fri 28 Aug · First Term · 2026/27 │
│ Community Secondary School                         [Quick create ▾] │
├──────────────────────────────────────────────────────────────────────┤
│ ATTENTION NEEDED (only when actionable)                              │
│ 12 responses need marking · 1 import needs review · 2 results held │
├───────────────────────────────────────────┬──────────────────────────┤
│ TODAY                                     │ CONTINUE WORKING         │
│ Ordered action/activity rows              │ Recent lesson            │
│ Attendance entry points only when valid   │ Draft assessment         │
│ Assessments opening/closing today         │ Question import          │
│ Homework due today                        │ Grading session          │
├───────────────────────────────────────────┼──────────────────────────┤
│ UPCOMING                                  │ QUICK CREATE             │
│ Compact 7–14 day agenda                   │ Lesson · Homework        │
│ Homework, tests, exams, deadlines         │ Assessment · Question    │
│                                           │ Import questions         │
├───────────────────────────────────────────┴──────────────────────────┤
│ TEACHING PULSE — compact evidence-backed metric strip               │
│ Classes · attendance trend · assessment progress · work pending     │
└──────────────────────────────────────────────────────────────────────┘
```

### Dashboard behavior

- Attention Needed is absent when there is no actionable work; it never renders reassuring synthetic statements.
- Each attention item contains the object, reason, scope, age/due time, and one primary action.
- Continue Working is based on persisted recent records, not browser-only recency.
- Upcoming is an agenda/list first. A calendar view is optional after the agenda is usable.
- Quick Create uses one compact menu or action row; it is not another card grid.
- Teaching Pulse is secondary and compact. Every metric links to its evidence source.
- Setup/profile completeness moves to a dismissible setup checklist or Settings, not the permanent top of Today.
- School-wide versus Teacher-owned data is labelled explicitly.

## 7. Mobile model

### Persistent mobile navigation

- Today
- Classes
- Students
- Assessments
- More

“More” opens an accessible navigation sheet containing Attendance, Scores, Grading, Lessons, Homework, Content, Tools, and Settings. A contextual create control appears in the top bar or Today surface; it does not replace a core navigation destination.

### Mobile Today order

1. date/school context;
2. actionable Attention Needed;
3. valid next/today item (only from real schedule/due evidence);
4. Continue Working;
5. Quick Create;
6. compact Upcoming;
7. Teaching Pulse/recent activity.

### Mobile interaction rules

- Page title replaces brand-only text in the authenticated top bar; the compact TeachNexis mark remains available in More/navigation.
- Only one sticky action region is active at a time and it accounts for the bottom navigation safe area.
- Tables transform into labelled record rows/cards containing the fields required for the task. Horizontal scrolling is reserved for genuinely two-dimensional score grids.
- Filters open inline or in one accessible sheet; avoid nested modal workflows.
- Create/edit forms use dedicated full-screen routes or sheets on mobile rather than permanent side panels.
- Minimum interactive target: 44px, with visible focus and non-colour selected/error states.
- Full-screen tools receive a shell-supported “workspace mode” instead of hard-coded negative margins.
- QI-4 keeps its single-candidate review model and Previous/Next navigation.

## 8. Canonical component system

### Reuse and strengthen

| Existing component | Recommendation |
|---|---|
| `PageHeader` / `Breadcrumb` | Keep; add compact/mobile variants and consistent action overflow. |
| `Button`, `ButtonLink`, `IconButton` | Keep as the only default control styles. |
| `StatusBadge`, `StatusMessage` | Keep for state only; do not use badges for ordinary metadata. |
| `EmptyState`, `LoadingState`, `ErrorState`, `Skeleton` | Keep; add route-level compositions. |
| `ResponsiveTable` | Extend with a row/list mobile rendering contract rather than horizontal-scroll-only behavior. |
| `WorkflowStepper` | Keep for imports and lifecycle flows. |
| `Overlay` | Evaluate as the base for one accessible Drawer/Sheet primitive. |
| `MathText`, `StemMathEditor` | Preserve unchanged for STEM read/edit surfaces. |

### Add as canonical compositions, not independent design systems

- `SectionHeader`: section title, evidence-safe count/context, optional single action.
- `ActionBar`: page or selection actions with mobile overflow behavior.
- `AttentionList`: ordered actionable records with severity, due context, and destination.
- `ContinueWorking`: recent persisted work grouped by object type.
- `MetricStrip`: compact metrics with source labels; no decorative stat-card grid.
- `ActivityRow` / `DataList`: canonical dense row foundation.
- `QuickCreate`: contextual menu/list using existing Button and Overlay primitives.
- `MobileActionBar`: safe-area-aware single workflow action region.
- `ResponsiveDataView`: table on wide screens, labelled rows on small screens.
- `Drawer` / `Sheet`: accessible dialog semantics, focus trapping, Escape, return focus.
- `CommandSearch`: route and entity search; add only after IA labels are stable.
- `CalendarPreview`: compact agenda first, optional calendar presentation second.

Avoid introducing a component package merely to replicate primitives already present. Evaluate a dependency only if the existing Overlay cannot meet accessible focus-management requirements with a small implementation.

## 9. Visual system recommendations

### Typography

- Preserve Inter and the TeachNexis brand.
- Standardize operational type roles:
  - page title: 24–28px, semibold/bold;
  - section title: 16–18px, semibold;
  - body/action: 14px;
  - supporting text: 12–13px;
  - avoid `font-black` for routine application headings;
  - reserve uppercase tracking for short structural labels only.

### Spacing and width

- Use a 4px base scale with 8, 12, 16, 24, 32, and 40px primary intervals.
- Default page gap: 24px desktop, 16px mobile.
- Default content max-width: approximately 1200–1280px; allow full width for score grids and purpose-built workspaces.
- Use shell-level workspace mode instead of negative margins.

### Surfaces, borders, elevation, and radius

- Canvas: page background.
- Surface: grouped content boundary.
- Subtle surface: row hover, filter area, or selected context.
- Use borders at group boundaries, not around every nested element.
- Use the existing panel radius token (12px) for major groups, control radius (8px) for controls, and dialog radius (16px) only for overlays.
- Avoid stacked shadows; use the existing panel shadow sparingly and overlay shadow only for floating layers.

### Colour and state

- Blue remains the primary action/brand colour.
- Semantic success, warning, and danger colours describe state, not feature identity.
- Replace rainbow icon tiles with neutral icons plus state/context accents.
- Every status includes text or an icon/text pair; never colour alone.
- Audit hard-coded light colours for dark-mode parity and migrate them to semantic tokens.

### Interaction states

- Standardize default, hover, focus, active, selected, disabled, loading, success, warning, and error states.
- Keep global reduced-motion support.
- Skeletons mirror final layout and do not animate under reduced motion.
- Async actions announce progress and completion through `aria-live` where appropriate.

## 10. Route migration map

### TX-2 shell and navigation

- `apps/web/components/layout/Sidebar.tsx`
- `apps/web/components/layout/Header.tsx`
- `apps/web/components/layout/BottomNav.tsx`
- `apps/web/components/layout/DashboardShell.tsx`
- `apps/web/components/layout/MobileNavContext.tsx`
- `apps/web/app/(dashboard)/layout.tsx`
- `apps/web/app/globals.css`
- shared UI components under `apps/web/components/ui/`

### TX-3 dashboard

- `apps/web/app/(dashboard)/dashboard/page.tsx`
- `apps/web/components/dashboard/*`
- a bounded dashboard query/service module using existing models and authorization

### TX-4 Students & Records

- `/student-hub` and its import, manual, portal, analytics, reports, and history children
- `/classes` and `/classes/[classId]`
- `/students`
- `/attendance`
- `/scores`
- `/report-cards`
- `/health` only after confirming its core Teacher frequency and permissions

### TX-5 Teaching and content

- `/lessons` and lesson detail/edit/create routes
- `/homework`
- `/library`
- `/curriculum`

### TX-6 Assessment

- `/question-bank`
- `/question-bank/import`
- `/exams` and assessment detail/create routes
- `/grading`
- assessment analytics routes
- keep `/exams/import` visually and semantically separate as legacy

### TX-7 tools, mobile, accessibility, and consistency

- `/analytics`
- `/study-buddy`
- `/knowledge-studio`
- `/intelligence`
- code/STEM labs
- `/settings`
- `/import` and `/beta` disposition
- final cross-route mobile/accessibility pass

## 11. Functional safety boundaries

The redesign must preserve:

- authentication adapters and server-side session resolution;
- Teacher authorization and database-backed identity;
- school/tenant query scoping;
- Student Hub import leases, staging, validation, commit, cleanup, and rollback;
- Question Bank lifecycle and immutable QuestionVersions;
- QI-4 staging, review, solution data, idempotency, and APPROVED import behavior;
- AssessmentPublication history and assessment lifecycle controls;
- Student delivery, grading, release, analytics, and score bridge;
- F9 curriculum authority and publication boundaries;
- MathText/KaTeX canonical rendering and STEM response behavior;
- mobile authenticated route protection.

Presentation work should consume existing server services. It must not reproduce lifecycle or authorization decisions in client navigation code.

## 12. Risk areas

1. **Role vocabulary mismatch:** metadata uses `school_admin`/`super_admin`, while the Teacher model uses `ADMIN`/`SUPER_ADMIN` and other school roles. Permission-aware IA needs a single server-derived capability contract, not client guesses.
2. **School-wide versus Teacher-owned scope:** dashboard and library queries sometimes show school-wide records. The UI must label scope before changing query behavior.
3. **Legacy route compatibility:** `/import`, `/student-hub/import`, `/exams/import`, and `/question-bank/import` have different contracts and must not be merged mechanically.
4. **Assessment lifecycle:** changing labels or action placement must not expose actions after attempts begin or alter publication snapshots.
5. **Sticky mobile actions:** Attendance, Health, legacy Exam Import, Question Bank selection, and bottom navigation may collide.
6. **Full-screen tool layouts:** hard-coded negative margins can break when shell spacing changes.
7. **Table transformations:** mobile rows must retain every required field/action and not create a separate data path.
8. **Dashboard query cost:** attention and continue-working queries must be bounded, parallel, indexed where already supported, and cached only at an appropriate Teacher/school scope.
9. **False intelligence:** no timetable, mastery, risk, or performance claim may appear without deterministic evidence.
10. **Design drift:** feature-local cards and buttons will reappear unless canonical components and acceptance checks are established in TX-2.

## 13. Implementation phases

### TX-2 — Teacher shell, IA, and design foundation

- establish canonical navigation configuration and server-derived capabilities;
- repair page-title resolution;
- implement accessible mobile More sheet/drawer behavior;
- revise bottom navigation;
- add SectionHeader, ActionBar, DataList/ActivityRow, MetricStrip, and mobile action primitives;
- codify page width, spacing, surface, radius, and state rules;
- make no feature-service changes.

Exit criterion: every current Teacher route remains reachable and protected, with stable desktop/mobile navigation and no functional regression.

### TX-3 — Teacher Today command centre

- create one bounded server-side dashboard data contract;
- implement evidence-backed Attention Needed, Continue Working, Upcoming, Quick Create, and Teaching Pulse;
- move setup/profile nudges out of the permanent primary hierarchy;
- omit timetable/mastery content until real sources exist.

Exit criterion: the first viewport prioritizes real work and contains no placeholder intelligence.

### TX-4 — Students & Records

- clarify Student Hub as Import & Sync;
- unify page headers, action bars, dense rows, responsive data views, filters, and empty states;
- preserve score/attendance/import semantics;
- define report and health-record placement by actual Teacher frequency and permission.

### TX-5 — Teaching & Content

- align Classes, Lessons, Homework, Library, and Curriculum;
- move create forms into contextual actions/sheets where appropriate;
- unify recent work, filters, detail headers, and mobile actions.

### TX-6 — Assessment

- clarify Question Bank → Assessment → Publication → Grading → Results progression;
- simplify competing assessment creation actions;
- preserve QI-4's single-flow review;
- harmonize dense assessment lists, lifecycle states, sticky actions, and mobile detail layouts;
- keep legacy exam import separate.

### TX-7 — Tools, administration, mobile, accessibility, and consistency

- harmonize full-screen AI/STEM tools with workspace mode;
- permission-gate administration navigation through authoritative capabilities;
- remove/de-emphasize dead and beta navigation;
- complete keyboard, focus, screen-reader, touch, contrast, dark-mode, loading, and responsive acceptance across all Teacher routes.

This sequence is preferable to redesigning feature pages before the shell and canonical compositions exist. Mobile rules begin in TX-2 and are verified in every phase; TX-7 is the closure pass, not the first mobile work.

## 14. Acceptance criteria

### Shell and IA

- all authorized current routes remain reachable;
- navigation labels describe Teacher jobs consistently;
- desktop and mobile hierarchies agree;
- current page title is always visible;
- no dead notification or beta action appears as a normal production control;
- permission-aware items come from server-authoritative capability data;
- keyboard and screen-reader users can open, traverse, close, and restore focus from mobile navigation.

### Dashboard

- actionable work appears before metrics;
- every count is derived from a named persisted source;
- empty attention sections disappear rather than inventing reassurance;
- no schedule, mastery, risk, or performance claim exists without evidence;
- recent work and scope are clearly labelled;
- first mobile viewport contains Today context and actionable work.

### Components and visuals

- shared PageHeader/Button/Status/State primitives are used consistently;
- ordinary metadata is not rendered as a status pill;
- nesting does not exceed one principal panel plus necessary row/input boundaries;
- semantic tokens work in light and dark themes;
- controls meet the 44px mobile target where touched frequently;
- loading, empty, error, success, disabled, focus, and selected states are defined.

### Responsive behavior

- no page-level horizontal overflow at 320, 360, 390, 430, 768, 1024, and 1440px;
- operational tables have a deliberate mobile row model, except true score matrices;
- no sticky action overlaps bottom navigation;
- full-screen tools use shell-supported workspace mode;
- core tasks remain usable with keyboard only and at 200% zoom.

### Functional regression

- authentication and sign-out pass;
- Teacher and tenant boundaries pass;
- Student Hub, Attendance, Scores, F6, F8, F9, STEM, QI-4, Question Bank, Assessment Builder, grading, and results remain green;
- no schema migration is introduced solely for presentation;
- production data is not mutated as part of visual acceptance.

## 15. TX-2 entry conditions

TX-2 is ready to begin when the owner approves:

1. the recommended navigation labels/grouping;
2. the mobile bottom-navigation model;
3. the rule that no timetable/mastery/risk intelligence appears without a deterministic source;
4. a shell-first implementation boundary that does not redesign feature persistence.

## 16. TX-3 implementation evidence

TX-3 uses the existing Teacher-scoped records without introducing a schema or dashboard data model. The command centre reads:

- `Teacher`, `Lesson`, and `Exam` for the teacher's recent work and authored counts;
- `Homework` for dated due work owned by the teacher;
- `ExamAttempt` through `listGradingQueue` for submitted responses needing marking or results ready for release;
- existing `ImportJob`/`ImportStagingRow` records filtered to the QI-4 question-import metadata shape;
- `Class` and active `Student` counts at school scope, explicitly labelled as school roster metrics.

Queries are bounded, parallelized with `Promise.all`, and limited to the recent/upcoming rows needed for the workspace. The dashboard intentionally omits timetable data (no lesson schedule field exists), mastery, risk scoring, unsupported performance claims, and generated recommendations. Empty states explain the missing dated evidence rather than manufacturing activity.

The implementation is in `apps/web/app/(dashboard)/dashboard/page.tsx` and reuses `PageHeader`, `SectionHeader`, `DataList`/`ActivityRow`, `MetricStrip`, `StatusBadge`, `EmptyState`, and canonical navigation routes. It does not alter authentication, persistence, QI-4, F8, F9, or STEM behavior.
