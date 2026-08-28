# TEACHNEXIS CURRICULUM SOURCE INTELLIGENCE REPORT

Audit scope: read-only inspection of `C:\Users\user\Downloads\NEW NERDC SCHEME, 2025.pdf` and the current TeachNexis repository. No database, production, migration, authentication, F6/F8, or F9 behavior was changed.

## PDF structure discovered

The artifact is a 428-page, unencrypted, text-readable PDF (`%PDF-1.5`, 2,212,365 bytes), produced by Microsoft Word 2016. It is organized as repeated `Week | Topic | Content` scheme-of-work tables, followed by lesson-note material near the end.

The recurring shape is:

```text
Class → Subject → Term → Week → Topic → Content / scope
```

The bounded pilot row is on PDF page 3:

```text
JSS 1 Mathematics · First Term · Week 1
Topic: Whole Numbers
Content: Place value, ordering, and properties of whole numbers.
```

Other rows include LCM, HCF, counting/conversion in base 2, fractions,
algebraic processes, geometry, statistics, revision, midterm tests/breaks,
examinations and closing/result-collection periods. Schedule rows are not
automatically learning objectives.

## Classes and subjects discovered

Classes represented: JSS1, JSS2, JSS3, SS1, SS2 and SS3.

Approximate subject-section counts are:

| Class | Headings | Subject families observed |
|---|---:|---|
| JSS1 | 31 | Mathematics, English Studies, Nigerian History, Intermediate Science, Digital Technologies, Business Studies, French, Cultural and Creative Arts, Christian Religious Studies, Physical and Health Education |
| JSS2 | 30 | Mathematics, English Studies, Nigerian History, Intermediate Science, Digital Technologies, Business Studies, French, Cultural & Creative Arts, Christian Religious Studies, Physical & Health Education |
| JSS3 | 28 | Mathematics, English Studies, Nigerian History, Intermediate Science, Digital Technologies, Business Studies, French, Cultural and Creative Arts, Christian Religious Studies, Social and Citizenship Studies |
| SS1 | 72 | Mathematics, Further Mathematics, English Studies, Biology, Chemistry, Physics, Agricultural Science, Geography, Government, Economics, Commerce, Financial Accounting, Marketing, Nigerian History, Christian Religious Studies, Citizenship and Heritage Studies, Digital Technologies, Food and Nutrition, Technical Drawing, Visual Arts, Literature in English, Beauty and Cosmetology, Livestock Farming, Catering and Craft Practice |
| SS2 | 66 | Mathematics, Further Mathematics, English Language, Biology, Chemistry, Physics, Agricultural Science, Geography, Government, Economics, Commerce, Financial Accounting, Marketing, Nigerian History, Christian Religious Studies, Digital Technologies, Food and Nutrition, Technical Drawing, Visual Arts, Beauty and Cosmetology, Livestock Farming, Catering and Craft |
| SS3 | 45 | Mathematics, Further Mathematics, English Language, Biology, Chemistry, Physics, Agricultural Science, Geography, Government, Economics, Commerce, Financial Accounting, Marketing, Nigerian History, Christian Religious Studies, Citizenship and Heritage Studies, Digital Technologies, Food and Nutrition, Technical Drawing, Visual Arts, Literature in English, Beauty and Cosmetology, Livestock Farming, Catering and Craft Practice |

Counts are headings, not canonical subjects. `English Studies`/`English
Language`, `Catering and Craft`/`Catering and Craft Practice`, and ampersand/
expanded CCA names require alias review.

## Terms, weeks and anomalies

Most sections contain First, Second and Third Term tables. Week ranges commonly
run 1–10/11–13 and include midterm tests, breaks, revision, examinations and
closing. Some sections have fewer term headings or different week ranges. Do
not assume missing weeks or terms.

Observed quality issues include inconsistent class/subject formatting, variable
week counts, table line-wrap artifacts, schedule rows without instructional
content, and no universal learning-objective column in the pilot table.

## Non-curriculum content

Near the end, pages labelled `SAMPLE LESSON NOTES – JSS1` contain lesson-note
prose and promotional text offering ready-to-use notes through WhatsApp, including
a phone number. Exclude these pages from canonical scheme extraction. They are
not evidence of NERDC issuance.

## Provenance assessment

**Document claim:** `JUNIOR SECONDARY ONE SCHEME OF WORK (NEW NERDC SCHEME, 2025)`;
the body covers JSS1–3 and SS1–3.

**Issuer evidence:** PDF metadata identifies `TEE VES-SEC` as author and
Microsoft Word 2016 as creator. There is no official NERDC URL, issuing letter,
ISBN, signed cover, or verifiable publisher record in the artifact.

**NERDC relationship:** currently unverifiable. Matching terminology does not
prove official issuance; the document may be derived, adapted, or merely labelled
with NERDC terminology.

**Recommended classification:** `UNVERIFIED_SOURCE`. If an institution verifies
authorship and usage, use `VERIFIED_INSTITUTIONAL_SCHEME`; do not classify it as
`OFFICIAL_CURRICULUM` on current evidence.

**Pilot usability:** academically usable for a bounded planning pilot: **YES**.
Usability is separate from official status.

## Existing TeachNexis architecture

Reusable infrastructure includes `Curriculum`, `CurriculumVersion`,
`CurriculumNode`, `CurriculumEdge`, F9C `CurriculumSource`, ingestion jobs,
staged items, provenance, stable keys, validation, review/approval/publication,
idempotency and stale-review protection. `QuestionVersionCurriculumAlignment`
supports reviewed question alignment. Bounded graph reads live in
`apps/web/lib/curriculum-graph.ts`; browser routes are under
`apps/web/app/(dashboard)/curriculum`.

Compatibility seams also exist in `Lesson`, `CurriculumPlan`, Question
`curriculumRef`/`topicTag`/`subTopicTag`, the curriculum engine, AI lesson prompts,
and the Question Bank.

## Gaps and contradictions

- F9C `CurriculumSourceType` has no explicit scheme-of-work value; `UNKNOWN` is
  safer than calling this artifact official.
- Provenance is version-level while staged items carry page/section; canonical
  node-level citation linkage is not explicit.
- Subject/class/term/week on nodes are optional compatibility dimensions and do
  not canonicalize aliases.
- Lessons, plans and legacy Question tags remain denormalized text.
- `seed-cig.sql` contains broad pre-authored curriculum and exam claims; it is
  not evidence for this PDF and must not auto-align it.
- Existing AI prompts claim Nigerian/WAEC/JAMB/JUPEB alignment without resolving
  a verified source scope; future generation must inject reviewed source context.
- Current curriculum UI browses canonical nodes but is not an ingestion/review UI.

## Proposed pipeline

```text
PDF → signature/MIME/size validation → page-bounded extraction
    → exclude promotional pages → deterministic table extraction
    → alias normalization → source citation → F9C staging
    → validation/conflict review → privileged approval
    → versioned canonical scope → derived intelligence overlay
```

Source rows remain immutable evidence. Any generated objectives, activities,
misconceptions, resources or questions must be separately marked
`AI_DERIVED` or `TEACHER_EDITED` and reviewed.

## Whole Numbers pilot mapping

| Source fact | Proposed mapping | Status |
|---|---|---|
| JSS 1 | `classLevel = JS1` | deterministic alias |
| Mathematics | subject context | verify subject alias |
| First Term | `term = FIRST` | deterministic |
| Week 1 | placement metadata | deterministic, not identity |
| Whole Numbers | `TOPIC` node | source-supported |
| Place value; ordering; properties of whole numbers | description/content scope | source-supported; not an objective |

No objective, prerequisite, activity, assessment, misconception or question
should be created from this row without a separate derived-content workflow.

## Recommended implementation phases

1. **F9D.2 source verification and bounded parser adapter:** verify issuer,
   register as an unverified scheme-of-work candidate, preserve page/table
   evidence, and stage only the pilot row.
2. **F9E controlled review/publication:** publish only after legitimate authority
   review.
3. **F9F source-bound intelligence overlay:** add derived/teacher-edited planning
   context without mutating source truth.
4. Later Question Bank/Lesson integration with reviewed filters and grounding.

## Required conclusions

### A. WHAT EXISTS

Versioned F9B/F9C graph and ingestion services, provenance fields, curriculum
browser, lesson/plan seams, and AI planning seams.

### B. WHAT THE PDF GIVES US

A large text-readable 2025 scheme compilation for JSS1–3 and SS1–3, with
week/topic/content tables. The bounded pilot gives explicit JSS1 Mathematics,
First Term, Week 1, Whole Numbers scope.

### C. WHAT IS MISSING

Verified issuer/licensing evidence, stable source IDs, subject-alias approval,
explicit objectives for the pilot row, and source-to-node citation linkage.

### D. WHAT SHOULD BE BUILT

A bounded source adapter and review workflow reusing F9C, preserving raw page
evidence, excluding promotional pages, and separating derived intelligence.

### E. WHAT SHOULD NOT BE BUILT

No bulk import, automatic official attribution, AI objectives, question
generation, mastery, Scheme of Work records, or destructive migration.

### F. EXACT FILES LIKELY TO CHANGE

Implementation only: `apps/web/lib/services/curriculum/ingestion.ts` or a
bounded parser adapter; a Development pilot script under `apps/web/scripts/`;
possibly the Prisma schema and an additive migration for source subtype/citation;
and future review components under `apps/web/app/(dashboard)/curriculum/`.

### G. PROPOSED WHOLE NUMBERS PILOT

Treat the supplied PDF as `UNVERIFIED_SOURCE`; stage exactly one JS1 →
Mathematics → First Term → Week 1 → Whole Numbers candidate with exact page/table
evidence. Require legitimate administrator review before publication. Do not
create objectives or questions.

### H. RECOMMENDED NEXT IMPLEMENTATION PROMPT

Implement a Development-only bounded source-recovery/staging phase. Verify issuer
evidence first; reuse F9C; parse only the Whole Numbers row; preserve page/table
evidence; classify the artifact as `UNVERIFIED_SOURCE` unless independent issuer
evidence is supplied; require legitimate human review; do not publish or generate
derived content without explicit approval.
