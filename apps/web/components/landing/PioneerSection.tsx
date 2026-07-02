"use client";

import Link from "next/link";
import {
  Rocket, Star, FlaskConical, Users, ArrowRight, CheckCircle,
  AlertTriangle, Heart, Clock, Bug, Lightbulb,
} from "lucide-react";

const FOCUS_AREAS = [
  "Lesson note accuracy & depth",
  "Exam question quality",
  "AI Study Buddy responses",
  "Mobile & dark mode experience",
  "Speed & performance",
  "Curriculum alignment (WAEC/JAMB)",
];

const WHAT_TO_EXPECT = [
  { icon: Clock, title: "60–90 minutes", desc: "of structured guided testing" },
  { icon: FlaskConical, title: "18 test tasks", desc: "covering every major module" },
  { icon: Bug, title: "Bug reporting", desc: "with structured forms" },
  { icon: Lightbulb, title: "Feature ideas", desc: "direct influence on the roadmap" },
];

const PROBLEM_CARDS = [
  {
    icon: AlertTriangle,
    color: "#d97706",
    bg: "rgba(217,119,6,0.08)",
    border: "rgba(217,119,6,0.2)",
    title: "The Problem",
    body: "Nigerian teachers spend 8–12 hours every week writing lesson notes, creating exam papers, and managing records — hours stolen from actual teaching. No tool existed that understood the Nigerian curriculum, WAEC, or JAMB.",
  },
  {
    icon: Rocket,
    color: "#2563eb",
    bg: "rgba(37,99,235,0.08)",
    border: "rgba(37,99,235,0.2)",
    title: "Our Solution",
    body: "TeachFlow OS is the first AI-powered Learning Operating System built specifically for Nigerian secondary schools — JSS1 to SS3, fully aligned with the national curriculum, WAEC, JAMB, and JUPEB syllabi.",
  },
  {
    icon: Heart,
    color: "#dc2626",
    bg: "rgba(220,38,38,0.08)",
    border: "rgba(220,38,38,0.15)",
    title: "Why You Matter",
    body: "You are not just testing software. You are co-creating a tool that thousands of teachers across Nigeria will depend on daily. Every bug you catch and every idea you share directly shapes what gets built next.",
  },
];

export function PioneerSection() {
  return (
    <section
      id="beta"
      className="landing-section reveal py-24 px-6"
      style={{ background: "linear-gradient(135deg, #fef3c7 0%, #dbeafe 50%, #fef3c7 100%)" }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 text-amber-700 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full">
            <Star size={12} fill="currentColor" />
            Exclusive Beta Access
          </span>
        </div>

        {/* Hero headline */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black mb-4 leading-tight" style={{ color: "#0f172a" }}>
            Welcome,{" "}
            <span className="gradient-text">Pioneer Educator</span>
          </h2>
          <p className="text-lg md:text-xl max-w-3xl mx-auto leading-relaxed" style={{ color: "#374151" }}>
            You have been selected to help shape the future of education technology in Nigeria.
            Your classroom experience is exactly what TeachFlow needs to become truly great.
          </p>
        </div>

        {/* Why TeachFlow was created */}
        <div className="grid md:grid-cols-3 gap-6 mb-14">
          {PROBLEM_CARDS.map(({ icon: Icon, color, bg, border, title, body }) => (
            <div
              key={title}
              className="rounded-2xl p-6"
              style={{ background: "#ffffff", border: `1px solid ${border}`, boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
            >
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                style={{ background: bg }}
              >
                <Icon size={20} style={{ color }} />
              </div>
              <h3 className="font-bold text-base mb-2" style={{ color: "#0f172a" }}>{title}</h3>
              <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{body}</p>
            </div>
          ))}
        </div>

        {/* What to expect */}
        <div className="mb-14">
          <h3 className="font-bold text-xl text-center mb-8" style={{ color: "#0f172a" }}>What to Expect</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {WHAT_TO_EXPECT.map(({ icon: Icon, title, desc }) => (
              <div
                key={title}
                className="rounded-xl p-5 text-center"
                style={{ background: "#ffffff", border: "1px solid rgba(0,0,0,0.07)", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mx-auto mb-3"
                  style={{ background: "rgba(37,99,235,0.08)" }}
                >
                  <Icon size={18} style={{ color: "#2563eb" }} />
                </div>
                <p className="font-bold text-sm mb-1" style={{ color: "#0f172a" }}>{title}</p>
                <p className="text-xs" style={{ color: "#64748b" }}>{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Focus areas */}
        <div
          className="rounded-2xl p-8 mb-10"
          style={{ background: "#ffffff", border: "1px solid rgba(217,119,6,0.2)", boxShadow: "0 2px 16px rgba(0,0,0,0.06)" }}
        >
          <div className="flex items-center gap-2 mb-6">
            <FlaskConical size={18} style={{ color: "#d97706" }} />
            <h3 className="font-bold text-lg" style={{ color: "#0f172a" }}>Areas That Need Your Attention</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {FOCUS_AREAS.map((area) => (
              <div key={area} className="flex items-center gap-2.5">
                <CheckCircle size={15} style={{ color: "#d97706" }} className="shrink-0" />
                <span className="text-sm" style={{ color: "#374151" }}>{area}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pioneer commitment */}
        <div
          className="text-center rounded-2xl p-8 mb-10"
          style={{
            background: "linear-gradient(135deg, rgba(217,119,6,0.07), rgba(37,99,235,0.07))",
            border: "1px solid rgba(217,119,6,0.2)",
          }}
        >
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-3"
            style={{ background: "rgba(217,119,6,0.1)" }}
          >
            <Users size={24} style={{ color: "#d97706" }} />
          </div>
          <h3 className="font-bold text-xl mb-2" style={{ color: "#0f172a" }}>Join the TeachFlow Advisory Circle</h3>
          <p className="text-sm max-w-xl mx-auto" style={{ color: "#64748b" }}>
            Pioneering beta testers who complete the testing programme will be invited to join
            the TeachFlow Advisory Circle — shaping future features and being credited as
            founding contributors to Nigeria&apos;s education revolution.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-3 font-bold px-8 py-4 rounded-xl text-base transition-all hover:scale-105 text-white"
            style={{
              background: "linear-gradient(135deg, #d97706, #2563eb)",
              boxShadow: "0 4px 24px rgba(217,119,6,0.3)",
            }}
          >
            <Rocket size={18} />
            Start Guided Testing
            <ArrowRight size={18} />
          </Link>
          <p className="text-xs mt-4" style={{ color: "#94a3b8" }}>
            Free beta access · No payment required · Your feedback is the only currency
          </p>
        </div>
      </div>
    </section>
  );
}
