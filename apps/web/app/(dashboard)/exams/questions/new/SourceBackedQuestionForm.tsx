"use client";

import { useState } from "react";
import { createSourceBackedQuestionDraft } from "@/app/actions/questions";

type Props = { source: { documentId: string; chunkId: string; excerpt: string; location: string; subject: string; topic: string; classLevel: string } };

export function SourceBackedQuestionForm({ source }: Props) {
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function submit(formData: FormData) {
    setBusy(true); setMessage("");
    try {
      const result = await createSourceBackedQuestionDraft({
        sourceDocumentId: source.documentId, sourceChunkId: source.chunkId,
        subject: String(formData.get("subject") ?? source.subject), classLevel: (String(formData.get("classLevel") ?? source.classLevel) || "SS1") as never,
        topic: String(formData.get("topic") ?? source.topic), examType: "SCHOOL_TEST", difficulty: "BASIC", questionType: String(formData.get("questionType") ?? "SHORT_ANSWER") as never, section: "A", stem: String(formData.get("stem") ?? ""), solution: String(formData.get("solution") ?? ""), explanation: String(formData.get("explanation") ?? ""), optionA: String(formData.get("optionA") ?? "") || undefined, optionB: String(formData.get("optionB") ?? "") || undefined, optionC: String(formData.get("optionC") ?? "") || undefined, optionD: String(formData.get("optionD") ?? "") || undefined,
      });
      setMessage(`Question draft created (${result.questionId}). Review it in Question Bank before approval.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Question could not be created."); }
    finally { setBusy(false); }
  }
  return <form action={submit} className="space-y-4 rounded-xl border border-primary/25 bg-primary-50/20 p-4">
    <div><h2 className="text-base font-semibold text-text">Create from selected source</h2><p className="mt-1 text-sm text-muted">Source evidence is attached; write the question in your own words.</p><p className="mt-2 border-l-2 border-primary/30 pl-3 text-sm whitespace-pre-wrap break-words">{source.location} · {source.excerpt}</p></div>
    <label className="block text-sm font-medium">Question type<select name="questionType" defaultValue="SHORT_ANSWER" className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2"><option>MCQ</option><option>SHORT_ANSWER</option><option>ESSAY</option><option>STRUCTURED</option><option>CALCULATION</option></select></label>
    <label className="block text-sm font-medium">Question<textarea name="stem" required rows={3} className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2" /></label>
    <div className="grid gap-3 sm:grid-cols-2">{["A","B","C","D"].map((letter) => <label key={letter} className="block text-sm">Option {letter}<input name={`option${letter}`} className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2" /></label>)}</div>
    <label className="block text-sm font-medium">Solution<textarea name="solution" required rows={3} className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2" /></label>
    <label className="block text-sm font-medium">Explanation<textarea name="explanation" required rows={3} className="mt-1 block w-full rounded-lg border border-border bg-surface px-3 py-2" /></label>
    <input type="hidden" name="subject" value={source.subject} /><input type="hidden" name="classLevel" value={source.classLevel} /><input type="hidden" name="topic" value={source.topic} />
    <button type="submit" disabled={busy} className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">{busy ? "Saving draft…" : "Save question draft"}</button>
    {message && <p role="status" className="text-sm text-text-2">{message}</p>}
  </form>;
}
