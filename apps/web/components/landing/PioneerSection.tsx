"use client";

import Link from "next/link";
import { Rocket, Star, FlaskConical, Users, ArrowRight, CheckCircle } from "lucide-react";

const FOCUS_AREAS = [
  "Lesson note accuracy & depth",
  "Exam question quality",
  "AI Study Buddy responses",
  "Mobile & dark mode experience",
  "Speed & performance",
  "Curriculum alignment (WAEC/JAMB)",
];

const WHAT_TO_EXPECT = [
  { icon: "⏱️", title: "60–90 minutes", desc: "of structured guided testing" },
  { icon: "🧪", title: "18 test tasks", desc: "covering every major module" },
  { icon: "🐛", title: "Bug reporting", desc: "with structured forms" },
  { icon: "💡", title: "Feature ideas", desc: "direct influence on the roadmap" },
];

export function PioneerSection() {
  return (
    <section
      id="beta"
      className="landing-section reveal py-24 px-6"
      style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e1b4b 50%, #0f172a 100%)" }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Badge */}
        <div className="flex justify-center mb-8">
          <span className="inline-flex items-center gap-2 bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-bold uppercase tracking-widest px-4 py-2 rounded-full">
            <Star size={12} fill="currentColor" />
            Exclusive Beta Access
          </span>
        </div>

        {/* Hero headline */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-4 leading-tight">
            Welcome,{" "}
            <span style={{ background: "linear-gradient(135deg, #fbbf24, #f59e0b)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Pioneer Educator
            </span>
          </h2>
          <p className="text-slate-300 text-lg md:text-xl max-w-3xl mx-auto leading-relaxed">
            You have been selected to help shape the future of education technology in Nigeria.
            Your classroom experience is exactly what TeachFlow needs to become truly great.
          </p>
        </div>

        {/* Why TeachFlow was created */}
        <div className="grid md:grid-cols-3 gap-6 mb-14">
          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <div className="text-2xl mb-3">😓</div>
            <h3 className="font-bold text-white text-base mb-2">The Problem</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              Nigerian teachers spend 8–12 hours every week writing lesson notes, creating exam
              papers, and managing records — hours stolen from actual teaching. No tool existed
              that understood the Nigerian curriculum, WAEC, or JAMB.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <div className="text-2xl mb-3">🚀</div>
            <h3 className="font-bold text-white text-base mb-2">Our Solution</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              TeachFlow OS is the first AI-powered Learning Operating System built specifically
              for Nigerian secondary schools — JSS1 to SS3, fully aligned with the national
              curriculum, WAEC, JAMB, and JUPEB syllabi.
            </p>
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
            <div className="text-2xl mb-3">🙏</div>
            <h3 className="font-bold text-white text-base mb-2">Why You Matter</h3>
            <p className="text-slate-400 text-sm leading-relaxed">
              You are not just testing software. You are co-creating a tool that thousands of
              teachers across Nigeria will depend on daily. Every bug you catch and every idea
              you share directly shapes what gets built next.
            </p>
          </div>
        </div>

        {/* What to expect */}
        <div className="mb-14">
          <h3 className="text-white font-bold text-xl text-center mb-8">What to Expect</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {WHAT_TO_EXPECT.map(({ icon, title, desc }) => (
              <div key={title} className="bg-white/5 border border-white/10 rounded-xl p-5 text-center">
                <div className="text-3xl mb-2">{icon}</div>
                <p className="text-white font-bold text-sm">{title}</p>
                <p className="text-slate-400 text-xs mt-1">{desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Focus areas */}
        <div className="bg-white/5 border border-amber-400/20 rounded-2xl p-8 mb-10">
          <div className="flex items-center gap-2 mb-6">
            <FlaskConical size={18} className="text-amber-400" />
            <h3 className="text-white font-bold text-lg">Areas That Need Your Attention</h3>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            {FOCUS_AREAS.map((area) => (
              <div key={area} className="flex items-center gap-2.5">
                <CheckCircle size={15} className="text-amber-400 shrink-0" />
                <span className="text-slate-300 text-sm">{area}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Pioneer commitment */}
        <div className="text-center bg-gradient-to-r from-amber-400/10 to-orange-400/10 border border-amber-400/30 rounded-2xl p-8 mb-10">
          <Users size={28} className="text-amber-400 mx-auto mb-3" />
          <h3 className="text-white font-bold text-xl mb-2">Join the TeachFlow Advisory Circle</h3>
          <p className="text-slate-400 text-sm max-w-xl mx-auto">
            Pioneering beta testers who complete the testing programme will be invited to join
            the TeachFlow Advisory Circle — shaping future features and being credited as
            founding contributors to Nigeria&apos;s education revolution.
          </p>
        </div>

        {/* CTA */}
        <div className="text-center">
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-3 bg-amber-400 hover:bg-amber-300 text-black font-bold px-8 py-4 rounded-xl text-base transition-all hover:scale-105 shadow-2xl shadow-amber-400/30"
          >
            <Rocket size={18} />
            Start Guided Testing
            <ArrowRight size={18} />
          </Link>
          <p className="text-slate-500 text-xs mt-4">
            Free beta access · No payment required · Your feedback is the only currency
          </p>
        </div>
      </div>
    </section>
  );
}
