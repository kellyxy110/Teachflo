# TeachNexis Frontend Foundation F1

## Scope

F1 establishes owned presentation primitives and additive design tokens. It does
not change routes, authentication, data contracts, imports, assessment logic, or
database behaviour.

## Foundation contract

- Operational controls have visible keyboard focus and practical touch sizes.
- Form labels are explicitly associated with their controls.
- Help and validation messages are connected through `aria-describedby`.
- Status communicates with text and iconography, not colour alone.
- Dense school records remain tabular and use labelled horizontal scrolling on
  narrow viewports rather than silently hiding important columns.
- Reduced-motion preferences remain authoritative.
- Page headers prioritise task context and actions over decorative presentation.

## Future navigation grouping

The current routes remain unchanged in F1. A later information-architecture
phase may group them under:

1. Today
2. Classes & Students
3. Assessment & Results
4. Teaching
5. Student Data
6. AI & Learning Tools
7. Administration

Canonical import-route consolidation and redirects require their own review and
must not be hidden inside visual navigation work.

## Protected boundaries

Frontend foundation work consumes existing Phase 8 contracts. It must not
change staging, `stageImportJob`, `commitImportJob`, supplied-total authority,
assessment-component persistence, retry behaviour, transaction boundaries,
school isolation, teacher attribution, OCR security, authentication semantics,
Prisma, or migrations.

## F1.1 runtime verification

Playwright is a web-only development dependency. The runner is locked to the
approved Development project through the guarded database environment and
requires a legitimate Clerk Teacher storage state at `apps/web/.auth/teacher.json`.
It has no request-addressable authentication bypass. Until that state is created
by an owner using a real Development sign-in, authenticated browser and visual
checks remain pending. The Student shell's fixed `w-56` sidebar and `ml-56`
content offset were recorded as a later responsive-work item, not changed in
F1.1.
