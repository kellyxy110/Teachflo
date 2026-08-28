export const QUESTION_TYPES = ["MCQ", "SHORT_ANSWER", "ESSAY", "STRUCTURED", "CALCULATION"] as const;
export type ImportedQuestionType = (typeof QUESTION_TYPES)[number];
export type CandidateStatus = "READY" | "NEEDS_REVIEW" | "ERROR" | "POSSIBLE_DUPLICATE";
export type StemConversionState = "PRESERVED" | "NOT_APPLICABLE" | "NEEDS_REVIEW";

export type QuestionImportCandidate = {
  sourceLocation: { file: string; page?: number; sheet?: string; row?: number; paragraph?: number; section?: string };
  rawSource: unknown;
  stem: string;
  questionType: ImportedQuestionType | null;
  options: string[];
  answer: string | null;
  marks: number | null;
  explanation: string | null;
  section: string | null;
  subject: string | null;
  topic: string | null;
  warnings: string[];
  errors: string[];
  duplicateFingerprint: string;
  sourceFingerprint: string;
  stemConversionState: StemConversionState;
  status: CandidateStatus;
};

export type QuestionImportParseResult = {
  sourceFingerprint: string;
  format: "CSV" | "XLSX" | "DOCX";
  candidates: QuestionImportCandidate[];
  warnings: string[];
  errors: string[];
};
