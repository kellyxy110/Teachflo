# TeachNexis Landing Page Reference

| Reference | Pattern | Decision | TeachNexis application | Accessibility | Responsive | Performance |
|---|---|---|---|---|---|---|
| shadcn/ui | Composable, owned primitives and clear hierarchy | ADAPT | Reuse existing TeachNexis primitives and tokens in marketing blocks | Semantic controls and focus states | Stack editorial/product split layouts | No new dependency |
| ReUI | Realistic product compositions, filters and stepper patterns | ADAPT | Use one bounded product-stage composition and workflow sequence | Keep interaction understandable without motion | Collapse stage to one focused panel | Avoid importing catalog/runtime |
| Refero | Product-story inspiration and section rhythm | ADAPT | Alternate copy, interface proof and focused statements | Preserve crawlable text | Editorial blocks become single-column | Static imagery preferred |
| Land-book / SiteInspire / Lapa | Marketing composition, whitespace and typography | ADAPT | Use restrained rhythm, not template cloning | Maintain contrast and heading order | Design mobile composition separately | Avoid oversized media |
| Design System Checklist | Token, state and component completeness | ADOPT | Use as LP2 quality checklist | Include keyboard, contrast, reduced motion | Test 320–1440px | Budget JS and image weight |
| beautifului / beui / rareui | Micro-interaction and polished marketing patterns | ADAPT | One purposeful reveal or tab transition | Provide non-motion equivalent | Disable/reduce motion | CSS-first |
| transitions.dev | Transition choreography | REJECT for LP1 | No dependency or spectacle needed | — | — | Avoid animation framework expansion |
| 21st.dev / easyui | Copyable component examples | REJECT wholesale | Existing F1 system remains canonical | — | — | Prevent second component system |
| coss / ui-skills / better-design / amua | Opinionated visual patterns | ADAPT selectively | Borrow hierarchy and content density only | Audit every adopted pattern | No desktop-only assumptions | No new packages |
| gooey / beam / metal / orbs | Special effects | REJECT | None explain TeachNexis value sufficiently | — | — | Avoid GPU-heavy decorative effects |

The supplied references were used as pattern research, not as implementation sources. No production files were changed.
