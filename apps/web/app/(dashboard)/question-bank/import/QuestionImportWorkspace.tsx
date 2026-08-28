"use client";

import { useMemo, useRef, useState } from "react";
import { MathText } from "@/components/ui/MathText";
import type { QuestionImportCandidate } from "@/lib/services/question-import/types";

type Candidate = QuestionImportCandidate & { reviewRevision?: number; approved?: boolean; rejected?: boolean };
type Row = { id: string; rowIndex: number; candidate: Candidate; stagingStatus: string };
type CommitResult = { questionIds: string[]; importedCount: number; alreadyImportedCount: number; conflictCount: number; skippedCount: number };
type Filter = "ALL" | "READY" | "NEEDS_REVIEW" | "ERROR" | "POSSIBLE_DUPLICATE" | "ACCEPTED" | "REJECTED";

const filters: Filter[] = ["ALL", "READY", "NEEDS_REVIEW", "ERROR", "POSSIBLE_DUPLICATE", "ACCEPTED", "REJECTED"];
const fieldClass = "mt-1 w-full rounded-lg border border-border bg-canvas px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary";

function statusLabel(row: Row): Filter {
  if (row.candidate.rejected) return "REJECTED";
  if (row.candidate.approved) return "ACCEPTED";
  return row.candidate.status;
}

function sourceLabel(candidate: Candidate): string {
  const source = candidate.sourceLocation;
  if (source.sheet && source.row) return `${source.sheet}, row ${source.row}`;
  if (source.page) return `Page ${source.page}`;
  if (source.paragraph) return `Paragraph ${source.paragraph}`;
  if (source.row) return `Row ${source.row}`;
  return "Source location recorded";
}

export function QuestionImportWorkspace() {
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Candidate>>({});
  const [jobId, setJobId] = useState("");
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const [committing, setCommitting] = useState(false);
  const [commitResult, setCommitResult] = useState<CommitResult | null>(null);
  const commitInFlight = useRef(false);
  const [filter, setFilter] = useState<Filter>("ALL");
  const [query, setQuery] = useState("");
  const [activeId, setActiveId] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const counts = useMemo(() => filters.reduce<Record<string, number>>((acc, key) => {
    acc[key] = key === "ALL" ? rows.length : rows.filter((row) => statusLabel(row) === key).length;
    return acc;
  }, {}), [rows]);
  const reviewedCount = useMemo(() => rows.filter((row) => row.candidate.approved || row.candidate.rejected).length, [rows]);
  const visible = useMemo(() => rows.filter((row) => {
    const text = `${row.candidate.stem} ${row.candidate.subject ?? ""} ${row.candidate.topic ?? ""}`.toLowerCase();
    return (filter === "ALL" || statusLabel(row) === filter) && (!query || text.includes(query.toLowerCase()));
  }), [filter, query, rows]);
  const active = visible.find((row) => row.id === activeId) ?? visible[0];
  const draft = active ? (drafts[active.id] ?? active.candidate) : undefined;
  const activeIndex = active ? visible.findIndex((row) => row.id === active.id) : -1;
  const isDirty = Boolean(active && draft && JSON.stringify(draft) !== JSON.stringify(active.candidate));

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true);
    setFileName(file.name);
    setMessage("");
    setCommitResult(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/question-import/stage", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed.");
      const loaded = (data.rows ?? []) as Row[];
      setJobId(data.jobId);
      setRows(loaded);
      setActiveId(loaded[0]?.id ?? "");
      setDrafts(Object.fromEntries(loaded.map((row) => [row.id, row.candidate])));
      setMessage(data.duplicate ? "This file was already staged; review its existing candidates." : "Questions staged. Review and accept only valid candidates.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setBusy(false);
    }
  }

  function updateDraft<K extends keyof Candidate>(field: K, value: Candidate[K]) {
    if (!active || !draft) return;
    setDrafts((all) => ({ ...all, [active.id]: { ...draft, [field]: value } }));
  }

  function updateOption(index: number, value: string) {
    const options = [...(draft?.options ?? [])];
    options[index] = value;
    updateDraft("options", options);
  }

  function updateSolutionStep(index: number, value: string) {
    const steps = [...(draft?.solutionSteps ?? [])];
    steps[index] = value;
    updateDraft("solutionSteps", steps);
  }

  async function review(row: Row, action: "save" | "accept" | "reject") {
    const value = drafts[row.id] ?? row.candidate;
    try {
      const body = action === "accept"
        ? { rowId: row.id, expectedRevision: Number(row.candidate.reviewRevision ?? 1), approve: true }
        : { rowId: row.id, expectedRevision: Number(row.candidate.reviewRevision ?? 1), patch: { ...value, status: action === "reject" ? "NEEDS_REVIEW" : "READY", approved: false, rejected: action === "reject", errors: action === "save" ? [] : value.errors } };
      const response = await fetch("/api/question-import/review", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Review action failed.");
      setRows((all) => all.map((item) => item.id === row.id ? { ...item, candidate: data, stagingStatus: "RESOLVED" } : item));
      setDrafts((all) => ({ ...all, [row.id]: data }));
      setMessage(action === "accept" ? `Question ${row.rowIndex + 1} accepted.` : action === "reject" ? `Question ${row.rowIndex + 1} rejected.` : `Question ${row.rowIndex + 1} changes saved.`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Review action failed.");
    }
  }

  async function bulkAccept() {
    const ready = rows.filter((row) => row.candidate.status === "READY" && !row.candidate.approved && !row.candidate.rejected);
    if (!ready.length || !window.confirm(`Accept ${ready.length} READY question(s)?`)) return;
    for (const row of ready) await review(row, "accept");
  }

  async function bulkReject() {
    const targets = rows.filter((row) => selected.has(row.id) && !row.candidate.approved);
    if (!targets.length || !window.confirm(`Reject ${targets.length} selected question(s)?`)) return;
    for (const row of targets) await review(row, "reject");
    setSelected(new Set());
  }

  async function commit() {
    if (!jobId || commitInFlight.current) return;
    commitInFlight.current = true;
    setCommitting(true);
    setCommitResult(null);
    try {
      const response = await fetch("/api/question-import/commit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Import failed.");
      setCommitResult(data as CommitResult);
      setMessage("");
      const jobResponse = await fetch(`/api/question-import/job?jobId=${encodeURIComponent(jobId)}`);
      if (jobResponse.ok) {
        const job = await jobResponse.json();
        const loaded = (job.rows ?? []) as Row[];
        setRows(loaded);
        setDrafts(Object.fromEntries(loaded.map((row) => [row.id, row.candidate])));
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Import failed.");
    } finally {
      commitInFlight.current = false;
      setCommitting(false);
    }
  }

  function move(delta: number) {
    const next = visible[activeIndex + delta];
    if (next) setActiveId(next.id);
  }

  const solutionSteps = draft && Array.isArray(draft.solutionSteps) ? draft.solutionSteps : [];

  return <div className="space-y-5">
    <div className="rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h2 className="text-sm font-semibold text-text">Upload questions for review</h2><p className="mt-1 text-xs text-text-2">CSV, XLSX and DOCX · Upload → Review → Accept → Question Bank</p></div>
        <div className="flex flex-wrap gap-2"><a href="/api/question-import/template" className="min-h-10 rounded-lg border border-border px-3 py-2 text-sm font-semibold text-text">Download TeachNexis template</a><label className="inline-flex min-h-10 cursor-pointer items-center rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white">{busy ? "Processing…" : "Choose file"}<input className="sr-only" type="file" accept=".csv,.xlsx,.docx" onChange={(event) => upload(event.target.files?.[0])} /></label></div>
      </div>
    </div>

    {fileName && <p className="text-sm text-text-2">Selected file: <span className="font-medium text-text">{fileName}</span></p>}
    {message && <p role="status" aria-live="polite" className="rounded-lg border border-border bg-surface p-3 text-sm text-text-2">{message}</p>}

    {rows.length > 0 && <section aria-label="Question review workspace" className="space-y-4 rounded-xl border border-border bg-surface p-4">
      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div><h2 className="font-semibold text-text">Question Import Review</h2><p className="mt-1 text-sm text-text-2">Progress: {reviewedCount} of {rows.length} reviewed</p></div>
          <label className="text-sm text-text-2">Jump to question<select value={active?.id ?? ""} onChange={(event) => setActiveId(event.target.value)} className="ml-2 min-h-10 rounded-lg border border-border bg-canvas px-2 text-text">{visible.map((row) => <option key={row.id} value={row.id}>Question {row.rowIndex + 1} · {statusLabel(row).replaceAll("_", " ")}</option>)}</select></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="tablist" aria-label="Candidate status filter">{filters.map((key) => <button key={key} type="button" role="tab" aria-selected={filter === key} onClick={() => setFilter(key)} className={`min-h-9 rounded-full border px-3 text-xs font-semibold ${filter === key ? "border-primary bg-primary text-white" : "border-border text-text-2"}`}>{key.replaceAll("_", " ")} ({counts[key]})</button>)}</div>
        <label className="mt-3 block"><span className="sr-only">Search candidates</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search questions, subject or topic" className={fieldClass} /></label>
      </div>

      {!active || !draft ? <p className="rounded-lg bg-canvas p-4 text-sm text-text-2">No candidates match this filter.</p> : <article className="mx-auto w-full max-w-4xl space-y-5 rounded-xl border border-border bg-canvas p-4 sm:p-6">
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
          <div><p className="text-xs font-semibold uppercase tracking-wide text-text-2">Question {active.rowIndex + 1} · {statusLabel(active).replaceAll("_", " ")}</p><p className="mt-1 text-xs text-text-2">{sourceLabel(active.candidate)}</p></div>
          <div className="flex items-center gap-2"><button type="button" onClick={() => move(-1)} disabled={activeIndex <= 0} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">Previous</button><button type="button" onClick={() => move(1)} disabled={activeIndex < 0 || activeIndex >= visible.length - 1} className="min-h-10 rounded-lg border border-border px-3 text-sm disabled:opacity-40">Next</button></div>
        </header>

        <label className="block text-sm font-medium text-text">Question<textarea value={draft.stem} onChange={(event) => updateDraft("stem", event.target.value)} rows={5} className={fieldClass} /></label>
        <div className="rounded-lg border border-border bg-surface p-3"><p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-2">Rendered preview</p><MathText text={draft.stem} /></div>
        {active.candidate.status === "POSSIBLE_DUPLICATE" && <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="alert">Possible duplicate: compare this candidate with the existing Question Bank entry. Existing QuestionVersions are never overwritten automatically.</p>}

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm font-medium text-text">Type<select value={draft.questionType ?? ""} onChange={(event) => updateDraft("questionType", event.target.value as Candidate["questionType"])} className={fieldClass}><option value="" disabled>Select type</option><option>MCQ</option><option>SHORT_ANSWER</option><option>ESSAY</option><option>STRUCTURED</option><option>CALCULATION</option></select></label>
          <label className="text-sm font-medium text-text">Marks<input type="number" min="0" value={draft.marks ?? ""} onChange={(event) => updateDraft("marks", event.target.value === "" ? null : Number(event.target.value))} className={fieldClass} /></label>
        </div>

        {draft.questionType === "MCQ" && <fieldset className="space-y-3"><legend className="text-sm font-semibold text-text">Options</legend>{Array.from({ length: Math.max(4, draft.options.length) }, (_, index) => <label key={index} className="grid gap-2 text-sm font-medium text-text sm:grid-cols-[2rem_1fr]"><span className="pt-3">{String.fromCharCode(65 + index)}.</span><span><input value={draft.options[index] ?? ""} onChange={(event) => updateOption(index, event.target.value)} className={fieldClass} />{draft.options[index] && <span className="mt-2 block rounded-lg border border-border bg-surface p-2 font-normal"><MathText text={draft.options[index]} /></span>}</span></label>)}</fieldset>}

        <section className="space-y-2" aria-labelledby="answer-heading"><h3 id="answer-heading" className="text-sm font-semibold text-text">Answer</h3><p className="text-xs text-text-2">The final answer or answer key.</p><input value={draft.answer ?? ""} onChange={(event) => updateDraft("answer", event.target.value || null)} className={fieldClass} />{draft.answer && <div className="rounded-lg border border-border bg-surface p-3"><MathText text={draft.answer} /></div>}</section>

        <section className="space-y-3" aria-labelledby="solution-heading">
          <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 id="solution-heading" className="text-sm font-semibold text-text">Solution steps</h3><p className="mt-1 text-xs text-text-2">Source-provided or Teacher-entered working. Missing steps remain empty.</p></div><button type="button" onClick={() => updateDraft("solutionSteps", [...solutionSteps, ""])} className="min-h-10 rounded-lg border border-border px-3 text-sm font-semibold">Add solution step</button></div>
          {solutionSteps.length === 0 ? <p className="rounded-lg border border-dashed border-border p-3 text-sm text-text-2">No solution steps were supplied by the source.</p> : solutionSteps.map((step, index) => <div key={index} className="rounded-lg border border-border bg-surface p-3"><div className="flex items-center justify-between gap-2"><label htmlFor={`solution-step-${active.id}-${index}`} className="text-sm font-semibold text-text">Step {index + 1}</label><button type="button" onClick={() => updateDraft("solutionSteps", solutionSteps.filter((_, stepIndex) => stepIndex !== index))} className="min-h-9 rounded border border-red-200 px-2 text-xs font-semibold text-red-700">Remove</button></div><textarea id={`solution-step-${active.id}-${index}`} value={step} onChange={(event) => updateSolutionStep(index, event.target.value)} rows={2} className={fieldClass} />{step && <div className="mt-2 rounded-lg bg-canvas p-2"><MathText text={step} /></div>}</div>)}
        </section>

        <section className="space-y-2" aria-labelledby="explanation-heading"><h3 id="explanation-heading" className="text-sm font-semibold text-text">Explanation</h3><p className="text-xs text-text-2">Teacher notes or a concise explanation of why the answer is correct.</p><textarea value={draft.explanation ?? ""} onChange={(event) => updateDraft("explanation", event.target.value || null)} rows={3} className={fieldClass} />{draft.explanation && <div className="rounded-lg border border-border bg-surface p-3"><MathText text={draft.explanation} /></div>}</section>

        {active.candidate.warnings?.length ? <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900" role="alert">Warnings: {active.candidate.warnings.join(" ")}</p> : null}
        {active.candidate.errors?.length ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">Errors: {active.candidate.errors.join(" ")}</p> : null}

        <footer className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
          <label className="mr-auto inline-flex min-h-10 items-center gap-2 text-sm text-text-2"><input type="checkbox" checked={selected.has(active.id)} onChange={(event) => setSelected((all) => { const next = new Set(all); if (event.target.checked) next.add(active.id); else next.delete(active.id); return next; })} />Select for bulk action</label>
          <button type="button" onClick={() => review(active, "save")} disabled={active.candidate.status === "ERROR" || !isDirty} className="min-h-10 rounded-lg border border-border px-3 text-sm font-semibold disabled:opacity-40">Save changes</button>
          <button type="button" onClick={() => review(active, "reject")} className="min-h-10 rounded-lg border border-red-200 px-3 text-sm font-semibold text-red-700">Reject</button>
          <button type="button" onClick={() => review(active, "accept")} disabled={isDirty || active.candidate.status !== "READY" || Boolean(active.candidate.approved)} title={isDirty ? "Save changes before accepting this question." : undefined} className="min-h-10 rounded-lg bg-primary px-3 text-sm font-semibold text-white disabled:opacity-40">{active.candidate.approved ? "Accepted" : "Accept question"}</button>
          {isDirty && <p className="basis-full text-right text-xs text-amber-700">Save your changes before accepting.</p>}
        </footer>
      </article>}
    </section>}

    {rows.length > 0 && <div className="flex flex-wrap gap-2"><button type="button" onClick={bulkAccept} disabled={committing || !rows.some((row) => row.candidate.status === "READY" && !row.candidate.approved)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold disabled:opacity-50">Accept all READY</button><button type="button" onClick={bulkReject} disabled={committing || !selected.size} className="min-h-11 rounded-lg border border-red-200 px-4 text-sm font-semibold text-red-700 disabled:opacity-50">Reject selected ({selected.size})</button><button type="button" onClick={commit} disabled={busy || committing || !rows.some((row) => row.candidate.approved)} aria-busy={committing} className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">{committing ? "Importing…" : "Import accepted questions"}</button></div>}
    {commitResult && <div role="status" aria-live="polite" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-900"><p className="font-semibold">Question import complete.</p><p className="mt-1">Imported {commitResult.importedCount}; already imported {commitResult.alreadyImportedCount}; conflicts {commitResult.conflictCount}; skipped {commitResult.skippedCount}.</p><a href="/question-bank" className="mt-3 inline-flex min-h-10 items-center rounded-lg bg-primary px-3 font-semibold text-white">Open Question Bank</a></div>}
  </div>;
}
