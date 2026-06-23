const NIGERIAN_SUBJECTS = new Set([
  "mathematics", "english", "physics", "chemistry", "biology",
  "further mathematics", "economics", "government", "literature",
  "civic education", "computer science", "agricultural science",
  "geography", "history", "religious studies", "french", "yoruba",
  "igbo", "hausa", "technical drawing", "food and nutrition",
  "home economics", "commerce", "accounting", "financial accounting",
  "basic science", "basic technology", "social studies", "fine art",
  "music", "physical education", "health education",
]);

const BLOOMS_KEYWORDS: Record<string, string[]> = {
  remember: ["define", "list", "state", "name", "identify", "recall", "label"],
  understand: ["explain", "describe", "summarize", "interpret", "classify", "compare"],
  apply: ["calculate", "solve", "use", "demonstrate", "apply", "compute", "determine"],
  analyze: ["analyze", "examine", "differentiate", "distinguish", "investigate", "relate"],
  evaluate: ["evaluate", "justify", "assess", "argue", "defend", "critique", "judge"],
  create: ["design", "construct", "create", "develop", "formulate", "propose", "plan"],
};

interface TrustCheck {
  label: string;
  status: "pass" | "warn" | "fail";
  detail: string;
}

export interface TrustReport {
  score: number;
  tier: "platinum" | "gold" | "silver" | "verified" | "review";
  checks: TrustCheck[];
  generatedAt: string;
}

export function verifyLesson(content: string, subject: string, classLevel: string): TrustReport {
  const checks: TrustCheck[] = [];
  const lower = content.toLowerCase();

  const isCurriculumSubject = NIGERIAN_SUBJECTS.has(subject.toLowerCase());
  checks.push({
    label: "Curriculum Alignment",
    status: isCurriculumSubject ? "pass" : "warn",
    detail: isCurriculumSubject
      ? `${subject} is a recognized Nigerian curriculum subject`
      : `${subject} is not in the standard curriculum list`,
  });

  const hasObjectives = /objective|learning outcome/i.test(content);
  const hasActivities = /activit|exercise|practice/i.test(content);
  const hasEvaluation = /evaluat|assess|question/i.test(content);
  const structureScore = [hasObjectives, hasActivities, hasEvaluation].filter(Boolean).length;
  checks.push({
    label: "Lesson Structure",
    status: structureScore >= 3 ? "pass" : structureScore >= 2 ? "warn" : "fail",
    detail: `${structureScore}/3 required sections found (objectives, activities, evaluation)`,
  });

  const classRef = new RegExp(classLevel.replace(/(\d)/, "\\s*$1"), "i");
  const hasClassRef = classRef.test(content) || /jss|ss[s123]/i.test(content);
  checks.push({
    label: "Grade Level Appropriateness",
    status: hasClassRef ? "pass" : "warn",
    detail: hasClassRef
      ? `Content references ${classLevel} level material`
      : "No explicit grade-level markers detected",
  });

  const wordCount = content.split(/\s+/).length;
  checks.push({
    label: "Content Depth",
    status: wordCount >= 200 ? "pass" : wordCount >= 100 ? "warn" : "fail",
    detail: `${wordCount} words — ${wordCount >= 200 ? "sufficient" : "may need more"} detail`,
  });

  const flagged = /kill|weapon|drug|sex|violen|hack|exploit/i.test(lower);
  checks.push({
    label: "Educational Safety",
    status: flagged ? "fail" : "pass",
    detail: flagged ? "Potentially inappropriate content detected" : "No safety concerns",
  });

  return buildReport(checks);
}

export function verifyExam(
  questions: { stem: string; type: string; optionA?: string | null; correctOption?: string | null; solution?: string | null }[],
  subject: string,
): TrustReport {
  const checks: TrustCheck[] = [];

  const isCurriculumSubject = NIGERIAN_SUBJECTS.has(subject.toLowerCase());
  checks.push({
    label: "Curriculum Alignment",
    status: isCurriculumSubject ? "pass" : "warn",
    detail: isCurriculumSubject
      ? `${subject} is a recognized curriculum subject`
      : `${subject} is not in the standard list`,
  });

  const mcqs = questions.filter((q) => q.type === "MCQ");
  const withOptions = mcqs.filter((q) => q.optionA);
  const withAnswers = mcqs.filter((q) => q.correctOption);
  checks.push({
    label: "Question Integrity",
    status: withOptions.length === mcqs.length && withAnswers.length === mcqs.length ? "pass" : "warn",
    detail: `${withOptions.length}/${mcqs.length} MCQs have options, ${withAnswers.length}/${mcqs.length} have correct answers`,
  });

  const allStems = questions.map((q) => q.stem.toLowerCase()).join(" ");
  const bloomsCovered = Object.entries(BLOOMS_KEYWORDS).filter(
    ([, keywords]) => keywords.some((kw) => allStems.includes(kw))
  );
  checks.push({
    label: "Bloom's Taxonomy Coverage",
    status: bloomsCovered.length >= 3 ? "pass" : bloomsCovered.length >= 2 ? "warn" : "fail",
    detail: `${bloomsCovered.length}/6 cognitive levels: ${bloomsCovered.map(([l]) => l).join(", ") || "none detected"}`,
  });

  const withSolutions = questions.filter((q) => q.solution && q.solution.length > 10);
  checks.push({
    label: "Solution Quality",
    status: withSolutions.length >= questions.length * 0.8 ? "pass" : withSolutions.length >= questions.length * 0.5 ? "warn" : "fail",
    detail: `${withSolutions.length}/${questions.length} questions have detailed solutions`,
  });

  const flagged = questions.some((q) => /kill|weapon|drug|sex|violen/i.test(q.stem));
  checks.push({
    label: "Educational Safety",
    status: flagged ? "fail" : "pass",
    detail: flagged ? "Potentially inappropriate content detected" : "No safety concerns",
  });

  return buildReport(checks);
}

function buildReport(checks: TrustCheck[]): TrustReport {
  const weights = { pass: 1, warn: 0.6, fail: 0 };
  const raw = checks.reduce((sum, c) => sum + weights[c.status], 0) / checks.length;
  const score = Math.round(raw * 100);

  let tier: TrustReport["tier"];
  if (score >= 95) tier = "platinum";
  else if (score >= 90) tier = "gold";
  else if (score >= 80) tier = "silver";
  else if (score >= 70) tier = "verified";
  else tier = "review";

  return { score, tier, checks, generatedAt: new Date().toISOString() };
}
