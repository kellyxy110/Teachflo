"use client";
import { motion } from "framer-motion";
import { GitBranch, Layers, ArrowRight, BookOpen } from "lucide-react";

const SUBJECTS = [
  "Mathematics", "English Language", "Physics", "Chemistry",
  "Biology", "Economics", "Government", "Literature",
  "Agricultural Science", "Basic Science", "Social Studies",
  "Computer Studies", "Geography", "History",
];

const STATS = [
  { value: "618", label: "Curriculum Topics", color: "#3b82f6" },
  { value: "473", label: "Prerequisite Edges", color: "#8b5cf6" },
  { value: "51", label: "Cross-Subject Links", color: "#10b981" },
  { value: "6", label: "Class Levels", color: "#f59e0b" },
];

const CLASS_LEVELS = ["JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"];

export function CurriculumSection() {
  return (
    <section
      id="curriculum"
      className="py-24 px-6 overflow-hidden"
      style={{ background: "linear-gradient(180deg, #04081a 0%, #070c1e 100%)" }}
    >
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">

          {/* Left: copy */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <span
              className="inline-block text-xs font-black uppercase tracking-[0.2em] mb-6 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(59,130,246,0.08)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.15)" }}
            >
              Curriculum Intelligence Graph
            </span>
            <h2 className="text-3xl sm:text-4xl font-black leading-tight mb-5" style={{ color: "#f1f5f9" }}>
              The Nigerian curriculum,<br />
              <span className="gradient-text">mapped as a knowledge graph.</span>
            </h2>
            <p className="text-base mb-6 leading-relaxed" style={{ color: "#64748b" }}>
              Unlike a folder hierarchy, the Curriculum Intelligence Graph stores every topic as a node with typed relationships — prerequisites, cross-subject links, Bloom&apos;s taxonomy levels, and WAEC exam standards. Every AI feature uses the same graph.
            </p>

            {/* Class levels */}
            <div className="flex flex-wrap gap-2 mb-8">
              {CLASS_LEVELS.map((level) => (
                <span
                  key={level}
                  className="px-3 py-1 rounded-full text-xs font-bold"
                  style={{
                    background: "rgba(59,130,246,0.08)",
                    border: "1px solid rgba(59,130,246,0.15)",
                    color: "#93c5fd",
                  }}
                >
                  {level}
                </span>
              ))}
            </div>

            <a
              href="/sign-up"
              className="inline-flex items-center gap-2 text-sm font-bold transition-all hover:gap-3"
              style={{ color: "#3b82f6" }}
            >
              Explore the curriculum <ArrowRight size={15} />
            </a>
          </motion.div>

          {/* Right: stats + subjects */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="space-y-5"
          >
            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl p-5"
                  style={{
                    background: "rgba(255,255,255,0.025)",
                    border: "1px solid rgba(255,255,255,0.07)",
                  }}
                >
                  <div className="text-3xl font-black mb-1" style={{ color: s.color }}>{s.value}</div>
                  <div className="text-xs" style={{ color: "#475569" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Subject tags */}
            <div
              className="rounded-2xl p-5"
              style={{
                background: "rgba(255,255,255,0.025)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div className="flex items-center gap-2 mb-3">
                <BookOpen size={14} style={{ color: "#60a5fa" }} />
                <span className="text-xs font-bold uppercase tracking-widest" style={{ color: "#475569" }}>Subjects Covered</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {SUBJECTS.map((s) => (
                  <span
                    key={s}
                    className="text-xs px-2.5 py-1 rounded-full"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      color: "#64748b",
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>

            {/* Edge types */}
            <div
              className="rounded-2xl p-5 flex items-start gap-4"
              style={{
                background: "rgba(59,130,246,0.06)",
                border: "1px solid rgba(59,130,246,0.15)",
              }}
            >
              <GitBranch size={20} style={{ color: "#60a5fa", marginTop: 2, flexShrink: 0 }} />
              <div>
                <div className="text-sm font-bold mb-1" style={{ color: "#93c5fd" }}>Graph-first architecture</div>
                <div className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
                  Relationships: TEACHES_BEFORE · REQUIRES · CROSS_SUBJECT · PART_OF · ASSESSED_BY — enabling AI agents to traverse learning paths no flat curriculum can represent.
                </div>
              </div>
            </div>

            {/* Exam alignment */}
            <div
              className="rounded-2xl p-5 flex items-start gap-4"
              style={{
                background: "rgba(16,185,129,0.06)",
                border: "1px solid rgba(16,185,129,0.15)",
              }}
            >
              <Layers size={20} style={{ color: "#34d399", marginTop: 2, flexShrink: 0 }} />
              <div>
                <div className="text-sm font-bold mb-1" style={{ color: "#6ee7b7" }}>Exam body alignment per node</div>
                <div className="text-xs leading-relaxed" style={{ color: "#64748b" }}>
                  Every topic carries its WAEC / NECO / JAMB / JUPEB exam standard tags so AI-generated questions are calibrated to the exact standard teachers need.
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
