import { Check } from "lucide-react";
import { cn } from "./cn";

export type WorkflowStep = { id: string; label: string; shortLabel?: string };

export function WorkflowStepper({ steps, currentStep, completedStepIds = [], label = "Workflow progress" }: { steps: WorkflowStep[]; currentStep: string; completedStepIds?: string[]; label?: string }) {
  return (
    <nav aria-label={label} className="tnx-scrollbar overflow-x-auto pb-1">
      <ol className="flex min-w-max items-center gap-1" role="list">
        {steps.map((step, index) => {
          const complete = completedStepIds.includes(step.id);
          const current = currentStep === step.id;
          return (
            <li key={step.id} className="flex items-center" aria-current={current ? "step" : undefined}>
              {index > 0 && <span className={cn("mx-1 h-px w-4 sm:w-7", complete || current ? "bg-primary" : "bg-border")} aria-hidden="true" />}
              <span className={cn("inline-flex min-h-9 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold", current && "border-primary bg-primary text-white", complete && !current && "border-success/30 bg-success-50 text-green-800 dark:text-green-300", !current && !complete && "border-border bg-surface text-text-2")}>
                <span className="inline-flex size-5 items-center justify-center rounded-full border border-current/30" aria-hidden="true">{complete && !current ? <Check size={12} /> : index + 1}</span>
                <span className="sm:hidden">{step.shortLabel ?? step.label}</span>
                <span className="hidden sm:inline">{step.label}</span>
              </span>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
