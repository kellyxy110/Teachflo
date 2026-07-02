"use client";
import { motion } from "framer-motion";
import {
  BookOpen, Brain, ClipboardList, HeartPulse, FileBarChart2, Sparkles,
  BarChart3, Code2, BookMarked,
} from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    color: "#3b82f6",
    tag: "AI",
    title: "AI Lesson Generator",
    desc: "Generate full lesson plans aligned to NERDC in under 10 seconds. Switch between Standard, ELI12, WAEC, JAMB, and JUPEB reading levels instantly.",
    stat: "10 sec",
    statLabel: "avg. generation",
  },
  {
    icon: Brain,
    color: "#8b5cf6",
    tag: "CIG · AI",
    title: "CIG Exam Builder",
    desc: "Build exams grounded in 618 curriculum topics. AI generates MCQs with misconceptions as distractors, Bloom's taxonomy tagging, and worked solutions.",
    stat: "618",
    statLabel: "curriculum topics",
  },
  {
    icon: ClipboardList,
    color: "#10b981",
    tag: "Classroom",
    title: "Digital Attendance",
    desc: "4-status register (Present, Absent, Late, Excused) with date navigator, monthly stats, and absenteeism alerts. Saves in seconds.",
    stat: "4",
    statLabel: "status types",
  },
  {
    icon: HeartPulse,
    color: "#ef4444",
    tag: "Classroom",
    title: "Student Health Records",
    desc: "Digital clinic: blood group, allergies, medications, emergency contacts, and clinic visit history — all scoped per school, never shared.",
    stat: "200",
    statLabel: "visit history cap",
  },
  {
    icon: FileBarChart2,
    color: "#f59e0b",
    tag: "Assessment",
    title: "CA Report Cards",
    desc: "Ordinal ranking (1st, 2nd, 3rd) with grade letters in the Nigerian 70–100 = A scale. Bulk export to Excel for full term reports.",
    stat: "A–F",
    statLabel: "Nigerian grading",
  },
  {
    icon: BookOpen,
    color: "#06b6d4",
    tag: "AI",
    title: "AI Study Buddy",
    desc: "5 learning modes: Explain It, Test Me, Give a Hint, Step-by-Step, and Review My Mistakes. Adapts to each student's weak topics.",
    stat: "5",
    statLabel: "learning modes",
  },
  {
    icon: BarChart3,
    color: "#a855f7",
    tag: "Analytics",
    title: "Mistake Intelligence",
    desc: "Detects recurring error patterns across a student's exam attempts. Groups mistakes by topic, Bloom level, and exam standard.",
    stat: "∞",
    statLabel: "pattern depth",
  },
  {
    icon: Code2,
    color: "#22c55e",
    tag: "AI",
    title: "Coding Lab",
    desc: "AI mentor for Computer Studies students. 5 modes: Explain, Debug, Optimise, Test, and Improve — powered by Qwen Coder.",
    stat: "JS · Py",
    statLabel: "primary languages",
  },
  {
    icon: BookMarked,
    color: "#f97316",
    tag: "CIG",
    title: "Curriculum Browser",
    desc: "Browse 618 TOPIC nodes across 6 class levels and 8 subjects. View prerequisites, cross-subject links, misconceptions, and WAEC exam standards.",
    stat: "473",
    statLabel: "prerequisite edges",
  },
];

const card = {
  hidden: { opacity: 0, y: 24 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, delay: i * 0.07, ease: "easeOut" },
  }),
};

export function FeatureGridSection() {
  return (
    <section
      id="features"
      className="py-24 px-6"
      style={{ background: "linear-gradient(180deg, #eff6ff 0%, #f0f7ff 100%)" }}
    >
      <div className="max-w-6xl mx-auto">
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
            style={{ background: "rgba(217,119,6,0.1)", color: "#b45309", border: "1px solid rgba(217,119,6,0.25)" }}
          >
            Platform Features
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-4" style={{ color: "#0f172a" }}>
            Everything a Nigerian school needs.<br />
            <span className="gradient-text">Nothing it doesn&apos;t.</span>
          </h2>
          <p className="max-w-xl mx-auto text-base" style={{ color: "#64748b" }}>
            From daily attendance to WAEC-calibre exam generation — TeachNexis covers the full teaching and learning cycle.
          </p>
        </motion.div>

        {/* Feature grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={card}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i}
              className="rounded-2xl p-5 flex flex-col gap-3 group transition-all hover:shadow-md"
              style={{
                background: "#ffffff",
                border: `1px solid ${f.color}18`,
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: `${f.color}12`, border: `1px solid ${f.color}20` }}
                >
                  <f.icon size={18} style={{ color: f.color }} />
                </div>
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                  style={{ background: `${f.color}10`, color: f.color }}
                >
                  {f.tag}
                </span>
              </div>

              <div>
                <h3 className="font-bold text-sm mb-1" style={{ color: "#0f172a" }}>{f.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>{f.desc}</p>
              </div>

              <div
                className="mt-auto pt-3 flex items-baseline gap-1"
                style={{ borderTop: `1px solid ${f.color}15` }}
              >
                <span className="text-lg font-black" style={{ color: f.color }}>{f.stat}</span>
                <span className="text-xs" style={{ color: "#94a3b8" }}>{f.statLabel}</span>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
