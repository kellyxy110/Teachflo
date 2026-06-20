export type ExamModeType = "DIAGNOSTIC" | "PRACTICE" | "ASSESSMENT" | "ADAPTIVE";
export type DifficultyLevel = "easy" | "medium" | "hard";
export type BloomLevel = "REMEMBER" | "UNDERSTAND" | "APPLY" | "ANALYZE" | "EVALUATE" | "CREATE";
export type QuestionSource = "syllabus" | "RAG" | "synthetic";
export type ErrorType = "conceptual" | "calculation" | "misinterpretation" | "missing_prerequisite";

export interface SkillEntry {
  skill: string;
  topic: string | null;
  total: number;
  correct: number;
  percentage: number;
  bloomsLevel: string | null;
}

export interface ExamBlueprint {
  studentId: string;
  subject: string;
  classLevel: string;
  topic: string;
  mode: ExamModeType;
  totalQuestions: number;
  composition: {
    weakReinforcement: number;
    mediumConsolidation: number;
    strongValidation: number;
  };
  difficultyDistribution: {
    easy: number;
    medium: number;
    hard: number;
  };
  bloomDistribution: Partial<Record<BloomLevel, number>>;
  targetSkills: string[];
  weakSkills: string[];
  strongSkills: string[];
  syllabusTopics: string[];
  ragAvailable: boolean;
}

export interface GeneratedQuestion {
  stem: string;
  type: "MCQ" | "SHORT_ANSWER" | "STRUCTURED";
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  correctOption?: string;
  solution: string;
  explanation: string;
  difficulty: DifficultyLevel;
  bloomLevel: BloomLevel;
  skillTag: string;
  topicTag: string;
  subTopicTag: string;
  source: QuestionSource;
  estimatedTime: number;
  distractorAnalysis?: Record<string, string>;
  commonMistakes?: string;
}

export interface AdaptiveState {
  currentDifficulty: DifficultyLevel;
  consecutiveCorrect: number;
  consecutiveWrong: number;
  difficultyHistory: DifficultyLevel[];
  accuracyByDifficulty: Record<DifficultyLevel, { correct: number; total: number }>;
  coveredSkills: string[];
  answeredQuestionIds: string[];
}

export interface MisconceptionResult {
  errorType: ErrorType;
  misconception: string;
  feedback: string;
  prerequisiteGap?: string;
}

export interface PostExamAnalytics {
  studentReport: {
    totalScore: number;
    maxScore: number;
    percentage: number;
    grade: string;
    topicBreakdown: Array<{
      topic: string;
      correct: number;
      total: number;
      percentage: number;
    }>;
    weakSkills: string[];
    strongSkills: string[];
    improvementSuggestions: string[];
    timeEfficiency: {
      totalTime: number;
      averagePerQuestion: number;
      fastestQuestion: number;
      slowestQuestion: number;
    };
    difficultyProgression: DifficultyLevel[];
  };
  systemReport: {
    hardestQuestions: Array<{ stem: string; successRate: number }>;
    mostFailedTopics: Array<{ topic: string; failRate: number }>;
    misconceptionClusters: Array<{ errorType: string; count: number; examples: string[] }>;
    syllabusCoverage: number;
    bloomDistribution: Partial<Record<BloomLevel, number>>;
  };
}
