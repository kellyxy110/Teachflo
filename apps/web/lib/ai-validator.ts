export type ValidatedMCQ = {
  stem: string;
  optionA: string;
  optionB: string;
  optionC: string;
  optionD: string;
  correctOption: "A" | "B" | "C" | "D";
  solution: string;
  explanation: string;
  commonMistakes?: string;
  examTip?: string;
  bloomLevel?: string;
};

export type ValidatedFlashcard = {
  front: string;
  back: string;
  subject?: string;
  topic?: string;
};

function str(val: unknown, max: number): string {
  return String(val ?? "").slice(0, max);
}

export function validateMCQArray(raw: unknown): ValidatedMCQ[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("AI returned empty or invalid MCQ array");
  }
  return raw.map((q, i) => {
    if (typeof q !== "object" || q === null) {
      throw new Error(`Question ${i + 1} is not an object`);
    }
    const obj = q as Record<string, unknown>;

    const stem = str(obj.stem, 2000);
    if (!stem.trim()) throw new Error(`Question ${i + 1}: missing stem`);

    const optionA = str(obj.optionA, 500);
    const optionB = str(obj.optionB, 500);
    const optionC = str(obj.optionC, 500);
    const optionD = str(obj.optionD, 500);
    if (!optionA || !optionB || !optionC || !optionD) {
      throw new Error(`Question ${i + 1}: missing one or more options`);
    }

    const rawCorrect = String(obj.correctOption ?? "").toUpperCase().trim();
    if (!["A", "B", "C", "D"].includes(rawCorrect)) {
      throw new Error(`Question ${i + 1}: invalid correctOption "${rawCorrect}"`);
    }

    return {
      stem,
      optionA,
      optionB,
      optionC,
      optionD,
      correctOption: rawCorrect as "A" | "B" | "C" | "D",
      solution: str(obj.solution, 2000),
      explanation: str(obj.explanation, 2000),
      commonMistakes: obj.commonMistakes ? str(obj.commonMistakes, 1000) : undefined,
      examTip: obj.examTip ? str(obj.examTip, 500) : undefined,
      bloomLevel: obj.bloomLevel ? str(obj.bloomLevel, 50) : undefined,
    };
  });
}

export function validateLessonMarkdown(raw: unknown): string {
  if (typeof raw !== "string") throw new Error("AI lesson content is not a string");
  const trimmed = raw.trim();
  if (trimmed.length < 50) throw new Error("AI lesson content is too short — likely a generation failure");
  // Warn if content ends mid-sentence (soft check, not a throw)
  if (trimmed.length > 200 && !/[.!?\n`]$/.test(trimmed)) {
    console.warn("[ai-validator] Lesson content may be truncated — does not end with sentence terminator");
  }
  return trimmed;
}

export function validateFlashcardArray(raw: unknown): ValidatedFlashcard[] {
  if (!Array.isArray(raw) || raw.length === 0) {
    throw new Error("AI returned empty or invalid flashcard array");
  }
  return raw.map((f, i) => {
    if (typeof f !== "object" || f === null) {
      throw new Error(`Flashcard ${i + 1} is not an object`);
    }
    const obj = f as Record<string, unknown>;
    const front = str(obj.front, 500);
    const back = str(obj.back, 1000);
    if (!front.trim() || !back.trim()) {
      throw new Error(`Flashcard ${i + 1}: missing front or back`);
    }
    return {
      front,
      back,
      subject: obj.subject ? str(obj.subject, 100) : undefined,
      topic: obj.topic ? str(obj.topic, 200) : undefined,
    };
  });
}
