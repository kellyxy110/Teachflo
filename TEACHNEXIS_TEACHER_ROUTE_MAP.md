# TeachNexis Teacher Route Map

TX-2 centralizes navigation labels, grouping, active-state matching and page titles in `apps/web/lib/navigation/teacher.ts`. This map changes discoverability only: existing routes and deep links remain available, and no redirects are introduced.

## Primary Teacher navigation

| Group | Label | Canonical route | Classification |
| --- | --- | --- | --- |
| Today | Dashboard | `/dashboard` | `CANONICAL` |
| Teaching | Classes | `/classes` | `CANONICAL` |
| Teaching | Lessons | `/lessons` | `CANONICAL` |
| Teaching | Homework | `/homework` | `CANONICAL` |
| Students & records | Students | `/students` | `CANONICAL` |
| Students & records | Attendance | `/attendance` | `CANONICAL` |
| Students & records | Scores | `/scores` | `CANONICAL` |
| Students & records | Reports | `/report-cards` | `CANONICAL` |
| Students & records | Import & Sync | `/student-hub` | `CANONICAL` |
| Assessment | Question Bank | `/question-bank` | `CANONICAL` |
| Assessment | Assessments | `/exams` | `CANONICAL` |
| Assessment | Grading | `/grading` | `CANONICAL` |
| Content | Library | `/library` | `CANONICAL` |
| Content | Curriculum | `/curriculum` | `CANONICAL` |
| Tools | AI Assistant | `/study-buddy` | `CANONICAL` |
| Tools | Knowledge Studio | `/knowledge-studio` | `CANONICAL` |
| Tools | Intelligence | `/intelligence` | `CANONICAL` |
| Tools | Analytics | `/analytics` | `ROLE_RESTRICTED` through the existing `analytics:read` permission |
| Tools | Math Workspace | `/math-workspace` | `CANONICAL` |
| Tools | Physics Lab | `/physics-lab` | `CANONICAL` |
| Tools | Chemistry Lab | `/chem-lab` | `CANONICAL` |
| Tools | Code Lab | `/code-lab` | `CANONICAL` |
| Account | Settings | `/settings` | `CANONICAL` |

Tools are collapsed by default on the expanded desktop sidebar. They open automatically when the current route belongs to that group. On mobile they live in the accessible More sheet.

## Contextual and legacy routes

| Route | Classification | Navigation treatment |
| --- | --- | --- |
| `/question-bank/import` | `HIDDEN_FROM_PRIMARY_NAV` | Contextual action from Question Bank; remains the canonical QI-4 workflow. |
| `/exams/import` | `HIDDEN_FROM_PRIMARY_NAV` | Legacy direct-to-exam import remains separate. |
| `/student-hub/import` | `HIDDEN_FROM_PRIMARY_NAV` | Contextual child of Import & Sync. |
| `/import` | `LEGACY_ALIAS` | Existing Smart Import deep link remains valid but is removed from primary Teacher navigation. |
| `/health` | `HIDDEN_FROM_PRIMARY_NAV` | Existing deep link remains valid. |
| `/beta` | `HIDDEN_FROM_PRIMARY_NAV` | Existing development surface remains valid but is not a primary Teacher job. |

Administration is intentionally omitted when no destination has an established server-authoritative permission contract. TX-2 does not infer administrative authority or expose a destination based on a client-provided role.

## Mobile primary navigation

`Today` → `/dashboard`
`Classes` → `/classes`
`Students` → `/students`
`Assessments` → `/exams`
`More` → accessible sheet containing all other authorized Teacher destinations
