// ── Shared types for the Unified Intelligence Core ──

export interface SkillNode {
  skill: string;
  topic: string | null;
  total: number;
  correct: number;
  percentage: number;
  bloomsLevel: string | null;
  trend: "improving" | "declining" | "stable";
}

// ── Phase 2B: Mistake Intelligence ──────────────────

export type ErrorCategory =
  | "conceptual"
  | "calculation"
  | "misinterpretation"
  | "missing_prerequisite"
  | "guessing";

export interface MistakeAnalysis {
  errorType: ErrorCategory;
  pattern: string;
  rootCause: string | null;
  prerequisiteGap: string | null;
  occurrences: number;
  isRecurring: boolean;
}

export interface MistakeCluster {
  skill: string;
  patterns: MistakeAnalysis[];
  totalErrors: number;
  resolvedCount: number;
  severityScore: number;
}

export interface MistakeReport {
  studentId: string;
  totalMistakes: number;
  clusters: MistakeCluster[];
  topPrerequisiteGaps: string[];
  recurringPatterns: MistakeAnalysis[];
  recentMistakes: Array<{
    questionStem: string;
    errorType: string;
    misconception: string;
    subject: string;
    date: Date;
  }>;
}

// ── Phase 2A: Adaptive Learning ─────────────────────

export type StepType = "remediation" | "guided_practice" | "new_concept" | "assessment" | "review";
export type StepStatus = "pending" | "active" | "completed" | "skipped";

export interface LearningStep {
  id: string;
  order: number;
  type: StepType;
  skill: string;
  topic: string;
  reason: string;
  difficulty: "easy" | "medium" | "hard";
  estimatedMinutes: number;
  status: StepStatus;
  prerequisites: string[];
  completedAt?: string;
}

export interface LearningPathData {
  steps: LearningStep[];
  currentStep: number;
  totalSteps: number;
  completedSteps: number;
  subject: string;
  lastUpdated: string;
}

// ── Phase 3A: Curriculum Generator ──────────────────

export interface WeekPlan {
  week: number;
  topic: string;
  subtopics: string[];
  objectives: string[];
  activities: string[];
  assessmentType: "formative" | "summative" | "diagnostic" | "none";
  hours: number;
  notes?: string;
}

export interface CurriculumPlanData {
  weeks: WeekPlan[];
  assessmentSchedule: Array<{
    week: number;
    type: string;
    topics: string[];
    weight: number;
  }>;
  revisionCycles: Array<{
    week: number;
    revisitTopics: string[];
    reason: string;
  }>;
  coverageSummary: {
    totalTopics: number;
    totalWeeks: number;
    assessmentCount: number;
    revisionWeeks: number;
  };
}
