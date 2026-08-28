import * as XLSX from "xlsx";
import { candidateFingerprint, normalizeText, QUESTION_IMPORT_MAX_CANDIDATES, QUESTION_IMPORT_MAX_COLUMNS, rejectUnsafeMarkup, validateQuestionImportFile } from "./validation";
import { parseCsvQuestions } from "./csv";
import type { QuestionImportParseResult } from "./types";

export function parseXlsxQuestions(name: string, buffer: Buffer, mime?: string, sheetName?: string): QuestionImportParseResult {
  const { fingerprint, warnings } = validateQuestionImportFile(name, buffer, "XLSX", mime);
  const workbook = XLSX.read(buffer, { type: "buffer", dense: true, cellFormula: false, cellHTML: false, cellNF: false, cellStyles: false, bookVBA: false, WTF: false });
  const selected = sheetName ?? workbook.SheetNames[0];
  if (!selected || !workbook.Sheets[selected]) throw new Error(workbook.SheetNames.length > 1 ? "Select a worksheet before importing." : "Workbook contains no readable worksheet.");
  if (workbook.SheetNames.length > 1 && !sheetName) throw new Error("Select a worksheet before importing a multi-sheet workbook.");
  const rows = XLSX.utils.sheet_to_json<unknown[]>(workbook.Sheets[selected], { header: 1, raw: false, defval: "", blankrows: false }).slice(0, QUESTION_IMPORT_MAX_CANDIDATES + 1);
  const header = (rows.shift() ?? []).map((value) => normalizeText(value));
  if (!header.length || header.length > QUESTION_IMPORT_MAX_COLUMNS) throw new Error("Worksheet headers are missing or exceed the column limit.");
  const csvRows = rows.map((values) => Object.fromEntries(header.map((column, index) => [column, normalizeText(values[index])]))) as Record<string, string>[];
  // Reuse the deterministic CSV mapping contract after converting displayed cells.
  const csv = parseCsvQuestions(`${name}#${selected}.csv`, Buffer.from([header, ...csvRows.map((row) => header.map((column) => row[column]))].map((row) => row.map((cell) => JSON.stringify(cell)).join(",")).join("\n")), "text/csv");
  csv.format = "XLSX";
  csv.sourceFingerprint = fingerprint;
  csv.warnings = [...warnings, ...csv.warnings, `Worksheet: ${selected}`];
  csv.candidates = csv.candidates.map((candidate) => ({ ...candidate, sourceLocation: { ...candidate.sourceLocation, file: name, sheet: selected }, sourceFingerprint: fingerprint, duplicateFingerprint: candidateFingerprint([candidate.stem, ...candidate.options, candidate.answer ?? "" ]), warnings: [...candidate.warnings, ...rejectUnsafeMarkup(candidate.stem)] }));
  return csv;
}
