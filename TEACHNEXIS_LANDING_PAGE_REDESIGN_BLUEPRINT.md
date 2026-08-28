# TeachNexis Landing Page Redesign Blueprint

## 1. Current-state audit

The public landing route is `apps/web/app/page.tsx`, which renders crawlable SEO copy and the client composition in `LandingPageClient`. The page currently contains navigation, hero, feature overview, workflow story, animated product/video showcase, intelligence, dashboard showcase, stats, testimonials, pricing, FAQ, CTA and footer.

Strengths to keep: real product vocabulary, clear sign-in/sign-up entry points, crawlable headings, responsive component boundaries, and reduced-motion detection in the client animation setup.

Problems: the narrative is long and feature-led; several sections imply capabilities that are partial or not evidenced in the current product (for example “7 free AI models”, broad adaptive/intelligence claims, and multiple personas); animated Lenis/GSAP and video-style sections add payload and cognitive load; testimonials/stats require proof; the page risks a generic AI-SaaS impression instead of showing the teacher workflow.

Keep the route and existing brand tokens. Improve hierarchy, evidence, copy precision and product proof. Replace only sections that cannot be substantiated. Remove unsupported claims rather than polishing them.

## 2. Product truth inventory

### LIVE / demonstrable

- Teacher Today dashboard, classes, students and school records.
- Attendance, scores/import and reporting workflows.
- Lessons, homework and library surfaces.
- Question Bank, reviewed question import (CSV/XLSX/DOCX), immutable QuestionVersions and Assessment Builder.
- Published assessments, server-authoritative deadlines, autosave/resume, grading and policy-controlled results.
- STEM/MathText rendering for mathematical and scientific notation.
- AI-assisted lesson/content tools where the UI and server route currently exist.

### PARTIAL / acceptance-dependent

- Authenticated Teacher/Student visual and accessibility acceptance.
- Some analytics/intelligence surfaces and advanced AI claims.
- Production database reconciliation and some integrations.

### COMING LATER / do not market as live

- Curriculum expansion beyond the bounded F9 foundation.
- Question file import extensions beyond the current MVP.
- Mastery/adaptive-learning expansion, CAS and AI grading.
- Production curriculum data promotion and unverified-source authority upgrades.

## 3. Audience strategy

Primary audience: teachers in Nigerian and African schools. The first screen should promise a calmer way to plan, assess and understand classroom work. Secondary audiences enter through dedicated sections: school leaders see records, reporting and control; students see focused assessment, practice and feedback. Do not split the hero equally among three audiences.

## 4. Recommended visual direction

Warm editorial-product composition: restrained light/dark surfaces, a confident typographic headline, one product screenshot as proof, and a single accent colour used for actions and status. Use compact evidence rows and generous but deliberate spacing. Keep rounded corners moderate and avoid gradients, glass, rainbow icon sets and decorative charts.

## 5. Proposed information architecture

1. Header: TeachNexis, product anchors, Sign in, primary “Start teaching” CTA.
2. Hero: teacher-first promise, one-sentence explanation, real Today/Assessment product frame, CTA pair.
3. Problem: fragmented planning, records and assessment (short, factual).
4. Workspace story: Today → teach → assess → understand, using real screens.
5. Teacher workflow: classes, lessons, homework, attendance and scores.
6. Assessment: Question Bank → Builder → timed attempt → grading/release.
7. Student experience: focused assessment, STEM rendering and feedback.
8. Trust/control: immutable versions, server-owned timing, school boundaries and review-first imports.
9. AI, carefully scoped: assistance inside existing workflows; label partial/coming capabilities.
10. FAQ and final CTA; footer with product, help and legal links.

## 6. Hero alternatives

**A — Recommended:** “One calm workspace for the work teachers do every day.” Subhead: “Plan lessons, keep records, build assessments and see what needs attention—without stitching together separate tools.”

**B:** “Teach. Assess. Understand.” Subhead explains the same workflow, with a real dashboard frame.

**C:** “From first lesson to final result.” Use only if the assessment lifecycle screenshot is available.

CTA should route to the existing sign-up/onboarding path. Secondary CTA should scroll to the product workflow, not a dead demo.

## 7. Screenshot/product-demo strategy

Use real, scrubbed product captures: Teacher Today, Question Import review, Assessment Builder, active Student assessment with MathText, and grading/result release. Prefer five purposeful frames over a fake all-in-one dashboard. Never expose names, scores, IDs or development data. If captures cannot be safely produced, use annotated static UI fragments sourced from the existing components and label them as product views.

## 8. Component and pattern research

| Source | Pattern | Fit / adaptation | Risks | Decision |
|---|---|---|---|---|
| [Refero](https://refero.design/) | Product screenshots and flow references | Helps compare real SaaS hierarchy; adapt to teacher workflow | Copying visual language | Research only |
| [shadcn/ui](https://ui.shadcn.com/docs/components) | Navigation, sheet, tabs, typography, accessible primitives | Reuse existing primitives and semantics | Component sprawl | Reuse, do not add a competing system |
| [UI Skills](https://www.ui-skills.com/) | Reduced motion, transform/opacity-only motion, coherent token discipline | Apply as acceptance constraints | Over-animation if misunderstood | Adopt guardrails |
| [Lapa](https://www.lapa.ninja/) / [SaaS Landing Page](https://www.saaslandingpage.com/) | Section rhythm and CTA composition | Use for narrative pacing, not templates | Generic SaaS sameness | Research only |
| [COSS](https://coss.com/ui) / [Design System Checklist](https://designsystemchecklist.com/) | Consistency and component quality | Validate tokens, focus, contrast and states | None material | Adopt review criteria |
| Jakub Antalik effects ([Gooey](https://gooey.jakubantalik.com/), [Beam](https://beam.jakubantalik.com/)) | Experimental visual accents | At most one small decorative accent | GPU cost, contrast, reduced motion | Defer unless justified |

## 9. Mobile strategy

At 390/430px: compact header with one primary CTA, headline no longer than four lines, screenshot cropped to the key workflow, and sections ordered Hero → proof → teacher workflow → assessment → student → trust → CTA. Avoid horizontal carousels and sticky elements that collide with browser chrome. Keep touch targets at least 44px, preserve semantic headings, and allow screenshots to scroll within bounded frames only when necessary.

## 10. Motion strategy

Use motion to clarify sequence, not decorate. Prefer opacity/transform, short reveal transitions, and one optional product interaction. Disable Lenis, parallax, infinite loops and heavy effects under `prefers-reduced-motion`. Lazy-load video and any enhanced demo; default to a poster/static frame. Measure LCP and JS before/after.

## 11. SEO, accessibility and performance constraints

- One visible H1; crawlable copy must match the product truth inventory.
- Preserve metadata, canonical URL, internal links and descriptive image alt text.
- Keyboard-reachable navigation and CTAs, visible focus, contrast, and no colour-only status.
- Keep landing page mostly server-rendered; lazy-load interactive demos.
- Set budgets for hero media, fonts, client JavaScript and video; avoid WebGL as a foundation.
- Test reduced motion, 390px, 430px, tablet and desktop.

## 12. Reuse vs replace map

Reuse `LandingNav`, `PageHeader`-style typography/tokens, existing buttons, MathText/STEM renderers and real dashboard/product components. Refactor `LandingPageClient` composition and copy. Replace unsupported stats/testimonials/intelligence claims with evidence or remove them. Keep footer/legal/FAQ structure where content is accurate. Do not modify authenticated product architecture.

## 13. Implementation phases

- **LP-R2 — Foundation:** copy truth pass, navigation, type scale, container and hero/product proof.
- **LP-R3 — Story:** problem, teacher workflow, assessment, student and trust sections.
- **LP-R4 — Product proof:** scrubbed screenshots, lightweight transitions, CTA instrumentation.
- **LP-R5 — Mobile/accessibility/performance:** responsive ordering, reduced motion, focus/contrast, media budgets.
- **LP-R6 — QA:** SEO, Core Web Vitals, route/auth smoke, content review and production approval.

## 14. Risks and non-goals

Risks are unsupported claims, fake or unsanitized screenshots, oversized client bundles, animation regressions, and messaging that implies official curriculum or AI grading. Non-goals: changing auth, assessment/curriculum schemas, adding AI providers, building a new design system, inventing analytics, or implementing the redesign during this discovery phase.

## 15. Acceptance criteria

The implemented redesign must communicate the teacher-first promise in five seconds; use only verified capabilities; show at least three real workflow proofs; keep sign-in/sign-up reachable; pass keyboard/focus/contrast and reduced-motion checks; avoid page-level overflow at 390/430px; meet agreed media/JS budgets; and preserve all authenticated routes and existing product behavior.
