import Link from "next/link";
import { CheckCircle2, Circle, ArrowRight, ChevronRight } from "lucide-react";

const SETUP_STEPS = [
  {
    id: "class",
    label: "Create a class",
    desc: "Add your first class — e.g. SS2A, JSS3B, SS1 Science",
    href: "/classes",
    icon: "🏫",
    tip: "Classes are the foundation. Every student, lesson, and exam belongs to a class.",
  },
  {
    id: "student",
    label: "Add students",
    desc: "Register students by name, gender, and admission number",
    href: "/student-hub",
    icon: "👩‍🎓",
    tip: "Add students to your class before taking attendance or entering scores.",
  },
  {
    id: "lesson",
    label: "Generate your first lesson note",
    desc: "Pick a subject and topic — AI generates a full 8-section lesson in 10 seconds",
    href: "/lessons/new",
    icon: "📝",
    tip: "No need to type everything. TeachNexis writes the full lesson aligned to NERDC and WAEC.",
  },
  {
    id: "exam",
    label: "Build or generate an exam",
    desc: "Use AI generation or the manual builder to create your exam questions",
    href: "/exams",
    icon: "📋",
    tip: "AI exams: choose subject, class, topic and click Generate. Manual: type questions and mark correct answers.",
  },
  {
    id: "score",
    label: "Enter student scores",
    desc: "Record CA scores — grades calculate automatically using Nigerian grading scale",
    href: "/scores",
    icon: "📊",
    tip: "Scores feed into report cards and analytics. Enter them after each assessment.",
  },
];

export function WorkflowSetupCard({
  classCount,
  studentCount,
  lessonCount,
  examCount,
  scoreCount,
}: {
  classCount: number;
  studentCount: number;
  lessonCount: number;
  examCount: number;
  scoreCount: number;
}) {
  const stepStatus = [
    classCount > 0,
    studentCount > 0,
    lessonCount > 0,
    examCount > 0,
    scoreCount > 0,
  ];

  const doneCount = stepStatus.filter(Boolean).length;

  if (doneCount === SETUP_STEPS.length) return null;

  const nextIdx = stepStatus.findIndex((s) => !s);
  const nextStep = SETUP_STEPS[nextIdx];

  return (
    <div className="bg-surface border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-black uppercase tracking-widest text-muted mb-0.5">
            Getting Started
          </p>
          <h3 className="font-bold text-text text-sm">
            Set up your school — recommended order
          </h3>
        </div>
        <div className="text-right shrink-0">
          <div className="text-2xl font-black text-primary leading-none">{doneCount}/{SETUP_STEPS.length}</div>
          <p className="text-[10px] text-muted">steps done</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-border">
        <div
          className="h-full bg-primary transition-all duration-700 ease-out"
          style={{ width: `${(doneCount / SETUP_STEPS.length) * 100}%` }}
        />
      </div>

      {/* Steps list */}
      <div className="divide-y divide-border">
        {SETUP_STEPS.map((step, i) => {
          const done = stepStatus[i];
          const isNext = i === nextIdx;
          const isPending = !done && !isNext;

          return (
            <Link
              key={step.id}
              href={done ? "#" : step.href}
              className={`flex items-center gap-4 px-5 py-3.5 transition-colors group ${
                done
                  ? "opacity-50 pointer-events-none"
                  : isNext
                  ? "bg-primary/[0.03] hover:bg-primary/[0.06] cursor-pointer"
                  : "opacity-60 hover:bg-bg/50 cursor-default"
              }`}
            >
              {/* Step number or check */}
              <div className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-black border-2 transition-colors ${
                done
                  ? "bg-success border-success text-white"
                  : isNext
                  ? "bg-primary border-primary text-white"
                  : "bg-bg border-border text-muted"
              }`}>
                {done ? "✓" : i + 1}
              </div>

              {/* Text */}
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-semibold leading-snug ${
                  done ? "line-through text-muted" : isNext ? "text-primary" : "text-text-2"
                }`}>
                  {step.icon} {step.label}
                </p>
                {!done && (
                  <p className="text-xs text-muted mt-0.5 leading-snug truncate">{step.desc}</p>
                )}
              </div>

              {/* Arrow or check */}
              {done
                ? <CheckCircle2 size={16} className="text-success shrink-0" />
                : isNext
                ? <ChevronRight size={16} className="text-primary shrink-0 group-hover:translate-x-0.5 transition-transform" />
                : <Circle size={14} className="text-border shrink-0" />
              }
            </Link>
          );
        })}
      </div>

      {/* Next action CTA */}
      {nextStep && (
        <div className="px-5 py-4 border-t border-border bg-primary/[0.03] flex items-start gap-4">
          <div className="flex-1 min-w-0">
            <p className="text-xs text-muted mb-0.5">Up next:</p>
            <p className="text-sm font-bold text-text">{nextStep.icon} {nextStep.label}</p>
            <p className="text-xs text-muted mt-0.5 leading-relaxed">{nextStep.tip}</p>
          </div>
          <Link
            href={nextStep.href}
            className="shrink-0 inline-flex items-center gap-2 bg-primary text-white text-xs font-bold px-4 py-2.5 rounded-lg hover:bg-primary/90 transition-colors"
          >
            Go <ArrowRight size={13} />
          </Link>
        </div>
      )}
    </div>
  );
}
