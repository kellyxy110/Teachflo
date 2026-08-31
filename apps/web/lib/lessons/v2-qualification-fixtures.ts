import type { LessonMetadata, LessonProvenance, Stage3AWorkedExamples, Stage3B1AMisconceptions, Stage3B1BActivities, Stage3B1CDifferentiation, Stage3B2FormativeThinking, Stage4AApplicationsGuidance, Stage4BExaminationItems, Stage5Closure } from "./v2-contract";

export const qualificationMetadata: LessonMetadata = { subject: "Mathematics", classLevel: "SS1", topic: "Quadratic Equations", term: "FIRST", week: 3, periods: 1, durationMinutes: 40, curriculumLabels: ["Synthetic qualification fixture"] };
export const qualificationProvenance: LessonProvenance = { origin: "AI_GENERATED", sourceLocations: [], extracted: false, generated: true, aiTransformedSource: false, teacherEditState: "NOT_REVIEWED", provider: "fixture", requestedModel: "fixture", actualModel: null, generatedAt: "2026-01-01T00:00:00.000Z", templateVersion: "TEACHNEXIS_LESSON_V2", curriculumContextUsed: false, textbookContextUsed: false, stages: {} };
export const qualificationInput = { metadata: qualificationMetadata, curriculumContext: ["Synthetic context only"], textbookContext: [] };

export const stageFixtures = {
  "3A": { stage: "3A", metadata: qualificationMetadata, provenance: qualificationProvenance, workedExamples: [1, 2, 3, 4, 5].map((level) => ({ level: level as 1 | 2 | 3 | 4 | 5, question: `Synthetic example ${level}: solve x² + ${level}x + 1 = 0.`, solution: "Synthetic solution with preserved x² notation." })) } as Stage3AWorkedExamples,
  "3B1A": { stage: "3B1A", metadata: qualificationMetadata, provenance: qualificationProvenance, misconceptions: "Synthetic misconception and correction." } as Stage3B1AMisconceptions,
  "3B1B": { stage: "3B1B", metadata: qualificationMetadata, provenance: qualificationProvenance, activities: "Synthetic classroom activity." } as Stage3B1BActivities,
  "3B1C": { stage: "3B1C", metadata: qualificationMetadata, provenance: qualificationProvenance, differentiation: "Synthetic differentiation plan." } as Stage3B1CDifferentiation,
  "3B2": { stage: "3B2", metadata: qualificationMetadata, provenance: qualificationProvenance, formativeAssessment: "Synthetic formative assessment.", higherOrderQuestions: "Synthetic higher-order question." } as Stage3B2FormativeThinking,
  "4A": { stage: "4A", metadata: qualificationMetadata, provenance: qualificationProvenance, applications: "Synthetic real-world application.", examinationGuidance: "Synthetic examination guidance." } as Stage4AApplicationsGuidance,
  "4B": { stage: "4B", metadata: qualificationMetadata, provenance: qualificationProvenance, examinationItems: [{ sourceStatus: "GENERATED_EXAM_STYLE", examStyle: null, question: "Synthetic exam-style question.", answer: "Synthetic answer." }] } as Stage4BExaminationItems,
  "5": { stage: 5, metadata: qualificationMetadata, provenance: qualificationProvenance, classExercise: ["Synthetic exercise"], boardSummary: ["Synthetic board summary"], comingNext: "Synthetic next step", homework: "Synthetic homework", studentSummary: "Synthetic revision summary", teacherReflection: { template: true, prompts: ["What worked?"], completed: false } } as Stage5Closure,
} as const;

export type QualificationStage = keyof typeof stageFixtures;
export function getQualificationFixture(stage: string) { return stageFixtures[stage as QualificationStage]; }
