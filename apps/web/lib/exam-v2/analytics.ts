import type { PostExamAnalytics, DifficultyLevel, BloomLevel } from "./types";

interface ResponseData {
  questionId: string;
  isCorrect: boolean | null;
  score: number;
  maxScore: number;
  timeSpentSeconds: number | null;
  errorType: string | null;
  misconception: string | null;
  difficultyAtTime: string | null;
  question: {
    stem: string;
    skillTag: string | null;
    topicTag: string | null;
    difficulty: string | null;
    bloomLevel: string | null;
  };
}

function computeGrade(percentage: number): string {
  if (percentage >= 70) return "A";
  if (percentage >= 60) return "B";
  if (percentage >= 50) return "C";
  if (percentage >= 45) return "D";
  if (percentage >= 40) return "E";
  return "F";
}

export function computePostExamAnalytics(
  responses: ResponseData[],
  totalQuestions: number
): PostExamAnalytics {
  let totalScore = 0;
  let maxScore = 0;
  const topicMap = new Map<string, { correct: number; total: number }>();
  const skillSet = new Set<string>();
  const weakSkills: string[] = [];
  const strongSkills: string[] = [];
  const times: number[] = [];
  const difficulties: DifficultyLevel[] = [];
  const bloomCounts: Partial<Record<BloomLevel, number>> = {};
  const errorClusters = new Map<string, { count: number; examples: string[] }>();
  const questionDifficulty: Array<{ stem: string; successRate: number }> = [];

  for (const r of responses) {
    totalScore += r.score;
    maxScore += r.maxScore;

    const topic = r.question.topicTag || "Unknown";
    const existing = topicMap.get(topic) || { correct: 0, total: 0 };
    existing.total += 1;
    if (r.isCorrect) existing.correct += 1;
    topicMap.set(topic, existing);

    if (r.question.skillTag) skillSet.add(r.question.skillTag);

    if (r.timeSpentSeconds) times.push(r.timeSpentSeconds);

    if (r.difficultyAtTime) {
      difficulties.push(r.difficultyAtTime as DifficultyLevel);
    }

    const bloom = r.question.bloomLevel as BloomLevel | null;
    if (bloom) {
      bloomCounts[bloom] = (bloomCounts[bloom] || 0) + 1;
    }

    if (r.errorType && r.misconception) {
      const cluster = errorClusters.get(r.errorType) || { count: 0, examples: [] };
      cluster.count += 1;
      if (cluster.examples.length < 3) cluster.examples.push(r.misconception);
      errorClusters.set(r.errorType, cluster);
    }

    questionDifficulty.push({
      stem: r.question.stem.substring(0, 80),
      successRate: r.isCorrect ? 100 : 0,
    });
  }

  const percentage = maxScore > 0 ? (totalScore / maxScore) * 100 : 0;

  const topicBreakdown = Array.from(topicMap.entries()).map(([topic, data]) => ({
    topic,
    correct: data.correct,
    total: data.total,
    percentage: data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0,
  }));

  for (const entry of topicBreakdown) {
    if (entry.percentage < 50) weakSkills.push(entry.topic);
    else if (entry.percentage >= 75) strongSkills.push(entry.topic);
  }

  const sortedByDifficulty = [...questionDifficulty].sort((a, b) => a.successRate - b.successRate);

  const mostFailedTopics = topicBreakdown
    .filter((t) => t.percentage < 50)
    .map((t) => ({ topic: t.topic, failRate: 100 - t.percentage }))
    .sort((a, b) => b.failRate - a.failRate);

  const totalTime = times.reduce((s, t) => s + t, 0);

  const syllabusCoverage = totalQuestions > 0
    ? Math.round((topicMap.size / Math.max(totalQuestions * 0.3, 1)) * 100)
    : 0;

  return {
    studentReport: {
      totalScore,
      maxScore,
      percentage: Math.round(percentage * 10) / 10,
      grade: computeGrade(percentage),
      topicBreakdown,
      weakSkills,
      strongSkills,
      improvementSuggestions: generateSuggestions(weakSkills, mostFailedTopics),
      timeEfficiency: {
        totalTime,
        averagePerQuestion: times.length > 0 ? Math.round(totalTime / times.length) : 0,
        fastestQuestion: times.length > 0 ? Math.min(...times) : 0,
        slowestQuestion: times.length > 0 ? Math.max(...times) : 0,
      },
      difficultyProgression: difficulties,
    },
    systemReport: {
      hardestQuestions: sortedByDifficulty.slice(0, 5),
      mostFailedTopics,
      misconceptionClusters: Array.from(errorClusters.entries()).map(([errorType, data]) => ({
        errorType,
        ...data,
      })),
      syllabusCoverage: Math.min(syllabusCoverage, 100),
      bloomDistribution: bloomCounts,
    },
  };
}

function generateSuggestions(
  weakSkills: string[],
  failedTopics: Array<{ topic: string; failRate: number }>
): string[] {
  const suggestions: string[] = [];

  if (weakSkills.length > 0) {
    suggestions.push(`Focus on: ${weakSkills.slice(0, 3).join(", ")} — these are your weakest areas.`);
  }

  if (failedTopics.length > 0) {
    suggestions.push(
      `Review ${failedTopics[0].topic} — ${failedTopics[0].failRate}% of questions were answered incorrectly.`
    );
  }

  if (weakSkills.length === 0) {
    suggestions.push("Strong performance! Try harder difficulty to challenge yourself.");
  }

  suggestions.push("Use Study Buddy in 'Review Mistakes' mode to work through your errors.");

  return suggestions;
}
