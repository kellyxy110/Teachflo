export const LESSON_V2_CONTRACT_VERSION = "TEACHNEXIS_LESSON_V2" as const;
export type RoadmapStatus = "COVERED" | "NEXT" | "FUTURE";
export type ExamStyle = "WAEC" | "NECO" | "JAMB" | null;
export type ExamSourceStatus = "VERIFIED_RETRIEVED_SOURCE" | "GENERATED_EXAM_STYLE";
export type ValidationStatus = "PASS" | "WARNINGS" | "BLOCKED";
export type LessonContentOrigin = "MANUAL" | "PASTE" | "DOCUMENT_IMPORT" | "BOOK_EXTRACTION" | "AI_GENERATED" | "AI_GROUNDED_IN_SOURCE" | "ADAPTED_EXISTING_LESSON";
export type TeacherEditState = "NOT_REVIEWED" | "IN_REVIEW" | "EDITED" | "REVIEWED" | "APPROVED";
export interface SourceLocation { documentId?: string; page?: number; range?: string; }
export interface LessonSourceContext { mode: "EXTRACT_FROM_SOURCE" | "GENERATE_FROM_SOURCE"; excerpts: string[]; locations: SourceLocation[]; }
export interface StemInput { origin: LessonContentOrigin; sourceRepresentation?: string; warnings?: string[]; }
export interface LessonMetadata { subject: string; classLevel: string; topic: string; term: string | null; week: number | null; periods: number; durationMinutes: number; curriculumLabels: string[]; }
export interface LessonCurriculum { objectives: string[]; learningOutcomes: string[]; bloomsDistribution: Record<string, string[]>; entryBehaviour: { topic: string; classLevel?: string; term?: string }[]; diagnosticQuestions: string[]; roadmap: { title: string; status: RoadmapStatus }[]; }
export interface LessonInstruction { materials: string[]; vocabulary: { term: string; definition: string; analogy: string }[]; hook: string; symbolsNotation: string; history: string; teachingContent: string; activities: string; differentiation: string; misconceptions: string; formativeAssessment: string; higherOrderQuestions: string; applications: string; }
export interface WorkedExample { level: 1 | 2 | 3 | 4 | 5; question: string; solution: string; markScheme?: string; }
export interface ExaminationItem { sourceStatus: ExamSourceStatus; examStyle: ExamStyle; evidence?: { sourceId: string; excerpt: string; retrievedAt: string }; citation?: string; question: string; answer: string; }
export interface LessonAssessment { examinationGuidance: string; examinationItems: ExaminationItem[]; classExercise: string[]; boardSummary: string[]; comingNext: string; homework: string; studentSummary: string; teacherReflection: { template: true; prompts: string[]; completed: false }; }
export const CANONICAL_TEACHER_REFLECTION_PROMPTS = ["What worked well in this lesson?", "Which learners need additional support?", "What should be adjusted before teaching this topic again?"] as const;
export function createTeacherReflectionTemplate(): LessonAssessment["teacherReflection"] { return { template: true, completed: false, prompts: [...CANONICAL_TEACHER_REFLECTION_PROMPTS] }; }
export interface LessonStem { sourceRepresentation: string; renderedRepresentation?: string; conversionWarnings: string[]; }
export interface LessonProvenance { origin: LessonContentOrigin; sourceLocations: SourceLocation[]; extracted: boolean; generated: boolean; aiTransformedSource: boolean; teacherEditState: TeacherEditState; provider?: string; requestedModel?: string; actualModel?: string | null; generatedAt?: string; templateVersion: string; curriculumContextUsed: boolean; curriculumContextId?: string; textbookContextUsed: boolean; textbookDocumentIds?: string[]; stages: Record<string, { status: "PENDING" | "COMPLETED" | "FAILED"; startedAt?: string; completedAt?: string; model?: string }>; }
export interface LessonValidation { status: ValidationStatus; errors: string[]; warnings: string[]; validatedAt?: string; }
export interface LessonNoteContract { contractVersion: typeof LESSON_V2_CONTRACT_VERSION; metadata: LessonMetadata; curriculum: LessonCurriculum; instruction: LessonInstruction; workedExamples: WorkedExample[]; assessment: LessonAssessment; stem: LessonStem; provenance: LessonProvenance; validation: LessonValidation; }
export interface StageBase { stage: 1 | 2 | 3 | 4 | 5; metadata: LessonMetadata; provenance: LessonProvenance; }
export interface Stage1ContextPlanning extends StageBase { stage: 1; curriculum: LessonCurriculum; vocabulary: LessonInstruction["vocabulary"]; symbolsNotation: string; }
export interface Stage1AFoundation extends Stage3SubstageBase { stage: "1A"; curriculumCore: Pick<LessonCurriculum, "objectives" | "learningOutcomes" | "bloomsDistribution">; vocabulary: LessonInstruction["vocabulary"]; symbolsNotation: string; }
export interface Stage1BEntryDiagnostics extends Stage3SubstageBase { stage: "1B"; entryBehaviour: LessonCurriculum["entryBehaviour"]; diagnosticQuestions: string[]; }
export interface Stage1CRoadmap extends Stage3SubstageBase { stage: "1C"; roadmap: LessonCurriculum["roadmap"]; }
export interface Stage2InstructionalExplanation extends StageBase { stage: 2; materials: string[]; hook: string; history: string; teachingContent: string; stem: LessonStem; }
export interface Stage2AMaterialsContext extends Stage3SubstageBase { stage: "2A"; materials: string[]; hook: string; history: string; teachingContent: string; }
export interface Stage2BStemNotation extends Stage3SubstageBase { stage: "2B"; stem: LessonStem; }
export interface Stage2A1InstructionalContext extends Stage3SubstageBase { stage: "2A1"; materials: string[]; hook: string; history: string | null; }
export interface TeachingContentChunk extends Stage3SubstageBase { stage: "2A_CONTENT"; roadmapId: string; roadmapIndex: number; title: string; content: string; }
export interface Stage3PedagogyWorkedPractice extends StageBase { stage: 3; workedExamples: WorkedExample[]; misconceptions: string; activities: string; differentiation: string; formativeAssessment: string; higherOrderQuestions: string; }
export type Stage3SubstageBase = Omit<StageBase, "stage"> & { stage: "1A" | "1B" | "1C" | "2A" | "2B" | "2A1" | "2A_CONTENT" | "3A" | "3B" | "3B1" | "3B1A" | "3B1B" | "3B1C" | "3B2" | "4A" | "4B" | "4-ASSEMBLY" | "5A" | "5B" | "5-ASSEMBLY" };
export interface Stage3AWorkedExamples extends Stage3SubstageBase { stage: "3A"; workedExamples: WorkedExample[]; }
export interface Stage3BPedagogyPractice extends Stage3SubstageBase { stage: "3B"; misconceptions: string; activities: string; differentiation: string; formativeAssessment: string; higherOrderQuestions: string; }
export interface Stage3B1ClassroomPedagogy extends Stage3SubstageBase { stage: "3B1"; misconceptions: string; activities: string; differentiation: string; }
export interface Stage3B1AMisconceptions extends Stage3SubstageBase { stage: "3B1A"; misconceptions: string; }
export interface Stage3B1BActivities extends Stage3SubstageBase { stage: "3B1B"; activities: string; }
export interface Stage3B1CDifferentiation extends Stage3SubstageBase { stage: "3B1C"; differentiation: string; }
export interface Stage3B2FormativeThinking extends Stage3SubstageBase { stage: "3B2"; formativeAssessment: string; higherOrderQuestions: string; }
export interface Stage4ApplicationsExamination extends StageBase { stage: 4; applications: string; examinationGuidance: string; examinationItems: ExaminationItem[]; }
export interface Stage4AApplicationsGuidance extends Stage3SubstageBase { stage: "4A"; applications: string; examinationGuidance: string; }
export interface Stage4BExaminationItems extends Stage3SubstageBase { stage: "4B"; examinationItems: ExaminationItem[]; }
export interface Stage5Closure extends StageBase { stage: 5; classExercise: string[]; boardSummary: string[]; comingNext: string; homework: string; studentSummary: string; teacherReflection: LessonAssessment["teacherReflection"]; }
export type Stage5GeneratedClosure = Omit<Stage5Closure, "teacherReflection">;
export interface Stage5AClassroomClosure extends Stage3SubstageBase { stage: "5A"; classExercise: string[]; boardSummary: string[]; }
export interface Stage5BContinuityStudentWork extends Stage3SubstageBase { stage: "5B"; comingNext: string; homework: string; studentSummary: string; }
export type LessonStages = [Stage1ContextPlanning, Stage2InstructionalExplanation, Stage3PedagogyWorkedPractice, Stage4ApplicationsExamination, Stage5Closure];
export type Stage6Assembly = { stage: 6; contract: LessonNoteContract };
export type LegacyLessonContent = { markdown: string };
export function detectLessonContent(value: unknown): "LEGACY_UNSTRUCTURED" | "V2_STRUCTURED" { if (!value || typeof value !== "object") return "LEGACY_UNSTRUCTURED"; const v = value as Record<string, unknown>; return v.contractVersion === LESSON_V2_CONTRACT_VERSION && v.sections ? "V2_STRUCTURED" : "LEGACY_UNSTRUCTURED"; }
