"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { archiveExam, getExamPublicationReadiness, publishExam, saveExamDraft } from "@/app/actions/exams";
import { Button } from "@/components/ui/Button";
import { StatusMessage } from "@/components/ui/Status";

type Props = { examId: string; lifecycle: string; draftRevision: number; duration: number | null; instructions: string | null; opensAt: Date | null; closesAt: Date | null; attempts: number; };

export function AssessmentLifecycleControls({ examId, lifecycle, draftRevision, duration, instructions, opensAt, closesAt, attempts }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [blockers, setBlockers] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [revision, setRevision] = useState(draftRevision);
  const [draft, setDraft] = useState({ duration: duration?.toString() ?? "", instructions: instructions ?? "", opensAt: opensAt ? toLocalInput(opensAt) : "", closesAt: closesAt ? toLocalInput(closesAt) : "" });
  const editable = lifecycle === "DRAFT" && attempts === 0;
  const save = () => startTransition(async () => {
    setError(null); setMessage(null);
    try { await saveExamDraft({ examId, expectedDraftRevision: revision, duration: draft.duration ? Number(draft.duration) : null, instructions: draft.instructions || null, opensAt: draft.opensAt || null, closesAt: draft.closesAt || null }); setRevision((value) => value + 1); setMessage("Draft saved."); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Draft save failed."); }
  });
  const publish = () => startTransition(async () => {
    setError(null); setMessage(null);
    try { const result = await publishExam(examId, revision); setMessage(`Published revision ${result.version}.`); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Publication failed."); }
  });
  const checkReadiness = () => startTransition(async () => {
    setError(null); setMessage(null);
    try {
      const result = await getExamPublicationReadiness(examId);
      setBlockers(result.hardBlockers);
      setWarnings(result.warnings);
      setMessage(result.hardBlockers.length ? "Resolve the publication checks before publishing." : "Assessment is ready to publish.");
    } catch (e) { setError(e instanceof Error ? e.message : "Unable to check publication readiness."); }
  });
  const archive = () => startTransition(async () => {
    setError(null); setMessage(null);
    try { await archiveExam(examId); setMessage("Assessment archived."); router.refresh(); }
    catch (e) { setError(e instanceof Error ? e.message : "Archive failed."); }
  });

  return <section className="space-y-4 rounded-xl border border-border bg-surface p-4" aria-labelledby="assessment-lifecycle-heading">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 id="assessment-lifecycle-heading" className="text-sm font-semibold text-text">Lifecycle and publication</h2><p className="mt-1 text-xs text-text-2">Explicit saves protect your work. Published content is immutable.</p></div><span className="rounded-full border border-border px-2.5 py-1 text-xs font-semibold text-text">{lifecycle}</span></div>
    {editable && <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm text-text">Duration (minutes)<input type="number" min="1" value={draft.duration} onChange={(e) => setDraft({ ...draft, duration: e.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-canvas px-3 py-2" /></label><label className="text-sm text-text sm:col-span-2">Instructions<textarea value={draft.instructions} onChange={(e) => setDraft({ ...draft, instructions: e.target.value })} rows={2} className="mt-1 block w-full rounded-lg border border-border bg-canvas px-3 py-2" /></label><label className="text-sm text-text">Opens at<input type="datetime-local" value={draft.opensAt} onChange={(e) => setDraft({ ...draft, opensAt: e.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-canvas px-3 py-2" /></label><label className="text-sm text-text">Closes at<input type="datetime-local" value={draft.closesAt} onChange={(e) => setDraft({ ...draft, closesAt: e.target.value })} className="mt-1 block w-full rounded-lg border border-border bg-canvas px-3 py-2" /></label></div>}
    {(message || error) && <div role={error ? "alert" : "status"}><StatusMessage tone={error ? "error" : "success"}>{error ?? message}</StatusMessage></div>}
    {(blockers.length > 0 || warnings.length > 0) && <div className="space-y-2 rounded-lg border border-border bg-canvas p-3 text-sm" aria-label="Publication readiness findings">
      {blockers.length > 0 && <div><p className="font-semibold text-error">Publication blockers</p><ul className="mt-1 list-disc pl-5 text-text-2">{blockers.map((item) => <li key={item}>{item}</li>)}</ul></div>}
      {warnings.length > 0 && <div><p className="font-semibold text-warning">Warnings</p><ul className="mt-1 list-disc pl-5 text-text-2">{warnings.map((item) => <li key={item}>{item}</li>)}</ul></div>}
    </div>}
    <div className="flex flex-wrap gap-2">{editable && <><Button type="button" variant="secondary" onClick={save} disabled={isPending}>{isPending ? "Saving…" : "Save draft"}</Button><Button type="button" variant="secondary" onClick={checkReadiness} disabled={isPending}>Check readiness</Button><Button type="button" onClick={publish} disabled={isPending}>Publish assessment</Button></>}{lifecycle === "PUBLISHED" && <Button type="button" variant="secondary" onClick={archive} disabled={isPending}>Archive assessment</Button>}</div>
    {!editable && lifecycle === "PUBLISHED" && <p className="text-xs text-text-2">Students have a published version. Questions, marks and timing cannot be changed in place.</p>}
  </section>;
}

function toLocalInput(value: Date) { const d = new Date(value); const pad = (n: number) => String(n).padStart(2, "0"); return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`; }
