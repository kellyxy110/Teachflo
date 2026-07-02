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
  return Math.min(5000 + p * 3500, 16000);
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
    ? `\n\nTEXTBOOK CONTEXT — excerpts from this school's uploaded subject PDFs. Use this content to align examples, definitions, and notation with what students have already seen in class:\n---\n${input.textbookContext}\n---`
    : "";

  const header = `
You are a senior Nigerian secondary school teacher writing a classroom-ready lesson note. You have 20+ years of experience with WAEC, NECO, and JAMB marking schemes.

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
STRICT RULES — violating any of these means the lesson note is rejected:
1. Language must suit ${input.classLevel} students — clear, direct, no waffle
2. BANNED phrases: "delve into", "explore", "let us dive", "certainly!", "absolutely!", "In conclusion, this lesson has..."
3. Nigerian-context analogies REQUIRED in teaching content (markets, keke, NEPA, farming, dangote, etc.)
4. Every formula MUST appear in a labelled box like this:
   ┌──────────────────────────────────┐
   │ Formula Name: formula expression │
   └──────────────────────────────────┘
5. Every diagram (Venn, number line, graph, circuit, table) MUST be drawn using ASCII art — never say "draw a diagram here"
6. Worked examples MUST be exactly 5, graduated Level 1 → Level 5 — do not combine or skip any level
7. Class Exercise questions MUST be different from worked examples — never copy-paste
8. Homework MUST be different from class exercises, and at least one question must be harder than any class exercise question
9. The WAEC/JAMB Past Questions section MUST contain real questions with year and paper cited — not generic advice paragraphs
10. Entry Behaviour MUST name specific prior topics from the Nigerian curriculum — never write "basic understanding of mathematics"
11. Write every section in FULL — never truncate, summarise, or say "continue pattern..."
12. Minimum total length: 2,000 words. More is better.
13. TOPIC ROADMAP is mandatory — list every sub-topic in the full topic sequence, mark covered ones with ✅, mark next ones with ⏭️
14. COMING UP NEXT is mandatory at the end of every period — name the exact sub-topics students will study in the next lesson/period
15. ALL sub-topics assigned to each period MUST be fully taught with definitions, examples, and exercises — never mark a sub-topic as covered without writing the full content for it
`.trim();

  // Reusable period body template
  const periodBody = (n: number) => `
### PERIOD ${n} (45 minutes)

#### Period ${n} Objective
[One sentence: the specific skill students master by the end of this period]

#### ${n}.1 Teaching Content (20 minutes)
[Full explanations with definitions, correct notation, and real Nigerian analogies. Number each concept.]

[For every formula, use this exact box format:]
┌──────────────────────────────────┐
│ [Formula Name]: [expression]     │
└──────────────────────────────────┘

[For any diagram (Venn, number line, graph, circuit, etc.), draw it in ASCII. Example Venn:]
        ┌────────────────────────────────┐
        │ Universal Set (U)              │
        │   ┌───────┐   ┌───────┐       │
        │   │   A   │∩AB│   B   │       │
        │   │  only │   │  only │       │
        │   └───────┘   └───────┘       │
        └────────────────────────────────┘

#### ${n}.2 Worked Examples — 5 Levels (15 minutes)

> These 5 examples MUST be present. Do not reduce to fewer. Each must be harder than the previous.

**Example 1 — Level 1 (Definition / Identification):**
**Q:** [Simple question testing a basic definition or notation]
**Solution:**
[Full step-by-step answer — show every line of reasoning]

**Example 2 — Level 2 (Single Operation):**
**Q:** [Applies one rule, formula, or operation]
**Solution:**
[Full step-by-step answer]

**Example 3 — Level 3 (Combined Operations):**
**Q:** [Requires two concepts or steps combined]
**Solution:**
[Full step-by-step answer]

**Example 4 — Level 4 (WAEC-Style Word Problem):**
**Q:** [Realistic scenario question in WAEC phrasing — "In a class of 40 students..." / "Given that..." etc.]
**Solution:**
[Full WAEC mark-scheme style answer, showing each awarded step]

**Example 5 — Level 5 (Challenge):**
**Q:** [Hardest variant — three-set problem / proof / extended multi-step / JUPEB-level]
**Solution:**
[Full step-by-step answer]

#### ${n}.3 Class Exercise (7 minutes)
*Students work individually. These questions must be different from the worked examples above.*

1. [Question at difficulty Level 1–2]
2. [Question at difficulty Level 2–3]
3. [Question at difficulty Level 3–4]
4. [WAEC-style question — different topic angle from Example 4]

#### ${n}.4 Board Summary
*Teacher writes these on the board. Students copy into notes.*

• [Key definition 1]
• [Key definition 2]
• [Key formula or rule]
• [Common notation / symbol meaning]
• [Most common mistake students make — and how to avoid it]
• [One exam tip]
(Write 5–8 bullets — all specific, nothing vague)

#### ${n}.5 Coming Up Next
*Tell students exactly what the next lesson/period will cover so they can prepare mentally.*

> **Next lesson:** [Name the specific sub-topics coming in Period ${n + 1} or the following lesson]
> Students should review: [1–2 things they already know that will connect to the next sub-topic]

---`.trim();

  if (periods === 1) {
    return `${header}

You are writing a SINGLE-PERIOD (45-minute) lesson note. Follow the exact 8-section structure below. Do not skip any section.

OUTPUT — copy this structure exactly and fill every placeholder:

## Lesson Note: ${input.topic}
**Subject:** ${input.subject} | **Class:** ${input.classLevel} | **Duration:** 45 minutes | **Term:** ${input.term ?? "First Term"} | **Week:** ${input.week ?? "—"}

---

### 1. Learning Objectives
By the end of this lesson, students should be able to:
1. [Objective — Knowledge/Recall, NERDC/WAEC syllabus keyword]
2. [Objective — Comprehension/Application]
3. [Objective — Analysis/Higher-order]
(Write 3–5 objectives)

---

### 2. Entry Behaviour
*Name the exact prior topics from the Nigerian curriculum the students must know. Do NOT write "basic understanding of..."*
[e.g., "Students must have covered: Number Systems (SS1), Basic Algebraic Expressions (JSS3), and Introduction to Logic (SS1 Term 1)."]

---

### 3. Topic Roadmap
*List EVERY sub-topic in the full ${input.topic} sequence for ${input.classLevel}. This lesson covers the ✅ rows in full. ⏭️ rows are previewed at the end. 🔒 rows are future lessons.*

| # | Sub-topic | Status |
|---|-----------|--------|
| 1 | [Sub-topic 1] | ✅ |
| 2 | [Sub-topic 2] | ⏭️ |
| 3 | [Sub-topic 3] | 🔒 |
[Continue for all sub-topics in the topic — minimum 6 rows]

---

### 4. Teaching Content (20 minutes)
*Cover EVERY sub-topic marked ✅ in the roadmap above — definitions, notation, analogies, formula boxes, ASCII diagrams. Do not skip any ✅ sub-topic.*

---

### 5. Worked Examples — 5 Levels (15 minutes)

**Example 1 — Level 1 (Definition / Identification):**
**Q:** [Question]
**Solution:** [Full step-by-step]

**Example 2 — Level 2 (Single Operation):**
**Q:** [Question]
**Solution:** [Full step-by-step]

**Example 3 — Level 3 (Combined Operations):**
**Q:** [Question]
**Solution:** [Full step-by-step]

**Example 4 — Level 4 (WAEC-Style Word Problem):**
**Q:** [Question]
**Solution:** [Full WAEC mark-scheme style]

**Example 5 — Level 5 (Challenge):**
**Q:** [Question]
**Solution:** [Full step-by-step]

---

### 6. Class Exercise (7 minutes)
*Different from worked examples — never copy-paste questions from above.*
1. [Question]
2. [Question]
3. [Question]
4. [WAEC-style question]

---

### 7. Board Summary
*5–8 specific bullet points for students to copy:*
• [Definition 1]
• [Definition 2]
• [Key formula]
• [Key rule/notation]
• [Common mistake + how to avoid it]
• [Exam tip]

---

### 8. Coming Up Next
> **Next lesson:** [Name the specific sub-topics marked ⏭️ in the Topic Roadmap above]
> Students should review: [1–2 prior concepts that connect directly to the next sub-topic]

---

### 9. Homework Assignment
*Harder than class exercise. None of these questions can appear in the class exercise.*
1. [Question]
2. [Harder question]
3. [Challenge question]

---

### 10. WAEC / JAMB Past Questions
*Real past questions. Cite year and paper. Write the full question and full model answer.*

**WAEC [Year], Paper [X], Q[N]:**
[Full question text]
**Model Answer:**
[Complete mark-scheme answer — every step as WAEC would award marks]

**WAEC [Year], Paper [X], Q[N]:**
[Full question text]
**Model Answer:**
[Complete answer]

**JAMB [Year], Q[N]:**
[MCQ question with 4 options A–D]
**Answer: [X]** — [Explanation of why this option is correct and why others are wrong]

---

${rules}`;
  }

  // Multi-period plan
  const periodBodies = Array.from({ length: periods }, (_, i) => periodBody(i + 1)).join("\n\n");

  return `${header}

You are writing a ${periods}-PERIOD lesson note. You MUST write EVERY section for EVERY period (Period 1 through Period ${periods}). Stopping early is not acceptable.

OUTPUT — copy this structure exactly and fill every placeholder:

## Lesson Note: ${input.topic}
**Subject:** ${input.subject} | **Class:** ${input.classLevel} | **Periods:** ${periods} | **Total Duration:** ${durationLabel}
**Term:** ${input.term ?? "First Term"} | **Week:** ${input.week ?? "—"}

---

### Overall Learning Objectives
By the end of all ${periods} periods, students should be able to:
1. [Objective — Knowledge/Recall, tied to NERDC/WAEC syllabus keyword]
2. [Objective — Comprehension/Application]
3. [Objective — Analysis/Synthesis]
4. [Objective — Evaluation/Problem-solving]
5. [Add more as the scope of ${periods} periods requires]

---

### Entry Behaviour
*Name the exact prior topics from the Nigerian curriculum — NOT generic phrases like "basic understanding."*
[e.g., "Students must have covered: Number Systems (SS1 Term 1), Surds (SS2 Term 2), and Indices (SS2 Term 1)."]

---

### Topic Roadmap
*List EVERY sub-topic in the full ${input.topic} sequence for ${input.classLevel}. Mark each with its status:*
*✅ = covered in this lesson | ⏭️ = next lesson | 🔒 = future lesson*

| # | Sub-topic | Status |
|---|-----------|--------|
| 1 | [Sub-topic 1] | ✅ / ⏭️ / 🔒 |
| 2 | [Sub-topic 2] | ✅ / ⏭️ / 🔒 |
| 3 | [Sub-topic 3] | ✅ / ⏭️ / 🔒 |
[Continue for every sub-topic in the full topic — minimum 6 rows]

---

### Period Overview
${Array.from({ length: periods }, (_, i) => `- **Period ${i + 1}:** [Specific sub-topic title for this period — must match a ✅ row in the roadmap above]`).join("\n")}

---

${periodBodies}

### Homework Assignment
*Assigned after the final period. Must be harder than any class exercise. No question can repeat from any class exercise.*
1. [Question]
2. [Harder question]
3. [Multi-step challenge question]

---

### WAEC / JAMB Past Questions
*Real past questions on this topic. Cite year and paper. Write full question + full model answer for each.*

**WAEC [Year], Paper [X], Q[N]:**
[Full question text]
**Model Answer:**
[Complete mark-scheme answer — every step as WAEC would award marks]

**WAEC [Year], Paper [X], Q[N]:**
[Full question text]
**Model Answer:**
[Complete answer]

**JAMB [Year], Q[N]:**
[MCQ question with 4 options A–D]
**Answer: [X]** — [Explanation of why correct + why distractors are wrong]

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
