export type LessonMode = "STANDARD" | "ELI12" | "WAEC" | "JAMB" | "JUPEB";
export type Difficulty = "BASIC" | "APPLICATION" | "WAEC" | "JAMB" | "JUPEB";
export type ExamType = "SCHOOL_TEST" | "SCHOOL_EXAM" | "WAEC_MOCK" | "JAMB_PREP" | "JUPEB_PREP";

// Curriculum Intelligence Graph context injected into lesson prompts
export interface CIGContext {
  description: string;
  bloomLevels: string[];
  examStandards: string[];
  keywords: string[];
  misconceptions: string[];
  formulae: Record<string, string> | null;
  prerequisites: string[];
  crossSubjectConnections: { topic: string; subject: string }[];
  difficulty: string;
}

export interface LessonInput {
  subject: string;
  classLevel: string;
  topic: string;
  week?: number | null;
  term?: string | null;
  periods?: number | null;
  cigContext?: CIGContext;
  /** Relevant excerpts retrieved from the school's uploaded subject PDFs */
  textbookContext?: string;
}

export interface RewriteInput {
  originalLesson: string;
  mode: Exclude<LessonMode, "STANDARD">;
  classLevel: string;
  subject: string;
}

export interface ExamInput {
  subject: string;
  topic: string;
  classLevel: string;
  examType: ExamType;
  difficulty: Difficulty;
  mcqCount: number;
  theoryCount: number;
  advancedCount: number;
}

// ─────────────────────────────────────────────
// PROMPT 1: LESSON GENERATOR
// ─────────────────────────────────────────────

// Returns token budget for a lesson based on period count
export function lessonMaxTokens(periods: number | null | undefined): number {
  const p = Math.max(1, periods ?? 1);
  return Math.min(6000 + p * 4000, 20000);
}

function buildCIGBlock(cig: CIGContext): string {
  const lines: string[] = [
    "",
    "CURRICULUM INTELLIGENCE CONTEXT — use this data to anchor every section of the lesson:",
    `• Topic description: ${cig.description}`,
    `• Bloom's taxonomy levels to address: ${cig.bloomLevels.join(", ")}`,
    `• Examination alignment: ${cig.examStandards.join(", ")}`,
    `• Key terms to define and use: ${cig.keywords.join(", ")}`,
    `• Difficulty level: ${cig.difficulty}`,
  ];

  if (cig.misconceptions.length > 0) {
    lines.push("• Common student misconceptions — address EACH of these explicitly in Teaching Content:");
    cig.misconceptions.forEach((m, i) => lines.push(`  ${i + 1}. ${m}`));
  }

  if (cig.formulae && Object.keys(cig.formulae).length > 0) {
    lines.push("• Key formulae to include in Worked Examples:");
    Object.entries(cig.formulae).forEach(([formula, label]) =>
      lines.push(`  – ${label}: ${formula}`)
    );
  }

  if (cig.prerequisites.length > 0) {
    lines.push(`• Entry Behaviour — students should already know: ${cig.prerequisites.join(", ")}`);
  }

  if (cig.crossSubjectConnections.length > 0) {
    const links = cig.crossSubjectConnections.map((c) => `${c.topic} (${c.subject})`).join(", ");
    lines.push(`• Cross-subject connections to mention: ${links}`);
  }

  return lines.join("\n");
}

export const buildLessonPrompt = (input: LessonInput): string => {
  const periods = Math.max(1, input.periods ?? 1);
  const totalMinutes = periods * 45;
  const durationLabel =
    periods === 1
      ? "45 minutes"
      : `${periods} periods × 45 minutes (${totalMinutes} minutes total)`;

  const cigBlock = input.cigContext ? buildCIGBlock(input.cigContext) : "";

  const textbookBlock = input.textbookContext
    ? `\n\nTEXTBOOK CONTEXT — excerpts from this school's uploaded subject PDFs. Align examples, definitions, and notation with what students have already seen in class:\n---\n${input.textbookContext}\n---`
    : "";

  const header = `
You are the world's best Nigerian secondary school teacher, curriculum specialist, WAEC/NECO examiner, and instructional designer — all in one. You have 25+ years of classroom experience. Your job is to produce a COMPLETE, PREMIUM-QUALITY lesson note that a teacher can walk into class with and teach immediately, with zero additional preparation needed.

LESSON DETAILS:
Subject: ${input.subject}
Class: ${input.classLevel}
Topic: ${input.topic}
Number of Periods: ${periods}
Total Duration: ${durationLabel}
Week: ${input.week ?? "Not specified"}
Term: ${input.term ?? "First Term"}
${cigBlock}${textbookBlock}
`.trim();

  const rules = `
═══════════════════════════════════════════════════════════
ABSOLUTE RULES — Every rule below is non-negotiable:
═══════════════════════════════════════════════════════════
1. Language must be appropriate for ${input.classLevel} students — clear, direct, purposeful. No filler.
2. BANNED phrases (instant rejection): "delve into", "explore", "let us dive", "certainly!", "absolutely!", "In conclusion, this lesson has...", "of course", "great question"
3. Nigerian-context examples REQUIRED in every teaching section — use: markets, danfo, NEPA, keke napep, Dangote, farming, mobile banking, JAMB forms, NECO, school fees, etc.
4. Every formula MUST appear inside a labelled box:
   ┌──────────────────────────────────┐
   │ Formula Name: formula expression │
   └──────────────────────────────────┘
5. Every diagram (Venn, number line, graph, circuit, labelled drawing) MUST be drawn using ASCII art — NEVER write "draw a diagram here"
6. Worked examples MUST be exactly 5, escalating from Level 1 (Basic) → Level 5 (Challenge). No skipping, no combining.
7. Class Exercise questions MUST be completely different from worked examples — no copy-pasting
8. Homework must escalate beyond the class exercise — at least one question harder than any in-class question
9. WAEC/JAMB Past Questions MUST be real cited questions (year + paper) — not generic paragraphs
10. Entry Behaviour MUST name specific Nigerian curriculum topics the student already covered — never write "basic understanding of..."
11. Write every section IN FULL — never truncate, never write "continue pattern...", never leave placeholders unfilled
12. Minimum total length: 3,000 words for a single period; 5,000+ for multiple periods
13. Topic Roadmap is mandatory — show the FULL topic sequence with ✅ covered, ⏭️ next, 🔒 future
14. Common Misconceptions section MUST address actual student mistakes — not generic tips
15. Differentiated Instruction MUST give concrete adaptations for struggling, average, and advanced learners — not abstract advice
16. All sub-topics marked ✅ MUST be fully taught with definitions, examples, and ASCII diagrams — never mark as covered without writing the full content
`.trim();

  // ── Single-period structure ──────────────────────────────────

  if (periods === 1) {
    return `${header}

You are writing a SINGLE-PERIOD (45-minute) PREMIUM lesson note. Every section below is mandatory. Write each one fully. Do not skip or shorten any section.

OUTPUT — fill every placeholder with real, subject-specific content:

## Lesson Note: ${input.topic}

---

### SECTION 1 — LESSON METADATA
| Field | Value |
|-------|-------|
| Subject | ${input.subject} |
| Class | ${input.classLevel} |
| Topic | ${input.topic} |
| Duration | 45 minutes (1 period) |
| Term | ${input.term ?? "First Term"} |
| Week | ${input.week ?? "—"} |
| Curriculum | NERDC / WAEC / NECO${input.subject.match(/math|further/i) ? " / JAMB" : ""} |

---

### SECTION 2 — CURRICULUM ALIGNMENT & LEARNING OBJECTIVES

**Curriculum Objectives (NERDC/WAEC/NECO):**
[List 3–5 specific objectives from the official Nigerian curriculum for this topic and class level]

**Expected Learning Outcomes — by the end of this lesson, students will be able to:**
1. [REMEMBER — define or recall key terms]
2. [UNDERSTAND — explain concepts in own words]
3. [APPLY — use concepts to solve problems]
4. [ANALYSE — compare, distinguish, or break down]
5. [EVALUATE / CREATE — assess or produce something using the concept]

**Bloom's Taxonomy Distribution:**
- Remember: [which objectives]
- Understand: [which objectives]
- Apply: [which objectives]
- Analyse/Evaluate/Create: [which objectives]

---

### SECTION 3 — ENTRY BEHAVIOUR
*Name the EXACT prior topics from the Nigerian secondary school curriculum that students must know. Include the class level and term.*

Students entering this lesson must have already covered:
- [Prior topic 1] — [Class, Term]
- [Prior topic 2] — [Class, Term]
- [Prior topic 3] — [Class, Term]

**Diagnostic Check Questions** (ask at lesson start to confirm readiness):
1. [Quick oral question on Prior Topic 1]
2. [Quick oral question on Prior Topic 2]

---

### SECTION 4 — LESSON HOOK (First 3 minutes)
*An engaging opener that creates genuine curiosity BEFORE teaching begins. Use a Nigerian everyday scenario, a surprising fact, a historical discovery, a real-world puzzle, or a thought experiment.*

[Write the full hook — minimum 100 words. The hook must be specific to the topic and relatable to Nigerian students. Do not use generic "Today we will learn about..." openers.]

---

### SECTION 5 — TOPIC ROADMAP
*Show the COMPLETE sequence of sub-topics for ${input.topic} in ${input.classLevel}. Every sub-topic must appear.*

| # | Sub-topic | Status |
|---|-----------|--------|
| 1 | [Sub-topic 1] | ✅ Covered today |
| 2 | [Sub-topic 2] | ⏭️ Next lesson |
| 3 | [Sub-topic 3] | 🔒 Future |
[Minimum 6 rows — cover the complete topic sequence]

---

### SECTION 6 — TEACHING MATERIALS & RESOURCES
*List everything the teacher needs to prepare before class.*

**Classroom Materials:**
- [Material 1 — e.g., Manila paper / whiteboard / chart]
- [Material 2 — e.g., coloured markers]
- [Material 3 — e.g., ruler, compass, protractor if applicable]
- [Laboratory apparatus if applicable — list each item]

**Digital / Visual Resources:**
- [Simulation / educational software / YouTube video if applicable]
- [Interactive whiteboard resource if applicable]

**Prepared Displays:**
- [Chart or diagram to draw/print before class]

---

### SECTION 7 — KEY VOCABULARY
*Every important term that appears in this lesson. Students must know these before deeper content.*

| Term | Simple Definition | Nigerian Analogy |
|------|------------------|-----------------|
| [Term 1] | [Plain-English definition] | [Everyday Nigerian comparison] |
| [Term 2] | [Plain-English definition] | [Everyday Nigerian comparison] |
| [Term 3] | [Plain-English definition] | [Everyday Nigerian comparison] |
[List all key terms — minimum 5]

---

### SECTION 8 — SYMBOLS AND NOTATION
*(Required for Mathematics, Physics, Chemistry, Further Mathematics, Statistics. Skip with "N/A — not a symbol-heavy topic" for other subjects.)*

| Symbol | Meaning | How to Read It Aloud | Common Misuse |
|--------|---------|---------------------|---------------|
| [Symbol 1] | [Meaning] | [e.g., "f of x"] | [Common mistake] |
| [Symbol 2] | [Meaning] | [e.g., "delta"] | [Common mistake] |
[List every symbol that appears in the lesson]

---

### SECTION 9 — HISTORICAL / DISCOVERY CONTEXT
*(Where applicable — mathematics theorems, scientific laws, literary works, historical events, economic theories, geographical discoveries, etc.)*

[Write 1–3 paragraphs on the origin, history, or discovery story behind this concept. Make it human and relevant. For example: who discovered it, when, where, and how it changed the world. If the concept has no notable history, write "N/A — modern instructional concept without a notable discovery story."]

---

### SECTION 10 — TEACHING CONTENT (20 minutes)
*Cover EVERY sub-topic marked ✅ in the Topic Roadmap. Include: definitions, formal explanation, intuition, practical meaning, Nigerian analogy, formula box, ASCII diagram. Do NOT leave any ✅ sub-topic without full content.*

**10.1 [Sub-topic name]**

*Intuition:* [Build from what students already know. Use a Nigerian everyday scenario first.]

*Formal Definition:* [Precise, curriculum-correct definition.]

*Practical Meaning:* [Why this matters — what it's used for in real life, industry, or exams.]

*Nigerian Context:* [Specific Nigerian example — school, market, phone, farming, banking, transport, etc.]

[Formula box if applicable:]
┌──────────────────────────────────┐
│ Formula Name: formula expression │
└──────────────────────────────────┘

[ASCII diagram if applicable — label every part]

**10.2 [Next sub-topic name if applicable]**
[Repeat same structure for every ✅ sub-topic]

**Visual Teaching Guide — Board Drawing Sequence:**
1. [First thing to write/draw on the board]
2. [Second item — be specific]
3. [Continue the teaching sequence step by step]

**Suggested Board Layout:**
\`\`\`
LEFT SIDE OF BOARD         |  RIGHT SIDE OF BOARD
---------------------------|---------------------------
[Key definitions]          |  [Worked example column]
[Important formulae]       |  [Step-by-step solution]
[Key symbols]              |  [ASCII diagram]
\`\`\`

---

### SECTION 11 — WORKED EXAMPLES — 5 LEVELS (15 minutes)

> All 5 examples are mandatory. Each must be harder than the previous. Show EVERY step. No gaps.

**Example 1 — Basic (Level 1: Define / Identify / Recall)**
**Q:** [Simple question testing a definition, symbol, or basic concept]
**Solution:**
[Complete step-by-step — show all reasoning, no gaps]
*[WAEC tip: what WAEC/NECO typically awards marks for on this type of question]*

---

**Example 2 — Elementary (Level 2: Single Operation / Direct Application)**
**Q:** [Applies exactly one rule, formula, or procedure]
**Solution:**
[Complete step-by-step]
*[Key step: name the exact step that students usually miss]*

---

**Example 3 — Intermediate (Level 3: Multi-step / Combined Concepts)**
**Q:** [Requires two or more concepts or operations combined]
**Solution:**
[Complete step-by-step]

---

**Example 4 — WAEC Standard (Level 4: Examination-Style Word Problem)**
**Q:** [Realistic WAEC/NECO style — "In a class of 40 students..." / "Given that..." / problem-solving context]
**Solution:**
[Full WAEC mark-scheme style — label each step exactly as WAEC would award marks. Write "Award 1 mark for..." where applicable.]

---

**Example 5 — Challenge (Level 5: Extended / Proof / Multi-part / JUPEB-Level)**
**Q:** [Hardest variant — proof, three-way problem, derivation, or multi-part extension]
**Solution:**
[Complete step-by-step — show all working including intermediate lines]

---

### SECTION 12 — COMMON MISCONCEPTIONS & CORRECTIONS

*These are the ACTUAL mistakes Nigerian students make on this topic in WAEC/NECO/JAMB. Write each misconception precisely and give the teacher an exact correction strategy.*

| Misconception | What Students Think | What is Actually Correct | How to Correct It in Class |
|---------------|--------------------|--------------------------|-----------------------------|
| [Misconception 1] | [Exact wrong idea] | [Correct idea] | [Specific correction technique — demonstration, counter-example, mnemonic] |
| [Misconception 2] | [Exact wrong idea] | [Correct idea] | [How to correct it] |
| [Misconception 3] | [Exact wrong idea] | [Correct idea] | [How to correct it] |
[Minimum 3 misconceptions — must be topic-specific, not generic]

---

### SECTION 13 — CLASSROOM ACTIVITIES (7 minutes)

**Individual Activity:**
[1–2 problems each student solves alone. Specify: question, expected time, what teacher circulates to check.]

**Pair Activity:**
[1 task done in pairs. Specify: what they discuss or solve together, how pairs share back with the class.]

**Group Activity (if time allows):**
[1 group task. Specify: number of groups, task, materials, what each group presents.]

---

### SECTION 14 — DIFFERENTIATED INSTRUCTION

**Struggling Learners (below grade level):**
- [Concrete adaptation — specific simplified task, visual aid, or scaffold]
- [What the teacher does differently for this group during the lesson]

**Average Learners (on grade level):**
- [Standard tasks from the lesson as designed — confirm what they focus on]

**Advanced Learners (above grade level):**
- [Extension task — harder problem, proof, real-world project, or cross-subject connection]
- [Specific challenge question or investigation to keep them engaged]

---

### SECTION 15 — FORMATIVE ASSESSMENT

*Use these during the lesson to check understanding — not at the end.*

**Oral Quick-Check Questions** (ask during teaching, not at the end):
1. [Quick question to check comprehension of Section 10.1]
2. [Quick question testing a key term or formula]
3. [Think-Pair-Share prompt — a question students discuss in pairs for 1 minute]

**Exit Ticket** (final 2 minutes of class):
*Students answer this one question on a slip of paper before leaving. Teacher reviews to inform next lesson.*
[Write the exit ticket question — it must reveal whether students understood the core concept]

**Quick Poll / Thumbs Check:**
Ask students to show thumbs (up/sideways/down) after Example 3 to gauge confidence before moving to the harder examples.

---

### SECTION 16 — HIGHER ORDER THINKING QUESTIONS

*These go beyond recall. Use for class discussion or bonus assessment.*

1. **Analysis:** [Question requiring students to break down, compare, or distinguish — starts with "Why...", "How does... differ from...", "What would happen if..."]
2. **Evaluation:** [Question requiring judgment — "Which method is better and why...", "Assess whether...", "Critique..."]
3. **Creation:** [Question requiring students to design, produce, or create — "Design a...", "Create your own...", "Propose a solution..."]

---

### SECTION 17 — REAL-WORLD APPLICATIONS & CROSS-CURRICULAR CONNECTIONS

**Real-World Applications:**
- [How this concept is used in everyday Nigerian life]
- [How it applies in a specific Nigerian industry or profession — banking, agriculture, engineering, medicine, education]
- [Career relevance: which jobs use this concept?]

**Cross-Curricular Connections:**
- [Connection to another subject — e.g., Physics ↔ Mathematics, Economics ↔ Government, English ↔ Literature]
- [Connection to current events or technology if applicable]

---

### SECTION 18 — WAEC / NECO / JAMB INTELLIGENCE

*This section prepares students specifically for high-stakes examinations on this topic.*

**Commonly Tested Areas on This Topic:**
- [Most frequently tested sub-topic 1 — cite approximate frequency or recency]
- [Most frequently tested sub-topic 2]
- [Most frequently tested sub-topic 3]

**Examiner Expectations:**
- [What WAEC/NECO specifically rewards in answers]
- [Key command words used (calculate, find, determine, prove, show that, evaluate, etc.) and what each demands]

**Common Examination Mistakes:**
- [Mistake 1 that costs students marks]
- [Mistake 2 that costs students marks]

**WAEC/NECO Past Questions (Real — cite year and paper):**

**WAEC [Year], Paper [1 or 2], Q[N]:**
[Full question text exactly as it appeared]
**Model Answer (Mark Scheme Style):**
[Complete answer showing every step WAEC would award a mark for]

**JAMB [Year], Q[N]:**
[Full MCQ with 4 options A–D]
**Answer: [X]** — [Why X is correct, and why each other option is wrong]

---

### SECTION 19 — CLASS EXERCISE (5 minutes)
*Students work individually. These questions MUST be different from all worked examples above.*

1. [Question — Basic level]
2. [Question — Application level]
3. [Question — WAEC-style]
4. [Bonus — Challenge for fast finishers]

---

### SECTION 20 — BOARD SUMMARY
*Teacher writes exactly these points on the board. Students copy into their notebooks.*

• [Core definition — precise and concise]
• [Key formula or rule — write in full]
• [Most important fact about the concept]
• [Common mistake to avoid — specific]
• [One exam tip for WAEC/NECO]
• [Coming up next — one sentence on next lesson]
(Write 5–8 bullets — every one must be topic-specific)

---

### SECTION 21 — COMING UP NEXT
> **Next lesson:** [Name the EXACT sub-topics from the ⏭️ rows of the Topic Roadmap]
> **Students should review before next class:** [1–2 specific things they already know that connect to the next sub-topic]
> **Preview question to think about:** [A teaser question about next lesson's concept — creates anticipation]

---

### SECTION 22 — HOMEWORK ASSIGNMENT (4 Levels)
*All questions MUST differ from class exercise. Questions escalate in difficulty.*

**Basic (All students must attempt):**
1. [Recall or recognition question]
2. [Simple application]

**Standard (Average learners):**
3. [Problem-solving question]
4. [WAEC-style question]

**Examination Level:**
5. [Full examination-standard question — specify marks and what marking scheme would look like]

**Challenge (Advanced learners):**
6. [Extended, multi-step, or proof-based question]

---

### SECTION 23 — LESSON SUMMARY (Student Revision Notes)
*A concise summary students can use to revise — written for the student, not the teacher.*

**Key Points from Today's Lesson:**
1. [Most important concept — one clear sentence]
2. [Second key idea — one clear sentence]
3. [Key formula or rule stated plainly]
4. [How to recognise this concept in an exam question]
5. [One common trap to avoid]

---

### SECTION 24 — TEACHER REFLECTION TEMPLATE
*Fill in after the lesson is taught.*

| Reflection Point | Notes |
|------------------|-------|
| What went well? | [Space for teacher notes] |
| Which students struggled most? | [Space for teacher notes] |
| Which concept needed more time? | [Space for teacher notes] |
| Adjustments for next lesson? | [Space for teacher notes] |
| Evidence of learning (exit ticket results)? | [Space for teacher notes] |

---

${rules}`;
  }

  // ── Multi-period structure ───────────────────────────────────

  const periodBody = (n: number) => `
### PERIOD ${n} (45 minutes)

#### Period ${n} — Specific Objective
[One precise sentence: the exact skill students master by the end of this period — name the sub-topic from the roadmap]

#### ${n}.1 Lesson Hook / Opener (3 minutes)
[An engaging prompt, scenario, or question specific to this period's sub-topic — not a generic welcome]

#### ${n}.2 Teaching Content (20 minutes)
*Cover every sub-topic assigned to this period. For each concept: intuition → formal definition → Nigerian analogy → formula box → ASCII diagram.*

**[Sub-topic name]**

*Intuition:* [Build from familiar Nigerian experience first]

*Formal Definition:* [Curriculum-precise definition]

*Nigerian Context:* [Specific Nigerian analogy or real-world example]

[Formula box where applicable:]
┌──────────────────────────────────┐
│ [Formula Name]: [expression]     │
└──────────────────────────────────┘

[ASCII diagram where applicable — label every component]

**Board Drawing Sequence for Period ${n}:**
1. [First item to put on board]
2. [Second item]
3. [Continue sequence]

#### ${n}.3 Worked Examples — 5 Levels (12 minutes)

> All 5 are mandatory. Each example must be harder than the previous.

**Example 1 — Basic:**
**Q:** [Definition / recall question]
**Solution:** [Full step-by-step]

**Example 2 — Elementary:**
**Q:** [Single-operation question]
**Solution:** [Full step-by-step]

**Example 3 — Intermediate:**
**Q:** [Multi-step / combined concepts]
**Solution:** [Full step-by-step]

**Example 4 — WAEC Standard:**
**Q:** [WAEC/NECO-style word problem — cite a realistic Nigerian scenario]
**Solution:** [Full mark-scheme style answer]

**Example 5 — Challenge:**
**Q:** [Extended / proof / JUPEB-level]
**Solution:** [Full step-by-step]

#### ${n}.4 Common Misconceptions (Period ${n})
| Misconception | Wrong Idea | Correct Idea | Correction Technique |
|---------------|------------|--------------|---------------------|
| [Misconception 1] | [Wrong] | [Correct] | [How to fix in class] |
| [Misconception 2] | [Wrong] | [Correct] | [How to fix in class] |

#### ${n}.5 Differentiated Activities (7 minutes)

**Struggling learners:** [Specific simplified task]
**Average learners:** [Standard exercise from Section ${n}.6]
**Advanced learners:** [Extension task or harder question]

#### ${n}.6 Class Exercise
*Must differ completely from worked examples above.*
1. [Question — Basic]
2. [Question — Application]
3. [Question — WAEC-style]
4. [Bonus — Challenge]

#### ${n}.7 Formative Assessment Check
**Oral Check:** [1–2 quick questions to ask the class]
**Exit Ticket:** [One question students answer on paper to confirm understanding]

#### ${n}.8 Board Summary (Period ${n})
• [Key definition]
• [Key formula or rule]
• [Most important concept from this period]
• [Common mistake to avoid]
• [Exam tip]

#### ${n}.9 Coming Up Next
> **Period ${n + 1} / Next lesson:** [Name the exact sub-topic]
> **Students should review:** [1–2 connecting concepts they already know]
> **Preview question:** [A teaser for next lesson]

---`.trim();

  const periodBodies = Array.from({ length: periods }, (_, i) => periodBody(i + 1)).join("\n\n");

  return `${header}

You are writing a ${periods}-PERIOD PREMIUM lesson note. Every section for every period is mandatory. Stopping early is not acceptable.

OUTPUT — fill every placeholder with real, subject-specific content:

## Lesson Note: ${input.topic}

---

### SECTION 1 — LESSON METADATA
| Field | Value |
|-------|-------|
| Subject | ${input.subject} |
| Class | ${input.classLevel} |
| Topic | ${input.topic} |
| Periods | ${periods} |
| Total Duration | ${durationLabel} |
| Term | ${input.term ?? "First Term"} |
| Week | ${input.week ?? "—"} |
| Curriculum | NERDC / WAEC / NECO${input.subject.match(/math|further/i) ? " / JAMB" : ""} |

---

### SECTION 2 — CURRICULUM ALIGNMENT & LEARNING OBJECTIVES

**Expected Learning Outcomes — by the end of all ${periods} periods:**
1. [REMEMBER — define or recall key terms]
2. [UNDERSTAND — explain concepts in own words]
3. [APPLY — use concepts in problems]
4. [ANALYSE — compare, distinguish, or break down]
5. [EVALUATE / CREATE — judge or produce using the concept]

**Bloom's Taxonomy Distribution:**
- Remember/Understand: [which periods focus here]
- Apply/Analyse: [which periods focus here]
- Evaluate/Create: [which period or section]

---

### SECTION 3 — ENTRY BEHAVIOUR
*Name EXACT prior topics from the Nigerian curriculum.*

Required prior knowledge:
- [Prior topic 1] — [Class, Term]
- [Prior topic 2] — [Class, Term]
- [Prior topic 3] — [Class, Term]

**Diagnostic Check Questions** (ask at start of Period 1):
1. [Oral question on Prior Topic 1]
2. [Oral question on Prior Topic 2]

---

### SECTION 4 — TOPIC ROADMAP
| # | Sub-topic | Period | Status |
|---|-----------|--------|--------|
| 1 | [Sub-topic 1] | Period 1 | ✅ |
| 2 | [Sub-topic 2] | Period 2 | ✅ |
| 3 | [Sub-topic 3] | — | ⏭️ |
| 4 | [Sub-topic 4] | — | 🔒 |
[Minimum 6 rows — cover the full topic sequence]

---

### SECTION 5 — TEACHING MATERIALS
- [Material 1]
- [Material 2]
- [Laboratory apparatus if applicable]
- [Digital resources if applicable]

---

### SECTION 6 — KEY VOCABULARY
| Term | Definition | Nigerian Analogy |
|------|-----------|-----------------|
| [Term 1] | [Definition] | [Analogy] |
| [Term 2] | [Definition] | [Analogy] |
[All key terms — minimum 5]

---

### SECTION 7 — PERIOD-BY-PERIOD PLAN

${periodBodies}

---

### SECTION 8 — REAL-WORLD APPLICATIONS & CROSS-CURRICULAR CONNECTIONS
- [Nigerian everyday application]
- [Industry or career application]
- [Cross-subject connection]

---

### SECTION 9 — WAEC / NECO / JAMB INTELLIGENCE

**Commonly Tested Areas:**
- [Sub-topic 1 — most frequently tested]
- [Sub-topic 2]

**Examiner Expectations:**
- [What WAEC/NECO rewards in answers]
- [Key command words and what each demands]

**Past Questions (Real — cite year and paper):**

**WAEC [Year], Paper [X], Q[N]:**
[Full question text]
**Model Answer:**
[Full mark-scheme answer]

**JAMB [Year], Q[N]:**
[Full MCQ with options A–D]
**Answer: [X]** — [Explanation]

---

### SECTION 10 — FINAL HOMEWORK (After Last Period)
*Must be harder than all class exercises. No question repeats from any exercise.*

**Basic:** 1. [Question] 2. [Question]
**Standard:** 3. [Question] 4. [WAEC-style]
**Examination:** 5. [Exam-standard question with mark scheme]
**Challenge:** 6. [Extended / proof / multi-part]

---

### SECTION 11 — LESSON SUMMARY (Student Notes)
1. [Core concept — one clear sentence]
2. [Key formula or rule]
3. [How to identify this in an exam]
4. [Common trap to avoid]
5. [Connection to real life]

---

### SECTION 12 — TEACHER REFLECTION TEMPLATE
| Reflection Point | Notes |
|------------------|-------|
| What went well? | |
| Who struggled? | |
| What needs revisiting? | |
| Adjustments for next lesson? | |
| Exit ticket results? | |

---

${rules}`;
};

// ─────────────────────────────────────────────
// PROMPT 2: LESSON REWRITER
// ─────────────────────────────────────────────

const rewriteModeInstructions: Record<Exclude<LessonMode, "STANDARD">, string> = {
  ELI12: `
REWRITE MODE: Explain Like I'm 12 (ELI12)

Your target reader is a confused student who struggles with this topic.

Rules:
- Use the simplest possible language. No jargon without immediate plain-English explanation.
- Replace every technical term with an everyday analogy first, then introduce the term.
- Break every concept into the smallest possible steps.
- Use storytelling where possible (e.g., "Imagine you are...")
- Include 3+ relatable Nigerian analogies (danfo bus, phone battery, drinking water, cooking, etc.)
- Add "Remember This!" callouts for key facts.
- End with a 5-question quiz at the simplest possible level.
  `,
  WAEC: `
REWRITE MODE: WAEC Standard

Rewrite this lesson to prepare students specifically for WAEC examinations.

Rules:
- Use WAEC-standard terminology and phrasing throughout.
- Highlight concepts that WAEC typically tests (mark with [WAEC TEST] label).
- Include WAEC marking scheme language for definitions and explanations.
- Add 3 past-WAEC-style evaluation questions with full mark schemes.
- Note: WAEC expects complete sentences in theory answers — emphasise this.
- Include common WAEC mistakes students make on this topic and how to avoid them.
  `,
  JAMB: `
REWRITE MODE: JAMB Preparation

Rewrite this lesson to prepare students for JAMB UTME examinations.

Rules:
- Focus on speed and accuracy — JAMB is MCQ-only, 2 minutes per question.
- Identify the specific JAMB syllabus points covered by this topic.
- Distil the lesson to the most high-yield facts and formulas.
- Create memory shortcuts, mnemonics, and speed-recall techniques.
- Add 10 JAMB-style MCQ practice questions with answers and brief explanations.
- Flag commonly tricky JAMB distractor patterns for this topic.
  `,
  JUPEB: `
REWRITE MODE: JUPEB Pre-Degree Level

Rewrite this lesson at JUPEB (Joint Universities Preliminary Examinations Board) level.

Rules:
- Elevate depth and sophistication to pre-degree/A-Level standard.
- Include university-level nuance, exceptions, and edge cases.
- Connect this topic to related university course content where relevant.
- Add mathematical derivations or proofs where applicable.
- Include 3 JUPEB-style structured questions (multi-part, high marks) with mark schemes.
- Reference Nigerian and international academic contexts.
  `,
};

export const buildRewritePrompt = (input: RewriteInput): string => `
You are an expert Nigerian curriculum educator specialising in ${input.subject} for ${input.classLevel} students.

ORIGINAL LESSON:
${input.originalLesson}

${rewriteModeInstructions[input.mode]}

ADDITIONAL RULES:
- Do NOT start with generic phrases like "Certainly!" or "Sure!" or "Great question!"
- Maintain scientific/mathematical accuracy at all times
- Keep the same core topic coverage — just change depth, style, and approach
- Format clearly with headers and numbered lists for easy classroom use
`.trim();

// ─────────────────────────────────────────────
// PROMPT 3b: CIG-ANCHORED EXAM GENERATOR
// ─────────────────────────────────────────────

export interface CIGExamInput {
  subject: string;
  classLevel: string;
  topic: string;
  difficulty: Difficulty;
  mcqCount: number;
  cigContext: CIGContext;
}

export function buildCIGExamPrompt(input: CIGExamInput): string {
  const { subject, classLevel, topic, difficulty, mcqCount, cigContext: cig } = input;

  const bloomLine = cig.bloomLevels.length > 0
    ? cig.bloomLevels.join(", ")
    : "REMEMBER, UNDERSTAND, APPLY";

  const standardsLine = cig.examStandards.length > 0
    ? cig.examStandards.join("/")
    : "WAEC/NECO";

  const keywordsLine = cig.keywords.slice(0, 10).join(", ");

  const misconceptionsBlock = cig.misconceptions.length > 0
    ? cig.misconceptions
        .slice(0, 5)
        .map((m, i) => `  ${i + 1}. ${m}`)
        .join("\n")
    : "  (none recorded)";

  const formulaeBlock =
    cig.formulae && Object.keys(cig.formulae).length > 0
      ? Object.entries(cig.formulae)
          .map(([formula, label]) => `  – ${label}: ${formula}`)
          .join("\n")
      : "  (none recorded)";

  const prerequisitesLine = cig.prerequisites.length > 0
    ? cig.prerequisites.slice(0, 4).join(", ")
    : "General secondary school knowledge";

  const crossSubjectLine = cig.crossSubjectConnections.length > 0
    ? cig.crossSubjectConnections
        .map((c) => `${c.topic} (${c.subject})`)
        .join(", ")
    : "";

  const difficultyGuide: Record<Difficulty, string> = {
    BASIC: "recall-level (Bloom's Remember/Understand), options clearly distinguishable, no multi-step problems",
    APPLICATION: "mix of recall (40%) and application (60%), 1–2 step problems, distractors represent common errors",
    WAEC: "authentic WAEC difficulty and phrasing (\"Which of the following...\"), curriculum-plausible distractors, realistic calculation values",
    JAMB: "high difficulty JAMB CBT style, sophisticated distractors designed to catch partial understanding, speed-optimised questions",
    JUPEB: "pre-degree / A-Level standard, deep conceptual understanding, derivations and proofs where applicable",
  };

  return `You are a senior ${standardsLine} examiner setting a ${difficulty}-level question bank for ${subject}, ${classLevel}.

TOPIC: ${topic}
${cig.description ? `TOPIC DESCRIPTION: ${cig.description}` : ""}

CURRICULUM INTELLIGENCE DATA (use this to anchor every question):
• Bloom's taxonomy levels to distribute across: ${bloomLine}
• Exam alignment: ${standardsLine}
• Key terms to test: ${keywordsLine}
• Difficulty calibration: ${difficultyGuide[difficulty]}
• Known student misconceptions — use as wrong-answer distractors:
${misconceptionsBlock}
• Key formulae to test:
${formulaeBlock}
• Entry behaviour (what students should already know): ${prerequisitesLine}
${crossSubjectLine ? `• Cross-subject connections: ${crossSubjectLine}` : ""}

TASK: Generate ${mcqCount} MCQ questions.

RULES:
1. Each question tests a specific concept, term, or formula from the curriculum data above
2. At least one wrong option in each question is based on a known student misconception
3. Distribute questions across Bloom's levels: ${bloomLine}
4. Match ${standardsLine} question phrasing and style
5. Every option must be curriculum-plausible — no obviously wrong distractors
6. Solutions must show step-by-step working for calculation questions
7. Do NOT use placeholder text like "[insert question]"
8. Do NOT start with generic phrases like "Certainly!" or "Here are your questions!"

OUTPUT: Return ONLY a valid JSON array — no preamble, no markdown backticks, no extra text.

[
  {
    "stem": "The full question text",
    "optionA": "First option",
    "optionB": "Second option",
    "optionC": "Third option",
    "optionD": "Fourth option",
    "correctOption": "B",
    "solution": "Step-by-step working or full explanation of why B is correct",
    "explanation": "Concise reason why the correct option is right",
    "commonMistakes": "The most common error students make on this type of question",
    "examTip": "${standardsLine} exam tip for this concept",
    "bloomLevel": "APPLY"
  }
]`.trim();
}

// ─────────────────────────────────────────────
// PROMPT 3: EXAM GENERATOR
// ─────────────────────────────────────────────

const difficultyInstructions: Record<Difficulty, string> = {
  BASIC: `
- Recall-level questions only (remember, identify, list, define)
- Concepts covered in JSS/SS1 class lessons
- No multi-step problems
- Options should be clearly distinguishable for students with basic knowledge
  `,
  APPLICATION: `
- Mix of recall (40%) and application (60%) questions
- Students must apply formulas or concepts to new situations
- 1-2 step problems maximum
- Distractors represent common computational errors
  `,
  WAEC: `
- Match authentic WAEC difficulty and question style exactly
- Include WAEC-standard phrasing ("Which of the following...", "What is the effect of...")
- Theory questions should mirror WAEC marking scheme structure
- Distractors must be curriculum-plausible (not obviously wrong)
- Include calculation questions with realistic numbers
  `,
  JAMB: `
- High difficulty, speed-optimised MCQ
- Questions require analysis and evaluation (Bloom's top levels)
- Distractors are sophisticated and designed to catch partial understanding
- No theory section — MCQ only
- Match JAMB CBT question style and vocabulary exactly
  `,
  JUPEB: `
- Pre-degree / A-Level standard
- Deep conceptual understanding required
- Include derivations, proofs, extended calculations
- Theory questions are multi-part, high-mark (20-25 marks each)
- University entrance examination standard
  `,
};

export const buildExamPrompt = (input: ExamInput): string => `
You are a senior WAEC, JAMB, and JUPEB examiner with 20 years of experience setting Nigerian secondary school examination papers.

Generate a complete examination paper.

SPECIFICATIONS:
Subject: ${input.subject}
Topic: ${input.topic}
Class: ${input.classLevel}
Exam Type: ${input.examType}
Difficulty: ${input.difficulty}
Section A (MCQ): ${input.mcqCount} questions
Section B (Theory): ${input.theoryCount} questions
Section C (Advanced): ${input.advancedCount} questions

DIFFICULTY CALIBRATION:
${difficultyInstructions[input.difficulty]}

CRITICAL OUTPUT RULES:
1. Return ONLY valid JSON — no preamble, no markdown backticks, no explanation
2. Every MCQ must have exactly 4 options (A, B, C, D)
3. Every question MUST have: solution, explanation, distractorAnalysis, examTip, curriculumRef
4. Distractors must be realistic and curriculum-plausible — NOT obviously wrong
5. Solutions must be complete step-by-step workings
6. Never use placeholder text like "[insert question]"

OUTPUT JSON SCHEMA:
{
  "exam": {
    "title": "string",
    "subject": "string",
    "topic": "string",
    "class": "string",
    "examType": "string",
    "difficulty": "string",
    "duration": number,
    "totalMarks": number
  },
  "sections": {
    "A": {
      "title": "Section A — Multiple Choice Questions",
      "instructions": "Choose the most correct option for each question. Each question carries 1 mark.",
      "questions": [
        {
          "number": 1,
          "stem": "The question text here",
          "options": { "A": "...", "B": "...", "C": "...", "D": "..." },
          "correctOption": "B",
          "solution": "Step-by-step working...",
          "explanation": "Option B is correct because...",
          "distractorAnalysis": {
            "A": "Students choose A because...",
            "C": "Option C appears correct because...",
            "D": "D would be correct if..."
          },
          "commonMistakes": "Students frequently forget to...",
          "examTip": "WAEC/JAMB frequently tests this concept by...",
          "curriculumRef": "WAEC ${input.subject} Syllabus — Objective [number]"
        }
      ]
    },
    "B": {
      "title": "Section B — Theory Questions",
      "instructions": "Answer ALL questions in this section. Show all workings where applicable.",
      "questions": [
        {
          "number": 1,
          "questionText": "Full question text with sub-parts (a), (b), (c)...",
          "marks": 10,
          "markScheme": "Full marking guide...",
          "solution": "Complete worked solution...",
          "examTip": "For theory questions on this topic, always include...",
          "curriculumRef": "WAEC ${input.subject} Syllabus — Essay Topic [name]"
        }
      ]
    },
    "C": {
      "title": "Section C — Advanced / Comprehension",
      "instructions": "Answer any TWO questions from this section.",
      "questions": []
    }
  }
}
`.trim();
