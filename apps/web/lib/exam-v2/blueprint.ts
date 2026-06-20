import type { ExamBlueprint, ExamModeType, SkillEntry, BloomLevel } from "./types";

const MODE_CONFIGS: Record<ExamModeType, {
  defaultQuestions: number;
  weakWeight: number;
  mediumWeight: number;
  strongWeight: number;
  difficultyBias: { easy: number; medium: number; hard: number };
}> = {
  DIAGNOSTIC: {
    defaultQuestions: 20,
    weakWeight: 0.2,
    mediumWeight: 0.6,
    strongWeight: 0.2,
    difficultyBias: { easy: 0.3, medium: 0.5, hard: 0.2 },
  },
  PRACTICE: {
    defaultQuestions: 15,
    weakWeight: 0.4,
    mediumWeight: 0.4,
    strongWeight: 0.2,
    difficultyBias: { easy: 0.4, medium: 0.4, hard: 0.2 },
  },
  ASSESSMENT: {
    defaultQuestions: 25,
    weakWeight: 0.25,
    mediumWeight: 0.5,
    strongWeight: 0.25,
    difficultyBias: { easy: 0.2, medium: 0.5, hard: 0.3 },
  },
  ADAPTIVE: {
    defaultQuestions: 20,
    weakWeight: 0.35,
    mediumWeight: 0.4,
    strongWeight: 0.25,
    difficultyBias: { easy: 0.3, medium: 0.4, hard: 0.3 },
  },
};

export function buildBlueprint(params: {
  studentId: string;
  subject: string;
  classLevel: string;
  topic: string;
  mode: ExamModeType;
  skills: SkillEntry[];
  totalQuestions?: number;
  ragAvailable?: boolean;
}): ExamBlueprint {
  const config = MODE_CONFIGS[params.mode];
  const total = params.totalQuestions ?? config.defaultQuestions;

  const weakThreshold = 50;
  const strongThreshold = 75;

  const weakSkills = params.skills
    .filter((s) => s.percentage < weakThreshold)
    .map((s) => s.skill);
  const strongSkills = params.skills
    .filter((s) => s.percentage >= strongThreshold)
    .map((s) => s.skill);
  const allSkills = params.skills.map((s) => s.skill);

  const weakCount = Math.round(total * config.weakWeight);
  const strongCount = Math.round(total * config.strongWeight);
  const mediumCount = total - weakCount - strongCount;

  const easyCount = Math.round(total * config.difficultyBias.easy);
  const hardCount = Math.round(total * config.difficultyBias.hard);
  const medDiffCount = total - easyCount - hardCount;

  const bloomDist = computeBloomDistribution(total, params.mode);

  const syllabusTopics = extractSyllabusTopics(params.skills, params.topic);

  return {
    studentId: params.studentId,
    subject: params.subject,
    classLevel: params.classLevel,
    topic: params.topic,
    mode: params.mode,
    totalQuestions: total,
    composition: {
      weakReinforcement: weakCount,
      mediumConsolidation: mediumCount,
      strongValidation: strongCount,
    },
    difficultyDistribution: {
      easy: easyCount,
      medium: medDiffCount,
      hard: hardCount,
    },
    bloomDistribution: bloomDist,
    targetSkills: allSkills.length > 0 ? allSkills : [params.topic],
    weakSkills,
    strongSkills,
    syllabusTopics,
    ragAvailable: params.ragAvailable ?? false,
  };
}

function computeBloomDistribution(
  total: number,
  mode: ExamModeType
): Partial<Record<BloomLevel, number>> {
  const weights: Record<ExamModeType, number[]> = {
    DIAGNOSTIC: [0.25, 0.25, 0.2, 0.15, 0.1, 0.05],
    PRACTICE: [0.2, 0.25, 0.25, 0.15, 0.1, 0.05],
    ASSESSMENT: [0.15, 0.2, 0.25, 0.2, 0.15, 0.05],
    ADAPTIVE: [0.15, 0.2, 0.25, 0.2, 0.1, 0.1],
  };

  const levels: BloomLevel[] = ["REMEMBER", "UNDERSTAND", "APPLY", "ANALYZE", "EVALUATE", "CREATE"];
  const w = weights[mode];
  const result: Partial<Record<BloomLevel, number>> = {};

  let assigned = 0;
  for (let i = 0; i < levels.length; i++) {
    const count = i === levels.length - 1 ? total - assigned : Math.round(total * w[i]);
    if (count > 0) {
      result[levels[i]] = count;
      assigned += count;
    }
  }

  return result;
}

function extractSyllabusTopics(skills: SkillEntry[], mainTopic: string): string[] {
  const topics = new Set<string>([mainTopic]);
  for (const s of skills) {
    if (s.topic) topics.add(s.topic);
  }
  return Array.from(topics);
}
