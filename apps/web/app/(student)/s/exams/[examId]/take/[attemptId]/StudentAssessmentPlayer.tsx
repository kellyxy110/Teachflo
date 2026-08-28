"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { savePublishedResponse, submitPublishedAssessment } from "@/app/actions/student-assessments";
import { StatusMessage } from "@/components/ui/Status";
import { MathText } from "@/components/ui/MathText";
import { StemMathEditor } from "@/components/exam/StemMathEditor";

type Item = { id: string; questionId: string; order: number; type: string; stem: string; optionA: string | null; optionB: string | null; optionC: string | null; optionD: string | null; marks: number; response: { selectedOption: string | null; textResponse: string | null } | null };
type Delivery = { attempt: { id: string; status: string; startedAt: Date; deadlineAt: Date | null; submittedAt: Date | null }; publication: { title: string; instructions: string | null; duration: number | null; resultReleasePolicy: string; answerReleasePolicy: string }; items: Item[] };

export function StudentAssessmentPlayer({ delivery }: { delivery: Delivery }) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, { selectedOption?: string; textResponse?: string }>>(() => Object.fromEntries(delivery.items.map((item) => [item.id, { selectedOption: item.response?.selectedOption ?? undefined, textResponse: item.response?.textResponse ?? "" }])));
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [remaining, setRemaining] = useState(() => remainingSeconds(delivery.attempt.deadlineAt));
  const [isPending, startTransition] = useTransition();
  const [submitted, setSubmitted] = useState(delivery.attempt.status !== "IN_PROGRESS");
  const expirySubmitted = useRef(false);
  const item = delivery.items[index];
  const answeredCount = useMemo(() => delivery.items.filter((candidate) => Boolean(answers[candidate.id]?.selectedOption || answers[candidate.id]?.textResponse?.trim())).length, [answers, delivery.items]);

  useEffect(() => { const timer = window.setInterval(() => setRemaining(remainingSeconds(delivery.attempt.deadlineAt)), 1000); return () => window.clearInterval(timer); }, [delivery.attempt.deadlineAt]);
  const expired = remaining !== null && remaining <= 0;
  const current = answers[item.id] ?? {};

  useEffect(() => {
    if (!expired || submitted || expirySubmitted.current) return;
    expirySubmitted.current = true;
    setError(null);
    startTransition(async () => {
      try {
        await submitPublishedAssessment(delivery.attempt.id);
        setSubmitted(true);
        setStatus("Assessment submitted automatically");
        router.refresh();
      } catch (e) {
        expirySubmitted.current = false;
        setError(e instanceof Error ? e.message : "Unable to submit the expired assessment.");
      }
    });
  }, [delivery.attempt.id, expired, router, startTransition, submitted]);

  function save() {
    setError(null); setStatus(null);
    startTransition(async () => {
      try { await savePublishedResponse({ attemptId: delivery.attempt.id, publicationItemId: item.id, selectedOption: current.selectedOption ?? null, textResponse: current.textResponse ?? null }); setStatus("Saved"); }
      catch (e) { setError(e instanceof Error ? e.message : "Unable to save progress."); }
    });
  }
  function submit() {
    if (!window.confirm(`Submit this assessment with ${delivery.items.length - answeredCount} unanswered question${delivery.items.length - answeredCount === 1 ? "" : "s"}? You cannot edit after submitting.`)) return;
    setError(null); setStatus(null);
    startTransition(async () => {
      try { await submitPublishedAssessment(delivery.attempt.id); setSubmitted(true); setStatus("Assessment submitted"); router.refresh(); }
      catch (e) { setError(e instanceof Error ? e.message : "Unable to submit assessment."); }
    });
  }

  if (!item) return <StatusMessage tone="error">No published questions are available for this attempt.</StatusMessage>;
  return <div className="mx-auto max-w-3xl space-y-5">
    <header className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-wide text-primary">Assessment</p><h1 className="mt-1 text-2xl font-bold text-text">{delivery.publication.title}</h1><p className="mt-1 text-sm text-text-2">Question {index + 1} of {delivery.items.length} · {answeredCount} answered</p></div><div className="rounded-lg border border-border bg-surface px-3 py-2 text-right" aria-live="polite"><p className="text-xs text-text-2">Time remaining</p><p className="font-mono text-lg font-bold text-text">{formatRemaining(remaining)}</p></div></header>
    <div className="h-2 overflow-hidden rounded-full bg-border"><div className="h-full bg-primary transition-[width] motion-reduce:transition-none" style={{ width: `${((index + 1) / delivery.items.length) * 100}%` }} /></div>
    {expired && submitted && <StatusMessage tone="warning" title="Attempt submitted automatically">The time limit ended. Your saved progress was submitted by the assessment server.</StatusMessage>}
    {expired && !submitted && <StatusMessage tone="warning" title="Attempt expired">Your saved progress is preserved. Refreshing will finalise this attempt.</StatusMessage>}
    {(status || error) && <StatusMessage tone={error ? "error" : "success"}>{error ?? status}</StatusMessage>}
    <section className="rounded-xl border border-border bg-surface p-5 sm:p-7" aria-labelledby="question-heading"><div className="flex items-start justify-between gap-3"><h2 id="question-heading" className="text-lg font-semibold leading-7 text-text"><MathText text={item.stem} /></h2><span className="shrink-0 text-xs font-semibold text-text-2">{item.marks} marks</span></div>
      {item.type === "MCQ" && <fieldset className="mt-6 space-y-3"><legend className="sr-only">Choose an answer</legend>{(["A", "B", "C", "D"] as const).map((key) => { const text = item[`option${key}` as "optionA" | "optionB" | "optionC" | "optionD"]; if (!text) return null; return <label key={key} className="flex min-h-12 cursor-pointer items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm hover:border-primary/50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-primary"><input type="radio" name={`question-${item.id}`} value={key} checked={current.selectedOption === key} onChange={() => setAnswers((all) => ({ ...all, [item.id]: { ...all[item.id], selectedOption: key } }))} disabled={submitted || expired} className="size-4" /><span className="font-semibold">{key}.</span><MathText text={text} /></label>; })}</fieldset>}
      {item.type !== "MCQ" && <div className="mt-6"><StemMathEditor id={`response-${item.id}`} label="Your answer" value={current.textResponse ?? ""} onChange={(textResponse) => setAnswers((all) => ({ ...all, [item.id]: { ...all[item.id], textResponse } }))} disabled={submitted || expired} rows={item.type === "STRUCTURED" || item.type === "CALCULATION" ? 10 : 6} /></div>}
    </section>
    <section aria-label="Question navigator" className="rounded-xl border border-border bg-surface p-3">
      <div className="flex flex-wrap gap-2">
        {delivery.items.map((candidate, candidateIndex) => {
          const answered = Boolean(answers[candidate.id]?.selectedOption || answers[candidate.id]?.textResponse?.trim());
          return <button key={candidate.id} type="button" onClick={() => setIndex(candidateIndex)} aria-label={`Question ${candidateIndex + 1}${answered ? ", answered" : ", unanswered"}`} aria-current={candidateIndex === index ? "step" : undefined} className={`min-h-10 min-w-10 rounded-lg border px-3 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary ${candidateIndex === index ? "border-primary bg-primary text-white" : answered ? "border-success/50 bg-success/10 text-text" : "border-border text-text-2"}`}>
            {candidateIndex + 1}
          </button>;
        })}
      </div>
    </section>
    <nav className="flex flex-wrap items-center justify-between gap-2" aria-label="Question navigation"><button type="button" onClick={() => setIndex((value) => Math.max(0, value - 1))} disabled={index === 0 || isPending} className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold disabled:opacity-50">Previous</button><button type="button" onClick={save} disabled={submitted || expired || isPending} className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold disabled:opacity-50">{isPending ? "Saving…" : "Save progress"}</button><div className="flex gap-2"><button type="button" onClick={() => setIndex((value) => Math.min(delivery.items.length - 1, value + 1))} disabled={index === delivery.items.length - 1 || isPending} className="min-h-10 rounded-lg border border-border px-4 text-sm font-semibold disabled:opacity-50">Next</button><button type="button" onClick={submit} disabled={submitted || expired || isPending} className="min-h-10 rounded-lg bg-primary px-4 text-sm font-semibold text-white disabled:opacity-50">Submit</button></div></nav>
  </div>;
}

function remainingSeconds(deadline: Date | string | null) { return deadline ? Math.max(0, Math.floor((new Date(deadline).getTime() - Date.now()) / 1000)) : null; }
function formatRemaining(seconds: number | null) { if (seconds === null) return "—"; return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`; }
