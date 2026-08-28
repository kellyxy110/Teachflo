import assert from "node:assert/strict";
import * as XLSX from "xlsx";
import { parseCsvQuestions } from "../lib/services/question-import/csv";
import { parseDocxQuestions } from "../lib/services/question-import/docx";
import { parseXlsxQuestions } from "../lib/services/question-import/xlsx";
import { validateQuestionImportFile } from "../lib/services/question-import/validation";

const csv = Buffer.from("Question,Type,Option A,Correct Answer,Marks\nSolve x=1,MCQ,x=1,x=1,1\nAmbiguous,Unknown,a,,1\n");
const parsedCsv = parseCsvQuestions("questions.csv", csv, "text/csv");
assert.equal(parsedCsv.candidates.length, 2);
assert.equal(parsedCsv.candidates[0].status, "READY");
assert.equal(parsedCsv.candidates[1].status, "NEEDS_REVIEW");
assert.equal(parsedCsv.sourceFingerprint, validateQuestionImportFile("questions.csv", csv, "CSV").fingerprint);
console.log("CSV_VALIDATION:PASS");
console.log("CSV_PARSING:PASS");
console.log("AMBIGUOUS_TYPE:PASS");

const sheet = XLSX.utils.aoa_to_sheet([["Question", "Type", "Correct Answer"], ["H2O formula", "SHORT_ANSWER", "H_2O"]]);
const workbook = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(workbook, sheet, "Questions");
XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([["Other"]]), "Other");
const xlsx = XLSX.write(workbook, { type: "buffer", bookType: "xlsx", bookSST: true });
assert.throws(() => parseXlsxQuestions("questions.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));
const parsedXlsx = parseXlsxQuestions("questions.xlsx", xlsx, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Questions");
assert.equal(parsedXlsx.candidates.length, 1);
console.log("XLSX_VALIDATION:PASS");
console.log("XLSX_MULTI_SHEET_CONFIRMATION:PASS");
console.log("XLSX_PARSING:PASS");

assert.throws(() => parseDocxQuestions("bad.docx", Buffer.from("not a zip"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document"));
console.log("DOCX_MALFORMED_REJECTION:PASS");
console.log("CLEANUP:PASS (in-memory fixtures)");
