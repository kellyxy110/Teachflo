"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles, FileText, Brain, ClipboardCheck, Users, BookOpen,
  BarChart3, MessageSquare, FileBarChart2, Calendar, Mic, Globe, Zap,
} from "lucide-react";

const CAPABILITIES = [
  {
    icon: Sparkles, color: "#3b82f6",
    title: "AI Lesson Planning",
    desc: "Generate complete 8-section lesson notes aligned to NERDC in under 10 seconds. Supports Standard, ELI12, WAEC, JAMB, and JUPEB reading levels.",
  },
  {
    icon: Globe, color: "#6366f1",
    title: "Curriculum Mapping",
    desc: "Navigate 618 NERDC topic nodes, 473 prerequisite edges, and cross-subject links. Find any topic instantly with full Bloom's taxonomy tagging.",
  },
  {
    icon: Brain, color: "#8b5cf6",
    title: "Question Generation",
    desc: "AI creates MCQs with deliberate misconceptions as distractors, open-ended questions, fill-in-the-blank, and WAEC past question variants.",
  },
  {
    icon: ClipboardCheck, color: "#10b981",
    title: "Automatic Grading",
    desc: "Upload student scripts and get instant AI marking with point-by-point explanations and detailed per-student performance breakdown.",
  },
  {
    icon: BarChart3, color: "#f59e0b",
    title: "Student Analytics",
    desc: "Track every student's performance trajectory across subjects, terms, and exam types. Identify weak topics and predict WAEC performance.",
  },
  {
    icon: Zap, color: "#ec4899",
    title: "Personalized Learning",
    desc: "AI Study Buddy adapts to each student's weak areas. 5 learning modes: Explain, Test, Hint, Step-by-Step, and Review My Mistakes.",
  },
  {
    icon: MessageSquare, color: "#06b6d4",
    title: "Parent Communication",
    desc: "Auto-generate progress reports, attendance summaries, and performance alerts. Share with parents via digital portal or PDF export.",
  },
  {
    icon: FileBarChart2, color: "#22c55e",
    title: "Report Cards",
    desc: "Generate term report cards with ordinal ranking, Nigerian A–F grading (70–100 = A), and export to Excel or PDF with school letterhead.",
  },
  {
    icon: Users, color: "#f97316",
    title: "Attendance Register",
    desc: "4-status digital register (Present, Absent, Late, Excused). Date navigation, monthly stats, and automatic absenteeism alerts.",
  },
  {
    icon: BookOpen, color: "#a855f7",
    title: "Digital Library",
    desc: "Access WAEC past questions from 2014–2024, textbook references, AI-summarized chapters, and teacher-uploaded resources.",
  },
  {
    icon: Calendar, color: "#14b8a6",
    title: "Scheme of Work",
    desc: "Auto-generate full-term and full-year schemes of work for any subject and class level. Aligned to NERDC with weekly topic breakdown.",
  },
  {
    icon: FileText, color: "#ef4444",
    title: "Learning Insights",
    desc: "Mistake Intelligence detects recurring error patterns, clusters by topic and Bloom level, and recommends targeted remediation exercises.",
  },
];

export function IntelligenceLayerSection() {
  const [active, setActive] = useState<number | null>(null);

  return (
    <section
      id="features"
      className="landing-section"
      style={{ padding: "120px 24px", background: "#f8fafc" }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 72 }}
        >
          <span style={{
            display: "inline-block", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.18em", textTransform: "uppercase",
            padding: "6px 14px", borderRadius: 100, marginBottom: 20,
            background: "rgba(99,102,241,0.08)", color: "#6366f1",
            border: "1px solid rgba(99,102,241,0.2)",
          }}>
            The Intelligence Layer
          </span>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 900, lineHeight: 1.1,
            letterSpacing: "-0.03em", marginBottom: 16, color: "#0f172a",
          }}>
            Built Around AI.
            <br />
            <span style={{
              background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              Designed Around Teachers.
            </span>
          </h2>
          <p style={{ fontSize: 17, color: "#64748b", maxWidth: 520, margin: "0 auto", lineHeight: 1.7 }}>
            Every feature is powered by AI and grounded in Nigerian curriculum standards. Click any capability to learn more.
          </p>
        </motion.div>

        {/* Capability grid */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
          gap: 12,
        }}>
          {CAPABILITIES.map((cap, i) => (
            <motion.button
              key={cap.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.04 }}
              onClick={() => setActive(active === i ? null : i)}
              style={{
                padding: active === i ? "20px" : "16px 18px",
                borderRadius: 16,
                background: active === i ? `${cap.color}08` : "#ffffff",
                border: `1px solid ${active === i ? cap.color + "30" : "rgba(0,0,0,0.07)"}`,
                cursor: "pointer",
                textAlign: "left",
                transition: "all 0.25s",
                boxShadow: active === i ? `0 8px 32px ${cap.color}15` : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: active === i ? 12 : 0 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${cap.color}12`,
                }}>
                  <cap.icon size={16} style={{ color: cap.color }} />
                </div>
                <span style={{
                  fontSize: 14, fontWeight: 700,
                  color: active === i ? "#0f172a" : "#334155",
                }}>
                  {cap.title}
                </span>
              </div>

              <AnimatePresence>
                {active === i && (
                  <motion.p
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.22 }}
                    style={{ fontSize: 13, color: "#64748b", lineHeight: 1.6, overflow: "hidden", marginTop: 4 }}
                  >
                    {cap.desc}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.button>
          ))}
        </div>
      </div>
    </section>
  );
}
