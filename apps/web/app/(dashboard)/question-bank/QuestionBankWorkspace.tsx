"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Eye, Library, Plus, X } from "lucide-react";
import { addQuestionsToAssessment } from "@/app/actions/question-bank";
import { Button } from "@/components/ui/Button";
import { FormField, Input, Select, fieldAria } from "@/components/ui/FormField";
import { Drawer } from "@/components/ui/Overlay";
import { EmptyState } from "@/components/ui/States";
import { StatusBadge, StatusMessage } from "@/components/ui/Status";
import { MathText } from "@/components/ui/MathText";

type BankQuestion = {
  id: string;
  stem: string;
  optionA: string | null;
  optionB: string | null;
  optionC: string | null;
  optionD: string | null;
  optionE: string | null;
  correctOption: string | null;
  solution: string;
  explanation: string;
  type: string;
  lifecycle: string;
  visibility: string;
  defaultMarks: number | null;
  difficulty: string | null;
  subject: string | null;
  topic: string | null;
  classLevel: string | null;
  latestVersion: number | null;
  usageCount: number;
  selectable: boolean;
};

type EditableAssessment = {
  id: string;
  title: string;
  subject: string;
  topic: string;
  classLevel: string;
  _count: { assessmentItems: number; questions: number };
};

export function QuestionBankWorkspace({
  questions,
  assessments,
  hasMore,
  destinationAssessmentId,
}: {
  questions: BankQuestion[];
  assessments: EditableAssessment[];
  hasMore: boolean;
  destinationAssessmentId: string | null;
}) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [assessmentId, setAssessmentId] = useState(destinationAssessmentId ?? assessments[0]?.id ?? "");
  const [marks, setMarks] = useState<Record<string, string>>({});
  const [addOpen, setAddOpen] = useState(false);
  const [preview, setPreview] = useState<BankQuestion | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<{ tone: "success" | "error"; message: string } | null>(null);

  const selected = useMemo(
    () => selectedIds.map((id) => questions.find((question) => question.id === id)).filter(Boolean) as BankQuestion[],
    [questions, selectedIds],
  );

  function toggle(questionId: string) {
    setSelectedIds((current) =>
      current.includes(questionId)
        ? current.filter((id) => id !== questionId)
        : [...current, questionId],
    );
    setFeedback(null);
  }

  function clearSelection() {
    setSelectedIds([]);
    setMarks({});
  }

  async function submitSelection() {
    if (!assessmentId || selected.length === 0) return;
    const parsedMarks = selected.map((question) => {
      const raw = marks[question.id]?.trim();
      return {
        questionId: question.id,
        marks: raw ? Number(raw) : undefined,
      };
    });
    if (parsedMarks.some(({ marks: value }) => value !== undefined && (!Number.isFinite(value) || value <= 0))) {
      setFeedback({ tone: "error", message: "Marks must be positive numbers." });
      return;
    }

    setSubmitting(true);
    setFeedback(null);
    const result = await addQuestionsToAssessment({ assessmentId, questions: parsedMarks });
    setSubmitting(false);
    if (!result.ok) {
      setFeedback({ tone: "error", message: result.error });
      return;
    }

    const addedText = `${result.added} question${result.added === 1 ? "" : "s"} added to ${result.assessmentTitle}.`;
    const skippedText = result.skipped > 0
      ? ` ${result.skipped} ${result.skipped === 1 ? "was" : "were"} already included.`
      : "";
    setFeedback({ tone: "success", message: `${addedText}${skippedText}` });
    clearSelection();
    setAddOpen(false);
    router.refresh();
  }

  if (questions.length === 0) {
    return (
      <EmptyState
        icon={<Library size={36} />}
        title="No reusable questions are available yet"
        description="Create a question, review it, and approve a reusable version before adding it to an assessment."
      />
    );
  }

  return (
    <div className="space-y-4">
      {feedback && <StatusMessage tone={feedback.tone}>{feedback.message}</StatusMessage>}
      {hasMore && (
        <StatusMessage tone="info">
          Showing the 50 most recent accessible questions. Server search and pagination are planned for a later phase.
        </StatusMessage>
      )}

      <div className="flex items-center justify-between gap-3 text-sm text-text-2">
        <p>{questions.length} reusable question{questions.length === 1 ? "" : "s"}</p>
        <p aria-live="polite">{selected.length} selected</p>
      </div>

      <div className="grid gap-3" role="list" aria-label="Reusable questions">
        {questions.map((question) => {
          const selectedQuestion = selectedIds.includes(question.id);
          const unavailableReason = question.lifecycle !== "APPROVED"
            ? `Status: ${question.lifecycle.toLowerCase()}`
            : question.latestVersion === null
              ? "Reusable version required"
              : null;
          return (
            <article
              key={question.id}
              role="listitem"
              className={`rounded-xl border bg-surface p-4 transition-colors ${selectedQuestion ? "border-primary ring-1 ring-primary/20" : "border-border"}`}
            >
              <div className="flex items-start gap-3">
                <input
                  id={`question-${question.id}`}
                  type="checkbox"
                  checked={selectedQuestion}
                  disabled={!question.selectable}
                  onChange={() => toggle(question.id)}
                  aria-describedby={unavailableReason ? `question-${question.id}-state` : undefined}
                  className="mt-1 size-5 shrink-0 rounded border-border text-primary focus-visible:ring-2 focus-visible:ring-primary disabled:cursor-not-allowed"
                />
                <label htmlFor={`question-${question.id}`} className="min-w-0 flex-1 cursor-pointer">
                  <span className="block text-sm font-semibold leading-6 text-text"><MathText text={question.stem} /></span>
                  <span className="mt-2 flex flex-wrap gap-1.5">
                    <StatusBadge>{question.type.replaceAll("_", " ")}</StatusBadge>
                    <StatusBadge tone={question.lifecycle === "APPROVED" ? "success" : "pending"}>{question.lifecycle}</StatusBadge>
                    {question.subject && <StatusBadge>{question.subject}</StatusBadge>}
                    {question.topic && <StatusBadge>{question.topic}</StatusBadge>}
                    {question.defaultMarks != null && <StatusBadge>{question.defaultMarks} marks</StatusBadge>}
                    <StatusBadge>{question.usageCount} use{question.usageCount === 1 ? "" : "s"}</StatusBadge>
                  </span>
                  {unavailableReason && <span id={`question-${question.id}-state`} className="mt-2 block text-xs text-warning">{unavailableReason}</span>}
                </label>
                <Button variant="quiet" size="sm" onClick={() => setPreview(question)} aria-label={`Preview question: ${question.stem}`}>
                  <Eye size={16} aria-hidden="true" />
                  <span className="hidden sm:inline">Preview</span>
                </Button>
              </div>
            </article>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div className="sticky bottom-4 z-20 flex flex-col gap-3 rounded-xl border border-primary/25 bg-surface p-3 shadow-[var(--shadow-overlay)] sm:flex-row sm:items-center sm:justify-between" role="region" aria-label="Question selection actions">
          <p className="text-sm font-semibold text-text">{selected.length} question{selected.length === 1 ? "" : "s"} selected</p>
          <div className="flex gap-2">
            <Button variant="quiet" onClick={clearSelection} className="flex-1 sm:flex-none"><X size={16} /> Clear selection</Button>
            <Button onClick={() => setAddOpen(true)} disabled={assessments.length === 0} className="flex-1 sm:flex-none"><Plus size={16} /> Add to Assessment</Button>
          </div>
        </div>
      )}

      {selected.length > 0 && assessments.length === 0 && (
        <StatusMessage tone="warning">You don&apos;t have an editable assessment yet. Assessments with attempts cannot be changed.</StatusMessage>
      )}

      <Drawer
        open={addOpen}
        onClose={() => !submitting && setAddOpen(false)}
        title="Add to Assessment"
        description="Choose an editable assessment and confirm assessment-specific marks. Questions append in the selected order."
      >
        <div className="space-y-5">
          <FormField id="assessment-destination" label="Assessment" required>
            <Select id="assessment-destination" value={assessmentId} onChange={(event) => setAssessmentId(event.target.value)} required>
              <option value="">Select an assessment</option>
              {assessments.map((assessment) => (
                <option key={assessment.id} value={assessment.id}>{assessment.title} · {assessment.classLevel}</option>
              ))}
            </Select>
          </FormField>

          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-text">Selected questions</h3>
            {selected.map((question, index) => {
              const fieldId = `marks-${question.id}`;
              return (
                <div key={question.id} className="rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold text-muted">Append position {index + 1}</p>
                  <p className="mt-1 line-clamp-2 text-sm text-text"><MathText text={question.stem} /></p>
                  <FormField id={fieldId} label="Marks" description={question.defaultMarks != null ? `Question default: ${question.defaultMarks}` : "Leave blank to use the question default."} className="mt-3">
                    <Input
                      id={fieldId}
                      type="number"
                      min="0.1"
                      max="1000"
                      step="0.5"
                      value={marks[question.id] ?? ""}
                      placeholder={question.defaultMarks?.toString() ?? "Default"}
                      onChange={(event) => setMarks((current) => ({ ...current, [question.id]: event.target.value }))}
                      {...fieldAria(fieldId, { description: true })}
                    />
                  </FormField>
                </div>
              );
            })}
          </div>

          {feedback?.tone === "error" && <StatusMessage tone="error">{feedback.message}</StatusMessage>}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setAddOpen(false)} disabled={submitting}>Cancel</Button>
            <Button onClick={submitSelection} disabled={submitting || !assessmentId}>
              {submitting ? "Adding questions…" : `Add ${selected.length} question${selected.length === 1 ? "" : "s"}`}
            </Button>
          </div>
        </div>
      </Drawer>

      <Drawer
        open={Boolean(preview)}
        onClose={() => setPreview(null)}
        title="Question Preview"
        description="Review the pinned educational content before selecting it."
      >
        {preview && <QuestionPreview question={preview} />}
      </Drawer>
    </div>
  );
}

function QuestionPreview({ question }: { question: BankQuestion }) {
  const options = ["A", "B", "C", "D", "E"].map((key) => ({
    key,
    value: question[`option${key}` as keyof BankQuestion] as string | null,
  })).filter(({ value }) => value);
  return (
    <div className="space-y-5">
      <section aria-labelledby="preview-question">
        <h3 id="preview-question" className="text-xs font-bold uppercase tracking-wide text-muted">Question</h3>
        <p className="mt-2 leading-7 text-text"><MathText text={question.stem} /></p>
        {options.length > 0 && (
          <ol className="mt-3 space-y-2" aria-label="Answer options">
            {options.map(({ key, value }) => (
                <li key={key} className="flex gap-2 rounded-lg border border-border px-3 py-2 text-sm">
                <span className="font-semibold">{key}.</span><MathText text={value!} />
                {question.correctOption === key && <span className="ml-auto inline-flex items-center gap-1 font-semibold text-success"><Check size={14} /> Correct answer</span>}
              </li>
            ))}
          </ol>
        )}
      </section>
      <section aria-labelledby="preview-answer">
        <h3 id="preview-answer" className="text-xs font-bold uppercase tracking-wide text-muted">Answer and solution</h3>
        <p className="mt-2 text-sm text-text"><MathText text={question.solution || "No solution recorded."} /></p>
      </section>
      {question.explanation && (
        <section aria-labelledby="preview-explanation">
          <h3 id="preview-explanation" className="text-xs font-bold uppercase tracking-wide text-muted">Explanation</h3>
        <p className="mt-2 text-sm leading-6 text-text-2"><MathText text={question.explanation} /></p>
        </section>
      )}
      <StatusMessage tone="info" title="Reusable version">Version {question.latestVersion ?? "unavailable"} will be pinned when this question is added.</StatusMessage>
    </div>
  );
}
