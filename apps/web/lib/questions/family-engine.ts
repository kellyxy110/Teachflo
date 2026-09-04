import type { ClassLevel, QuestionType, Term } from "@prisma/client";
import {
  buildCanonicalQuestionVersionEnvelope,
  buildCanonicalQuestionMetadata,
  canonicalQuestionFingerprint,
  questionFamilyKey,
  type CanonicalQuestionMetadata,
  type QuestionCorpusDifficulty,
  type QuestionCognitiveSkill,
} from "@/lib/questions/corpus-contract";

export type FamilyParameters = Record<string, number>;
export type QuestionFamilyKey =
  | "ss1-mathematics-linear-equation-v1"
  | "ss1-mathematics-algebra-simplification-v1"
  | "ss1-mathematics-ratio-proportion-v1"
  | "ss1-mathematics-arithmetic-progression-v1"
  | "ss1-mathematics-percentage-application-v1";

export type FamilyQuestion = {
  type: QuestionType;
  stem: string;
  answer: string;
  solution: string;
  options?: string[];
  correctOptionIndex?: number;
};

export type FamilyGenerationInput = {
  seed: number;
  questionType?: QuestionType;
  difficulty?: QuestionCorpusDifficulty;
  cognitiveSkill?: QuestionCognitiveSkill;
  assessmentProfiles?: CanonicalQuestionMetadata["assessmentProfiles"];
  classLevel?: ClassLevel;
  term?: Term;
  subject?: string;
  topic?: string;
  subtopic?: string;
  curriculumNodeId: string;
  curriculumVersionId: string;
  objectiveNodeId?: string;
};

export type QuestionFamilyDefinition = {
  key: QuestionFamilyKey;
  version: number;
  subject: string;
  classLevel: ClassLevel;
  topic: string;
  supportedQuestionTypes: readonly QuestionType[];
  generate: (seed: number, type: QuestionType) => FamilyQuestion;
};

export type GeneratedQuestionCandidate = FamilyQuestion & {
  familyKey: string;
  familyVersion: number;
  parameters: FamilyParameters;
  metadata: CanonicalQuestionMetadata;
  exactFingerprint: string;
  normalizedFingerprint: string;
  familyVariantFingerprint: string;
};

export type CandidateValidation = {
  valid: boolean;
  blockers: string[];
  warnings: string[];
};

function rng(seed: number) {
  let state = Math.abs(Math.trunc(seed)) || 1;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function integer(random: () => number, min: number, max: number) {
  return Math.floor(random() * (max - min + 1)) + min;
}

function mcq(question: string, answer: number, distractors: number[], solution: string): FamilyQuestion {
  const options = [String(answer), ...distractors.map(String)];
  return { type: "MCQ", stem: question, answer: String(answer), solution, options, correctOptionIndex: 0 };
}

function linear(seed: number, type: QuestionType): FamilyQuestion {
  const random = rng(seed);
  const a = integer(random, 2, 9);
  const x = integer(random, 2, 12);
  const b = integer(random, 1, 12);
  const c = a * x + b;
  const text = `Solve ${a}x + ${b} = ${c}.`;
  const solution = `${a}x = ${c - b}, so x = ${x}.`;
  return type === "MCQ" ? mcq(text, x, [x + 1, x - 1, -x], solution) : { type, stem: text, answer: String(x), solution };
}

function simplify(seed: number, type: QuestionType): FamilyQuestion {
  const random = rng(seed);
  const a = integer(random, 2, 9);
  const b = integer(random, 2, 9);
  const text = `Simplify ${a}x + ${b}x.`;
  const answer = a + b;
  const solution = `Combine like terms: (${a} + ${b})x = ${answer}x.`;
  return { type, stem: text, answer: `${answer}x`, solution };
}

function ratio(seed: number, type: QuestionType): FamilyQuestion {
  const random = rng(seed);
  const a = integer(random, 2, 6);
  const b = integer(random, 2, 8);
  const multiplier = integer(random, 2, 7);
  const known = a * multiplier;
  const answer = b * multiplier;
  const text = `If ${a}:${b} = ${known}:y, find y.`;
  const solution = `The scale factor is ${known}/${a} = ${multiplier}; therefore y = ${b} × ${multiplier} = ${answer}.`;
  return { type, stem: text, answer: String(answer), solution };
}

function progression(seed: number, type: QuestionType): FamilyQuestion {
  const random = rng(seed);
  const first = integer(random, 1, 12);
  const difference = integer(random, 2, 8);
  const position = integer(random, 4, 12);
  const answer = first + (position - 1) * difference;
  const text = `Find the ${position}th term of the arithmetic progression ${first}, ${first + difference}, ${first + 2 * difference}, ...`;
  const solution = `Use aₙ = a + (n − 1)d: ${first} + (${position} − 1) × ${difference} = ${answer}.`;
  return { type, stem: text, answer: String(answer), solution };
}

function percentage(seed: number, type: QuestionType): FamilyQuestion {
  const random = rng(seed);
  const percent = integer(random, 10, 50);
  const base = integer(random, 2, 20) * 10;
  const answer = (percent * base) / 100;
  const text = `Find ${percent}% of ${base}.`;
  const solution = `${percent}/100 × ${base} = ${answer}.`;
  return type === "MCQ" ? mcq(text, answer, [answer + 5, answer - 5, answer * 2], solution) : { type, stem: text, answer: String(answer), solution };
}

export const QUESTION_FAMILY_REGISTRY: readonly QuestionFamilyDefinition[] = [
  { key: "ss1-mathematics-linear-equation-v1", version: 1, subject: "Mathematics", classLevel: "SS1", topic: "Linear Equations", supportedQuestionTypes: ["CALCULATION", "SHORT_ANSWER", "MCQ"], generate: linear },
  { key: "ss1-mathematics-algebra-simplification-v1", version: 1, subject: "Mathematics", classLevel: "SS1", topic: "Algebraic Simplification", supportedQuestionTypes: ["SHORT_ANSWER", "CALCULATION"], generate: simplify },
  { key: "ss1-mathematics-ratio-proportion-v1", version: 1, subject: "Mathematics", classLevel: "SS1", topic: "Ratio and Proportion", supportedQuestionTypes: ["SHORT_ANSWER", "CALCULATION"], generate: ratio },
  { key: "ss1-mathematics-arithmetic-progression-v1", version: 1, subject: "Mathematics", classLevel: "SS1", topic: "Arithmetic Progression", supportedQuestionTypes: ["SHORT_ANSWER", "CALCULATION"], generate: progression },
  { key: "ss1-mathematics-percentage-application-v1", version: 1, subject: "Mathematics", classLevel: "SS1", topic: "Percentage", supportedQuestionTypes: ["CALCULATION", "SHORT_ANSWER", "MCQ"], generate: percentage },
];

export function getQuestionFamily(key: string) {
  return QUESTION_FAMILY_REGISTRY.find((family) => family.key === key);
}

function fingerprintParameters(familyKey: string, parameters: FamilyParameters) {
  return JSON.stringify([familyKey, Object.entries(parameters).sort(([a], [b]) => a.localeCompare(b))]);
}

function parametersFor(familyKey: QuestionFamilyKey, seed: number): FamilyParameters {
  return { seed, family: familyKey.length };
}

export function generateQuestionCandidate(familyKey: QuestionFamilyKey, input: FamilyGenerationInput): GeneratedQuestionCandidate {
  const family = getQuestionFamily(familyKey);
  if (!family) throw new Error(`Unknown question family: ${familyKey}`);
  const type = input.questionType ?? family.supportedQuestionTypes[0];
  if (!family.supportedQuestionTypes.includes(type)) throw new Error(`${type} is not supported by ${familyKey}`);
  const question = family.generate(input.seed, type);
  const parameters = parametersFor(familyKey, input.seed);
  const exactFingerprint = canonicalQuestionFingerprint({ stem: question.stem, type, answer: question.answer, solution: question.solution });
  const normalizedFingerprint = canonicalQuestionFingerprint({ stem: question.stem.replace(/\d+/g, "#"), type, answer: question.answer, solution: question.solution });
  const familyVariantFingerprint = fingerprintParameters(familyKey, parameters);
  const metadata = buildCanonicalQuestionMetadata({
    subject: input.subject ?? family.subject,
    classLevel: input.classLevel ?? family.classLevel,
    term: input.term,
    topic: input.topic ?? family.topic,
    subtopic: input.subtopic,
    curriculumNodeIds: [input.curriculumNodeId],
    objectiveNodeIds: input.objectiveNodeId ? [input.objectiveNodeId] : [],
    questionType: type,
    difficulty: input.difficulty ?? "STANDARD",
    cognitiveSkills: [input.cognitiveSkill ?? "APPLICATION"],
    assessmentProfiles: input.assessmentProfiles ?? ["SCHOOL_STANDARD"],
    estimatedTimeSeconds: 120,
    marks: type === "MCQ" ? 1 : 2,
    calculatorPolicy: "NOT_APPLICABLE",
    prerequisiteNodeIds: [],
    curriculumAlignments: [{ curriculumVersionId: input.curriculumVersionId, nodeId: input.curriculumNodeId, objectiveNodeId: input.objectiveNodeId, authority: "INTERNAL_UNVERIFIED" }],
    familyKey: questionFamilyKey({ subject: input.subject ?? family.subject, curriculumNodeId: input.curriculumNodeId, family: family.key }),
    familyVariant: parameters,
    generationMethod: "DETERMINISTIC",
    verifierId: "teachnexis.math.arithmetic.v1",
    verifierVersion: "1",
    exactFingerprint,
    normalizedFingerprint,
    familyVariantFingerprint,
    origin: "DETERMINISTIC_GENERATED",
    provenance: { origin: "DETERMINISTIC_GENERATED", verification: "NOT_REQUIRED" },
    reviewStatus: "DRAFT",
    version: 1,
  });
  return { ...question, familyKey, familyVersion: family.version, parameters, metadata, exactFingerprint, normalizedFingerprint, familyVariantFingerprint };
}

export function validateQuestionCandidate(candidate: GeneratedQuestionCandidate): CandidateValidation {
  const blockers: string[] = [];
  const warnings: string[] = [];
  const family = getQuestionFamily(candidate.familyKey);
  if (!family) blockers.push("family is not registered");
  if (family && !family.supportedQuestionTypes.includes(candidate.type)) blockers.push("question type is not supported by family");
  if (!candidate.stem.trim() || !candidate.answer.trim() || !candidate.solution.trim()) blockers.push("stem, answer, and solution are required");
  if (candidate.type === "MCQ") {
    if (!candidate.options || candidate.options.length < 2) blockers.push("MCQ requires options");
    if (candidate.options && new Set(candidate.options.map((option) => option.trim().toLowerCase())).size !== candidate.options.length) blockers.push("MCQ options must be unique");
    if (candidate.correctOptionIndex === undefined || candidate.options?.[candidate.correctOptionIndex] !== candidate.answer) blockers.push("MCQ correct answer must be present in options");
  }
  if (candidate.metadata.origin === "VERIFIED_PAST_QUESTION") blockers.push("deterministic candidates cannot be verified past questions");
  if (candidate.metadata.reviewStatus !== "DRAFT") blockers.push("generated candidates must start as DRAFT");
  if (candidate.metadata.provenance.origin !== "DETERMINISTIC_GENERATED") blockers.push("deterministic provenance is required");
  if (!candidate.metadata.curriculumAlignments.length) blockers.push("curriculum alignment is required");
  if (candidate.parameters.seed < 0) warnings.push("negative seeds are normalized deterministically");
  return { valid: blockers.length === 0, blockers, warnings };
}

/** Recomputes the answer from family parameters instead of trusting rendered text. */
export function verifyQuestionAnswer(candidate: GeneratedQuestionCandidate): { valid: boolean; expected: string; actual: string } {
  const family = getQuestionFamily(candidate.familyKey);
  if (!family) return { valid: false, expected: "", actual: candidate.answer };
  const regenerated = family.generate(candidate.parameters.seed, candidate.type);
  return { valid: regenerated.answer === candidate.answer, expected: regenerated.answer, actual: candidate.answer };
}
