"use client";

import { useState, useEffect } from "react";
import { X, ArrowRight, ArrowLeft, Rocket, BookOpen, LayoutDashboard, Brain, FlaskConical, CheckCircle } from "lucide-react";

const WIZARD_KEY = "tf_onboarding_v1";

interface Step {
  icon: React.ReactNode;
  label: string;
  title: string;
  subtitle: string;
  body: React.ReactNode;
}

const steps: Step[] = [
  {
    icon: <Rocket size={28} className="text-primary" />,
    label: "Welcome",
    title: "Welcome to TeachFlow OS",
    subtitle: "The AI Learning Operating System built for Nigerian secondary schools",
    body: (
      <div className="space-y-3">
        <p className="text-sm text-text-2 leading-relaxed">
          TeachFlow OS is designed to give every Nigerian teacher superpowers — generating
          complete lesson notes in 10 seconds, building WAEC-ready exam papers, and
          tracking every student's learning journey automatically.
        </p>
        <div className="grid grid-cols-3 gap-3 mt-4">
          {[
            { emoji: "🧠", label: "AI-Powered", desc: "7 free AI models" },
            { emoji: "📚", label: "Curriculum-Aligned", desc: "WAEC · JAMB · JUPEB" },
            { emoji: "🇳🇬", label: "Built for Nigeria", desc: "JSS1 to SS3" },
          ].map(({ emoji, label, desc }) => (
            <div key={label} className="bg-bg rounded-xl p-3 text-center border border-border">
              <div className="text-2xl mb-1">{emoji}</div>
              <p className="text-xs font-bold text-text">{label}</p>
              <p className="text-[10px] text-muted mt-0.5">{desc}</p>
            </div>
          ))}
        </div>
        <div className="mt-4 p-3 bg-primary/5 border border-primary/20 rounded-xl">
          <p className="text-xs text-text-2">
            <span className="font-semibold text-primary">You are a Pioneer Educator.</span>{" "}
            Your feedback during this beta phase will directly shape TeachFlow's future. Thank you for being here.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: <BookOpen size={28} className="text-amber-500" />,
    label: "Teaching Tools",
    title: "Your Teaching Superpowers",
    subtitle: "AI tools that save 10+ hours every week",
    body: (
      <div className="space-y-3">
        {[
          {
            emoji: "📝",
            name: "AI Lesson Generator",
            desc: "Generate complete, classroom-ready lesson notes for any subject and topic in under 10 seconds. Supports single periods, double periods, and multi-period sequences. Fully aligned with WAEC and the Nigerian national curriculum.",
            link: "/lessons/new",
          },
          {
            emoji: "📋",
            name: "Smart Exam Builder",
            desc: "Create complete examination papers with MCQ, theory, and advanced questions. Each question comes with model answers, mark schemes, and distractor analysis. Supports WAEC Mock, JAMB Prep, and school exams.",
            link: "/exams/new",
          },
          {
            emoji: "🤖",
            name: "Study Buddy AI Tutor",
            desc: "A personal AI tutor for each student. Explains concepts, tests understanding, gives hints, and tracks mistakes. Adapts to what each student struggles with.",
            link: "/study-buddy",
          },
        ].map(({ emoji, name, desc }) => (
          <div key={name} className="flex gap-3 p-3 bg-bg rounded-xl border border-border">
            <div className="text-xl shrink-0">{emoji}</div>
            <div>
              <p className="text-sm font-semibold text-text">{name}</p>
              <p className="text-xs text-text-2 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: <LayoutDashboard size={28} className="text-green-500" />,
    label: "School Tools",
    title: "School Management Made Simple",
    subtitle: "Everything you need to run your school — in one place",
    body: (
      <div className="space-y-3">
        {[
          { emoji: "🏫", name: "Classes", desc: "Create and organise JSS1–SS3 classes. Each class gets its own student list, scores, homework, and analytics." },
          { emoji: "👩‍🎓", name: "Students", desc: "Register and manage student profiles. Track each student's academic journey from enrolment to graduation." },
          { emoji: "📊", name: "Scores & Grades", desc: "Enter class scores quickly and view automatic grade calculations using the Nigerian grading scale (A–F)." },
          { emoji: "📌", name: "Homework", desc: "Create and track homework assignments. Set due dates and monitor completion across all classes." },
        ].map(({ emoji, name, desc }) => (
          <div key={name} className="flex gap-3 p-3 bg-bg rounded-xl border border-border">
            <div className="text-xl shrink-0 mt-0.5">{emoji}</div>
            <div>
              <p className="text-sm font-semibold text-text">{name}</p>
              <p className="text-xs text-text-2 mt-0.5">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: <Brain size={28} className="text-purple-500" />,
    label: "AI Intelligence",
    title: "AI That Understands Your Students",
    subtitle: "Not just data — actionable intelligence",
    body: (
      <div className="space-y-3">
        {[
          {
            emoji: "📈",
            name: "Analytics Dashboard",
            desc: "See your school's performance at a glance. Which subjects are struggling? Which students are at risk? The analytics engine surfaces what matters.",
          },
          {
            emoji: "🔬",
            name: "Mistake Intelligence",
            desc: "Understand WHY students fail — not just that they failed. Identifies recurring error patterns across your classes and suggests targeted interventions.",
          },
          {
            emoji: "🛤️",
            name: "Adaptive Learning Paths",
            desc: "TeachFlow automatically generates personalised study sequences for each student based on their performance history and identified weaknesses.",
          },
          {
            emoji: "📚",
            name: "Knowledge Studio",
            desc: "Upload school documents, past papers, or syllabi. TeachFlow extracts knowledge to generate flashcards, quizzes, and AI-augmented study materials.",
          },
        ].map(({ emoji, name, desc }) => (
          <div key={name} className="flex gap-3 p-3 bg-bg rounded-xl border border-border">
            <div className="text-xl shrink-0 mt-0.5">{emoji}</div>
            <div>
              <p className="text-sm font-semibold text-text">{name}</p>
              <p className="text-xs text-text-2 mt-0.5 leading-relaxed">{desc}</p>
            </div>
          </div>
        ))}
      </div>
    ),
  },
  {
    icon: <FlaskConical size={28} className="text-red-500" />,
    label: "Your Mission",
    title: "Your Beta Testing Mission",
    subtitle: "Help us build Nigeria's best education platform",
    body: (
      <div className="space-y-4">
        <p className="text-sm text-text-2 leading-relaxed">
          Over the next <strong className="text-text">60–90 minutes</strong>, we ask you to explore
          every major feature and share your honest experience. This is not a quiz — there are no
          wrong answers. Only your genuine teacher's perspective.
        </p>
        <div className="space-y-2.5">
          {[
            { num: "01", task: "Visit the Beta Hub from the sidebar (marked 🧪)" },
            { num: "02", task: "Complete the 18-task testing checklist" },
            { num: "03", task: "Report any bugs you encounter" },
            { num: "04", task: "Share your ideas for features that would help you most" },
            { num: "05", task: "Rate each feature honestly on the scorecard" },
          ].map(({ num, task }) => (
            <div key={num} className="flex items-start gap-3 p-3 bg-bg rounded-xl border border-border">
              <span className="text-[10px] font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md shrink-0 mt-0.5">{num}</span>
              <p className="text-sm text-text">{task}</p>
            </div>
          ))}
        </div>
        <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl">
          <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
            🏆 <strong>Pioneer Educators</strong> who complete the full testing programme will be
            invited to join the <strong>TeachFlow Advisory Circle</strong> — helping shape the
            future of TeachFlow OS.
          </p>
        </div>
      </div>
    ),
  },
];

export function OnboardingWizard() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    const done = localStorage.getItem(WIZARD_KEY);
    if (!done) {
      // Small delay so dashboard renders first
      const t = setTimeout(() => setOpen(true), 600);
      return () => clearTimeout(t);
    }
  }, []);

  function handleComplete() {
    setCompleting(true);
    setTimeout(() => {
      localStorage.setItem(WIZARD_KEY, "1");
      setOpen(false);
      setCompleting(false);
    }, 400);
  }

  function handleSkip() {
    localStorage.setItem(WIZARD_KEY, "1");
    setOpen(false);
  }

  if (!open) return null;

  const current = steps[step];
  const isLast = step === steps.length - 1;
  const pct = ((step + 1) / steps.length) * 100;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.65)", backdropFilter: "blur(4px)" }}
    >
      <div
        className="relative bg-surface border border-border rounded-2xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden"
        style={{ maxHeight: "90vh" }}
      >
        {/* Progress bar */}
        <div className="h-1 bg-border">
          <div
            className="h-full bg-primary transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-border">
          <div className="flex items-center gap-3">
            {current.icon}
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">
                Step {step + 1} of {steps.length} — {current.label}
              </p>
              <h2 className="text-base font-bold text-text leading-tight">{current.title}</h2>
            </div>
          </div>
          <button
            onClick={handleSkip}
            className="text-muted hover:text-text-2 transition-colors p-1 rounded-lg hover:bg-bg"
          >
            <X size={18} />
          </button>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 py-3 border-b border-border">
          {steps.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`rounded-full transition-all ${
                i === step
                  ? "w-6 h-2 bg-primary"
                  : i < step
                  ? "w-2 h-2 bg-primary/50"
                  : "w-2 h-2 bg-border"
              }`}
            />
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <p className="text-xs text-text-2 mb-4">{current.subtitle}</p>
          {current.body}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-border bg-bg">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 0}
            className="flex items-center gap-1.5 text-sm text-text-2 hover:text-text disabled:opacity-30 disabled:cursor-not-allowed transition-colors px-3 py-2 rounded-lg hover:bg-border/20"
          >
            <ArrowLeft size={15} />
            Back
          </button>

          <p className="text-xs text-muted">{step + 1} / {steps.length}</p>

          {isLast ? (
            <button
              onClick={handleComplete}
              disabled={completing}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all hover:scale-105 disabled:opacity-70"
            >
              <CheckCircle size={15} />
              {completing ? "Starting..." : "Let's Go!"}
            </button>
          ) : (
            <button
              onClick={() => setStep((s) => s + 1)}
              className="flex items-center gap-2 bg-primary text-white px-5 py-2 rounded-xl text-sm font-bold hover:bg-primary/90 transition-all hover:scale-105"
            >
              Next
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
