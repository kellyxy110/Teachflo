# Testing: [Capability Name]

## Acceptance Criteria

The capability is considered complete when ALL of the following pass:

- [ ] [Criterion 1 — specific, measurable]
- [ ] [Criterion 2]
- [ ] [Criterion 3]
- [ ] Contract: all inputs validated correctly
- [ ] Contract: all outputs match guaranteed types and nullability
- [ ] Contract: all failure scenarios behave as specified
- [ ] Security: IDOR — resource in another school returns "not found"
- [ ] Security: invalid inputs are rejected with descriptive errors
- [ ] Security: no XSS vectors in user-controlled content

---

## Test Cases

### Happy Path

| Test | Input | Expected Output |
|---|---|---|
| [Test name] | [Input description] | [Expected result] |

### Validation Tests

| Test | Input | Expected Error |
|---|---|---|
| Invalid date format | `date: "01/01/2025"` | "Invalid date format" |
| Invalid enum | `status: "UNKNOWN"` | "Invalid [field]" |
| Oversized array | `records: [>500 items]` | "Invalid record count" |
| [Other] | [Input] | [Expected error] |

### Security Tests

| Test | Scenario | Expected Behaviour |
|---|---|---|
| IDOR — read | Request resource belonging to different school | "Not found" |
| IDOR — write | Write to resource belonging to different school | "Not found" |
| XSS | User input containing `<script>` | Escaped in all outputs |
| Unauthenticated | No session | 401 / auth error |

### Edge Cases

| Test | Scenario | Expected Behaviour |
|---|---|---|
| Empty data | No records exist | Empty state returned (not error) |
| Maximum limits | Array at cap | Accepted; beyond cap rejected |
| [Other edge case] | [Scenario] | [Expected] |

---

## AI Output Tests (if applicable)

| Test | Input | Quality Criterion |
|---|---|---|
| Completeness | Long-form generation request | No truncation mid-sentence |
| Format compliance | [Content type] request | Output matches specified structure |
| Curriculum alignment | Topic: [Subject/Class/Term/Topic] | Content references correct curriculum |

---

## Performance Targets

| Operation | Target | Measurement |
|---|---|---|
| [Primary operation] | < [Xms] at [N] concurrent users | [How to measure] |
| [Secondary operation] | < [Xms] | [How to measure] |

---

## Regression Checklist

When this capability is modified, verify these adjacent capabilities are unaffected:

- [ ] [Dependent capability 1]
- [ ] [Dependent capability 2]
- [ ] Authentication still enforced
- [ ] Data isolation still enforced
