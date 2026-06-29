# UI: Curriculum Intelligence Graph (CIG)

## Routes

| Route | Component | Purpose |
|---|---|---|
| `/curriculum` | `CurriculumBrowserClient` | Browse subjects, class levels, terms, and topics |
| `/curriculum/[nodeId]` | `TopicDetailClient` | View full topic detail, prerequisites, relationships, and launch content generation |

**Design principle:** Teachers never see the word "graph." They see a curriculum browser. The graph is the engine; the browser is the experience.

---

## Page: `/curriculum`

### Purpose
Give teachers a fast, organised view of the curriculum — browsable by subject, class, and term — so they can find any topic and launch content generation in under 10 seconds.

### Layout

**Mobile (375px — primary design target):**
```
┌─────────────────────────────┐
│ Header: "Curriculum"        │
├─────────────────────────────┤
│ Subject selector (dropdown) │
│ Class level selector        │
│ Term selector               │
├─────────────────────────────┤
│ Topic list                  │
│ ┌─────────────────────────┐ │
│ │ Week 1 · Easy · 40 min  │ │
│ │ States of Matter        │ │
│ │ WAEC · NECO             │ │
│ └─────────────────────────┘ │
│ ┌─────────────────────────┐ │
│ │ Week 2 · Medium · 50min │ │
│ │ Atomic Structure        │ │
│ │ WAEC                    │ │
│ └─────────────────────────┘ │
│ ...                         │
├─────────────────────────────┤
│ Bottom Nav                  │
└─────────────────────────────┘
```

**Desktop (md+):**
```
┌──────┬──────────────────────────────────┐
│ Side │ Subject │ Class │ Term           │
│ bar  ├──────────────────────────────────┤
│      │ Topic list (2-column grid)        │
│      │ ┌──────────┐  ┌──────────┐       │
│      │ │ Week 1   │  │ Week 2   │       │
│      │ │ States   │  │ Atomic   │       │
│      │ │ of Matter│  │ Structure│       │
│      │ └──────────┘  └──────────┘       │
└──────┴──────────────────────────────────┘
```

### Filters (top of page, always visible)

| Filter | Type | Default |
|---|---|---|
| Subject | Dropdown | First subject alphabetically |
| Class Level | Segmented control (JSS1–SS3) | JSS1 |
| Term | Segmented control (First/Second/Third) | First |

Changing any filter reloads the topic list immediately (no submit button).

### Topic Card

Each topic in the list displays:
- Week number and topic name (primary)
- Difficulty badge (Easy / Medium / Hard — colour coded)
- Estimated time in minutes
- Exam standard tags (WAEC, NECO, JAMB — small badges)
- Prerequisite indicator (lock icon if this topic has prerequisites not yet in the browser context)

Tapping/clicking a card navigates to `/curriculum/[nodeId]`.

---

### States

**Loading state:**
Skeleton cards — 6 placeholder cards with pulsing animation. Filter controls remain visible and interactive.

**Empty state:**
```
┌─────────────────────────────┐
│  📚                         │
│  No topics found            │
│                             │
│  No topics are available    │
│  for [Subject] [Class]      │
│  [Term] yet.                │
│                             │
│  [Request Topic Addition]   │
└─────────────────────────────┘
```
Never a blank page. Always actionable.

**Error state:**
```
Could not load curriculum. 
Check your connection and try again. [Retry]
```

---

## Page: `/curriculum/[nodeId]`

### Purpose
Give the teacher a complete, actionable view of a single topic — its educational context, connections to other topics, and one-tap access to content generation.

### Layout

**Mobile:**
```
┌─────────────────────────────┐
│ ← Back    Atomic Structure  │
├─────────────────────────────┤
│ Physics · SS1 · Term 1 · W2 │
│ Medium · 50 min             │
│ [WAEC] [NECO]               │
├─────────────────────────────┤
│ [Generate Lesson]           │ ← Primary CTA
│ [Generate Quiz]             │
│ [Generate Flashcards]       │
├─────────────────────────────┤
│ Tabs: Overview │ Related    │
├─────────────────────────────┤
│ Overview tab:               │
│                             │
│ Learning Objectives (3)     │
│ • State the structure of... │
│ • Describe the role of...   │
│ • Identify protons...       │
│                             │
│ Prerequisites (2)           │
│ • States of Matter →        │
│ • Basic Measurement →       │
│                             │
│ Common Misconceptions       │
│ • Students often confuse... │
│                             │
│ Bloom's Levels              │
│ [Remember] [Understand]     │
│ [Apply]                     │
├─────────────────────────────┤
│ Bottom Nav                  │
└─────────────────────────────┘
```

**Desktop:**
```
┌──────┬────────────────────┬─────────────────┐
│ Side │ Topic header       │ Right panel      │
│ bar  │ Atomic Structure   │ Prerequisites    │
│      │                    │ ──────────────   │
│      │ [Generate Lesson]  │ States of Matter │
│      │ [Generate Quiz]    │ Basic Meas.      │
│      │ [Generate Cards]   │                  │
│      │                    │ Cross-Subject    │
│      │ Learning Obj. (3)  │ ──────────────   │
│      │ • ...              │ Math: Atomic#s   │
│      │ • ...              │ Chem: Periodic T │
│      │                    │                  │
│      │ Misconceptions     │ Exam Standards   │
│      │ • ...              │ WAEC Physics     │
│      │                    │ NECO Physics     │
└──────┴────────────────────┴─────────────────┘
```

### Key Interactions

| Interaction | Trigger | Response |
|---|---|---|
| Generate Lesson | Button tap | Navigate to Lesson Generator with nodeId pre-filled |
| Generate Quiz | Button tap | Navigate to Quiz Generator with nodeId pre-filled |
| Generate Flashcards | Button tap | Navigate to Flashcard Generator with nodeId pre-filled |
| Click prerequisite | Tap prerequisite link | Navigate to that topic's detail page |
| Click cross-subject | Tap connection | Navigate to that topic's detail page |

### Related Tab
Shows all connected nodes by relationship type:
- "Topics that teach before this"
- "Topics that teach after this"
- "Same concept in other subjects" (CROSS_SUBJECT)
- "Assessed together" (ASSESSED_BY same exam standard)

Each connection is clickable — the curriculum graph becomes navigable without the teacher knowing it's a graph.

---

## Components

| Component | Purpose |
|---|---|
| `SubjectSelector` | Dropdown for subject selection |
| `ClassLevelSegment` | JSS1–SS3 segmented control |
| `TermSegment` | First/Second/Third segmented control |
| `TopicCard` | Topic list item with metadata badges |
| `BloomsTag` | Colour-coded Bloom's taxonomy badge |
| `ExamStandardBadge` | WAEC / NECO / JAMB badge |
| `PrerequisiteChain` | Linked list of prerequisite topics |
| `CrossSubjectPanel` | Grid of cross-subject connections |
| `GenerateActionBar` | Primary CTAs (Lesson / Quiz / Flashcards) |

---

## Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| Mobile (<768px) | Single column list; tabs for Overview/Related; bottom nav |
| Tablet (768–1024px) | Two-column topic grid; side panel collapsed |
| Desktop (>1024px) | Two-column topic grid; right panel always visible |

## Accessibility

- [ ] Subject/class/term selectors keyboard-navigable
- [ ] Topic cards focusable with Enter to navigate
- [ ] Bloom's level badges have aria-labels
- [ ] Generate action buttons have descriptive labels (not just "Generate")
- [ ] Prerequisite and cross-subject links have descriptive link text
- [ ] Loading skeletons have aria-busy on the container

## Design Tokens
All colours via `@theme` CSS variables. No hardcoded values.
Difficulty badges: Easy = green token, Medium = amber token, Hard = red token.
Bloom's badges: each level uses a distinct hue from the design system palette.
