# UI: [Capability Name]

## Pages / Routes

| Route | Component | Purpose |
|---|---|---|
| `/[route]` | `[ComponentName]` | [What the teacher sees and does here] |

---

## Page: [Route]

### Purpose
What the teacher is trying to accomplish on this page.

### Layout
Describe the layout structure. Mobile-first.

```
[ASCII wireframe or written layout description]

Mobile (375px):
┌─────────────────────────┐
│ Header                  │
├─────────────────────────┤
│ [Content area]          │
│                         │
├─────────────────────────┤
│ Bottom Nav              │
└─────────────────────────┘

Desktop (md+):
┌──────┬──────────────────┐
│ Side │ Content area     │
│ bar  │                  │
└──────┴──────────────────┘
```

### States

**Loading state:**
[What the teacher sees while data is loading]

**Empty state:**
[What the teacher sees when there is no data yet — never a blank page]

**Populated state:**
[What the teacher sees with data]

**Error state:**
[What the teacher sees when something goes wrong — communicates what happened and what to do]

### Key Interactions

| Interaction | Trigger | Response |
|---|---|---|
| [Action] | [Teacher does this] | [System does this] |

### Components Used

| Component | Source | Purpose |
|---|---|---|
| [ComponentName] | shared / local | [What it does in this page] |

---

## Responsive Behaviour

| Breakpoint | Behaviour |
|---|---|
| Mobile (<768px) | [Description] |
| Tablet (768–1024px) | [Description] |
| Desktop (>1024px) | [Description] |

## Accessibility

- [ ] All interactive elements have accessible labels
- [ ] Colour contrast meets WCAG AA
- [ ] Keyboard navigation works for all primary actions
- [ ] Loading states communicated to screen readers

## Design Tokens Used

List Tailwind v4 `@theme` variables used in this capability's UI.
Do not use hardcoded colour values.
