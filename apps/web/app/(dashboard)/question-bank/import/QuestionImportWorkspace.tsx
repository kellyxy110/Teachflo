"use client";

import { useState } from "react";
import { MathText } from "@/components/ui/MathText";
import type { QuestionImportCandidate } from "@/lib/services/question-import/types";

type Candidate = QuestionImportCandidate & { reviewRevision?: number; approved?: boolean };
type Row = { id: string; rowIndex: number; candidate: Candidate; stagingStatus: string };

export function QuestionImportWorkspace() {
  const [rows, setRows] = useState<Row[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [jobId, setJobId] = useState("");
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function upload(file?: File) {
    if (!file) return;
    setBusy(true); setFileName(file.name); setMessage("");
    try {
      const form = new FormData(); form.append("file", file);
      const response = await fetch("/api/question-import/stage", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Upload failed.");
      const loaded = (data.rows ?? []) as Row[];
      setJobId(data.jobId); setRows(loaded); setDrafts(Object.fromEntries(loaded.map((row) => [row.id, row.candidate.stem])));
      setMessage(data.duplicate ? "This file was already staged. Its existing questions are shown below." : "Questions staged. Review each question before accepting it.");
    } catch (error) { setMessage(error instanceof Error ? error.message : "Upload failed."); }
    finally { setBusy(false); }
  }

  async function saveChanges(row: Row) {
    const stem = drafts[row.id] ?? row.candidate.stem;
    try {
      const response = await fetch("/api/question-import/review", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rowId: row.id, expectedRevision: Number(row.candidate.reviewRevision ?? 1), patch: { ...row.candidate, stem, status: "READY", errors: [] } }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not save changes.");
      setRows((all) => all.map((item) => item.id === row.id ? { ...item, candidate: data, stagingStatus: "RESOLVED" } : item));
      setMessage(`Question ${row.rowIndex + 1} changes saved.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save changes."); }
  }

  async function accept(row: Row) {
    try {
      const response = await fetch("/api/question-import/review", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ rowId: row.id, expectedRevision: Number(row.candidate.reviewRevision ?? 1), approve: true }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Could not accept question.");
      setRows((all) => all.map((item) => item.id === row.id ? { ...item, candidate: data, stagingStatus: "RESOLVED" } : item));
      setMessage(`Question ${row.rowIndex + 1} accepted.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not accept question."); }
  }

  async function commit() {
    if (!jobId) return;
    setBusy(true);
    try {
      const response = await fetch("/api/question-import/commit", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ jobId }) });
      const data = await response.json(); if (!response.ok) throw new Error(data.error ?? "Import failed.");
      setMessage(`${data.questionIds?.length ?? 0} accepted question(s) imported into Question Bank.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Import failed."); }
    finally { setBusy(false); }
  }

  return <div className="space-y-5">
    <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-primary px-4 text-sm font-semibold text-white">{busy ? "Processing…" : "Upload CSV, XLSX or DOCX"}<input className="sr-only" type="file" accept=".csv,.xlsx,.docx" onChange={(event) => upload(event.target.files?.[0])} /></label>
    {fileName && <p className="text-sm text-text-2">Selected file: <span className="font-medium text-text">{fileName}</span></p>}
    {message && <p role="status" className="rounded-lg border border-border bg-surface p-3 text-sm text-text-2">{message}</p>}
    <div className="space-y-4">{rows.map((row) => <article key={row.id} className="rounded-xl border border-border bg-surface p-4">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-2">Question {row.rowIndex + 1} · {row.candidate.status}</p>
      <textarea aria-label={`Question ${row.rowIndex + 1}`} value={drafts[row.id] ?? row.candidate.stem} onChange={(event) => setDrafts((all) => ({ ...all, [row.id]: event.target.value }))} rows={3} className="w-full rounded-lg border border-border bg-canvas p-3 text-sm" />
      <div className="mt-3 rounded-lg bg-canvas p-3"><MathText text={drafts[row.id] ?? row.candidate.stem} /></div>
      {row.candidate.warnings?.length ? <p className="mt-2 text-xs text-amber-700">{row.candidate.warnings.join(" ")}</p> : null}
      <div className="mt-3 flex flex-wrap gap-2"><button type="button" onClick={() => saveChanges(row)} disabled={row.candidate.status === "ERROR"} className="min-h-10 rounded-lg border border-border px-3 text-sm font-semibold text-text disabled:opacity-50">Save changes</button><button type="button" onClick={() => accept(row)} disabled={row.candidate.status !== "READY"} className="min-h-10 rounded-lg bg-primary px-3 text-sm font-semibold text-white disabled:opacity-50">{row.candidate.approved ? "Accepted" : "Accept question"}</button></div>
    </article>)}</div>
    {rows.length > 0 && <button type="button" onClick={commit} disabled={busy || !rows.some((row) => row.candidate.approved)} className="min-h-11 rounded-lg border border-border px-4 text-sm font-semibold text-text disabled:opacity-50">Import accepted questions</button>}
  </div>;
}
