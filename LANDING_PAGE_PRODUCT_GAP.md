# TeachNexis Landing Page Product Gap

## Evidence baseline

The public route is `apps/web/app/page.tsx`. It renders a server SEO summary plus `LandingPageClient`, which composes eleven client-side sections: navigation, hero, why/platform, video showcase, intelligence layer, dashboard showcase, stats, testimonials, pricing, FAQ, final CTA and footer.

## Truth classification

### LIVE / IMPLEMENTED

- Teacher dashboard, classes, students, attendance and scores.
- Student Data Hub and SchoolCube CSV/XLS/XLSX import workflows.
- Question Bank workspace, reusable questions, versions and assessment-item bridge.
- AI-assisted lesson/exam/question generation with teacher review boundaries.
- Student dashboard and practice surfaces.
- School-scoped authorization, teacher attribution and responsive application UI.

### PARTIAL

- Assessment publication/lifecycle persistence is implemented but still undergoing hardening verification.
- Curriculum-aware metadata exists, but full curriculum ingestion/alignment is not universal.
- Analytics/intelligence surfaces exist at varying maturity.
- Pricing and institutional packaging are not an authoritative commercial contract.

### IN DEVELOPMENT

- Full assessment lifecycle UI and student delivery contract.
- Broader reusable Question Bank search/filtering and quality intelligence.
- Supabase authentication migration remains parallel to the public workstream.

### FUTURE VISION

- Adaptive mastery engine, semantic duplicate detection, curriculum ingestion and large-scale content engine.
- Complete interactive exploration → guided practice → mastery loop.
- Student school-code/PIN authentication completion.

## Gaps and risks

- The current page presents many capabilities with equal visual weight, obscuring the connected teacher workflow.
- Several sections retain “TeachFlow OS” wording and legacy claims.
- Stats, testimonials, pricing and “free forever” statements require product-owner verification before being treated as authoritative proof.
- AI and adaptive language can imply autonomy beyond the implemented teacher-review model.
- QuestionVersion, publication and assessment implementation terms should be translated into educator outcomes.
- Student, parent and principal audiences are shown together despite the product being teacher/school-first.
- Trust messaging should foreground school isolation, teacher control and responsible AI without exposing implementation details.
- The page needs explicit Sign in and Get started pathways in both desktop and mobile navigation.
