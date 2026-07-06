"use client";

import { useState, useCallback, useRef } from "react";
import {
  Upload, FileSpreadsheet, CheckCircle, XCircle, ArrowRight, ArrowLeft,
  Loader2, AlertTriangle, Users, ClipboardList, Sparkles, Eye, Camera,
  AlertCircle, RefreshCw, ShieldCheck,
} from "lucide-react";

type Step = "upload" | "mapping" | "preview" | "conflicts" | "importing" | "done";

interface ClassOption {
  id: string;
  name: string;
  level: string;
  session: string;
  term: string;
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

interface StagingResult {
  jobId: string;
  totalRows: number;
  newCount: number;
  updateCount: number;
  conflictCount: number;
  skipCount: number;
  errors: string[];
}

interface CommitResult {
  studentsCreated: number;
  studentsUpdated: number;
  scoresUpserted: number;
  errors: string[];
}

const TARGET_FIELDS = [
  { key: "firstName", label: "First Name", required: true },
  { key: "lastName", label: "Last Name", required: true },
  { key: "regNumber", label: "Reg / Admission No.", required: false },
  { key: "gender", label: "Gender", required: false },
  { key: "subject", label: "Subject", required: false },
  { key: "ca1", label: "CA1 Score", required: false },
  { key: "ca2", label: "CA2 Score", required: false },
  { key: "exam", label: "Exam Score", required: false },
  { key: "total", label: "Total Score", required: false },
  { key: "grade", label: "Grade", required: false },
  { key: "remark", label: "Teacher Remark", required: false },
  { key: "ignore", label: "— Skip Column —", required: false },
];

type ConflictResolution = "KEEP_EXISTING" | "REPLACE" | "MERGE";

export function ImportHubClient({
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
  const [stagingResult, setStagingResult] = useState<StagingResult | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);
  const [defaultResolution, setDefaultResolution] = useState<ConflictResolution>("MERGE");
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const [ocrPreview, setOcrPreview] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

  const parseFile = useCallback(async (f: File) => {
    const ext = f.name.split(".").pop()?.toLowerCase();
    if (ext === "csv" || ext === "tsv" || ext === "txt") {
      const Papa = (await import("papaparse")).default;
      const text = await f.text();
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
        transformHeader: (h: string) => h.trim(),
      });
      return { headers: result.meta.fields ?? [], rows: result.data };
    } else if (ext === "xlsx" || ext === "xls") {
      const XLSX = await import("xlsx");
      const buffer = await f.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws, { defval: "" });
      if (json.length === 0) return { headers: [], rows: [] };
      const headers = Object.keys(json[0]);
      return {
        headers,
        rows: json.map((row) => Object.fromEntries(headers.map((h) => [h, String(row[h] ?? "")]))),
      };
    }
    throw new Error("Unsupported file type. Use CSV, XLSX, or XLS.");
  }, []);

  const analyzeAndStage = useCallback(
    async (headers: string[], rows: Record<string, string>[], fileName: string) => {
      const analyzeRes = await fetch("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers, sampleRows: rows.slice(0, 5), fileName, totalRows: rows.length }),
      });
      if (!analyzeRes.ok) {
        const err = await analyzeRes.json().catch(() => ({ error: "Analysis failed" }));
        throw new Error((err as { error: string }).error ?? "Analysis failed");
      }
      return analyzeRes.json() as Promise<AnalyzeResult>;
    },
    []
  );

  const handleUpload = useCallback(
    async (f: File) => {
      setFile(f);
      setError(null);
      setLoading(true);
      try {
        const { headers, rows } = await parseFile(f);
        if (!headers.length || !rows.length) throw new Error("File is empty.");
        setRawData(rows);
        const result = await analyzeAndStage(headers, rows, f.name);
        setAnalysis(result);
        setMappings(result.mappings);
        if (result.detectedSubject) setSubject(result.detectedSubject);
        if (result.detectedTerm) {
          const t = result.detectedTerm.toUpperCase();
          if (t === "FIRST" || t === "SECOND" || t === "THIRD") setTerm(t as typeof term);
        }
        if (result.detectedSession) setSession(result.detectedSession);
        if (result.detectedClass) {
          const match = classes.find((c) => c.name.toLowerCase() === result.detectedClass!.toLowerCase());
          if (match) setClassId(match.id);
        }
        setStep("mapping");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to parse file");
      } finally {
        setLoading(false);
      }
    },
    [parseFile, analyzeAndStage, classes]
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
      if (!res.ok) throw new Error("OCR failed");
      const result = await res.json() as { headers: string[]; rows: Record<string, string>[] };
      if (!result.headers?.length) throw new Error("No table detected in image.");
      setRawData(result.rows);
      const analysis = await analyzeAndStage(result.headers, result.rows, f.name);
      setAnalysis(analysis);
      setMappings(analysis.mappings);
      if (analysis.detectedSubject) setSubject(analysis.detectedSubject);
      setStep("mapping");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR failed");
      setOcrPreview(null);
    } finally {
      setLoading(false);
    }
  }, [analyzeAndStage]);

  const runStaging = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Create job
      const jobRes = await fetch("/api/student-hub/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: file?.name?.endsWith(".csv") ? "CSV" : "EXCEL", fileName: file?.name }),
      });
      if (!jobRes.ok) throw new Error("Failed to create import job");
      const { jobId: newJobId } = await jobRes.json() as { jobId: string };
      setJobId(newJobId);

      // Map rows
      const activeMappings = mappings.filter((m) => m.target !== "ignore");
      const stagingRows = rawData.map((row, idx) => ({
        rowIndex: idx,
        rawData: row,
        parsedData: Object.fromEntries(activeMappings.map((m) => [m.target, row[m.source] ?? ""])),
      }));

      // Stage
      const stageRes = await fetch(`/api/student-hub/jobs/${newJobId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows: stagingRows }),
      });
      if (!stageRes.ok) throw new Error("Staging failed");
      const result = await stageRes.json() as StagingResult;
      setStagingResult(result);
      setStep(result.conflictCount > 0 ? "conflicts" : "preview");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Staging failed");
    } finally {
      setLoading(false);
    }
  }, [file, mappings, rawData]);

  const executeCommit = useCallback(async () => {
    if (!jobId) return;
    setStep("importing");
    setError(null);
    try {
      const res = await fetch(`/api/student-hub/jobs/${jobId}/commit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ classId, subject, term, session, defaultResolution }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Commit failed" }));
        throw new Error((err as { error: string }).error ?? "Commit failed");
      }
      const result = await res.json() as CommitResult;
      setCommitResult(result);
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setStep("preview");
    }
  }, [jobId, classId, subject, term, session, defaultResolution]);

  const reset = () => {
    setStep("upload");
    setFile(null);
    setRawData([]);
    setAnalysis(null);
    setMappings([]);
    setStagingResult(null);
    setJobId(null);
    setCommitResult(null);
    setError(null);
    setOcrPreview(null);
  };

  const hasScoreColumns = mappings.some((m) => ["ca1", "ca2", "exam", "total", "grade"].includes(m.target));
  const requiredMet = mappings.some((m) => m.target === "firstName") && mappings.some((m) => m.target === "lastName");

  const steps = ["upload", "mapping", "preview", "done"] as const;

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2 text-xs font-medium flex-wrap">
        {steps.map((s, i) => {
          const active = step === s || (s === "preview" && step === "conflicts") || (s === "done" && step === "importing");
          return (
            <div key={s} className="flex items-center gap-2">
              {i > 0 && <div className="w-6 h-px bg-border" />}
              <div
                className={`px-3 py-1.5 rounded-full border transition-colors ${
                  active
                    ? "bg-primary text-white border-primary"
                    : "bg-surface text-text-2 border-border"
                }`}
              >
                {i + 1}. {s === "done" ? "Complete" : s.charAt(0).toUpperCase() + s.slice(1)}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          <AlertTriangle size={16} />
          {error}
        </div>
      )}

      {/* ── Step 1: Upload ── */}
      {step === "upload" && (
        <div className="space-y-4">
          {loading ? (
            <div className="bg-surface border-2 border-dashed border-border rounded-2xl p-12 text-center">
              <Loader2 size={40} className="text-primary animate-spin mx-auto mb-3" />
              <p className="text-sm text-text-2">
                {ocrPreview ? "AI is reading the mark sheet..." : `Parsing ${file?.name}…`}
              </p>
              {ocrPreview && (
                <img src={ocrPreview} alt="preview" className="mt-3 max-h-36 rounded-lg opacity-60 mx-auto" />
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleUpload(f); }}
                onClick={() => fileRef.current?.click()}
                className="bg-surface border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-primary/40 cursor-pointer transition-colors"
              >
                <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls,.tsv" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload(f); }} />
                <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
                  <FileSpreadsheet size={26} className="text-primary" />
                </div>
                <p className="text-sm font-semibold text-text">Upload Spreadsheet</p>
                <p className="text-xs text-text-2 mt-1">CSV, Excel (.xlsx / .xls)</p>
              </div>

              <div
                onClick={() => imgRef.current?.click()}
                className="bg-surface border-2 border-dashed border-border rounded-2xl p-8 text-center hover:border-amber-500/40 cursor-pointer transition-colors"
              >
                <input ref={imgRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); }} />
                <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center mx-auto mb-3">
                  <Camera size={26} className="text-amber-500" />
                </div>
                <p className="text-sm font-semibold text-text">Scan Mark Sheet</p>
                <p className="text-xs text-text-2 mt-1">Photo of printed / handwritten result</p>
                <div className="inline-flex items-center gap-1.5 text-xs text-amber-500 font-medium bg-amber-500/10 px-2.5 py-1 rounded-full mt-2">
                  <Sparkles size={11} /> AI Vision OCR
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Step 2: Mapping ── */}
      {step === "mapping" && analysis && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <Sparkles size={15} className="text-primary" />
              <h2 className="font-bold text-text">AI Column Mapping</h2>
              <span className="ml-auto text-xs text-text-2 bg-bg px-2 py-1 rounded-full">
                {analysis.totalRows} rows
              </span>
            </div>
            <div className="grid gap-2">
              {mappings.map((m) => (
                <div key={m.source} className="flex items-center gap-3 px-3 py-2.5 rounded-lg bg-bg border border-border">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-mono font-medium text-text truncate">{m.source}</p>
                    <p className="text-xs text-text-2 truncate">e.g. {analysis.sampleRows[0]?.[m.source] ?? "—"}</p>
                  </div>
                  <ArrowRight size={14} className="text-text-2 shrink-0" />
                  <select
                    value={m.target}
                    onChange={(e) => setMappings((prev) => prev.map((p) => p.source === m.source ? { ...p, target: e.target.value } : p))}
                    className="w-44 px-2 py-1.5 rounded-lg text-sm bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {TARGET_FIELDS.map((f) => <option key={f.key} value={f.key}>{f.label}</option>)}
                  </select>
                  {m.confidence >= 0.8 && m.target !== "ignore" && <CheckCircle size={15} className="text-green-500 shrink-0" />}
                  {m.confidence < 0.5 && m.target !== "ignore" && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {/* Import settings */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-text text-sm">Import Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Class *</label>
                <select value={classId} onChange={(e) => setClassId(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30">
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.level} — {c.session})</option>)}
                </select>
              </div>
              {hasScoreColumns && (
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">Default Subject *</label>
                  <input value={subject} onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Mathematics"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              )}
              {hasScoreColumns && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-text-2 mb-1">Term</label>
                    <select value={term} onChange={(e) => setTerm(e.target.value as typeof term)}
                      className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30">
                      <option value="FIRST">First Term</option>
                      <option value="SECOND">Second Term</option>
                      <option value="THIRD">Third Term</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-2 mb-1">Session</label>
                    <input value={session} onChange={(e) => setSession(e.target.value)} placeholder="e.g. 2025/2026"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-2 border border-border hover:bg-bg transition-colors">
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={runStaging} disabled={!requiredMet || (hasScoreColumns && !subject) || loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-40">
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              {loading ? "Analysing…" : "Preview & Stage"}
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3a: Conflicts ── */}
      {step === "conflicts" && stagingResult && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-amber-500" />
              <h2 className="font-bold text-text">Conflicts Detected</h2>
              <span className="ml-auto text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full font-bold">
                {stagingResult.conflictCount} conflicts
              </span>
            </div>
            <p className="text-sm text-text-2">
              {stagingResult.conflictCount} row(s) conflict with existing records. Choose how to resolve them all at once, or review individually in the next step.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {(["MERGE", "REPLACE", "KEEP_EXISTING"] as ConflictResolution[]).map((r) => (
                <button
                  key={r}
                  onClick={() => setDefaultResolution(r)}
                  className={`p-4 rounded-xl border text-left transition-all ${
                    defaultResolution === r
                      ? "border-primary bg-primary/5 ring-1 ring-primary"
                      : "border-border bg-surface hover:border-primary/30"
                  }`}
                >
                  <p className="text-sm font-bold text-text mb-1">
                    {r === "MERGE" ? "Merge" : r === "REPLACE" ? "Replace" : "Keep Existing"}
                  </p>
                  <p className="text-xs text-text-2">
                    {r === "MERGE"
                      ? "Update empty fields only — keep existing data"
                      : r === "REPLACE"
                      ? "Overwrite existing record with imported data"
                      : "Keep existing record, skip incoming data"}
                  </p>
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button onClick={() => setStep("mapping")} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-2 border border-border hover:bg-bg transition-colors">
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={() => setStep("preview")} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors">
              Continue <ArrowRight size={14} />
            </button>
          </div>
        </div>
      )}

      {/* ── Step 3b: Preview ── */}
      {step === "preview" && stagingResult && (
        <div className="space-y-6">
          <div className="bg-surface border border-border rounded-xl p-5">
            <h2 className="font-bold text-text mb-4">Import Preview</h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
              <Stat icon={Users} label="New Students" value={String(stagingResult.newCount)} color="text-green-500" />
              <Stat icon={RefreshCw} label="Updates" value={String(stagingResult.updateCount)} color="text-blue-500" />
              <Stat icon={AlertCircle} label="Conflicts" value={String(stagingResult.conflictCount)} color="text-amber-500" />
              <Stat icon={XCircle} label="Skipped" value={String(stagingResult.skipCount)} color="text-text-2" />
            </div>

            {/* Sample */}
            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-bg">
                    {mappings.filter((m) => m.target !== "ignore").map((m) => (
                      <th key={m.source} className="px-3 py-2 text-left font-semibold text-text-2 whitespace-nowrap">
                        {TARGET_FIELDS.find((f) => f.key === m.target)?.label ?? m.target}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rawData.slice(0, 8).map((row, i) => (
                    <tr key={i} className="border-t border-border">
                      {mappings.filter((m) => m.target !== "ignore").map((m) => (
                        <td key={m.source} className="px-3 py-2 text-text whitespace-nowrap">{row[m.source] ?? "—"}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {rawData.length > 8 && (
              <p className="text-xs text-text-2 mt-2">Showing 8 of {rawData.length} rows</p>
            )}

            {stagingResult.errors.length > 0 && (
              <div className="mt-4 bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                <p className="text-xs font-bold text-red-500 mb-1">{stagingResult.errors.length} staging warnings:</p>
                <ul className="text-xs text-red-400 space-y-0.5 max-h-24 overflow-y-auto">
                  {stagingResult.errors.slice(0, 5).map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}
          </div>

          {/* Conflict resolution reminder */}
          {stagingResult.conflictCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
              <ShieldCheck size={16} />
              <span>
                {stagingResult.conflictCount} conflict(s) will be resolved using:{" "}
                <strong>{defaultResolution === "KEEP_EXISTING" ? "Keep Existing" : defaultResolution === "REPLACE" ? "Replace" : "Merge"}</strong>
              </span>
              <button onClick={() => setStep("conflicts")} className="ml-auto text-xs underline">
                Change
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={() => setStep("mapping")} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-2 border border-border hover:bg-bg transition-colors">
              <ArrowLeft size={14} /> Back
            </button>
            <button onClick={executeCommit} className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors">
              <CheckCircle size={14} /> Commit {stagingResult.totalRows} rows
            </button>
          </div>
        </div>
      )}

      {/* ── Importing ── */}
      {step === "importing" && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <Loader2 size={40} className="text-primary animate-spin mx-auto mb-4" />
          <p className="text-base font-semibold text-text">Committing data…</p>
          <p className="text-sm text-text-2 mt-1">Writing students and scores — please wait.</p>
        </div>
      )}

      {/* ── Done ── */}
      {step === "done" && commitResult && (
        <div className="bg-surface border border-border rounded-xl p-8 text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
            <CheckCircle size={32} className="text-green-500" />
          </div>
          <h2 className="text-xl font-bold text-text">Import Complete!</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-w-md mx-auto">
            <StatCard value={commitResult.studentsCreated} label="Students Created" color="text-green-500" />
            <StatCard value={commitResult.studentsUpdated} label="Students Updated" color="text-blue-500" />
            <StatCard value={commitResult.scoresUpserted} label="Scores Imported" color="text-primary" />
          </div>
          {commitResult.errors.length > 0 && (
            <div className="text-left max-w-md mx-auto bg-red-500/5 border border-red-500/20 rounded-xl p-4">
              <p className="text-xs font-bold text-red-500 mb-2">{commitResult.errors.length} row(s) had issues:</p>
              <ul className="text-xs text-red-400 space-y-0.5 max-h-28 overflow-y-auto">
                {commitResult.errors.slice(0, 10).map((e, i) => <li key={i}>• {e}</li>)}
              </ul>
            </div>
          )}
          <div className="flex items-center justify-center gap-3">
            <button onClick={reset}
              className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors">
              Import Another File
            </button>
            <a href="/student-hub/analytics"
              className="px-5 py-2 rounded-lg text-sm font-bold text-primary border border-primary/30 hover:bg-primary/5 transition-colors">
              View Analytics
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string; color?: string }) {
  return (
    <div className="bg-bg rounded-xl p-3 flex items-center gap-3">
      <Icon size={17} className={color ?? "text-primary"} />
      <div>
        <p className="text-xs text-text-2">{label}</p>
        <p className={`text-sm font-bold ${color ?? "text-text"}`}>{value}</p>
      </div>
    </div>
  );
}

function StatCard({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="bg-bg rounded-xl p-4">
      <p className={`text-2xl font-black ${color}`}>{value}</p>
      <p className="text-xs text-text-2 mt-0.5">{label}</p>
    </div>
  );
}
