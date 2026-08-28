import Link from "next/link";
import { ArrowRight, ClipboardCheck, GraduationCap, LineChart, Sparkles, Users } from "lucide-react";

const steps = [
  { label: "Teach", text: "Prepare lessons and learning experiences with curriculum-aware AI assistance.", icon: GraduationCap },
  { label: "Organise", text: "Keep classes, students, attendance and records in one dependable workspace.", icon: Users },
  { label: "Assess", text: "Reuse reviewed questions, build assessments and preserve what students were given.", icon: ClipboardCheck },
  { label: "Understand", text: "Bring scores and classroom evidence together so progress is easier to see.", icon: LineChart },
  { label: "Improve", text: "Give students clearer practice and feedback, guided by the teacher who knows them.", icon: Sparkles },
];

export function WorkflowStorySection() {
  return (
    <section id="workflow" className="landing-section px-6 py-24 lg:px-12" aria-labelledby="workflow-title">
      <div className="mx-auto max-w-7xl">
        <div className="max-w-2xl">
          <p className="mb-4 text-xs font-bold uppercase tracking-[0.18em] text-blue-300">One connected classroom loop</p>
          <h2 id="workflow-title" className="text-3xl font-bold tracking-tight text-white sm:text-5xl">From the next lesson to the next breakthrough.</h2>
          <p className="mt-5 text-base leading-7 text-slate-300 sm:text-lg">TeachNexis connects the practical work of teaching with the evidence that helps every learner move forward.</p>
        </div>

        <ol className="mt-12 grid gap-3 md:grid-cols-5" aria-label="TeachNexis teaching and learning workflow">
          {steps.map(({ label, text, icon: Icon }, index) => (
            <li key={label} className="relative rounded-2xl border border-white/10 bg-white/[0.045] p-5">
              <div className="mb-7 flex items-center justify-between">
                <span className="text-xs font-bold tracking-[0.16em] text-slate-500">0{index + 1}</span>
                <Icon aria-hidden="true" size={19} className="text-blue-300" />
              </div>
              <h3 className="text-lg font-semibold text-white">{label}</h3>
              <p className="mt-2 text-sm leading-6 text-slate-400">{text}</p>
              {index < steps.length - 1 && <ArrowRight aria-hidden="true" className="absolute -right-3 top-1/2 z-10 hidden -translate-y-1/2 text-slate-600 md:block" size={18} />}
            </li>
          ))}
        </ol>

        <div className="mt-8">
          <Link href="/sign-up" className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-blue-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-blue-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950">
            Start with your classroom <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </div>
      </div>
    </section>
  );
}
