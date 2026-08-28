"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import {
  FileSpreadsheet, CheckCircle, XCircle, ArrowRight, ArrowLeft,
  Loader2, AlertTriangle, Users, ClipboardList, Sparkles, Eye, Camera,
  AlertCircle, RefreshCw, ShieldCheck, FileDown, BarChart3, Hash,
  TrendingDown, TrendingUp, ClipboardPaste, FileText, Table2,
} from "lucide-react";
import {
  splitFullName, FULL_NAME_FORMAT_LABELS, DEFAULT_FULL_NAME_FORMAT, type FullNameFormat,
} from "@/lib/services/import/name-format";
import { normalizeKey, type SubjectSuggestion } from "@/lib/services/import/subject-normalize-shared";
import { normalizeAssessmentComponentName, parseTabularMatrix, suggestAssessmentComponent } from "@/lib/services/import/assessment-components-shared";
import { FormField, Input, Select, fieldAria } from "@/components/ui/FormField";
import { ResponsiveTable } from "@/components/ui/ResponsiveTable";
import { StatusMessage } from "@/components/ui/Status";
import { WorkflowStepper } from "@/components/ui/WorkflowStepper";

type Step = "upload" | "mapping" | "preview" | "conflicts" | "importing" | "done";
type UploadMode = "file" | "paste" | "templates";

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
  componentName?: string;
  normalizedName?: string;
  maxScore?: number;
}

interface AssessmentComponentConfig {
  sourceColumn: string;
  componentName: string;
  normalizedName: string;
  maxScore: string;
  order: number;
  existingComponentId?: string;
}

interface ExistingAssessmentComponent {
  id: string;
  name: string;
  normalizedName: string;
  maxScore: number | null;
  order: number;
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

interface ValidationIssue {
  type: "error" | "warning";
  message: string;
}

interface PostAnalytics {
  totalStudents: number;
  withScores: number;
  classAverage: number | null;
  highest: { name: string; total: number } | null;
  lowest: { name: string; total: number } | null;
  belowSixtyCount: number;
  topThree: { name: string; total: number }[];
}

const TARGET_FIELDS = [
  { key: "fullName", label: "Full Name / Student Name", required: false, group: "Identity / student fields" },
  { key: "firstName", label: "First Name", required: true, group: "Identity / student fields" },
  { key: "lastName", label: "Last Name", required: true, group: "Identity / student fields" },
  { key: "regNumber", label: "Reg / Admission No.", required: false, group: "Identity / student fields" },
  { key: "gender", label: "Gender", required: false, group: "Identity / student fields" },
  { key: "dateOfBirth", label: "Date of Birth", required: false, group: "Identity / student fields" },
  { key: "parentName", label: "Parent / Guardian Name", required: false, group: "Identity / student fields" },
  { key: "parentPhone", label: "Parent / Guardian Phone", required: false, group: "Identity / student fields" },
  { key: "className", label: "Class", required: false, group: "Identity / student fields" },
  { key: "subject", label: "Subject", required: false, group: "Identity / student fields" },
  { key: "assessmentComponent", label: "Assessment Component", required: false, group: "Result fields" },
  { key: "ca1", label: "Legacy CA1 Score", required: false, group: "Result fields" },
  { key: "ca2", label: "Legacy CA2 Score", required: false, group: "Result fields" },
  { key: "exam", label: "Exam Score", required: false, group: "Result fields" },
  { key: "total", label: "Total Score (supplied)", required: false, group: "Result fields" },
  { key: "grade", label: "Grade", required: false, group: "Result fields" },
  { key: "position", label: "Position / Rank", required: false, group: "Result fields" },
  { key: "remark", label: "Teacher Remark", required: false, group: "Result fields" },
  { key: "ignore", label: "— Skip Column —", required: false, group: "Other" },
];

function buildComponentConfigs(mappings: ColumnMapping[]): Record<string, AssessmentComponentConfig> {
  return Object.fromEntries(mappings.filter((mapping) => mapping.target === "assessmentComponent").map((mapping, order) => {
    const suggestion = suggestAssessmentComponent(mapping.source);
    const componentName = mapping.componentName ?? suggestion?.componentName ?? mapping.source;
    return [mapping.source, {
      sourceColumn: mapping.source,
      componentName,
      normalizedName: mapping.normalizedName ?? suggestion?.normalizedName ?? normalizeAssessmentComponentName(componentName),
      maxScore: String(mapping.maxScore ?? suggestion?.maxScore ?? ""),
      order,
    }];
  }));
}

type ConflictResolution = "KEEP_EXISTING" | "REPLACE" | "MERGE";
type TemplateType = "student-list" | "result-import" | "subject-scores" | "full-class";

function parsePastedText(text: string): { headers: string[]; rows: Record<string, string>[] } | null {
  const lines = text.trim().split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return null;

  const firstLine = lines[0];
  const tabCount = (firstLine.match(/\t/g) ?? []).length;
  const commaCount = (firstLine.match(/,/g) ?? []).length;
  const delim = tabCount >= commaCount ? "\t" : ",";

  const splitRow = (line: string): string[] => {
    if (delim === "\t") return line.split("\t").map((c) => c.trim());
    const cells: string[] = [];
    let cur = "", inQ = false;
    for (const ch of line) {
      if (ch === '"') { inQ = !inQ; }
      else if (ch === "," && !inQ) { cells.push(cur.trim()); cur = ""; }
      else cur += ch;
    }
    cells.push(cur.trim());
    return cells;
  };

  const headers = splitRow(lines[0]).map((h, i) =>
    h.replace(/^["']|["']$/g, "").trim() || `Column ${i + 1}`
  );

  const rows = lines.slice(1).map((line) => {
    const cells = splitRow(line);
    return Object.fromEntries(
      headers.map((h, i) => [h, cells[i]?.replace(/^["']|["']$/g, "").trim() ?? ""])
    );
  });

  return { headers, rows };
}

async function downloadTemplate(type: TemplateType) {
  const XLSX = await import("xlsx");

  const configs: Record<TemplateType, { name: string; headers: string[]; sample: string[][] }> = {
    "student-list": {
      name: "Student List",
      headers: ["First Name", "Last Name", "Reg Number", "Gender", "Date of Birth", "Class", "Arm", "Parent Name", "Parent Phone"],
      sample: [
        ["John", "Doe", "SCH/2024/001", "Male", "2010-01-15", "SS2", "A", "Mr Emmanuel Doe", "08012345678"],
        ["Jane", "Smith", "SCH/2024/002", "Female", "2010-03-22", "SS2", "A", "Mrs Grace Smith", "08087654321"],
        ["Peter", "James", "SCH/2024/003", "Male", "2009-11-08", "SS2", "A", "Pastor James", "08011223344"],
      ],
    },
    "result-import": {
      name: "Result Import",
      headers: ["First Name", "Last Name", "Reg Number", "Subject", "CA1", "CA2", "Exam", "Total", "Grade", "Position", "Teacher Remark"],
      sample: [
        ["John", "Doe", "SCH/2024/001", "Mathematics", "20", "18", "55", "93", "A", "1", "Excellent performance"],
        ["Jane", "Smith", "SCH/2024/002", "Mathematics", "15", "16", "48", "79", "B", "3", "Good effort"],
        ["Peter", "James", "SCH/2024/003", "Mathematics", "12", "14", "40", "66", "C", "5", "Needs improvement"],
      ],
    },
    "subject-scores": {
      name: "Subject Scores",
      headers: ["Student Name", "Reg Number", "CA1 Score", "CA2 Score", "Exam Score", "Total Score", "Grade"],
      sample: [
        ["John Doe", "SCH/2024/001", "20", "18", "55", "93", "A"],
        ["Jane Smith", "SCH/2024/002", "15", "16", "48", "79", "B"],
        ["Peter James", "SCH/2024/003", "12", "14", "40", "66", "C"],
      ],
    },
    "full-class": {
      name: "Full Class Performance",
      headers: ["First Name", "Last Name", "Reg Number", "Gender", "English Language", "Mathematics", "Basic Science", "Social Studies", "Total", "Average", "Position", "Class Teacher Remark"],
      sample: [
        ["John", "Doe", "SCH/2024/001", "Male", "85", "90", "78", "82", "335", "83.75", "1", "Outstanding student"],
        ["Jane", "Smith", "SCH/2024/002", "Female", "78", "75", "82", "80", "315", "78.75", "2", "Good performance"],
        ["Peter", "James", "SCH/2024/003", "Male", "65", "66", "70", "68", "269", "67.25", "3", "Satisfactory"],
      ],
    },
  };

  const cfg = configs[type];
  const wb = XLSX.utils.book_new();

  const ws = XLSX.utils.aoa_to_sheet([cfg.headers, ...cfg.sample]);
  ws["!cols"] = cfg.headers.map(() => ({ wch: 20 }));
  XLSX.utils.book_append_sheet(wb, ws, "Import Template");

  const instrWs = XLSX.utils.aoa_to_sheet([
    [`TeachNexis — ${cfg.name} Template`],
    [""],
    ["Instructions:"],
    ["1. Fill in your student data below the header row"],
    ["2. Do NOT rename or delete the header row"],
    ["3. Save as .xlsx or export as .csv"],
    ["4. In TeachNexis: Student Hub → Import → Upload File"],
    ["5. Upload this file and complete the column mapping step"],
    [""],
    ["Questions? Contact your school admin or TeachNexis support."],
  ]);
  XLSX.utils.book_append_sheet(wb, instrWs, "Instructions");

  XLSX.writeFile(wb, `teachnexis-${type}-template.xlsx`);
}

export function ImportHubClient({
  classes,
}: {
  classes: ClassOption[];
  schoolId: string;
  teacherId: string;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [uploadMode, setUploadMode] = useState<UploadMode>("file");
  const [file, setFile] = useState<File | null>(null);
  const [importSource, setImportSource] = useState<"FILE" | "PASTE">("FILE");
  const [pasteText, setPasteText] = useState("");
  const [pastePreview, setPastePreview] = useState<{ headers: string[]; rows: Record<string, string>[] } | null>(null);
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
  const [validationIssues, setValidationIssues] = useState<ValidationIssue[]>([]);
  const [postAnalytics, setPostAnalytics] = useState<PostAnalytics | null>(null);
  // Full-name split direction — never a silent hardcoded assumption. Default
  // is only ever a pre-selected suggestion; the teacher confirms it below.
  const [fullNameFormat, setFullNameFormat] = useState<FullNameFormat>(DEFAULT_FULL_NAME_FORMAT);
  const [fullNameFormatConfirmed, setFullNameFormatConfirmed] = useState(false);
  // Subject Registry confirmation: raw value -> teacher-confirmed canonical name.
  const [subjectSuggestions, setSubjectSuggestions] = useState<SubjectSuggestion[]>([]);
  const [subjectOverrides, setSubjectOverrides] = useState<Record<string, string>>({});
  const [loadingSubjects, setLoadingSubjects] = useState(false);
  const [subjectMappingsConfirmed, setSubjectMappingsConfirmed] = useState(false);
  const [componentConfigs, setComponentConfigs] = useState<Record<string, AssessmentComponentConfig>>({});
  const [existingComponents, setExistingComponents] = useState<ExistingAssessmentComponent[]>([]);
  const [assessmentComponentsConfirmed, setAssessmentComponentsConfirmed] = useState(false);
  const [componentDiscrepanciesConfirmed, setComponentDiscrepanciesConfirmed] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);

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

  useEffect(() => {
    if (step !== "mapping" || !mappings.some((mapping) => mapping.target === "assessmentComponent")) return;
    let cancelled = false;
    fetch("/api/assessment-components")
      .then((response) => response.ok ? response.json() : { components: [] })
      .then((data: { components: ExistingAssessmentComponent[] }) => {
        if (!cancelled) setExistingComponents(data.components);
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, [step, mappings]);

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
      const matrix = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" });
      return parseTabularMatrix(matrix);
    }
    throw new Error("Unsupported file type. Use CSV, XLSX, or XLS.");
  }, []);

  const analyzeAndStage = useCallback(
    async (headers: string[], rows: Record<string, string>[], fileName: string) => {
      const analyzeRes = await fetch("/api/import/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ headers, sampleRows: rows.slice(0, 3), fileName, totalRows: rows.length }),
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
      setImportSource("FILE");
      setError(null);
      setLoading(true);
      try {
        const { headers, rows } = await parseFile(f);
        if (!headers.length || !rows.length) throw new Error("File is empty.");
        setRawData(rows);
        const result = await analyzeAndStage(headers, rows, f.name);
        setAnalysis(result);
        setMappings(result.mappings);
        setComponentConfigs(buildComponentConfigs(result.mappings));
        setAssessmentComponentsConfirmed(false);
        setComponentDiscrepanciesConfirmed(false);
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
    setImportSource("FILE");
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
      const a = await analyzeAndStage(result.headers, result.rows, f.name);
      setAnalysis(a);
      setMappings(a.mappings);
      setComponentConfigs(buildComponentConfigs(a.mappings));
      setAssessmentComponentsConfirmed(false);
      setComponentDiscrepanciesConfirmed(false);
      if (a.detectedSubject) setSubject(a.detectedSubject);
      setStep("mapping");
    } catch (e) {
      setError(e instanceof Error ? e.message : "OCR failed");
      setOcrPreview(null);
    } finally {
      setLoading(false);
    }
  }, [analyzeAndStage]);

  const handlePasteImport = useCallback(async () => {
    if (!pastePreview) return;
    setImportSource("PASTE");
    setError(null);
    setLoading(true);
    try {
      const { headers, rows } = pastePreview;
      if (!headers.length || !rows.length) throw new Error("No data detected.");
      setRawData(rows);
      const result = await analyzeAndStage(headers, rows, "pasted-table.csv");
      setAnalysis(result);
      setMappings(result.mappings);
      setComponentConfigs(buildComponentConfigs(result.mappings));
      setAssessmentComponentsConfirmed(false);
      setComponentDiscrepanciesConfirmed(false);
      if (result.detectedSubject) setSubject(result.detectedSubject);
      if (result.detectedTerm) {
        const t = result.detectedTerm.toUpperCase();
        if (t === "FIRST" || t === "SECOND" || t === "THIRD") setTerm(t as typeof term);
      }
      if (result.detectedSession) setSession(result.detectedSession);
      setStep("mapping");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse pasted data");
    } finally {
      setLoading(false);
    }
  }, [pastePreview, analyzeAndStage]);

  const hasScoreColumns = mappings.some((mapping) => ["ca1", "ca2", "assessmentComponent", "exam", "total", "grade"].includes(mapping.target));
  const assessmentComponentMappings = mappings
    .filter((mapping) => mapping.target === "assessmentComponent")
    .map((mapping, order) => {
      const config = componentConfigs[mapping.source];
      return config ? {
        sourceColumn: mapping.source,
        componentName: config.componentName.trim(),
        normalizedName: normalizeAssessmentComponentName(config.normalizedName || config.componentName),
        maxScore: Number(config.maxScore),
        order,
        existingComponentId: config.existingComponentId,
        createConfirmed: !config.existingComponentId && assessmentComponentsConfirmed,
      } : null;
    })
    .filter((mapping): mapping is NonNullable<typeof mapping> => mapping !== null);

  const totalColumn = mappings.find((mapping) => mapping.target === "total")?.source;
  const examColumn = mappings.find((mapping) => mapping.target === "exam")?.source;
  const componentDiscrepancies = useMemo(() => totalColumn ? rawData.flatMap((row, rowIndex) => {
    const suppliedTotal = Number(row[totalColumn]);
    const componentValues = assessmentComponentMappings
      .map((mapping) => Number(row[mapping.sourceColumn]))
      .filter(Number.isFinite);
    const exam = examColumn ? Number(row[examColumn]) : NaN;
    const visibleSum = componentValues.reduce((sum, value) => sum + value, 0) + (Number.isFinite(exam) ? exam : 0);
    return Number.isFinite(suppliedTotal) && componentValues.length > 0 && Math.abs(suppliedTotal - visibleSum) > 0.000001
      ? [{ rowIndex, suppliedTotal, visibleSum }]
      : [];
  }) : [], [totalColumn, rawData, assessmentComponentMappings, examColumn]);

  const runClientValidation = useCallback((): ValidationIssue[] => {
    const issues: ValidationIssue[] = [];

    const hasFirstName = mappings.some((m) => m.target === "firstName");
    const hasLastName = mappings.some((m) => m.target === "lastName");
    const hasFullName = mappings.some((m) => m.target === "fullName");
    const hasName = (hasFirstName && hasLastName) || hasFullName;
    if (!hasName) {
      issues.push({ type: "error", message: "Map a Full Name column, or both First Name and Last Name" });
    }

    if (!classId) issues.push({ type: "error", message: "Class is required" });

    if (hasName) {
      const fnCol = mappings.find((m) => m.target === "firstName")?.source;
      const lnCol = mappings.find((m) => m.target === "lastName")?.source;
      const fullCol = mappings.find((m) => m.target === "fullName")?.source;
      const nameKeys = rawData
        .map((r) => {
          if (fullCol) return r[fullCol]?.trim().toLowerCase() ?? "";
          return `${r[fnCol ?? ""] ?? ""}|${r[lnCol ?? ""] ?? ""}`.toLowerCase().trim();
        })
        .filter((n) => n && n !== "|");
      const uniq = new Set(nameKeys);
      if (uniq.size < nameKeys.length) {
        issues.push({ type: "warning", message: `${nameKeys.length - uniq.size} duplicate student name(s) in import data` });
      }
    }

    const regCol = mappings.find((m) => m.target === "regNumber")?.source;
    if (regCol) {
      const regs = rawData.map((r) => r[regCol] ?? "").filter((r) => r.trim());
      if (new Set(regs).size < regs.length) {
        issues.push({ type: "warning", message: "Duplicate admission numbers detected" });
      }
    }

    const scoreFields = ["ca1", "ca2", "exam", "total"] as const;
    for (const field of scoreFields) {
      const col = mappings.find((m) => m.target === field)?.source;
      if (!col) continue;
      const invalid = rawData.filter((r) => r[col]?.trim() && isNaN(parseFloat(r[col]))).length;
      if (invalid > 0) {
        const lbl = TARGET_FIELDS.find((f) => f.key === field)?.label ?? field;
        issues.push({ type: "error", message: `${invalid} row(s) have non-numeric ${lbl}` });
      }
      const outOfRange = rawData.filter((r) => {
        const v = parseFloat(r[col] ?? "");
        return !isNaN(v) && (v < 0 || v > 100);
      }).length;
      if (outOfRange > 0) {
        const lbl = TARGET_FIELDS.find((f) => f.key === field)?.label ?? field;
        issues.push({ type: "warning", message: `${outOfRange} row(s) have ${lbl} outside 0–100` });
      }
    }

    if (mappings.some((mapping) => mapping.target === "assessmentComponent")) {
      if (assessmentComponentMappings.length !== mappings.filter((mapping) => mapping.target === "assessmentComponent").length) {
        issues.push({ type: "error", message: "Configure every mapped assessment component" });
      }
      const normalizedNames = assessmentComponentMappings.map((mapping) => mapping.normalizedName);
      if (new Set(normalizedNames).size !== normalizedNames.length) {
        issues.push({ type: "error", message: "Each assessment component can be mapped only once" });
      }
      for (const mapping of assessmentComponentMappings) {
        if (!mapping.componentName || !mapping.normalizedName || !Number.isFinite(mapping.maxScore) || mapping.maxScore <= 0) {
          issues.push({ type: "error", message: `Confirm a name and maximum score for ${mapping.sourceColumn}` });
          continue;
        }
        const invalid = rawData.filter((row) => {
          const raw = row[mapping.sourceColumn]?.trim();
          if (!raw || raw === "-" || raw.toUpperCase() === "N/A") return false;
          const value = Number(raw);
          return !Number.isFinite(value) || value < 0 || value > mapping.maxScore;
        }).length;
        if (invalid > 0) issues.push({ type: "error", message: `${invalid} row(s) exceed or violate the confirmed maximum for ${mapping.componentName}` });
      }
      if (!assessmentComponentsConfirmed) {
        issues.push({ type: "error", message: "Confirm the assessment component structure before staging" });
      }
    }

    if (componentDiscrepancies.length > 0) {
      issues.push({ type: "warning", message: `${componentDiscrepancies.length} row(s) have a supplied total that differs from the visible component sum` });
      if (!componentDiscrepanciesConfirmed) {
        issues.push({ type: "error", message: "Confirm that supplied totals will be preserved despite component discrepancies" });
      }
    }

    if (hasScoreColumns && !subject.trim()) {
      issues.push({ type: "error", message: "Subject name is required when importing scores" });
    }

    if (hasFullName && !fullNameFormatConfirmed) {
      issues.push({ type: "error", message: "Confirm how the Full Name column should be interpreted" });
    }
    if (subjectSuggestions.some((s) => normalizeKey(s.raw) !== normalizeKey(subjectOverrides[normalizeKey(s.raw)] ?? s.suggested)) && !subjectMappingsConfirmed) {
      issues.push({ type: "error", message: "Confirm the subject mappings that will be learned for this school" });
    }

    return issues;
  }, [mappings, rawData, classId, subject, hasScoreColumns, fullNameFormatConfirmed, subjectSuggestions, subjectOverrides, subjectMappingsConfirmed, assessmentComponentMappings, assessmentComponentsConfirmed, componentDiscrepancies, componentDiscrepanciesConfirmed]);

  const computePostAnalytics = useCallback((): PostAnalytics => {
    const totalCol = mappings.find((m) => m.target === "total")?.source;
    const fnCol = mappings.find((m) => m.target === "firstName")?.source ?? "";
    const lnCol = mappings.find((m) => m.target === "lastName")?.source ?? "";

    const students = rawData.map((row) => ({
      name: `${row[fnCol] ?? ""} ${row[lnCol] ?? ""}`.trim(),
      total: totalCol ? parseFloat(row[totalCol] ?? "") : NaN,
    }));
    const withScores = students.filter((s) => !isNaN(s.total));

    if (withScores.length === 0) {
      return { totalStudents: students.length, withScores: 0, classAverage: null, highest: null, lowest: null, belowSixtyCount: 0, topThree: [] };
    }

    const sorted = [...withScores].sort((a, b) => b.total - a.total);
    const avg = withScores.reduce((sum, s) => sum + s.total, 0) / withScores.length;

    return {
      totalStudents: students.length,
      withScores: withScores.length,
      classAverage: Math.round(avg * 100) / 100,
      highest: sorted[0] ?? null,
      lowest: sorted[sorted.length - 1] ?? null,
      belowSixtyCount: withScores.filter((s) => s.total < 60).length,
      topThree: sorted.slice(0, 3),
    };
  }, [mappings, rawData]);

  const discardJob = useCallback((id: string) => {
    // Best-effort cleanup — never blocks the flow that triggered it.
    fetch(`/api/student-hub/jobs/${id}/discard`, { method: "POST" }).catch(() => {});
  }, []);

  const runStaging = useCallback(async () => {
    const issues = runClientValidation();
    setValidationIssues(issues);
    if (issues.some((i) => i.type === "error")) return;

    setLoading(true);
    setError(null);
    try {
      // A previous staging round exists (e.g. the teacher went Back to fix a mapping
      // and is re-staging) — discard it instead of leaving it stranded in STAGED
      // status with no path to commit or clean up.
      if (jobId) discardJob(jobId);

      const srcName = importSource === "PASTE" ? "CSV" : (file?.name?.endsWith(".csv") ? "CSV" : "EXCEL");
      const fileName = importSource === "PASTE" ? "pasted-table.csv" : (file?.name ?? "upload");

      const jobRes = await fetch("/api/student-hub/jobs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source: srcName, fileName }),
      });
      if (!jobRes.ok) throw new Error("Failed to create import job");
      const { jobId: newJobId } = await jobRes.json() as { jobId: string };
      setJobId(newJobId);

      const activeMappings = mappings.filter((m) => m.target !== "ignore" && m.target !== "assessmentComponent");
      const stagingRows = rawData.map((row, idx) => ({
        rowIndex: idx,
        rawData: row,
        parsedData: Object.fromEntries(activeMappings.map((m) => [m.target, row[m.source] ?? ""])),
      }));

      const stageRes = await fetch(`/api/student-hub/jobs/${newJobId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: stagingRows,
          classId,
          term,
          session,
          fullNameFormat,
          fullNameFormatConfirmed,
          subjectCanonicalMap: subjectOverrides,
          subjectMappingsConfirmed,
          assessmentComponentMappings,
          assessmentComponentsConfirmed,
        }),
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
  }, [importSource, file, mappings, rawData, runClientValidation, jobId, discardJob, classId, term, session, fullNameFormat, fullNameFormatConfirmed, subjectOverrides, subjectMappingsConfirmed, assessmentComponentMappings, assessmentComponentsConfirmed]);

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
      setPostAnalytics(computePostAnalytics());
      setStep("done");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed");
      setStep("preview");
    }
  }, [jobId, classId, subject, term, session, defaultResolution, computePostAnalytics]);

  const changeMappingTarget = (mapping: ColumnMapping, target: string) => {
    setMappings((previous) => previous.map((item) => item.source === mapping.source ? { ...item, target } : item));
    setComponentConfigs((previous) => {
      const next = { ...previous };
      if (target === "assessmentComponent") {
        const suggestion = suggestAssessmentComponent(mapping.source);
        const componentName = mapping.componentName ?? suggestion?.componentName ?? mapping.source;
        next[mapping.source] = next[mapping.source] ?? {
          sourceColumn: mapping.source,
          componentName,
          normalizedName: mapping.normalizedName ?? suggestion?.normalizedName ?? normalizeAssessmentComponentName(componentName),
          maxScore: String(mapping.maxScore ?? suggestion?.maxScore ?? ""),
          order: Object.keys(next).length,
        };
      } else {
        delete next[mapping.source];
      }
      return next;
    });
    setAssessmentComponentsConfirmed(false);
    setComponentDiscrepanciesConfirmed(false);
  };

  const reset = () => {
    // Abandoning a staged-but-never-committed job (e.g. "Back" out of mapping after
    // already staging once) — discard it so it doesn't linger invisibly.
    if (jobId && !commitResult) discardJob(jobId);
    setStep("upload");
    setUploadMode("file");
    setFile(null);
    setImportSource("FILE");
    setPasteText("");
    setPastePreview(null);
    setRawData([]);
    setAnalysis(null);
    setMappings([]);
    setStagingResult(null);
    setJobId(null);
    setCommitResult(null);
    setError(null);
    setOcrPreview(null);
    setValidationIssues([]);
    setPostAnalytics(null);
    setSubjectSuggestions([]);
    setSubjectOverrides({});
    setFullNameFormat(DEFAULT_FULL_NAME_FORMAT);
    setFullNameFormatConfirmed(false);
    setSubjectMappingsConfirmed(false);
    setComponentConfigs({});
    setExistingComponents([]);
    setAssessmentComponentsConfirmed(false);
    setComponentDiscrepanciesConfirmed(false);
  };

  const requiredMet =
    (mappings.some((m) => m.target === "firstName") && mappings.some((m) => m.target === "lastName")) ||
    mappings.some((m) => m.target === "fullName");
  const hasBlockingErrors = validationIssues.some((i) => i.type === "error");

  const workflowSteps = [
    { id: "upload", label: "Upload" },
    { id: "analyse", label: "Analyse", shortLabel: "Analyse" },
    { id: "map", label: "Map columns", shortLabel: "Map" },
    { id: "preview", label: "Preview" },
    { id: "confirm", label: "Confirm" },
    { id: "commit", label: "Commit" },
    { id: "complete", label: "Complete" },
  ];
  const workflowCurrent = step === "upload" ? (loading ? "analyse" : "upload")
    : step === "mapping" ? "map"
    : step === "preview" || step === "conflicts" ? "confirm"
    : step === "importing" ? "commit"
    : "complete";
  const workflowCompleted = workflowSteps
    .slice(0, Math.max(0, workflowSteps.findIndex((item) => item.id === workflowCurrent)))
    .map((item) => item.id);

  return (
    <div className="space-y-6">
      <WorkflowStepper steps={workflowSteps} currentStep={workflowCurrent} completedStepIds={workflowCompleted} label="Student import progress" />

      {error && (
        <StatusMessage tone="error" title="Import could not continue">{error}</StatusMessage>
      )}

      {/* ── Step 1: Upload ── */}
      {step === "upload" && (
        <div className="space-y-4">
          {/* Mode tabs */}
          <div className="flex gap-1 p-1 bg-bg rounded-xl border border-border">
            {([
              { id: "file" as UploadMode, icon: FileSpreadsheet, label: "Upload File" },
              { id: "paste" as UploadMode, icon: ClipboardPaste, label: "Paste Table" },
              { id: "templates" as UploadMode, icon: FileDown, label: "Templates" },
            ]).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                onClick={() => setUploadMode(id)}
                className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-colors ${
                  uploadMode === id
                    ? "bg-surface text-text shadow-sm border border-border"
                    : "text-text-2 hover:text-text"
                }`}
              >
                <Icon size={14} />
                {label}
              </button>
            ))}
          </div>

          {/* File tab */}
          {uploadMode === "file" && (
            loading ? (
              <div className="bg-surface border-2 border-dashed border-border rounded-2xl p-12 text-center">
                <Loader2 size={40} className="text-primary animate-spin mx-auto mb-3" />
                <p className="text-sm text-text-2">
                  {ocrPreview ? "AI is reading the mark sheet…" : `Parsing ${file?.name}…`}
                </p>
                {ocrPreview && (
                  // eslint-disable-next-line @next/next/no-img-element
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
                  <p className="text-[11px] text-text-2 mt-3 bg-bg rounded-lg px-3 py-2 border border-border">
                    Export from SchoolCube → drag & drop here
                  </p>
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
            )
          )}

          {/* Paste tab */}
          {uploadMode === "paste" && (
            <div className="space-y-4">
              <div className="bg-surface border border-border rounded-xl p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <ClipboardPaste size={15} className="text-primary" />
                  <h3 className="font-bold text-text text-sm">Paste Table Data</h3>
                </div>
                <p className="text-xs text-text-2">
                  In SchoolCube (or any portal), select the result table, copy it, then paste below. Tab-separated (Excel) and CSV formats are auto-detected.
                </p>
                <textarea
                  value={pasteText}
                  onChange={(e) => { setPasteText(e.target.value); setPastePreview(null); }}
                  rows={9}
                  placeholder={"Paste your copied table here…\n\nExample (copied from Excel or SchoolCube):\nFirst Name\tLast Name\tMaths\tEnglish\nJohn\tDoe\t85\t78\nJane\tSmith\t92\t88"}
                  className="w-full px-3 py-2.5 rounded-lg text-xs font-mono bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
                <button
                  onClick={() => {
                    const result = parsePastedText(pasteText);
                    if (!result) {
                      setError("Could not detect a table. Make sure you copied a table with column headers in the first row.");
                      return;
                    }
                    setError(null);
                    setPastePreview(result);
                  }}
                  disabled={!pasteText.trim()}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-40"
                >
                  <Eye size={14} /> Detect Columns
                </button>
              </div>

              {pastePreview && (
                <div className="bg-surface border border-green-500/20 rounded-xl p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={15} className="text-green-500" />
                    <p className="text-sm font-bold text-text">
                      Detected {pastePreview.headers.length} columns · {pastePreview.rows.length} rows
                    </p>
                  </div>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-bg">
                          {pastePreview.headers.map((h) => (
                            <th key={h} className="px-3 py-2 text-left font-semibold text-text-2 whitespace-nowrap">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {pastePreview.rows.slice(0, 4).map((row, i) => (
                          <tr key={i} className="border-t border-border">
                            {pastePreview.headers.map((h) => (
                              <td key={h} className="px-3 py-1.5 text-text whitespace-nowrap">{row[h] ?? "—"}</td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {pastePreview.rows.length > 4 && (
                    <p className="text-xs text-text-2">Showing 4 of {pastePreview.rows.length} rows</p>
                  )}
                  <button
                    onClick={handlePasteImport}
                    disabled={loading}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-40"
                  >
                    {loading ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
                    {loading ? "Analysing columns…" : "Map Columns →"}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Templates tab */}
          {uploadMode === "templates" && (
            <div className="space-y-4">
              <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-4 text-xs text-blue-600 dark:text-blue-400">
                Download a template, fill in your student data in Excel or Google Sheets, then upload via the <strong>Upload File</strong> tab.
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {([
                  { type: "student-list" as TemplateType, icon: Users, title: "Student List", desc: "Register new students — names, reg numbers, gender, class, parent contacts", color: "text-blue-500", bg: "bg-blue-500/10" },
                  { type: "result-import" as TemplateType, icon: ClipboardList, title: "Result Import", desc: "Full result sheet — CA1, CA2, exam, total, grade, position per subject", color: "text-green-500", bg: "bg-green-500/10" },
                  { type: "subject-scores" as TemplateType, icon: Hash, title: "Subject Scores", desc: "Single subject scores for an existing class — quick score entry", color: "text-amber-500", bg: "bg-amber-500/10" },
                  { type: "full-class" as TemplateType, icon: Table2, title: "Full Class Performance", desc: "All subjects side by side — total, average, position, class teacher remark", color: "text-purple-500", bg: "bg-purple-500/10" },
                ]).map(({ type, icon: Icon, title, desc, color, bg }) => (
                  <div key={type} className="bg-surface border border-border rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                        <Icon size={18} className={color} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-text">{title}</p>
                        <p className="text-xs text-text-2 mt-0.5">{desc}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => downloadTemplate(type)}
                      className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-bold border transition-colors ${color} border-current hover:opacity-80`}
                    >
                      <FileDown size={13} /> Download .xlsx Template
                    </button>
                  </div>
                ))}
              </div>
              <p className="text-xs text-text-2 flex items-center gap-2 px-1">
                <FileText size={13} className="shrink-0" />
                After filling in the template, switch to <strong>Upload File</strong> and drag it in.
              </p>
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
              <h2 className="font-bold text-text">Column Mapping</h2>
              <span className="ml-auto text-xs text-text-2 bg-bg px-2 py-1 rounded-full">
                {analysis.totalRows} rows · {importSource === "PASTE" ? "Pasted Table" : file?.name}
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
                    onChange={(e) => changeMappingTarget(m, e.target.value)}
                    className="w-44 px-2 py-1.5 rounded-lg text-sm bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                  >
                    {["Identity / student fields", "Result fields", "Other"].map((group) => (
                      <optgroup key={group} label={group}>
                        {TARGET_FIELDS.filter((field) => field.group === group).map((field) => (
                          <option key={field.key} value={field.key}>{field.label}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                  {m.confidence >= 0.8 && m.target !== "ignore" && <CheckCircle size={15} className="text-green-500 shrink-0" />}
                  {m.confidence < 0.5 && m.target !== "ignore" && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
                </div>
              ))}
            </div>
          </div>

          {mappings.some((mapping) => mapping.target === "assessmentComponent") && (
            <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
              <div>
                <h3 className="font-bold text-text text-sm">Assessment Components</h3>
                <p className="text-xs text-text-2 mt-1">
                  Confirm how each school-specific score column will be stored. Existing components are scoped to this school only.
                </p>
              </div>
              <div className="space-y-3">
                {mappings.filter((mapping) => mapping.target === "assessmentComponent").map((mapping) => {
                  const config = componentConfigs[mapping.source];
                  if (!config) return null;
                  return (
                    <div key={mapping.source} className="rounded-xl border border-border bg-bg p-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                      <div>
                        <p className="text-[11px] uppercase tracking-wide text-text-2 font-semibold">Source</p>
                        <p className="text-sm font-mono text-text mt-1">{mapping.source}</p>
                        <p className="text-xs text-text-2 truncate">Sample: {analysis.sampleRows[0]?.[mapping.source] ?? "—"}</p>
                      </div>
                      <label className="text-xs text-text-2">
                        Reuse or create
                        <select
                          value={config.existingComponentId ?? "__new__"}
                          onChange={(event) => {
                            const existing = existingComponents.find((component) => component.id === event.target.value);
                            setComponentConfigs((previous) => ({
                              ...previous,
                              [mapping.source]: existing ? {
                                ...config,
                                existingComponentId: existing.id,
                                componentName: existing.name,
                                normalizedName: existing.normalizedName,
                                maxScore: existing.maxScore == null ? "" : String(existing.maxScore),
                              } : { ...config, existingComponentId: undefined },
                            }));
                            setAssessmentComponentsConfirmed(false);
                          }}
                          className="mt-1 w-full px-2 py-2 rounded-lg bg-surface border border-border text-text"
                        >
                          <option value="__new__">Create confirmed component</option>
                          {existingComponents.map((component) => <option key={component.id} value={component.id}>{component.name}</option>)}
                        </select>
                      </label>
                      <label className="text-xs text-text-2">
                        Display name
                        <input
                          value={config.componentName}
                          disabled={Boolean(config.existingComponentId)}
                          onChange={(event) => setComponentConfigs((previous) => ({ ...previous, [mapping.source]: { ...config, componentName: event.target.value, normalizedName: normalizeAssessmentComponentName(event.target.value) } }))}
                          className="mt-1 w-full px-2 py-2 rounded-lg bg-surface border border-border text-text disabled:opacity-60"
                        />
                      </label>
                      <label className="text-xs text-text-2">
                        Normalized name
                        <input
                          value={config.normalizedName}
                          disabled={Boolean(config.existingComponentId)}
                          onChange={(event) => setComponentConfigs((previous) => ({ ...previous, [mapping.source]: { ...config, normalizedName: event.target.value } }))}
                          className="mt-1 w-full px-2 py-2 rounded-lg bg-surface border border-border text-text disabled:opacity-60"
                        />
                      </label>
                      <label className="text-xs text-text-2">
                        Maximum mark
                        <input
                          type="number"
                          min="0.01"
                          step="0.01"
                          value={config.maxScore}
                          disabled={Boolean(config.existingComponentId && existingComponents.find((component) => component.id === config.existingComponentId)?.maxScore != null)}
                          onChange={(event) => setComponentConfigs((previous) => ({ ...previous, [mapping.source]: { ...config, maxScore: event.target.value } }))}
                          className="mt-1 w-full px-2 py-2 rounded-lg bg-surface border border-border text-text disabled:opacity-60"
                        />
                      </label>
                    </div>
                  );
                })}
              </div>
              <label className="flex items-start gap-2 text-xs text-text-2 cursor-pointer">
                <input type="checkbox" checked={assessmentComponentsConfirmed} onChange={(event) => setAssessmentComponentsConfirmed(event.target.checked)} className="mt-0.5" />
                I confirm these component names, maximum marks, ordering, and school-scoped reuse choices.
              </label>
            </div>
          )}

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

          {componentDiscrepancies.length > 0 && (
            <section className="space-y-3 rounded-xl border border-warning/30 bg-warning-50/40 p-4 sm:p-5" aria-labelledby="component-discrepancy-title">
              <StatusMessage tone="warning" title="Supplied total differs from visible components" className="border-0 bg-transparent p-0">
                <span id="component-discrepancy-title">{componentDiscrepancies.length} row(s) differ. TeachNexis will preserve the supplied Total Score and store component values separately. Nothing is silently recalculated or double-counted.</span>
              </StatusMessage>
              <ResponsiveTable label="Component total discrepancies" className="shadow-none" tableClassName="min-w-[30rem] text-xs">
                  <thead><tr className="bg-bg"><th className="px-3 py-2 text-left">Row</th><th className="px-3 py-2 text-left">Supplied total</th><th className="px-3 py-2 text-left">Visible component sum</th></tr></thead>
                  <tbody>{componentDiscrepancies.slice(0, 5).map((item) => (
                    <tr key={item.rowIndex} className="border-t border-border"><td className="px-3 py-2">{item.rowIndex + 2}</td><td className="px-3 py-2 font-semibold">{item.suppliedTotal}</td><td className="px-3 py-2">{item.visibleSum}</td></tr>
                  ))}</tbody>
              </ResponsiveTable>
              <label className="flex items-start gap-2 text-xs text-text-2 cursor-pointer">
                <input type="checkbox" checked={componentDiscrepanciesConfirmed} onChange={(event) => setComponentDiscrepanciesConfirmed(event.target.checked)} className="mt-0.5 size-4 accent-primary" />
                I reviewed these differences and confirm that the supplied totals remain authoritative for this import.
              </label>
            </section>
          )}

          {/* Import settings */}
          <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
            <h3 className="font-bold text-text text-sm">Import Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField id="import-class" label="Class" required>
                <Select id="import-class" value={classId} onChange={(e) => setClassId(e.target.value)} required>
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.level} — {c.session})</option>)}
                </Select>
              </FormField>
              {hasScoreColumns && (
                <FormField id="import-subject" label="Default Subject" required description="Used only when the file does not provide a subject column." error={!subject.trim() ? "Enter a subject before previewing." : undefined}>
                  <Input id="import-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Mathematics" required {...fieldAria("import-subject", { description: true, error: !subject.trim() })} />
                </FormField>
              )}
              {hasScoreColumns && (
                <>
                  <FormField id="import-term" label="Term">
                    <Select id="import-term" value={term} onChange={(e) => setTerm(e.target.value as typeof term)}>
                      <option value="FIRST">First Term</option>
                      <option value="SECOND">Second Term</option>
                      <option value="THIRD">Third Term</option>
                    </Select>
                  </FormField>
                  <FormField id="import-session" label="Session" description="Use the school academic-session format, for example 2025/2026.">
                    <Input id="import-session" value={session} onChange={(e) => setSession(e.target.value)} placeholder="e.g. 2025/2026" {...fieldAria("import-session", { description: true })} />
                  </FormField>
                </>
              )}
            </div>
          </div>

          {/* Validation panel */}
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
              {hasBlockingErrors && (
                <p className="text-xs text-red-500 font-medium pt-1 border-t border-red-500/20 mt-2">Fix errors above before continuing.</p>
              )}
            </div>
          )}

          <div className="flex items-center gap-3">
            <button onClick={reset} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm text-text-2 border border-border hover:bg-bg transition-colors">
              <ArrowLeft size={14} /> Back
            </button>
            <button
              onClick={runStaging}
              disabled={!requiredMet || loading}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-40"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
              {loading ? "Validating…" : "Preview & Stage"}
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
              {stagingResult.conflictCount} row(s) conflict with existing records. Choose how to resolve all at once.
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

            {assessmentComponentMappings.length > 0 && (
              <div className="mb-5 overflow-x-auto rounded-lg border border-border">
                <table className="w-full text-xs">
                  <thead><tr className="bg-bg"><th className="px-3 py-2 text-left">Source column</th><th className="px-3 py-2 text-left">Stored component</th><th className="px-3 py-2 text-left">Normalized name</th><th className="px-3 py-2 text-left">Maximum</th><th className="px-3 py-2 text-left">Sample</th><th className="px-3 py-2 text-left">State</th></tr></thead>
                  <tbody>{assessmentComponentMappings.map((mapping) => (
                    <tr key={mapping.sourceColumn} className="border-t border-border">
                      <td className="px-3 py-2 font-mono">{mapping.sourceColumn}</td>
                      <td className="px-3 py-2 font-semibold">{mapping.componentName}</td>
                      <td className="px-3 py-2">{mapping.normalizedName}</td>
                      <td className="px-3 py-2">{mapping.maxScore}</td>
                      <td className="px-3 py-2">{rawData[0]?.[mapping.sourceColumn] ?? "—"}</td>
                      <td className="px-3 py-2 text-green-600">Confirmed</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}

            {componentDiscrepancies.length > 0 && (
              <div className="mb-5 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                <AlertTriangle size={15} className="shrink-0" />
                <span><strong>{componentDiscrepancies.length} supplied total discrepancy/discrepancies confirmed.</strong> Supplied totals will be stored unchanged; visible sums remain validation metadata only.</span>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-border">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-bg">
                    {mappings.filter((m) => m.target !== "ignore").map((m) => (
                      <th key={m.source} className="px-3 py-2 text-left font-semibold text-text-2 whitespace-nowrap">
                        {m.target === "assessmentComponent"
                          ? componentConfigs[m.source]?.componentName ?? "Assessment Component"
                          : TARGET_FIELDS.find((f) => f.key === m.target)?.label ?? m.target}
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
            {rawData.length > 8 && <p className="text-xs text-text-2 mt-2">Showing 8 of {rawData.length} rows</p>}

            {stagingResult.errors.length > 0 && (
              <div className="mt-4 bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                <p className="text-xs font-bold text-red-500 mb-1">{stagingResult.errors.length} staging warnings:</p>
                <ul className="text-xs text-red-400 space-y-0.5 max-h-24 overflow-y-auto">
                  {stagingResult.errors.slice(0, 5).map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            )}
          </div>

          {stagingResult.conflictCount > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
              <ShieldCheck size={16} />
              <span>
                {stagingResult.conflictCount} conflict(s) resolved by:{" "}
                <strong>{defaultResolution === "KEEP_EXISTING" ? "Keep Existing" : defaultResolution === "REPLACE" ? "Replace" : "Merge"}</strong>
              </span>
              <button onClick={() => setStep("conflicts")} className="ml-auto text-xs underline">Change</button>
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
        <div className="space-y-6">
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
              <button onClick={reset} className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors">
                Import Another File
              </button>
              <a href="/student-hub/analytics" className="px-5 py-2 rounded-lg text-sm font-bold text-primary border border-primary/30 hover:bg-primary/5 transition-colors">
                View Analytics
              </a>
            </div>
          </div>

          {/* Post-import analytics */}
          {postAnalytics && postAnalytics.withScores > 0 && (
            <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
              <div className="flex items-center gap-2">
                <BarChart3 size={16} className="text-primary" />
                <h3 className="font-bold text-text">Import Analytics</h3>
                <span className="ml-auto text-xs text-text-2 bg-bg px-2 py-1 rounded-full">
                  {subject || "Scores"} · {term.charAt(0) + term.slice(1).toLowerCase()} Term · {session}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-bg rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-primary">{postAnalytics.classAverage?.toFixed(1) ?? "—"}</p>
                  <p className="text-xs text-text-2 mt-0.5">Class Average</p>
                </div>
                <div className="bg-bg rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-green-500">{postAnalytics.highest?.total ?? "—"}</p>
                  <p className="text-xs text-text-2 mt-0.5">Highest Score</p>
                </div>
                <div className="bg-bg rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-red-500">{postAnalytics.lowest?.total ?? "—"}</p>
                  <p className="text-xs text-text-2 mt-0.5">Lowest Score</p>
                </div>
                <div className="bg-bg rounded-xl p-3 text-center">
                  <p className="text-xl font-black text-amber-500">{postAnalytics.belowSixtyCount}</p>
                  <p className="text-xs text-text-2 mt-0.5">Below 60%</p>
                </div>
              </div>

              {postAnalytics.topThree.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold text-text-2 uppercase tracking-wide">Top Performers</p>
                  {postAnalytics.topThree.map((s, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-bg border border-border">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-black ${i === 0 ? "bg-amber-500/20 text-amber-500" : i === 1 ? "bg-text-2/10 text-text-2" : "bg-orange-500/10 text-orange-500"}`}>
                        {i + 1}
                      </div>
                      <p className="text-sm font-semibold text-text flex-1">{s.name}</p>
                      <div className="flex items-center gap-1 text-green-500">
                        <TrendingUp size={13} />
                        <span className="text-sm font-bold">{s.total}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {postAnalytics.belowSixtyCount > 0 && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-sm text-amber-700 dark:text-amber-400">
                  <TrendingDown size={15} className="shrink-0" />
                  <span>
                    <strong>{postAnalytics.belowSixtyCount}</strong> student(s) scored below 60% — consider remedial review for {subject || "this subject"}.
                  </span>
                </div>
              )}

              <div className="grid grid-cols-3 gap-3 text-xs text-text-2">
                <div className="bg-bg rounded-lg p-2 text-center">
                  <p className="font-bold text-text">{postAnalytics.totalStudents}</p>
                  <p>Total Students</p>
                </div>
                <div className="bg-bg rounded-lg p-2 text-center">
                  <p className="font-bold text-text">{postAnalytics.withScores}</p>
                  <p>With Scores</p>
                </div>
                <div className="bg-bg rounded-lg p-2 text-center">
                  <p className="font-bold text-text">
                    {postAnalytics.withScores > 0
                      ? `${Math.round(((postAnalytics.withScores - postAnalytics.belowSixtyCount) / postAnalytics.withScores) * 100)}%`
                      : "—"}
                  </p>
                  <p>Pass Rate</p>
                </div>
              </div>
            </div>
          )}
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
