import { routedChat } from "@/lib/ai/router";
import type { ErrorCategory, MistakeAnalysis, MistakeCluster, MistakeReport } from "./types";

const VALID_ERRORS: ErrorCategory[] = [
  "conceptual", "calculation", "misinterpretation", "missing_prerequisite", "guessing",
];

export async function classifyMistake(params: {
  questionStem: string;
  correctAnswer: string;
  studentAnswer: string;
  subject: string;
  topic: string;
  explanation: string;
  timeSpent: number;
  estimatedTime: number;
}): Promise<MistakeAnalysis> {
  const timeRatio = params.timeSpent / params.estimatedTime;
  const likelyGuessing = timeRatio < 0.2;

  if (likelyGuessing) {
    return {
      errorType: "guessing",
      pattern: "Answer submitted too quickly — likely guessing or uncertain.",
      rootCause: "Insufficient understanding of the topic to attempt the question.",
      prerequisiteGap: params.topic,
      occurrences: 1,
      isRecurring: false,
    };
  }

  try {
    const response = await routedChat({
      message: `Analyze this student's wrong answer in depth.

Subject: ${params.subject}
Topic: ${params.topic}
Question: ${params.questionStem}
Correct answer: ${params.correctAnswer}
Student's answer: ${params.studentAnswer}
Expected explanation: ${params.explanation}
Time spent: ${params.timeSpent}s (expected: ${params.estimatedTime}s)

Return ONLY a JSON object:
{
  "errorType": "conceptual | calculation | misinterpretation | missing_prerequisite | guessing",
  "pattern": "one sentence describing the specific error pattern",
  "rootCause": "why the student made this error — the underlying gap",
  "prerequisiteGap": "if the student is missing a prerequisite skill, name it — otherwise null"
}`,
      systemPrompt:
        "You are a diagnostic education specialist for Nigerian secondary schools (WAEC/JAMB/JUPEB). Analyze student errors precisely to identify root causes and prerequisite gaps. Return ONLY valid JSON.",
    });

    const raw = response.content.replace(/```json?\n?|\n?```/g, "").trim();
    const result = JSON.parse(raw);

    return {
      errorType: VALID_ERRORS.includes(result.errorType) ? result.errorType : "conceptual",
      pattern: String(result.pattern || "Unknown error pattern"),
      rootCause: result.rootCause ? String(result.rootCause) : null,
      prerequisiteGap: result.prerequisiteGap ? String(result.prerequisiteGap) : null,
      occurrences: 1,
      isRecurring: false,
    };
  } catch {
    return {
      errorType: "conceptual",
      pattern: "Unable to classify error — review the correct answer.",
      rootCause: null,
      prerequisiteGap: null,
      occurrences: 1,
      isRecurring: false,
    };
  }
}

export function buildMistakeReport(
  studentId: string,
  patterns: Array<{
    skill: string;
    errorType: string;
    pattern: string;
    rootCause: string | null;
    prerequisiteGap: string | null;
    occurrences: number;
    resolved: boolean;
  }>,
  recentMistakes: Array<{
    questionStem: string;
    errorType: string;
    misconception: string;
    subject: string;
    date: Date;
  }>
): MistakeReport {
  const clusterMap = new Map<string, MistakeCluster>();

  for (const p of patterns) {
    const existing = clusterMap.get(p.skill) || {
      skill: p.skill,
      patterns: [],
      totalErrors: 0,
      resolvedCount: 0,
      severityScore: 0,
    };

    existing.patterns.push({
      errorType: p.errorType as ErrorCategory,
      pattern: p.pattern,
      rootCause: p.rootCause,
      prerequisiteGap: p.prerequisiteGap,
      occurrences: p.occurrences,
      isRecurring: p.occurrences >= 3,
    });

    existing.totalErrors += p.occurrences;
    if (p.resolved) existing.resolvedCount += 1;

    existing.severityScore = computeSeverity(existing);
    clusterMap.set(p.skill, existing);
  }

  const clusters = Array.from(clusterMap.values()).sort(
    (a, b) => b.severityScore - a.severityScore
  );

  const topGaps = new Set<string>();
  for (const p of patterns) {
    if (p.prerequisiteGap && !p.resolved) topGaps.add(p.prerequisiteGap);
  }

  const recurring = patterns
    .filter((p) => p.occurrences >= 3 && !p.resolved)
    .map((p) => ({
      errorType: p.errorType as ErrorCategory,
      pattern: p.pattern,
      rootCause: p.rootCause,
      prerequisiteGap: p.prerequisiteGap,
      occurrences: p.occurrences,
      isRecurring: true,
    }));

  return {
    studentId,
    totalMistakes: patterns.reduce((sum, p) => sum + p.occurrences, 0),
    clusters,
    topPrerequisiteGaps: Array.from(topGaps).slice(0, 5),
    recurringPatterns: recurring,
    recentMistakes,
  };
}

function computeSeverity(cluster: MistakeCluster): number {
  let score = cluster.totalErrors * 2;
  for (const p of cluster.patterns) {
    if (p.isRecurring) score += 10;
    if (p.prerequisiteGap) score += 5;
    if (p.errorType === "missing_prerequisite") score += 8;
    if (p.errorType === "conceptual") score += 3;
  }
  score -= cluster.resolvedCount * 5;
  return Math.max(0, score);
}
