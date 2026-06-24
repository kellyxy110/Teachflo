export type LessonMode = "STANDARD" | "ELI12" | "WAEC" | "JAMB" | "JUPEB";
export type Difficulty = "BASIC" | "APPLICATION" | "WAEC" | "JAMB" | "JUPEB";
export type ExamType = "SCHOOL_TEST" | "SCHOOL_EXAM" | "WAEC_MOCK" | "JAMB_PREP" | "JUPEB_PREP";

export interface LessonInput {
  subject: string;
  classLevel: string;
  topic: string;
  week?: number | null;
  term?: string | null;
  periods?: number | null;
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
  // ~1 000 tokens per period, minimum 2 500, hard cap 8 000
  return Math.min(Math.max(2500, p * 1000), 8000);
}

export const buildLessonPrompt = (input: LessonInput): string => {
  const periods = Math.max(1, input.periods ?? 1);
  const totalMinutes = periods * 40;
  const durationLabel =
    periods === 1
      ? "40 minutes"
      : `${periods} periods × 40 minutes (${totalMinutes} minutes total)`;

  const header = `
You are an experienced Nigerian secondary school educator with deep knowledge of the Nigerian national curriculum, WAEC, JAMB, and JUPEB syllabi.

Generate a detailed, classroom-ready lesson plan for the following:

Subject: ${input.subject}
Class: ${input.classLevel}
Topic: ${input.topic}
Number of Periods: ${periods}
Total Duration: ${durationLabel}
Week: ${input.week ?? "Not specified"}
Term: ${input.term ?? "First Term"}
`.trim();

  const rules = `
RULES:
- Use classroom-friendly language appropriate for ${input.classLevel} students
- Do NOT use phrases like "delve into", "explore", "let's dive", "certainly!", "absolutely!"
- Ground analogies in Nigerian daily life (markets, traffic, cooking, farming, technology)
- Include accurate content aligned with the Nigerian national curriculum and WAEC syllabus
- Write EVERY section in full — do not truncate or summarise
`.trim();

  if (periods === 1) {
    return `${header}

OUTPUT FORMAT — Return this exact structure in full:

## Lesson Plan: ${input.topic}
**Subject:** ${input.subject} | **Class:** ${input.classLevel} | **Duration:** 40 minutes

---

### Learning Objectives
By the end of this lesson, students should be able to:
1. [Objective 1 — Knowledge/Recall level]
2. [Objective 2 — Comprehension/Application level]
3. [Objective 3 — Higher-order thinking/Analysis]

---

### Entry Behaviour
[What prior knowledge students need. One short paragraph.]

---

### Introduction (5 minutes)
[Hook activity or question to engage students. Real-world Nigerian context preferred.]

---

### Main Teaching Content (25 minutes)

#### Sub-topic 1: [Name]
[Clear, accurate content. Use numbered steps for processes.]

#### Sub-topic 2: [Name]
[Continue...]

---

### Worked Examples
Example 1:
[Question + full step-by-step solution]

Example 2:
[Question + full step-by-step solution]

---

### Class Activities (7 minutes)
**Individual Practice:**
[2–3 short tasks students complete alone]

**Group Discussion:**
[1 discussion question or problem-solving activity]

---

### Evaluation Questions (3 minutes)
1. [Question testing objective 1]
2. [Question testing objective 2]
3. [Question testing objective 3]

---

### Homework Assignment
[1–2 practical or thought-provoking tasks]

---

### WAEC/Exam Connection
[How this topic appears in WAEC/JAMB exams. Common question types and mark-scheme tips.]

---

${rules}`;
  }

  // Multi-period plan
  const periodBodies = Array.from({ length: periods }, (_, i) => {
    const n = i + 1;
    return `
### PERIOD ${n} (40 minutes)

#### Period ${n} Objective
[Specific skill or sub-topic covered in this period]

#### Teaching Content (25 minutes)
[Detailed content for this period. Numbered steps, definitions, worked calculations, diagrams described in words.]

#### Worked Example
[1 fully worked example relevant to this period's content]

#### Class Activity (10 minutes)
[Task students do in class — individual or pair work]

#### Period ${n} Evaluation (5 minutes)
1. [Question 1]
2. [Question 2]

---`.trim();
  }).join("\n\n");

  return `${header}

This is a ${periods}-PERIOD lesson plan. You MUST write a complete section for every period (Period 1 through Period ${periods}). Do not stop early.

OUTPUT FORMAT — Return this exact structure in full:

## Lesson Plan: ${input.topic}
**Subject:** ${input.subject} | **Class:** ${input.classLevel} | **Periods:** ${periods} | **Total Duration:** ${durationLabel}

---

### Overall Learning Objectives
By the end of all ${periods} periods, students should be able to:
1. [Objective 1 — Knowledge/Recall]
2. [Objective 2 — Comprehension/Application]
3. [Objective 3 — Analysis/Synthesis]
4. [Objective 4 — Evaluation/Problem-solving]
5. [Add more objectives as the scope of ${periods} periods requires]

---

### Entry Behaviour
[What prior knowledge students need before Period 1. One short paragraph.]

---

### Period Overview
${Array.from({ length: periods }, (_, i) => `- **Period ${i + 1}:** [Sub-topic title]`).join("\n")}

---

${periodBodies}

### Homework Assignment
[Assigned after the final period — 1–3 tasks that consolidate the entire ${periods}-period sequence]

---

### WAEC/Exam Connection
[How all sub-topics covered across these ${periods} periods appear in WAEC/JAMB. List specific past-question patterns and mark-scheme tips for each sub-topic.]

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
