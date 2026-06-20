import { routedChat } from "@/lib/ai/router";
import type { CurriculumPlanData, WeekPlan } from "./types";

export async function generateCurriculumPlan(params: {
  subject: string;
  classLevel: string;
  term: string;
  totalWeeks: number;
  syllabusContext?: string;
  performanceData?: {
    classAverage: number;
    weakTopics: string[];
    strongTopics: string[];
    commonMistakes: string[];
  };
}): Promise<CurriculumPlanData> {
  const perfSection = params.performanceData
    ? `
Class Performance Data:
- Class average: ${params.performanceData.classAverage}%
- Weak topics: ${params.performanceData.weakTopics.join(", ") || "none identified"}
- Strong topics: ${params.performanceData.strongTopics.join(", ") || "none identified"}
- Common mistakes: ${params.performanceData.commonMistakes.join("; ") || "none identified"}

IMPORTANT: Weak topics should get MORE time and appear EARLIER with remediation.
Strong topics can be covered more quickly or used for enrichment.`
    : "";

  const ragSection = params.syllabusContext
    ? `\nSyllabus/Document Context:\n${params.syllabusContext}\n`
    : "";

  const response = await routedChat({
    message: `Generate a complete ${params.totalWeeks}-week curriculum plan.

Subject: ${params.subject}
Class: ${params.classLevel}
Term: ${params.term}
${perfSection}
${ragSection}

Return ONLY a JSON object:
{
  "weeks": [
    {
      "week": 1,
      "topic": "main topic",
      "subtopics": ["subtopic1", "subtopic2"],
      "objectives": ["objective1", "objective2"],
      "activities": ["activity1", "activity2"],
      "assessmentType": "formative | summative | diagnostic | none",
      "hours": 4,
      "notes": "optional teacher notes"
    }
  ],
  "assessmentSchedule": [
    { "week": 4, "type": "formative", "topics": ["topic1"], "weight": 10 }
  ],
  "revisionCycles": [
    { "week": 6, "revisitTopics": ["topic1"], "reason": "spaced repetition" }
  ]
}

Rules:
- Follow Nigerian WAEC/JAMB/JUPEB curriculum standards
- Include diagnostic assessment in week 1
- Add formative assessments every 3-4 weeks
- Include at least 2 revision/spaced repetition cycles
- Summative assessment in the final week
- If performance data shows weak topics, allocate extra time to them
- Sequence topics so prerequisites come before dependent concepts
- Each week should have clear, measurable objectives`,
    systemPrompt:
      "You are a Nigerian curriculum planning specialist aligned with WAEC, JAMB, and JUPEB standards. Generate optimized, performance-aware curriculum plans. Return ONLY valid JSON, no markdown.",
  });

  const raw = response.content.replace(/```json?\n?|\n?```/g, "").trim();
  const parsed = JSON.parse(raw);

  const weeks: WeekPlan[] = (parsed.weeks || []).map((w: Record<string, unknown>, i: number) => ({
    week: Number(w.week) || i + 1,
    topic: String(w.topic || ""),
    subtopics: Array.isArray(w.subtopics) ? w.subtopics.map(String) : [],
    objectives: Array.isArray(w.objectives) ? w.objectives.map(String) : [],
    activities: Array.isArray(w.activities) ? w.activities.map(String) : [],
    assessmentType: (["formative", "summative", "diagnostic", "none"].includes(w.assessmentType as string)
      ? w.assessmentType
      : "none") as "formative" | "summative" | "diagnostic" | "none",
    hours: Number(w.hours) || 4,
    notes: w.notes ? String(w.notes) : undefined,
  }));

  const assessmentSchedule = (parsed.assessmentSchedule || []).map(
    (a: Record<string, unknown>) => ({
      week: Number(a.week),
      type: String(a.type),
      topics: Array.isArray(a.topics) ? a.topics.map(String) : [],
      weight: Number(a.weight) || 0,
    })
  );

  const revisionCycles = (parsed.revisionCycles || []).map(
    (r: Record<string, unknown>) => ({
      week: Number(r.week),
      revisitTopics: Array.isArray(r.revisitTopics) ? r.revisitTopics.map(String) : [],
      reason: String(r.reason || ""),
    })
  );

  return {
    weeks,
    assessmentSchedule,
    revisionCycles,
    coverageSummary: {
      totalTopics: new Set(weeks.map((w) => w.topic)).size,
      totalWeeks: weeks.length,
      assessmentCount: assessmentSchedule.length,
      revisionWeeks: revisionCycles.length,
    },
  };
}
