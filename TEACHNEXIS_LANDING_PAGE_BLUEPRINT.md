# TeachNexis Landing Page Blueprint

## Audience and positioning

- Primary: teachers who need one dependable workspace for planning, records and assessment.
- Secondary: school leaders who need trustworthy school-wide visibility and controlled data.
- Tertiary: students as participants in the learning loop; parents/organisations later.

**Promise:** TeachNexis connects everyday teaching, school records, assessment and student improvement in one calm, curriculum-aware workspace—AI accelerates preparation while educators remain in control.

## Recommended narrative

TEACH → ORGANISE → ASSESS → UNDERSTAND → IMPROVE. This is more distinctive and truthful than positioning as an AI chatbot, SIS or generic LMS.

## Proposed wireframe

1. **Nav** — TeachNexis mark, Product, For Teachers, For Schools, Resources; Sign in and Get started. Mobile drawer preserves both auth actions.
2. **Hero: “The connected classroom workspace”** — specific promise, two CTAs, composed real-interface product stage. Current capability basis: LIVE.
3. **Proof strip** — Nigerian school context, supported class levels/workflows, no fabricated logos or metrics. LIVE/PARTIAL.
4. **Problem statement** — fragmented records, repetitive preparation and disconnected assessment; respectful editorial copy.
5. **Workflow story** — Teach → Organise → Assess → Understand → Improve, shown as one connected journey rather than six cards.
6. **Teacher workspace** — dashboard/classes/students/attendance/scores composition with academic context. LIVE.
7. **Question Bank + Assessment** — create/review/store/reuse; explain teacher value, not schema terms. LIVE/PARTIAL.
8. **AI with a human gate** — Generate → Review → Adapt → Approve; show provenance and teacher control. LIVE/PARTIAL.
9. **Student loop** — Learn → Practice → Feedback → Improve using supported student surfaces. LIVE; mastery language qualified.
10. **Intelligence and records** — reports, imports and progress evidence; avoid claiming adaptive mastery as complete. LIVE/PARTIAL.
11. **Local relevance, wider ambition** — WAEC/NECO/JAMB and school terms as current context, architecture open to other curricula. PARTIAL.
12. **Trust** — school isolation, secure sign-in, teacher authority, assessment history and responsible AI review. LIVE/IN_DEVELOPMENT with qualifiers.
13. **Institutional CTA** — Get started for a teacher; school conversation/contact only if a real destination exists.
14. **Footer** — only existing routes: Product anchors, Sign in, Sign up, Terms, Privacy, Cookies; no dead Company/Resources links.

## Hero directions

### Product-first (recommended)
**Headline:** One workspace for the work that moves learning forward.
**Subhead:** TeachNexis brings lesson preparation, class records, reusable questions, assessments and student practice into one teacher-led system for Nigerian schools.
**CTAs:** Get started free / See how it works.
**Visual:** A calm, bounded product stage showing Dashboard → Question Bank → Assessment → Student progress.

### Teacher-outcome-first
**Headline:** Spend less time stitching tools together. Spend more time teaching.
**Subhead:** Organise your classes, understand your learners and build better assessments with AI assistance that keeps you in control.
**CTAs:** Get started / Sign in.
**Risk:** Can sound like generic productivity software without the product stage.

### Education-system-first
**Headline:** A clearer operating layer for modern schools.
**Subhead:** Connect teaching, records, assessment and learning progress across the school—grounded in the realities of Nigerian education.
**CTAs:** Explore TeachNexis / For schools.
**Risk:** “Operating layer” may be abstract for an individual teacher.

## Visual and interaction direction

Use existing blue/yellow-accent tokens with dark navy surfaces only where they improve contrast; avoid gradients as the primary message. Use existing typography and icons. Alternate editorial copy, real UI proof, workflow diagrams and concise statements. One subtle reveal/transition is sufficient; all motion must respect `prefers-reduced-motion`.

Responsive strategy: mobile hero uses a single readable product panel below the CTA; desktop uses a two-column stage; sections collapse to one focal idea at 320–430px; no horizontal screenshot overflow. Budget for server-rendered copy, optimized static images, lazy below-fold media and no autoplay video.

Accessibility requirements: landmarks, one H1, logical headings, descriptive links, keyboard-visible focus, labelled menu/dialog controls, alt text for screenshots, contrast, touch targets and reduced-motion equivalents.

## LP2 component plan

Keep `LandingNav`, `LandingFooter`, and proven sections where content remains accurate. LP2 may introduce owned `MarketingNav`, `ProductStage`, `WorkflowStory`, `ProductScreenshot`, `TrustSection` and `MarketingCTA` only after review; do not add a library. Prefer server components for static copy and isolate animation to small client islands.

## Implementation impact map

- KEEP: `apps/web/app/page.tsx`, metadata foundation, existing brand/logo and reusable UI primitives.
- MODIFY: `LandingNav`, `LandingPageClient`, `HeroSection`, `LandingFooter`, selected feature/CTA sections after truth review.
- REPLACE/CONSOLIDATE: duplicated stats/testimonial/pricing blocks only if owner evidence is absent.
- REMOVE: no section in LP1; any removal requires LP2 content approval.

LP1 intentionally leaves production code untouched.
