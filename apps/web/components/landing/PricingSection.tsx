"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Zap, Lock } from "lucide-react";

const FREE_FEATURES = [
  "AI Lesson Plan Generator (all modes)",
  "Curriculum Intelligence Graph — 618 topics",
  "AI Exam Builder with CIG grounding",
  "CBT export: Excel, CSV, JSON, Moodle XML, QTI",
  "Digital Attendance Register",
  "Student Health Records",
  "CA Report Cards with ordinal ranking",
  "AI Study Buddy (5 learning modes)",
  "Coding Lab AI mentor",
  "Mistake Intelligence & Adaptive Learning",
  "18 free AI models — no API key needed",
  "LaTeX equation editor (850+ symbols)",
];

const PRO_FEATURES = [
  "Everything in Free, always",
  "Advanced class-level analytics dashboard",
  "Team collaboration (multiple teachers)",
  "Priority AI model pool (faster responses)",
  "Student portal & progress sharing",
  "Custom school branding",
  "Export to PDF with school letterhead",
  "Dedicated support",
];

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="py-24 px-6"
      style={{ background: "linear-gradient(180deg, #080d20 0%, #04081a 100%)" }}
    >
      <div className="max-w-5xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span
            className="inline-block text-xs font-black uppercase tracking-[0.2em] mb-4 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(16,185,129,0.08)", color: "#34d399", border: "1px solid rgba(16,185,129,0.15)" }}
          >
            Simple Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-4" style={{ color: "#f1f5f9" }}>
            Honest pricing.<br />
            <span className="gradient-text">Free means free.</span>
          </h2>
          <p className="max-w-lg mx-auto text-base" style={{ color: "#64748b" }}>
            Nigerian schools should not be paying to teach better. The core platform is and will remain free. Pro features for large schools are coming.
          </p>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">

          {/* Free plan */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-3xl p-8 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, rgba(59,130,246,0.08), rgba(139,92,246,0.08))",
              border: "1px solid rgba(59,130,246,0.2)",
            }}
          >
            {/* Glow */}
            <div
              className="absolute top-0 left-0 right-0 h-40 pointer-events-none"
              style={{ background: "radial-gradient(ellipse at top, rgba(59,130,246,0.06), transparent 70%)" }}
            />

            <div className="relative z-10">
              <div className="flex items-center gap-2 mb-2">
                <Zap size={16} style={{ color: "#60a5fa" }} />
                <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#60a5fa" }}>Free Forever</span>
              </div>
              <div className="text-5xl font-black mb-1" style={{ color: "#f1f5f9" }}>₦0</div>
              <p className="text-sm mb-8" style={{ color: "#64748b" }}>No credit card. No expiry. No catch.</p>

              <Link
                href="/sign-up"
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-black text-white text-sm mb-8 transition-all hover:scale-[1.02]"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  boxShadow: "0 0 30px rgba(59,130,246,0.3)",
                }}
              >
                <Zap size={15} /> Start for free — no card needed
              </Link>

              <ul className="space-y-3">
                {FREE_FEATURES.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "#94a3b8" }}>
                    <Check size={14} className="shrink-0 mt-0.5" style={{ color: "#10b981" }} />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>

          {/* Pro plan (Coming Soon) */}
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="rounded-3xl p-8 relative"
            style={{
              background: "rgba(255,255,255,0.02)",
              border: "1px solid rgba(255,255,255,0.07)",
            }}
          >
            <div className="flex items-center gap-2 mb-2">
              <Lock size={14} style={{ color: "#a78bfa" }} />
              <span className="text-xs font-black uppercase tracking-widest" style={{ color: "#a78bfa" }}>Pro — Coming Soon</span>
            </div>
            <div className="text-5xl font-black mb-1" style={{ color: "#64748b" }}>₦?</div>
            <p className="text-sm mb-8" style={{ color: "#475569" }}>Pricing will be set based on affordability for Nigerian schools.</p>

            <div
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm mb-8"
              style={{
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                color: "#475569",
                cursor: "default",
              }}
            >
              Notify me when available
            </div>

            <ul className="space-y-3">
              {PRO_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-sm" style={{ color: "#475569" }}>
                  <Check size={14} className="shrink-0 mt-0.5" style={{ color: "#334155" }} />
                  {f}
                </li>
              ))}
            </ul>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
