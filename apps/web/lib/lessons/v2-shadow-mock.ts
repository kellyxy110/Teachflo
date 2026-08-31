import type { ShadowTransport } from "./v2-shadow";

const teachingContent = Array.from({ length: 190 }, (_, index) => `synthetic${index + 1}`).join(" ");
const payloadForStage = (stage: string) => {
  switch (stage) {
    case "1A": return { curriculumCore: { objectives: ["Synthetic objective"], learningOutcomes: ["Synthetic outcome"], bloomsDistribution: { REMEMBER: ["Synthetic outcome"] } }, vocabulary: [{ term: "factor", definition: "Synthetic definition", analogy: "Synthetic analogy" }], symbolsNotation: "x² + bx + c = 0" };
    case "1B": return { entryBehaviour: [{ topic: "Synthetic prior topic", classLevel: "JSS3", term: "THIRD" }], diagnosticQuestions: ["Synthetic diagnostic question?"] };
    case "1C": return { roadmap: [{ title: "Synthetic roadmap step", status: "COVERED" }] };
    case "2A1": return { materials: ["Synthetic board"], hook: "Synthetic lesson hook", history: null };
    case "2A_CONTENT": return { content: teachingContent };
    case "3A": return { workedExamples: [1, 2, 3, 4, 5].map((level) => ({ level, question: `Synthetic question ${level}`, solution: `Synthetic solution ${level}` })) };
    case "3B1A": return { misconceptions: "Synthetic misconception and correction" };
    case "3B1B": return { activities: "Synthetic classroom activity" };
    case "3B1C": return { differentiation: "Synthetic differentiation" };
    case "3B2": return { formativeAssessment: "Synthetic formative assessment", higherOrderQuestions: "Synthetic higher-order question" };
    case "4A": return { applications: "Synthetic application", examinationGuidance: "Synthetic examination guidance" };
    case "4B": return { examinationItems: [{ sourceStatus: "GENERATED_EXAM_STYLE", examStyle: null, question: "Synthetic exam-style question", answer: "Synthetic answer" }] };
    case "5A": return { classExercise: ["Synthetic class exercise"], boardSummary: ["Synthetic board summary"] };
    case "5B": return { comingNext: "Synthetic next lesson", homework: "Synthetic homework", studentSummary: "Synthetic student summary" };
    default: throw new Error(`No mock payload for stage ${stage}`);
  }
};

export function createShadowMockTransport(overrides: Partial<Record<string, (attempt: 1 | 2) => unknown>> = {}): ShadowTransport { return async ({ stage, attempt, model }) => { const override = overrides[String(stage)]; const payload = override ? override(attempt) : payloadForStage(String(stage)); if (payload instanceof Error) throw payload; if (payload && typeof payload === "object" && "status" in payload && !Array.isArray(payload) && !("choices" in payload)) throw payload; return { model, choices: [{ message: { content: typeof payload === "string" ? payload : JSON.stringify(payload) } }] }; }; }
