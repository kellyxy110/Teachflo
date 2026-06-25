"use client";

import { useState, useTransition, useRef } from "react";
import { useRouter } from "next/navigation";
import * as XLSX from "xlsx";
import { bulkImportQuestions } from "@/app/actions/questions";
import {
  Upload, FileSpreadsheet, Check, X, Loader2,
  AlertCircle, Download, Eye,
} from "lucide-react";

type ExamOption = { id: string; title: string; questionCount: number };

type ParsedQuestion = {
  stem: string;
  type: "MCQ" | "SHORT_ANSWER" | "ESSAY" | "STRUCTURED" | "CALCULATION";
  optionA?: string;
  optionB?: string;
  optionC?: string;
  optionD?: string;
  optionE?: string;
  correctOption?: string;
  solution: string;
  explanation: string;
  section?: string;
  difficulty?: string;
  marks?: number;
};

const EXPECTED_COLUMNS = [
  "Question", "Type", "Option A", "Option B", "Option C", "Option D",
  "Option E", "Correct", "Solution", "Explanation", "Section", "Difficulty", "Marks",
];

export function ExcelImportClient({ exams }: { exams: ExamOption[] }) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [examId, setExamId] = useState("");
  const [fileName, setFileName] = useState("");
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [imported, setImported] = useState(false);
  const [saving, startSave] = useTransition();
  const [showPreview, setShowPreview] = useState(false);

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setErrors([]);
    setQuestions([]);
    setImported(false);

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: "" });

        if (rows.length === 0) {
          setErrors(["No data found in the spreadsheet."]);
          return;
        }

        const parsed: ParsedQuestion[] = [];
        const errs: string[] = [];

        rows.forEach((row, i) => {
          const stem = (row["Question"] ?? row["question"] ?? row["Stem"] ?? row["stem"] ?? "").toString().trim();
          const solution = (row["Solution"] ?? row["solution"] ?? row["Answer"] ?? row["answer"] ?? "").toString().trim();
          const explanation = (row["Explanation"] ?? row["explanation"] ?? solution).toString().trim();

          if (!stem) {
            errs.push(`Row ${i + 2}: Missing question text`);
            return;
          }
          if (!solution) {
            errs.push(`Row ${i + 2}: Missing solution/answer`);
            return;
          }

          const rawType = (row["Type"] ?? row["type"] ?? "MCQ").toString().trim().toUpperCase();
          const type = (["MCQ", "SHORT_ANSWER", "ESSAY", "STRUCTURED", "CALCULATION"].includes(rawType)
            ? rawType : "MCQ") as ParsedQuestion["type"];

          const correct = (row["Correct"] ?? row["correct"] ?? row["Correct Answer"] ?? "").toString().trim().toUpperCase();

          parsed.push({
            stem,
            type,
            optionA: (row["Option A"] ?? row["option_a"] ?? row["A"] ?? "").toString().trim() || undefined,
            optionB: (row["Option B"] ?? row["option_b"] ?? row["B"] ?? "").toString().trim() || undefined,
            optionC: (row["Option C"] ?? row["option_c"] ?? row["C"] ?? "").toString().trim() || undefined,
            optionD: (row["Option D"] ?? row["option_d"] ?? row["D"] ?? "").toString().trim() || undefined,
            optionE: (row["Option E"] ?? row["option_e"] ?? row["E"] ?? "").toString().trim() || undefined,
            correctOption: correct || undefined,
            solution,
            explanation,
            section: (row["Section"] ?? row["section"] ?? "A").toString().trim().toUpperCase().charAt(0) || "A",
            difficulty: (row["Difficulty"] ?? row["difficulty"] ?? "").toString().trim() || undefined,
            marks: parseInt(row["Marks"] ?? row["marks"] ?? "") || undefined,
          });
        });

        setQuestions(parsed);
        setErrors(errs);
        if (parsed.length > 0) setShowPreview(true);
      } catch {
        setErrors(["Failed to parse the Excel file. Ensure it's a valid .xlsx file."]);
      }
    };
    reader.readAsArrayBuffer(file);
  }

  function handleImport() {
    if (!examId || questions.length === 0) return;
    startSave(async () => {
      try {
        await bulkImportQuestions(examId, questions);
        setImported(true);
      } catch {
        setErrors((prev) => [...prev, "Failed to import questions. Please try again."]);
      }
    });
  }

  function downloadTemplate() {
    const ws = XLSX.utils.aoa_to_sheet([
      EXPECTED_COLUMNS,
      ["What is 2 + 2?", "MCQ", "3", "4", "5", "6", "", "B", "4", "2 + 2 = 4", "A", "BASIC", "1"],
      ["Solve $x^2 - 4 = 0$", "MCQ", "x = 2", "x = ±2", "x = 4", "x = -4", "", "B", "x = ±2, since x² = 4", "Take square root of both sides", "A", "WAEC", "2"],
      ["Explain photosynthesis", "ESSAY", "", "", "", "", "", "", "Photosynthesis is the process by which...", "Must mention light, CO2, water, glucose", "B", "APPLICATION", "10"],
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Questions");
    XLSX.writeFile(wb, "teachflow_question_template.xlsx");
  }

  const mcqCount = questions.filter((q) => q.type === "MCQ").length;
  const theoryCount = questions.length - mcqCount;

  return (
    <div className="space-y-4">
      {/* Exam selector */}
      <div className="bg-surface border border-border rounded-xl p-4">
        <label className="block text-xs font-semibold text-text-2 mb-1.5">Import into Exam *</label>
        <select
          value={examId}
          onChange={(e) => setExamId(e.target.value)}
          className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Select an exam</option>
          {exams.map((ex) => (
            <option key={ex.id} value={ex.id}>
              {ex.title} ({ex.questionCount} questions)
            </option>
          ))}
        </select>
      </div>

      {/* Template download */}
      <div className="bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/20 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <FileSpreadsheet size={20} className="text-blue-500 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-text mb-1">Excel Template</p>
            <p className="text-xs text-text-2 mb-2">
              Download the template, fill it with your questions, then upload it below.
              Use <code className="bg-bg px-1 rounded">$...$</code> for math symbols (e.g. <code className="bg-bg px-1 rounded">$x^2$</code>).
            </p>
            <button
              onClick={downloadTemplate}
              className="flex items-center gap-1.5 bg-blue-500 text-white text-xs font-bold px-3 py-2 rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Download size={14} />Download Template
            </button>
          </div>
        </div>
      </div>

      {/* File upload */}
      <div
        onClick={() => fileRef.current?.click()}
        className="bg-surface border-2 border-dashed border-border rounded-xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls"
          onChange={handleFile}
          className="hidden"
        />
        <Upload size={32} className="text-muted mx-auto mb-2" />
        {fileName ? (
          <p className="text-sm font-semibold text-text">{fileName}</p>
        ) : (
          <>
            <p className="text-sm font-medium text-text">Click to upload Excel file</p>
            <p className="text-xs text-muted mt-1">.xlsx or .xls files only</p>
          </>
        )}
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div className="bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/20 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle size={16} className="text-red-500" />
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">
              {errors.length} issue{errors.length > 1 ? "s" : ""} found
            </p>
          </div>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {errors.map((err, i) => (
              <p key={i} className="text-xs text-red-600 dark:text-red-400">{err}</p>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      {questions.length > 0 && showPreview && (
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Eye size={16} className="text-primary" />
              <h3 className="text-sm font-bold text-text">
                Preview: {questions.length} questions
              </h3>
            </div>
            <div className="flex gap-2">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary-50 text-primary">
                {mcqCount} MCQ
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {theoryCount} Theory
              </span>
            </div>
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {questions.slice(0, 10).map((q, i) => (
              <div key={i} className="flex items-start gap-2 py-2 border-b border-border last:border-0">
                <span className="w-6 h-6 rounded-full bg-border/30 flex items-center justify-center text-[10px] font-bold text-muted shrink-0 mt-0.5">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-text truncate">{q.stem}</p>
                  <div className="flex gap-2 mt-0.5">
                    <span className="text-[10px] text-muted">{q.type}</span>
                    {q.correctOption && (
                      <span className="text-[10px] text-success font-bold">Ans: {q.correctOption}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {questions.length > 10 && (
              <p className="text-xs text-muted text-center py-2">
                ...and {questions.length - 10} more questions
              </p>
            )}
          </div>
        </div>
      )}

      {/* Import button */}
      {questions.length > 0 && !imported && (
        <div className="sticky bottom-16 md:bottom-0 z-10">
          <button
            onClick={handleImport}
            disabled={!examId || saving}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold bg-primary text-white hover:bg-primary-600 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50"
          >
            {saving ? (
              <><Loader2 size={16} className="animate-spin" />Importing {questions.length} questions...</>
            ) : (
              <><Upload size={16} />Import {questions.length} Questions</>
            )}
          </button>
        </div>
      )}

      {/* Success */}
      {imported && (
        <div className="bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-xl p-4 text-center">
          <Check size={24} className="text-emerald-500 mx-auto mb-2" />
          <p className="text-sm font-bold text-emerald-700 dark:text-emerald-400">
            {questions.length} questions imported successfully!
          </p>
          <button
            onClick={() => router.push(`/exams/${examId}`)}
            className="mt-3 text-sm font-bold text-primary hover:underline"
          >
            View Exam →
          </button>
        </div>
      )}
    </div>
  );
}
