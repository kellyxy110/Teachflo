"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown } from "lucide-react";

const FAQS = [
  {
    q: "What is TeachNexis?",
    a: "TeachNexis is an AI-powered educational operating system built specifically for Nigerian secondary schools. It covers lesson planning, exam creation, digital attendance, student health records, report cards, and AI tutoring — all aligned to WAEC, JAMB, JUPEB, and the NERDC curriculum from JSS1 to SS3.",
  },
  {
    q: "Is it really free? What's the catch?",
    a: "The core platform is completely free with no time limit, no credit card required, and no feature gating. We use free-tier AI models (Groq, Cerebras, OpenRouter) so there's no per-request cost for the base features. A Pro plan for advanced school-administration features is planned, but everything you see today will always remain free.",
  },
  {
    q: "What exam bodies and class levels are supported?",
    a: "TeachNexis supports WAEC, NECO, JAMB, and JUPEB. All six Nigerian secondary levels are covered: JSS1, JSS2, JSS3, SS1, SS2, and SS3. Every AI output is calibrated to the correct examination standard and vocabulary.",
  },
  {
    q: "What subjects are in the Curriculum Intelligence Graph?",
    a: "Mathematics, English Language, Physics, Chemistry, Biology, Economics, Government, Literature in English, Agricultural Science, Basic Science, Social Studies, Business Studies, Civic Education, Home Economics, Computer Studies, Geography, History, and more. The graph currently holds 618 topic nodes across 14+ subjects and all six class levels.",
  },
  {
    q: "How does the AI work? Do I need to pay for API access?",
    a: "No API key is required. TeachNexis uses an intent-based router that selects the best free model for each task — Groq (Llama 3) for fast tutoring, Qwen Coder for the Coding Lab, DeepSeek for exam generation, and Cerebras for speed-critical tasks. All model calls go through OpenRouter's free tier with automatic fallback chains.",
  },
  {
    q: "Is my school's data private and secure?",
    a: "Yes. All data — students, attendance, health records, exam questions — is scoped to your school's account and never shared across schools. TeachNexis enforces school-level data isolation on every database query. No AI provider receives your students' identifiable information — only anonymised educational content.",
  },
  {
    q: "Can I import existing exams or student data?",
    a: "Yes. You can bulk-import exam questions via Excel (.xlsx) with flexible column mapping and a 10-question preview before saving. Question banks can be exported as Excel CBT format, CSV, JSON, Moodle XML, and IMS QTI 2.1.",
  },
  {
    q: "What devices and browsers are supported?",
    a: "TeachNexis is fully mobile-responsive and works on all modern browsers (Chrome, Firefox, Safari, Edge). The dashboard is optimised for both mobile (bottom navigation) and desktop (sidebar) use cases. The Three.js hero on the landing page gracefully degrades on older devices.",
  },
];

function FAQItem({ item, index }: { item: typeof FAQS[0]; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.05 }}
      className="rounded-2xl overflow-hidden"
      style={{ border: "1px solid rgba(0,0,0,0.07)", background: "#ffffff" }}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-4 px-6 py-5 text-left transition-colors hover:bg-white/[0.02]"
        aria-expanded={open}
      >
        <span className="text-sm font-semibold" style={{ color: "#0f172a" }}>{item.q}</span>
        <motion.div
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="shrink-0"
        >
          <ChevronDown size={16} style={{ color: "#475569" }} />
        </motion.div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            key="answer"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >
            <p
              className="px-6 pb-5 text-sm leading-relaxed"
              style={{ color: "#64748b" }}
            >
              {item.a}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export function FAQSection() {
  return (
    <section
      id="faq"
      className="py-24 px-6"
      style={{ background: "#fdf8f0" }}
    >
      <div className="max-w-3xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-14"
        >
          <span
            className="inline-block text-xs font-black uppercase tracking-[0.2em] mb-4 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(245,158,11,0.08)", color: "#fbbf24", border: "1px solid rgba(245,158,11,0.15)" }}
          >
            FAQ
          </span>
          <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-4" style={{ color: "#0f172a" }}>
            Common questions.<br />
            <span className="gradient-text">Honest answers.</span>
          </h2>
        </motion.div>

        <div className="space-y-3">
          {FAQS.map((item, i) => (
            <FAQItem key={item.q} item={item} index={i} />
          ))}
        </div>
      </div>
    </section>
  );
}
