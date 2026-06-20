import { routedChat } from "@/lib/ai/router";
import type { SkillNode, LearningStep, LearningPathData, StepType } from "./types";
import type { MistakeReport } from "./types";

export function computeLearningPath(params: {
  studentId: string;
  subject: string;
  classLevel: string;
  skills: SkillNode[];
  mistakeReport: MistakeReport;
  existingPath?: LearningPathData;
}): LearningPathData {
  const steps: LearningStep[] = [];
  let order = 0;

  const prereqGaps = new Set(params.mistakeReport.topPrerequisiteGaps);
  for (const gap of prereqGaps) {
    steps.push(createStep(++order, "remediation", gap, gap, "easy",
      `Prerequisite gap detected — ${gap} must be addressed before advancing.`,
      15, Array.from(prereqGaps).filter((g) => g !== gap)
    ));
  }

  const weakSkills = params.skills
    .filter((s) => s.percentage < 40)
    .sort((a, b) => a.percentage - b.percentage);

  for (const skill of weakSkills.slice(0, 5)) {
    if (prereqGaps.has(skill.skill)) continue;
    const hasMistakePattern = params.mistakeReport.clusters.some(
      (c) => c.skill === skill.skill && c.totalErrors > 0
    );
    steps.push(createStep(++order, "remediation", skill.skill, skill.topic || skill.skill, "easy",
      hasMistakePattern
        ? `Weak skill with recurring mistakes — needs targeted remediation.`
        : `Below 40% mastery — foundation building required.`,
      20, []
    ));
  }

  const midSkills = params.skills
    .filter((s) => s.percentage >= 40 && s.percentage < 70)
    .sort((a, b) => a.percentage - b.percentage);

  for (const skill of midSkills.slice(0, 5)) {
    steps.push(createStep(++order, "guided_practice", skill.skill, skill.topic || skill.skill, "medium",
      `${Math.round(skill.percentage)}% mastery — guided practice to consolidate.`,
      25, []
    ));
  }

  if (weakSkills.length + midSkills.length >= 3) {
    steps.push(createStep(++order, "assessment", "checkpoint", params.subject, "medium",
      "Mid-path checkpoint to verify progress before new concepts.",
      15, []
    ));
  }

  const strongSkills = params.skills.filter((s) => s.percentage >= 70);
  const allCoveredSkills = new Set([
    ...weakSkills.map((s) => s.skill),
    ...midSkills.map((s) => s.skill),
    ...strongSkills.map((s) => s.skill),
  ]);

  const potentialNew = strongSkills
    .filter((s) => s.percentage < 90)
    .slice(0, 3);

  for (const skill of potentialNew) {
    steps.push(createStep(++order, "new_concept", skill.skill, skill.topic || skill.skill, "hard",
      `Strong foundation (${Math.round(skill.percentage)}%) — ready for advanced application.`,
      30, []
    ));
  }

  const recurringMistakeSkills = params.mistakeReport.recurringPatterns
    .map((p) => p.pattern)
    .slice(0, 2);
  if (recurringMistakeSkills.length > 0) {
    steps.push(createStep(++order, "review", "recurring-errors", params.subject, "medium",
      `Review recurring error patterns: ${recurringMistakeSkills.join("; ")}`,
      20, []
    ));
  }

  steps.push(createStep(++order, "assessment", "final-assessment", params.subject, "medium",
    "Final adaptive assessment to measure overall progress.",
    20, []
  ));

  let currentStep = 0;
  if (params.existingPath) {
    currentStep = Math.min(params.existingPath.currentStep, steps.length - 1);
  }

  return {
    steps,
    currentStep,
    totalSteps: steps.length,
    completedSteps: steps.filter((s) => s.status === "completed").length,
    subject: params.subject,
    lastUpdated: new Date().toISOString(),
  };
}

function createStep(
  order: number, type: StepType, skill: string, topic: string,
  difficulty: "easy" | "medium" | "hard", reason: string,
  estimatedMinutes: number, prerequisites: string[]
): LearningStep {
  return {
    id: `step-${order}-${skill.replace(/\s+/g, "-").toLowerCase()}`,
    order,
    type,
    skill,
    topic,
    reason,
    difficulty,
    estimatedMinutes,
    status: "pending",
    prerequisites,
  };
}

export async function generateStepContent(step: LearningStep, subject: string, classLevel: string): Promise<string> {
  const typePrompts: Record<StepType, string> = {
    remediation: `Create a remediation lesson for a student who is struggling with "${step.skill}" in ${subject} (${classLevel}). Focus on building foundational understanding with simple examples and analogies. Include 3 practice questions.`,
    guided_practice: `Create a guided practice session for "${step.skill}" in ${subject} (${classLevel}). Include worked examples with step-by-step solutions, then 5 practice questions of increasing difficulty.`,
    new_concept: `Introduce the advanced concept "${step.skill}" in ${subject} (${classLevel}). Explain clearly with examples, connect to prior knowledge, and include 3 challenging questions.`,
    assessment: `Create a short diagnostic assessment (5 questions) covering "${step.skill}" in ${subject} (${classLevel}). Mix question types and difficulty levels.`,
    review: `Create a focused review session addressing common mistakes in "${step.skill}" for ${subject} (${classLevel}). Show common errors, explain why they're wrong, and provide corrected approaches.`,
  };

  const response = await routedChat({
    message: typePrompts[step.type],
    systemPrompt: "You are TeachFlow AI, an adaptive learning content generator for Nigerian secondary schools aligned with WAEC/JAMB/JUPEB standards.",
  });

  return response.content;
}
