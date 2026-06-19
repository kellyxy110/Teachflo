import { redirect } from "next/navigation";
import Link from "next/link";
import {
  BookOpen,
  BarChart3,
  Users,
  FileText,
  Zap,
  Shield,
  CheckCircle,
} from "lucide-react";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const CLERK_KEY = process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY;

  if (!CLERK_KEY) {
    redirect("/setup");
  }

  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (userId) redirect("/dashboard");
  } catch {
    // Not signed in — show landing page
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      {/* ── Nav ─────────────────────────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-surface/90 backdrop-blur-md border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-bold text-lg text-text">TeachFlow OS</span>
          <div className="flex items-center gap-2">
            <Link
              href="/sign-in"
              className="text-sm font-medium text-text-2 hover:text-text transition-colors px-4 py-2"
            >
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="text-sm font-semibold bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-600 transition-colors"
            >
              Get started free
            </Link>
          </div>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      <section className="pt-24 pb-16 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 bg-primary-50 text-primary text-xs font-semibold px-4 py-1.5 rounded-full border border-primary-100 mb-8">
            <Zap size={12} />
            WAEC · JAMB · JUPEB aligned
          </div>

          <h1 className="text-5xl font-bold leading-tight mb-6">
            The AI operating system
            <br />
            <span className="text-primary">for Nigerian schools</span>
          </h1>

          <p className="text-xl text-text-2 leading-relaxed mb-10 max-w-2xl mx-auto">
            Generate WAEC-ready lesson plans in seconds, create exam questions with
            distractor analysis, and track every student's performance — all in one
            platform built for JSS1–SS3.
          </p>

          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link
              href="/sign-up"
              className="bg-primary text-white px-8 py-3.5 rounded-xl font-semibold text-base hover:bg-primary-600 transition-colors shadow-sm"
            >
              Get started free →
            </Link>
            <Link
              href="/sign-in"
              className="px-8 py-3.5 rounded-xl font-semibold text-base border border-border text-text-2 hover:text-text hover:bg-surface transition-colors"
            >
              Sign in
            </Link>
          </div>

          <div className="mt-5 flex items-center justify-center gap-5 text-sm text-muted">
            {["No credit card required", "Set up in 2 minutes", "Free forever plan"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <CheckCircle size={13} className="text-success" />
                {t}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Dashboard Mock ──────────────────────────────────────────────────── */}
      <section className="px-6 pb-24">
        <div className="max-w-5xl mx-auto">
          <div className="bg-surface rounded-2xl border border-border shadow-xl overflow-hidden">
            {/* Browser chrome */}
            <div className="bg-bg px-4 py-3 flex items-center gap-2 border-b border-border">
              <div className="w-3 h-3 rounded-full bg-danger/50" />
              <div className="w-3 h-3 rounded-full bg-warning/50" />
              <div className="w-3 h-3 rounded-full bg-success/50" />
              <div className="flex-1 ml-4 bg-surface rounded-md px-4 py-1 text-xs text-muted border border-border">
                teachflow.app/dashboard
              </div>
            </div>

            {/* Mock app shell */}
            <div className="flex" style={{ height: 300 }}>
              {/* Sidebar */}
              <div className="w-48 bg-text shrink-0 flex flex-col p-4">
                <div className="text-white font-bold text-sm mb-6">TeachFlow OS</div>
                {[
                  ["Dashboard", true],
                  ["Lessons", false],
                  ["Exams", false],
                  ["Students", false],
                  ["Analytics", false],
                ].map(([label, active]) => (
                  <div
                    key={label as string}
                    className={`text-xs px-3 py-2 rounded-lg mb-1 ${
                      active ? "bg-primary text-white" : "text-muted"
                    }`}
                  >
                    {label as string}
                  </div>
                ))}
              </div>

              {/* Main content */}
              <div className="flex-1 bg-bg p-5 overflow-hidden">
                <div className="text-sm font-semibold text-text mb-3">Good morning, Mrs. Adeyemi 👋</div>

                {/* Stat cards */}
                <div className="grid grid-cols-4 gap-3 mb-4">
                  {[
                    ["24", "Lessons", "text-primary"],
                    ["18", "Exams", "text-waec"],
                    ["94", "Students", "text-success"],
                    ["72%", "Pass Rate", "text-warning"],
                  ].map(([val, lbl, color]) => (
                    <div key={lbl} className="bg-surface rounded-xl p-3 border border-border">
                      <div className={`text-xl font-bold ${color}`}>{val}</div>
                      <div className="text-xs text-muted mt-0.5">{lbl}</div>
                    </div>
                  ))}
                </div>

                {/* Recent activity */}
                <div className="bg-surface rounded-xl border border-border p-3">
                  <div className="text-xs font-semibold text-text mb-2">Recent AI generations</div>
                  {[
                    "SS2 Biology — Cell Division (WAEC mode)",
                    "JSS3 Mathematics — Quadratic Equations",
                    "SS1 English Language — Essay Writing (JAMB mode)",
                  ].map((item) => (
                    <div key={item} className="text-xs text-text-2 py-1.5 border-b border-border last:border-0">
                      {item}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ────────────────────────────────────────────────────────── */}
      <section className="bg-surface border-y border-border px-6 py-24">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-text mb-3">
              Everything a Nigerian school needs
            </h2>
            <p className="text-text-2">
              Built specifically for JSS1–SS3 curriculum and national exam standards
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            {[
              {
                Icon: Zap,
                iconClass: "text-primary bg-primary-50",
                title: "AI Lesson Generation",
                desc: "Generate full lesson plans aligned to WAEC, JAMB, or JUPEB in under 10 seconds. Powered by Groq's LPU hardware for real-time streaming.",
              },
              {
                Icon: FileText,
                iconClass: "text-waec bg-primary-50",
                title: "Smart Exam Builder",
                desc: "Create MCQ and theory questions with automatic distractor analysis. Every wrong option is pedagogically designed — not random.",
              },
              {
                Icon: BarChart3,
                iconClass: "text-success bg-success-50",
                title: "Performance Analytics",
                desc: "Track class averages, pass rates, grade distributions (A–F), and at-risk students across all subjects and class levels.",
              },
              {
                Icon: Users,
                iconClass: "text-primary bg-primary-50",
                title: "Student Management",
                desc: "Manage student profiles, class assignments, and homework submissions across JSS1–SS3 with one unified interface.",
              },
              {
                Icon: BookOpen,
                iconClass: "text-warning bg-warning-50",
                title: "Resource Library",
                desc: "Every AI-generated lesson and exam is saved in a searchable library. Filter by subject, class level, or content type.",
              },
              {
                Icon: Shield,
                iconClass: "text-danger bg-danger-50",
                title: "Role-Based Access",
                desc: "Teachers, school admins, students, and parents each see exactly what they need. RBAC built in from day one — no extra config.",
              },
            ].map(({ Icon, iconClass, title, desc }) => (
              <div key={title} className="bg-bg rounded-2xl border border-border p-6 hover:border-primary/30 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${iconClass}`}>
                  <Icon size={20} />
                </div>
                <h3 className="font-semibold text-text mb-2">{title}</h3>
                <p className="text-sm text-text-2 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ────────────────────────────────────────────────────── */}
      <section className="px-6 py-24">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-text mb-3">Up and running in 3 steps</h2>
            <p className="text-text-2">From sign-up to your first AI lesson in under 5 minutes</p>
          </div>

          <div className="space-y-8">
            {[
              {
                n: "01",
                title: "Create your school",
                desc: "Sign up, enter your school name, state, and LGA. Your account is ready instantly — no approval process, no waiting.",
              },
              {
                n: "02",
                title: "Generate your first lesson",
                desc: "Pick a subject, class level, and topic. Choose WAEC, JAMB, JUPEB, or ELI12 mode. TeachFlow writes the full lesson plan and saves it to your library.",
              },
              {
                n: "03",
                title: "Track and improve",
                desc: "Enter student scores after exams. TeachFlow automatically surfaces at-risk students, class averages, and subject-level performance trends.",
              },
            ].map(({ n, title, desc }) => (
              <div key={n} className="flex gap-6">
                <div className="w-12 h-12 rounded-2xl bg-primary text-white font-bold text-sm flex items-center justify-center shrink-0">
                  {n}
                </div>
                <div className="pt-2">
                  <h3 className="font-semibold text-text mb-1.5">{title}</h3>
                  <p className="text-sm text-text-2 leading-relaxed">{desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ─────────────────────────────────────────────────────── */}
      <section className="bg-surface border-y border-border px-6 py-12">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-8 text-center">
          {[
            ["JSS1–SS3", "All class levels covered"],
            ["WAEC · JAMB · JUPEB", "National exam alignment"],
            ["< 10 seconds", "Average lesson generation time"],
          ].map(([stat, label]) => (
            <div key={stat}>
              <div className="text-2xl font-bold text-primary mb-1">{stat}</div>
              <div className="text-sm text-text-2">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────────────────────────────────── */}
      <section className="bg-primary px-6 py-24 text-center">
        <div className="max-w-xl mx-auto">
          <h2 className="text-3xl font-bold text-white mb-4">
            Ready to transform your school?
          </h2>
          <p className="text-primary-100 mb-10 leading-relaxed">
            Join schools already using TeachFlow OS to save hours every week on
            lesson planning, exam creation, and student tracking.
          </p>
          <Link
            href="/sign-up"
            className="inline-block bg-white text-primary px-10 py-4 rounded-xl font-bold text-base hover:bg-primary-50 transition-colors"
          >
            Get started free →
          </Link>
          <p className="text-primary-100 text-sm mt-4">No credit card required</p>
        </div>
      </section>

      {/* ── Footer ──────────────────────────────────────────────────────────── */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <span className="font-bold text-text">TeachFlow OS</span>
          <span className="text-muted text-sm">Built for Nigerian secondary schools · JSS1–SS3</span>
        </div>
      </footer>
    </div>
  );
}
