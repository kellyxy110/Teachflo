import Papa from "papaparse";
import { candidateFingerprint, normalizeText, QUESTION_IMPORT_MAX_CANDIDATES, QUESTION_IMPORT_MAX_COLUMNS, rejectUnsafeMarkup, validateQuestionImportFile } from "./validation";
import { QUESTION_TYPES, type CandidateStatus, type ImportedQuestionType, type QuestionImportParseResult } from "./types";

const aliases: Record<string, string[]> = {
  stem: ["question", "question text", "stem", "prompt"], type: ["type", "question type", "question_type"],
  answer: ["answer", "correct answer", "correct_answer", "key"], marks: ["marks", "mark", "score"],
  explanation: ["explanation", "solution", "feedback"], section: ["section", "part"], subject: ["subject"], topic: ["topic"],
  optionA: ["option a", "option_a", "a"], optionB: ["option b", "option_b", "b"], optionC: ["option c", "option_c", "c"], optionD: ["option d", "option_d", "d"],
};

function key(value: string): string { return value.toLowerCase().trim().replace(/\s+/g, " "); }
function findColumn(headers: string[], names: string[]): string | undefined { return headers.find((header) => names.includes(key(header))); }
function parseType(value: string): ImportedQuestionType | null {
  const normalized = key(value).replace(/[ _-]/g, "").toUpperCase();
  const match = QUESTION_TYPES.find((type) => type.replace("_", "") === normalized);
  return match ?? null;
}

export function parseCsvQuestions(name: string, buffer: Buffer, mime?: string): QuestionImportParseResult {
  const { fingerprint, warnings } = validateQuestionImportFile(name, buffer, "CSV", mime);
  const parsed = Papa.parse<Record<string, string>>(buffer.toString("utf8"), { header: true, skipEmptyLines: "greedy", dynamicTyping: false });
  const errors = parsed.errors.map((error) => `Row ${error.row ?? "?"}: ${error.message}`);
  const headers = parsed.meta.fields ?? [];
  if (!headers.length || headers.length > QUESTION_IMPORT_MAX_COLUMNS) throw new Error("CSV headers are missing or exceed the column limit.");
  const columns = Object.fromEntries(Object.entries(aliases).map(([nameKey, names]) => [nameKey, findColumn(headers, names)]));
  const candidates = parsed.data.slice(0, QUESTION_IMPORT_MAX_CANDIDATES).map((row, index) => {
    const stem = normalizeText(columns.stem ? row[columns.stem] : "");
    const rawType = normalizeText(columns.type ? row[columns.type] : "");
    const type = parseType(rawType);
    const options = [columns.optionA, columns.optionB, columns.optionC, columns.optionD].map((column) => normalizeText(column ? row[column] : "")).filter(Boolean);
    const rowWarnings = [...rejectUnsafeMarkup(stem)];
    if (!stem) errors.push(`Row ${index + 2}: question text is missing.`);
    if (rawType && !type) rowWarnings.push(`Ambiguous question type: ${rawType}`);
    if (!rawType) rowWarnings.push("Question type requires Teacher confirmation.");
    const status = !stem ? "ERROR" : (!type || rowWarnings.length ? "NEEDS_REVIEW" : "READY");
    const answer = columns.answer ? normalizeText(row[columns.answer]) : null;
    const marksText = columns.marks ? normalizeText(row[columns.marks]) : "";
    const marks = marksText && Number.isFinite(Number(marksText)) ? Number(marksText) : null;
    const normalizedAnswer = answer || null;
    const candidateStatus: CandidateStatus = status as CandidateStatus;
    return { sourceLocation: { file: name, row: index + 2 }, rawSource: row, stem, questionType: type, options, answer: normalizedAnswer, marks, explanation: columns.explanation ? normalizeText(row[columns.explanation]) || null : null, section: columns.section ? normalizeText(row[columns.section]) || null : null, subject: columns.subject ? normalizeText(row[columns.subject]) || null : null, topic: columns.topic ? normalizeText(row[columns.topic]) || null : null, warnings: rowWarnings, errors: stem ? [] : [`Row ${index + 2}: question text is missing.`], duplicateFingerprint: candidateFingerprint([stem, ...options, normalizedAnswer ?? ""]), sourceFingerprint: fingerprint, stemConversionState: "PRESERVED" as const, status: candidateStatus };
  });
  if (parsed.data.length > QUESTION_IMPORT_MAX_CANDIDATES) warnings.push(`Only the first ${QUESTION_IMPORT_MAX_CANDIDATES} rows were staged; remaining rows require a bounded continuation.`);
  return { sourceFingerprint: fingerprint, format: "CSV", candidates, warnings, errors };
}
