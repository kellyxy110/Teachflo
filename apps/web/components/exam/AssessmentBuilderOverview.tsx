import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, FileQuestion, Gauge, Timer } from "lucide-react";
import { StatusBadge, StatusMessage } from "@/components/ui/Status";
import { WorkflowStepper } from "@/components/ui/WorkflowStepper";

type AssessmentBuilderOverviewProps = {
  questionCount: number;
  reusableQuestionCount: number;
  knownMarks: number;
  unknownMarksCount: number;
  answeredQuestionCount: number;
  duration: number | null;
  attemptCount: number;
};

const steps = [
  { id: "details", label: "Details" },
  { id: "questions", label: "Questions" },
  { id: "settings", label: "Settings" },
  { id: "review", label: "Review" },
];

export function AssessmentBuilderOverview({
  questionCount,
  reusableQuestionCount,
  knownMarks,
  unknownMarksCount,
  answeredQuestionCount,
  duration,
  attemptCount,
}: AssessmentBuilderOverviewProps) {
  const editable = attemptCount === 0;
  const completed = ["details"];
  if (questionCount > 0) completed.push("questions");
  if (duration && duration > 0) completed.push("settings");

  const checks = [
    {
      label: "Questions added",
      detail: questionCount > 0 ? `${questionCount} available for review` : "Add at least one question",
      pass: questionCount > 0,
    },
    {
      label: "Marks recorded",
      detail: unknownMarksCount === 0 && questionCount > 0
        ? `${knownMarks} total marks`
        : `${unknownMarksCount} question${unknownMarksCount === 1 ? "" : "s"} without numeric marks`,
      pass: unknownMarksCount === 0 && questionCount > 0,
    },
    {
      label: "Answer evidence",
      detail: questionCount > 0
        ? `${answeredQuestionCount} of ${questionCount} questions include an answer or solution`
        : "No questions to validate",
      pass: questionCount > 0 && answeredQuestionCount === questionCount,
    },
    {
      label: "Duration",
      detail: duration && duration > 0 ? `${duration} minutes` : "No duration recorded",
      pass: Boolean(duration && duration > 0),
    },
  ];

  return (
    <section className="space-y-4" aria-labelledby="assessment-workflow-heading">
      <div>
        <h2 id="assessment-workflow-heading" className="sr-only">Assessment builder progress</h2>
        <WorkflowStepper
          steps={steps}
          currentStep="review"
          completedStepIds={completed}
          label="Assessment builder stages"
        />
      </div>

      {!editable && (
        <StatusMessage tone="warning" title="Assessment content locked">
          A student attempt has started. Question Bank additions and other content changes are unavailable so historical attempts remain trustworthy.
        </StatusMessage>
      )}

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric icon={<FileQuestion size={17} />} label="Questions" value={String(questionCount)} />
          <Metric icon={<Gauge size={17} />} label="Known marks" value={questionCount > 0 ? String(knownMarks) : "—"} />
          <Metric icon={<Timer size={17} />} label="Duration" value={duration ? `${duration} min` : "Not set"} />
          <Metric icon={<Clock3 size={17} />} label="Attempts" value={String(attemptCount)} />
        </div>

        <aside className="rounded-xl border border-border bg-surface p-4" aria-labelledby="readiness-heading">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 id="readiness-heading" className="text-sm font-semibold text-text">Review checks</h3>
            <StatusBadge tone={editable ? "pending" : "warning"}>{editable ? "Editable" : "Locked"}</StatusBadge>
          </div>
          <ul className="mt-3 space-y-3">
            {checks.map((check) => (
              <li key={check.label} className="flex items-start gap-2 text-sm">
                {check.pass
                  ? <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-success" aria-hidden="true" />
                  : <AlertTriangle size={16} className="mt-0.5 shrink-0 text-warning" aria-hidden="true" />}
                <div>
                  <p className="font-medium text-text">{check.label}</p>
                  <p className="text-xs leading-5 text-text-2">{check.detail}</p>
                </div>
              </li>
            ))}
          </ul>
          {reusableQuestionCount > 0 && (
            <p className="mt-3 border-t border-border pt-3 text-xs text-text-2">
              {reusableQuestionCount} question{reusableQuestionCount === 1 ? "" : "s"} pinned from the reusable Question Bank.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-border bg-surface p-3">
      <div className="flex items-center gap-2 text-text-2">
        <span className="text-primary" aria-hidden="true">{icon}</span>
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="mt-2 text-lg font-bold text-text">{value}</p>
    </div>
  );
}
