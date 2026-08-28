"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle, XCircle, ArrowRight,
  ArrowLeft, Loader2, AlertTriangle, Users, ClipboardList,
  Sparkles, Eye, Camera,
} from "lucide-react";
import {
  splitFullName, FULL_NAME_FORMAT_LABELS, DEFAULT_FULL_NAME_FORMAT, type FullNameFormat,
} from "@/lib/services/import/name-format";
import { normalizeKey, type SubjectSuggestion } from "@/lib/services/import/subject-normalize-shared";

type Step = "upload" | "mapping" | "preview" | "importing" | "done";

interface ClassOption {
  id: string;
  name: string;
  level: string;
  session: string;
}

interface ColumnMapping {
  source: string;
  target: string;
  confidence: number;
}

interface AnalyzeResult {
  headers: string[];
  sampleRows: Record<string, string>[];
  mappings: ColumnMapping[];
  detectedClass: string | null;
  detectedSubject: string | null;
  detectedTerm: string | null;
  detectedSession: string | null;
  totalRows: number;
}

interface ImportResult {
  studentsCreated: number;
  studentsUpdated: number;
  scoresCreated: number;
  errors: string[];
}

interface ValidationIssue {
  type: "error" | "warning";
  message: string;
}

const TARGET_FIELDS = [
  { key: "fullName", label: "Full Name (auto-split)", required: false },
  { key: "firstName", label: "First Name", required: false },
  { key: "lastName", label: "Last Name", required: false },
  { key: "regNumber", label: "Reg/Admission No.", required: false },
  { key: "gender", label: "Gender", required: false },
  { key: "subject", label: "Subject", required: false },
  { key: "ca1", label: "CA1", required: false },
  { key: "ca2", label: "CA2", required: false },
  { key: "exam", label: "Exam Score", required: false },
  { key: "total", label: "Total", required: false },
  { key: "grade", label: "Grade", required: false },
  { key: "remark", label: "Remark", required: false },
  { key: "ignore", label: "— Skip Column —", required: false },
];

export function ImportClient({
  classes,
  schoolId,
  teacherId,
}: {
  classes: ClassOption[];
  schoolId: string;
  teacherId: string;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [file, setFile] = useState<File | null>(null);
  const [rawData, setRawData] = useState<Record<string, string>[]>([]);
  const [analysis, setAnalysis] = useState<AnalyzeResult | null>(null);
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [term, setTerm] = useState<"FIRST" | "SECOND" | "THIRD">("FIRST");
  const [session, setSession] = useState("2025/2026");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  // Full-name split direction — never a silent hardcoded assumption. Default
  // is only ever a pre-selected suggestion; the teacher confirms it below.
  const [fullNameFormat, setFullNameFormat] = useState<FullNameFormat>(DEFAULT_FULL_NAME_FORMAT);
  const [fullNameFormatConfirmed, setFullNameFormatConfirmed] = useState(false);
  // Subject Registry confirmation: raw value -> teacher-confirmed canonical name.
  const [subjectSuggestions, setSubjectSuggestions] = useState<SubjectSuggestion[]>([]);
  const [subjectOverrides, setSubjectOverrides] = useState<Record<string, string>>({});
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectMappingsConfirmed, setSubjectMappingsConfirmed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);

  // As soon as a "Subject" column is mapped, fetch canonicalization suggestions
  // (school-confirmed aliases > built-in synonyms > as-entered) so the teacher
  // can review/edit them before staging — never applied silently.
  useEffect(() => {
    const subjectCol = mappings.find((m) => m.target === "subject")?.source;
    if (step !== "mapping" || !subjectCol) return;
    const values = rawData.map((r) => r[subjectCol]).filter((v): v is string => !!v?.trim());
    if (values.length === 0) return;

    let cancelled = false;
    // Standard fetch-in-effect loading indicator — not a synchronization hazard,
    // the rule just can't distinguish this from the cascading-render case it targets.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoadingSubjects(true);
    fetch("/api/subjects/suggest", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ values }),
    })
      .then((res) => (res.ok ? res.json() : { suggestions: [] }))
      .then((data: { suggestions: SubjectSuggestion[] }) => {
        if (cancelled) return;
        setSubjectSuggestions(data.suggestions);
        setSubjectMappingsConfirmed(false);
        setSubjectOverrides((prev) => {
          const next = { ...prev };
          for (const s of data.suggestions) {
            const key = normalizeKey(s.raw);
            if (!(key in next)) next[key] = s.suggested;
          }
          return next;
        });
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoadingSubjects(false); });

    return () => { cancelled = true; };
  }, [step, mappings, rawData]);

  const parseFile = useCallback(async (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    let headers: string[] = [];
    let rows: Record<string, string>[] = [];

    if (ext === "csv" || ext === "tsv" || ext === "txt") {
      const Papa = (await import("papaparse")).default;
      const text = await f.text();
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim(),
      });
      headers = result.meta.fields ?? [];
      rows = result.data;
    } else if (ext === "xlsx" || ext === "xls") {
      const XLSX = await import("xlsx");
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      if (json.length > 0) {
        headers = Object.keys(json[0]);
        rows = json.map((row) =>
          Object.fromEntries(headers.map((h) => [h, String(row[h] ?? "")]))
        );
      }
    } else {
      throw new Error("Unsupported file type. Please upload CSV, XLSX, or XLS.");
    }

    return { headers, rows };
  }, []);

  const handleUpload = useCallback(
    async (f: File) => {
      setFile(f);
      setError(null);
      setLoading(true);

      try {
        const { headers, rows } = await parseFile(f);
        if (headers.length === 0 || rows.length === 0) {
          throw new Error("File appears empty — no headers or data rows found.");
        }
        setRawData(rows);

        const res = await fetch("/api/import/analyze", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            headers,
            sampleRows: rows.slice(0, 3),
            fileName: f.name,
            totalRows: rows.length,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: "Analysis failed" }));
          throw new Error(err.error ?? "Analysis failed");
        }

        const result: AnalyzeResult = await res.json();
        setAnalysis(result);
        setMappings(result.mappings);

        if (result.detectedSubject) setSubject(result.detectedSubject);
        if (result.detectedTerm) {
          const t = result.detectedTerm.toUpperCase();
          if (t === "FIRST" || t === "SECOND" || t === "THIRD") setTerm(t);
        }
        if (result.detectedSession) setSession(result.detectedSession);

        if (result.detectedClass) {
          const match = classes.find(
            (c) => c.name.toLowerCase() === result.detectedClass!.toLowerCase()
          );
          if (match) setClassId(match.id);
        }

        setStep("mapping");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to parse file");
      } finally {
        setLoading(false);
      }
    },
    [parseFile, classes]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) handleUpload(f);
    },
    [handleUpload]
  );

  const handleImageUpload = useCallback(async (f: File) => {
    setFile(f);
    setError(null);
    setLoading(true);
    setOcrPreview(URL.createObjectURL(f));

    try {
      const form = new FormData();
      form.append("image", f);

      const res = await fetch("/api/ocr/extract", { method: "POST", body: form });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "OCR failed" }));
        throw new Error(err.error ?? "OCR failed");
      }

      const result: {
        headers: string[];
        rows: Record<string, string>[];
        totalRows: number;
        detectedSubject?: string | null;
        detectedClass?: string | null;
        detectedTerm?: string | null;
        detectedSession?: string | null;
        modelUsed?: string;
      } = await res.json();
      if (!result.headers?.length || !result.rows?.length) {
        throw new Error("No table data found in image. Try a clearer photo.");
      }

      setRawData(result.rows);

      // Run through AI column mapper
      const analyzeRes = await fetch("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          headers: result.headers,
          sampleRows: result.rows.slice(0, 3),
          fileName: f.name,
          totalRows: result.rows.length,
        }),
      });

      if (!analyzeRes.ok) {
        const err = await analyzeRes.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error(err.error ?? "Analysis failed");
      }

      const analysis: AnalyzeResult = await analyzeRes.json();
      setAnalysis(analysis);
      setMappings(analysis.mappings);
      if (analysis.detectedSubject) setSubject(analysis.detectedSubject);
      if (analysis.detectedTerm) {
        const t = analysis.detectedTerm.toUpperCase();
        if (t === "FIRST" || t === "SECOND" || t === "THIRD") setTerm(t as "FIRST" | "SECOND" | "THIRD");
      }
      if (analysis.detectedSession) setSession(analysis.detectedSession);
      setStep("mapping");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR failed");
      setOcrPreview(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const updateMapping = useCallback((sourceCol: string, newTarget: string) => {
    setMappings((prev) =>
      prev.map((m) => (m.source === sourceCol ? { ...m, target: newTarget } : m))
    );
  }, []);

  // This system commits directly to production on "Import" with no staging/preview
  // diff — unlike the newer Student Hub importer, nothing here catches typo'd scores,
  // out-of-range values, or duplicate rows before they're written. Mirrors the checks
  // already in ImportHubClient.tsx's runClientValidation.
  const runClientValidation = useCallback((): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    const fnCol = mappings.find((m) => m.target === "firstName")?.source;
    const lnCol = mappings.find((m) => m.target === "lastName")?.source;
    const fullCol = mappings.find((m) => m.target === "fullName")?.source;

    const nameKeys = rawData
      .map((r) => {
        if (fullCol) return r[fullCol]?.trim().toLowerCase() ?? "";
        return `${r[fnCol ?? ""] ?? ""}|${r[lnCol ?? ""] ?? ""}`.trim().toLowerCase();
      })
      .filter((n) => n && n !== "|");
    const uniqNames = new Set(nameKeys);
    if (uniqNames.size < nameKeys.length) {
      issues.push({ type: "warning", message: `${nameKeys.length - uniqNames.size} duplicate student name(s) in this file` });
    }

    const regCol = mappings.find((m) => m.target === "regNumber")?.source;
    if (regCol) {
      const regs = rawData.map((r) => r[regCol] ?? "").filter((r) => r.trim());
      if (new Set(regs).size < regs.length) {
        issues.push({ type: "warning", message: "Duplicate admission numbers detected" });
      }
    }

    for (const field of ["ca1", "ca2", "exam", "total"] as const) {
      const col = mappings.find((m) => m.target === field)?.source;
      if (!col) continue;
      const invalid = rawData.filter((r) => r[col]?.trim() && isNaN(parseFloat(r[col]))).length;
      if (invalid > 0) {
        issues.push({ type: "error", message: `${invalid} row(s) have a non-numeric ${field.toUpperCase()} value — those scores will import blank` });
      }
      const outOfRange = rawData.filter((r) => {
        const v = parseFloat(r[col] ?? "");
        return !isNaN(v) && (v < 0 || v > 100);
      }).length;
      if (outOfRange > 0) {
        issues.push({ type: "warning", message: `${outOfRange} row(s) have ${field.toUpperCase()} outside 0–100` });
      }
    }

    if (fullCol && !fullNameFormatConfirmed) {
      issues.push({ type: "error", message: "Confirm how the Full Name column should be interpreted" });
    }
    if (subjectSuggestions.some((s) => normalizeKey(s.raw) !== normalizeKey(subjectOverrides[normalizeKey(s.raw)] ?? s.suggested)) && !subjectMappingsConfirmed) {
      issues.push({ type: "error", message: "Confirm the subject mappings that will be learned for this school" });
    }
    return issues;
  }, [mappings, rawData, fullNameFormatConfirmed, subjectSuggestions, subjectOverrides, subjectMappingsConfirmed]);

  const executeImport = useCallback(async () => {
    setStep("importing");
    setError(null);

    try {
      const activeMappings = mappings.filter((m) => m.target !== "ignore");
      const mappedRows = rawData.map((row) => {
        const out: Record<string, string> = {};
        for (const m of activeMappings) {
          out[m.target] = row[m.source] ?? "";
        }
        return out;
      });

      const res = await fetch("/api/import/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: mappedRows,
          classId,
          subject,
          term,
          session,
          schoolId,
          fullNameFormat,
          fullNameFormatConfirmed,
          subjectCanonicalMap: subjectOverrides,
          subjectMappingsConfirmed,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Import failed" }));
        throw new Error(err.error ?? "Import failed");
      }

      const result: ImportResult = await res.json();
      setImportResult(result);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setStep("preview");
    }
  }, [mappings, rawData, classId, subject, term, session, schoolId, fullNameFormat, fullNameFormatConfirmed, subjectOverrides, subjectMappingsConfirmed]);

  const hasScoreColumns = mappings.some((m) =>
    ["ca1", "ca2", "exam", "total", "grade"].includes(m.target)
  );

  const requiredMet =
    mappings.some((m) => m.target === "fullName") ||
    (mappings.some((m) => m.target === "firstName") &&
      mappings.some((m) => m.target === "lastName"));

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs font-medium">
        {(["upload", "mapping", "preview", "done"] as const).map((s, i) => (
          <div key={s} className="flex items-center gap-2">
            {i > 0 && <div className="w-8 h-px bg-border" />}
            <div
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors"
              style={{
                background:
                  step === s || (s === "done" && step === "importing")
                    ? "var(--color-primary)"
                    : "var(--color-surface)",
                color:
                  step === s || (s === "done" && step === "importing")
                    ? "#fff"
                    : "var(--color-text-2)",
                border: "1px solid var(--color-border)",
              }}
            >
              <span className="capitalize">{i + 1}. {s === "done" ? "Complete" : s}</span>
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* ── Step 1: Upload ────────────────────────────────────── */}
      {step === "upload" && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-surface border-2 border-dashed border-border rounded-2xl p-12 text-center">
              <div className="flex flex-col items-center gap-3">
                <Loader2 size={40} className="text-primary animate-spin" />
                <p className="text-sm text-text-2">
                  {ocrPreview ? "Reading mark sheet with AI vision..." : "Parsing"}{" "}
                  {!ocrPreview && <span className="font-semibold text-text">{file?.name}</span>}
                  {!ocrPreview && " and detecting columns..."}
                </p>
                {ocrPreview && (
                  <img src={ocrPreview} alt="Mark sheet preview" className="mt-2 max-h-40 rounded-lg object-contain opacity-60" />
                )}
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Spreadsheet upload */}
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={handleDrop}
                onClick={() => fileRef.current?.click()}
                className="bg-surface border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/40 transition-colors cursor-pointer"
              >
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv,.xlsx,.xls,.tsv,.txt"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                    <FileSpreadsheet size={26} className="text-primary" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text mb-1">Upload Spreadsheet</p>
                    <p className="text-xs text-text-2">CSV, Excel (.xlsx, .xls), TSV</p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-text-2">
                    <span>.csv</span><span>.xlsx</span><span>.xls</span>
                  </div>
                </div>
              </div>

              {/* Photo / OCR upload */}
              <div
                onClick={() => imgRef.current?.click()}
                className="bg-surface border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-amber-500/40 transition-colors cursor-pointer"
              >
                <input
                  ref={imgRef}
                  type="file"
                  accept="image/jpeg,image/jpg,image/png,image/webp"
                  className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }}
                />
                <div className="flex flex-col items-center gap-3">
                  <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
                    <Camera size={26} className="text-amber-500" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-text mb-1">Scan Mark Sheet</p>
                    <p className="text-xs text-text-2">Photo of handwritten or printed result sheet</p>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-amber-500/80 font-medium bg-amber-500/10 px-3 py-1 rounded-full">
                    <Sparkles size={12} /> AI Vision OCR
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Column Mapping ────────────────────────────── */}
      {step === "mapping" && analysis && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={16} className="text-primary" />
              <h2 className="font-bold text-text">AI Column Mapping</h2>
              <span className="ml-auto text-xs text-text-2 bg-bg px-2 py-1 rounded-full">
                {analysis.totalRows} rows detected
              </span>
            </div>

            <p className="text-sm text-text-2">
              We detected <strong>{analysis.headers.length}</strong> columns.
              Review the AI-suggested mappings below — adjust any that look wrong.
            </p>

            <div className="grid gap-3">
              {mappings.map((m) => (
                <div
                  key={m.source}
                  className="flex items-center gap-3 px-4 py-3 rounded-lg bg-bg border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium text-text truncate">{m.source}</p>
                    <p className="text-xs text-text-2 truncate">
                      e.g. {analysis.sampleRows[0]?.[m.source] ?? "—"}
                    </p>
                  </div>
                  <ArrowRight size={16} className="text-text-2 shrink-0" />
                  <select
                    value={m.target}
                    onChange={(e) => updateMapping(m.source, e.target.value)}
                    className="w-44 px-3 py-2 rounded-lg text-sm bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {TARGET_FIELDS.map((f) => (
                      <option key={f.key} value={f.key}>
                        {f.label}
                      </option>
                    ))}
                  </select>
                  {m.confidence >= 0.8 && m.target !== "ignore" && (
                    <CheckCircle size={16} className="text-green-500 shrink-0" />
                  )}
                  {m.confidence < 0.5 && m.target !== "ignore" && (
                    <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Full Name split direction — explicit, teacher-confirmed, never guessed */}
          {mappings.some((m) => m.target === "fullName") && (() => {
            const fullNameCol = mappings.find((m) => m.target === "fullName")!.source;
            const samples = rawData.slice(0, 3).map((r) => r[fullNameCol]).filter(Boolean);
            return (
              <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
                <h3 className="font-bold text-text text-sm">Full Name Format</h3>
                <p className="text-xs text-text-2">
                  A single &ldquo;Full Name&rdquo; column is ambiguous — confirm how names should split.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {(Object.keys(FULL_NAME_FORMAT_LABELS) as FullNameFormat[]).map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => { setFullNameFormat(fmt); setFullNameFormatConfirmed(true); }}
                      className={`p-3 rounded-lg border text-left text-xs transition-colors ${
                        fullNameFormat === fmt ? "border-primary bg-primary/5 ring-1 ring-primary" : "border-border hover:border-primary/30"
                      }`}
                    >
                      {FULL_NAME_FORMAT_LABELS[fmt]}
                    </button>
                  ))}
                </div>
                {samples.length > 0 && (
                  <div className="bg-bg rounded-lg border border-border p-3 space-y-1">
                    <p className="text-[11px] font-semibold text-text-2 uppercase tracking-wide">Preview</p>
                    {samples.map((s, i) => {
                      const split = splitFullName(s, fullNameFormat);
                      return (
                        <p key={i} className="text-xs text-text font-mono">
                          &ldquo;{s}&rdquo; → First: <strong>{split.firstName}</strong> · Last: <strong>{split.lastName}</strong>
                        </p>
                      );
                    })}
                    {fullNameFormat === "KEEP_WHOLE" && (
                      <p className="text-[11px] text-amber-600 dark:text-amber-400 pt-1">
                        The original name is preserved, but a best-effort split still populates First/Last Name — full non-split storage isn&apos;t supported everywhere in the app yet.
                      </p>
                    )}
                  </div>
                )}
                <label className="flex items-start gap-2 text-xs text-text-2 cursor-pointer">
                  <input type="checkbox" checked={fullNameFormatConfirmed} onChange={(e) => setFullNameFormatConfirmed(e.target.checked)} className="mt-0.5" />
                  I confirm this interpretation for every Full Name value in this import.
                </label>
              </div>
            );
          })()}

          {/* Subject Registry confirmation — suggestions only, never applied silently */}
          {mappings.some((m) => m.target === "subject") && subjectSuggestions.length > 0 && (
            <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-text text-sm">Confirm Subject Names</h3>
                {loadingSubjects && <Loader2 size={13} className="animate-spin text-text-2" />}
              </div>
              <p className="text-xs text-text-2">
                Review how each subject value in this file will be recorded. Different spellings of the same subject (e.g. &ldquo;Maths&rdquo; and &ldquo;Mathematics&rdquo;) should map to one canonical name.
              </p>
              <div className="grid gap-2">
                {subjectSuggestions.map((s) => {
                  const key = normalizeKey(s.raw);
                  return (
                    <div key={s.raw} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg border border-border">
                      <span className="text-sm font-mono text-text flex-1 truncate">{s.raw}</span>
                      <ArrowRight size={14} className="text-text-2 shrink-0" />
                      <input
                        value={subjectOverrides[key] ?? s.suggested}
                        onChange={(e) => setSubjectOverrides((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="w-48 px-2 py-1.5 rounded-lg text-sm bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                      />
                      {s.source === "SCHOOL_ALIAS" && (
                        <span className="text-[10px] text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">Learned</span>
                      )}
                      {s.source === "BUILT_IN" && (
                        <span className="text-[10px] text-text-2 bg-bg border border-border px-1.5 py-0.5 rounded shrink-0">Suggested</span>
                      )}
                    </div>
                  );
                })}
              </div>
              {subjectSuggestions.some((s) => normalizeKey(s.raw) !== normalizeKey(subjectOverrides[normalizeKey(s.raw)] ?? s.suggested)) && (
                <label className="flex items-start gap-2 text-xs text-text-2 cursor-pointer">
                  <input type="checkbox" checked={subjectMappingsConfirmed} onChange={(e) => setSubjectMappingsConfirmed(e.target.checked)} className="mt-0.5" />
                  I confirm these canonical subject names and allow TeachNexis to reuse them for this school.
                </label>
              )}
            </div>
          )}

          {/* Class / Subject / Term config */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-text text-sm">Import Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Class *</label>
                <select
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  {classes.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.level} — {c.session})
                    </option>
                  ))}
                </select>
              </div>
              {hasScoreColumns && (
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">Subject *</label>
                  <input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Mathematics"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              )}
              {hasScoreColumns && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-text-2 mb-1">Term</label>
                    <select
                      value={term}
                      onChange={(e) => setTerm(e.target.value as typeof term)}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                    >
                      <option value="FIRST">First Term</option>
                      <option value="SECOND">Second Term</option>
                      <option value="THIRD">Third Term</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-2 mb-1">Session</label>
                    <input
                      value={session}
                      onChange={(e) => setSession(e.target.value)}
                      placeholder="e.g. 2025/2026"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {validationIssues.length > 0 && (
            <div className="bg-surface border border-amber-500/20 rounded-xl p-4 space-y-2">
              <p className="text-xs font-bold text-amber-600 dark:text-amber-400">Validation Issues</p>
              {validationIssues.map((issue, i) => (
                <div key={i} className={`flex items-start gap-2 text-xs ${issue.type === "error" ? "text-red-500" : "text-amber-600 dark:text-amber-400"}`}>
                  {issue.type === "error"
                    ? <XCircle size={13} className="shrink-0 mt-0.5" />
                    : <AlertTriangle size={13} className="shrink-0 mt-0.5" />}
                  {issue.message}
                </div>
              ))}
              {validationIssues.some((i) => i.type === "error") && (
                <p className="text-xs text-red-500 font-medium pt-1 border-t border-red-500/20 mt-2">Fix the mapping above before continuing.</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => { setStep("upload"); setFile(null); setAnalysis(null); setValidationIssues([]); setSubjectSuggestions([]); setSubjectOverrides({}); setFullNameFormatConfirmed(false); setSubjectMappingsConfirmed(false); }}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-2 border border-border hover:bg-bg transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={() => {
                const issues = runClientValidation();
                setValidationIssues(issues);
                if (issues.some((i) => i.type === "error")) return;
                setStep("preview");
              }}
              disabled={!requiredMet || (hasScoreColumns && !subject)}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              <Eye size={14} /> Preview Import
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3: Preview ───────────────────────────────────── */}
      {step === "preview" && analysis && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="font-bold text-text mb-4">Import Preview</h2>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <Stat icon={Users} label="Students" value={String(analysis.totalRows)} />
              <Stat icon={ClipboardList} label="Class" value={classes.find((c) => c.id === classId)?.name ?? "—"} />
              {hasScoreColumns && <Stat icon={FileSpreadsheet} label="Subject" value={subject || "—"} />}
              <Stat icon={Sparkles} label="Scores" value={hasScoreColumns ? "Yes" : "Students only"} />
            </div>

            {/* Sample rows table */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-bg">
                    {mappings
                      .filter((m) => m.target !== "ignore")
                      .map((m) => (
                        <th key={m.source} className="px-3 py-2 text-left font-semibold text-text-2 whitespace-nowrap">
                          {TARGET_FIELDS.find((f) => f.key === m.target)?.label ?? m.target}
                        </th>
                      ))}
                  </tr>
                </thead>
                <tbody>
                  {rawData.slice(0, 8).map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {mappings
                        .filter((m) => m.target !== "ignore")
                        .map((m) => (
                          <td key={m.source} className="px-3 py-2 text-text whitespace-nowrap">
                            {row[m.source] ?? "—"}
                          </td>
                        ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {analysis.totalRows > 8 && (
              <p className="text-xs text-text-2 mt-2">
                Showing 8 of {analysis.totalRows} rows
              </p>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setStep("mapping")}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-2 border border-border hover:bg-bg transition-colors"
            >
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={executeImport}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors"
            >
              <CheckCircle size={14} /> Import {analysis.totalRows} rows
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3.5: Importing ───────────────────────────────── */}
      {step === "importing" && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <Loader2 size={40} className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-base font-semibold text-text">Importing data...</p>
          <p className="text-sm text-text-2 mt-1">
            Creating students and scores — this may take a moment.
          </p>
        </div>
      )}

      {/* ── Step 4: Done ──────────────────────────────────────── */}
      {step === "done" && importResult && (
        <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-text">Import Complete!</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-md mx-auto">
            <div className="bg-bg rounded-xl p-4">
              <p className="text-2xl font-black text-primary">{importResult.studentsCreated}</p>
              <p className="text-xs text-text-2">Students Created</p>
            </div>
            <div className="bg-bg rounded-xl p-4">
              <p className="text-2xl font-black text-amber-500">{importResult.studentsUpdated}</p>
              <p className="text-xs text-text-2">Students Updated</p>
            </div>
            <div className="bg-bg rounded-xl p-4">
              <p className="text-2xl font-black text-green-500">{importResult.scoresCreated}</p>
              <p className="text-xs text-text-2">Scores Imported</p>
            </div>
          </div>

          {importResult.errors.length > 0 && (
            <div className="text-left mt-4 bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <p className="text-xs font-bold text-red-500 mb-2">
                {importResult.errors.length} row(s) had issues:
              </p>
              <ul className="text-xs text-red-400 space-y-1 max-h-32 overflow-y-auto">
                {importResult.errors.slice(0, 10).map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
              </ul>
            </div>
          )}

          <button
            onClick={() => {
              setStep("upload");
              setFile(null);
              setAnalysis(null);
              setRawData([]);
              setMappings([]);
              setImportResult(null);
              setError(null);
              setValidationIssues([]);
              setSubjectSuggestions([]);
              setSubjectOverrides({});
              setFullNameFormat(DEFAULT_FULL_NAME_FORMAT);
              setFullNameFormatConfirmed(false);
              setSubjectMappingsConfirmed(false);
            }}
            className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors mt-2"
          >
            Import Another File
          </button>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string }) {
  return (
    <div className="bg-bg rounded-xl p-3 flex items-center gap-3">
      <Icon size={18} className="text-primary shrink-0" />
      <div>
        <p className="text-xs text-text-2">{label}</p>
        <p className="text-sm font-bold text-text">{value}</p>
      </div>
    </div>
  );
}
