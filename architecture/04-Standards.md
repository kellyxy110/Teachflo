# TeachNexis — Standards

## Code Standards

### Language & Framework
- TypeScript strict mode throughout. No `any` types in new code.
- Next.js 16 App Router patterns exclusively. No Pages Router.
- React 19 context syntax: `<Ctx value={...}>` not `<Ctx.Provider value={...}>`.
- Tailwind v4 with `@theme` CSS variables. No inline style overrides unless unavoidable.

### File & Folder Naming
- Components: PascalCase (`AttendanceClient.tsx`)
- Server actions: camelCase files in `app/actions/` (`attendance.ts`)
- Pages: `page.tsx` inside route folder
- Layouts: `layout.tsx` inside route folder
- Domain architecture files: kebab-case folders, PascalCase `.md` files

### Server Actions
- All data mutations go through server actions (`"use server"`), never direct client-side DB calls.
- Every server action begins with `requireSchool()` to establish authenticated context.
- Every query is scoped by `schoolId` — no exceptions.
- Input validation at the action boundary, not in the component.

### Database
- Prisma client imported from `@/lib/db`.
- Connection via Supavisor pooler only (port 6543, `?pgbouncer=true`).
- Transactions for multi-table writes.
- No raw SQL in application code; all queries via Prisma ORM.
- Schema migrations run manually in Supabase SQL Editor.

### Security
- Resource IDs validated against `schoolId` before any read or write.
- User-controlled HTML content escaped before `dangerouslySetInnerHTML`.
- Array inputs capped at defined limits (attendance: 500, bulk import: 200, clinic visits: 200).
- Note/text fields capped at 500 characters unless a different limit is justified.
- Date inputs validated against `/^\d{4}-\d{2}-\d{2}$/` regex.
- Enum inputs validated against known sets before DB write.

## AI Prompt Standards

### Structure
Every prompt follows this structure:
1. Role assignment (dynamic, based on subject domain)
2. Context injection (curriculum topic, class level, term)
3. Task definition
4. Output format specification
5. Quality constraints
6. Constraints and prohibitions

### Quality Rules
- No truncation. Content is generated in sections and merged automatically.
- Educational accuracy is verified against the Nigerian secondary curriculum.
- AI outputs are never presented to teachers as final without review affordance.
- Prompts are stored in `Prompt.md` files — no prompt logic embedded in application code.

### Model Assignment
- Long-form generation: Kimi K2.6
- Mathematics and structured assessment: DeepSeek
- Summaries, flashcards, short-form: Qwen
- General writing, fallback: Grok
- Code and engineering: Ornith

## Educational Standards

### Curriculum Alignment
- All content aligned to the Nigerian Educational Research and Development Council (NERDC) curriculum.
- WAEC, NECO, and JAMB standards applied where assessment is involved.
- Bloom's Taxonomy levels mapped to every learning objective and assessment item.
- Content classified by: Subject, Class (JSS1–SS3), Term (First/Second/Third), Week, Topic.

### Assessment Standards
- Multiple Choice questions: minimum 4 options (A–D), maximum 5 (A–E).
- CBT examinations: minimum 40 questions per subject, maximum 120.
- Continuous Assessment: CA1 (first test), CA2 (second test), Exam (terminal examination).
- Grading scale:
  - A1: 75–100 (Excellent)
  - B2: 70–74 (Very Good)
  - B3: 65–69 (Good)
  - C4: 60–64 (Credit)
  - C5: 55–59 (Credit)
  - C6: 50–54 (Credit)
  - D7: 45–49 (Pass)
  - E8: 40–44 (Pass)
  - F9: 0–39 (Fail)

### Content Quality
- Teacher Version: full lecture notes with pedagogical guidance.
- Student Version: simplified, readable, age-appropriate.
- Every Knowledge Package includes: Lecture Notes, Summary, Flashcards, Quiz, Assignment, Worksheet, Infographic, Teacher Notes, Student Notes, References, Learning Objectives, Bloom's Mapping.

## UI/UX Standards

### Layout
- Mobile-first. All layouts designed for 375px width minimum.
- Desktop enhancements are additive, not required for core workflows.
- Sidebar hidden on mobile (`-translate-x-full`), bottom navigation (`BottomNav`) for 5 primary sections.
- Safe area insets applied to bottom navigation for iOS devices.

### Design Tokens
- All colours, spacing, and typography via Tailwind v4 `@theme` CSS variables.
- No hardcoded colour values in component code.
- Dark mode supported via CSS variable switching.

### Interaction
- Sticky save buttons on long forms.
- Optimistic UI updates where appropriate.
- Loading states on all async operations.
- Empty states designed and implemented — never leave users with a blank page.
- Error states communicate what happened and what the user can do next.

### Accessibility
- Interactive elements have accessible labels.
- Colour contrast meets WCAG AA minimum.
- Keyboard navigation supported on all primary workflows.

## Documentation Standards

### Architecture Files
- Written in clear, precise English.
- No marketing language.
- Decisions explain rationale, not just the choice made.
- Specifications describe what the system does and why, not how the code works.

### Decision Log
- Append-only. Never delete or revise a decision entry.
- When a decision is superseded, add a new entry referencing the original.
- Date in ISO format (YYYY-MM-DD).
- Include: Decision, Rationale, Impact, Alternatives Considered.

### Specification Drift
- A specification file that diverges from implementation is an architectural defect.
- Updating specification is part of the implementation task, not a separate activity.
