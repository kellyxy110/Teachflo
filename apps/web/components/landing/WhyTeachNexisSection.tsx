"use client";
import { motion } from "framer-motion";
import { Sparkles, FlaskConical, Users, BarChart3, BookMarked, MessageSquareText } from "lucide-react";

const FEATURES = [
  {
    icon: Sparkles,
    color: "#3b82f6",
    title: "AI Lesson Studio",
    body: "Create complete, curriculum-aligned lesson notes in seconds. Every note follows the Nigerian 8-section format grounded in NERDC, WAEC, and JAMB standards.",
  },
  {
    icon: FlaskConical,
    color: "#8b5cf6",
    title: "Smart Exam Builder",
    body: "Generate professional examinations with automatic marking schemes, Bloom's taxonomy tagging, and WAEC-calibre multiple choice distractors.",
  },
  {
    icon: Users,
    color: "#10b981",
    title: "Student Intelligence",
    body: "Monitor attendance, grades, behaviour patterns, and learning progress across every class and term from a single dashboard.",
  },
  {
    icon: BookMarked,
    color: "#f59e0b",
    title: "Curriculum Intelligence",
    body: "Search 618 curriculum topics instantly. Generate schemes of work, weekly plans, lesson objectives, and assessment ideas aligned to NERDC.",
  },
  {
    icon: MessageSquareText,
    color: "#ec4899",
    title: "AI Teaching Assistant",
    body: "Ask. Generate. Explain. Rewrite. Teach. Your personal AI assistant that understands Nigerian secondary school curriculum inside and out.",
  },
  {
    icon: BarChart3,
    color: "#06b6d4",
    title: "School Analytics",
    body: "Comprehensive performance analytics across classes, subjects, and terms. Export report cards, CA records, and rankings with one click.",
  },
];

const card = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.08, ease: "easeOut" },
  }),
};

export function WhyTeachNexisSection() {
  return (
    <section
      id="why"
      className="landing-section"
      style={{ padding: "120px 24px", background: "#ffffff" }}
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
          <span
            style={{
              display: "inline-block", fontSize: 11, fontWeight: 800,
              letterSpacing: "0.18em", textTransform: "uppercase",
              padding: "6px 14px", borderRadius: 100, marginBottom: 20,
              background: "rgba(37,99,235,0.07)", color: "#2563eb",
              border: "1px solid rgba(37,99,235,0.18)",
            }}
          >
            Why TeachNexis
          </span>
          <h2
            style={{
              fontSize: "clamp(2rem, 4vw, 3.2rem)",
              fontWeight: 900, lineHeight: 1.1,
              letterSpacing: "-0.03em", marginBottom: 16,
              color: "#0f172a",
            }}
          >
            One Platform.
            <br />
            <span style={{
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              Every Classroom. Endless Possibilities.
            </span>
          </h2>
          <p style={{ maxWidth: 560, margin: "0 auto", fontSize: 17, color: "#64748b", lineHeight: 1.7 }}>
            Built from the ground up for Nigerian secondary schools — not adapted from foreign EdTech. Every feature understands your curriculum, your students, and your classroom.
          </p>
        </motion.div>

        {/* Feature cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
            gap: 20,
          }}
        >
          {FEATURES.map((f, i) => (
            <motion.div
              key={f.title}
              variants={card}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i}
              whileHover={{ y: -4, boxShadow: `0 16px 40px ${f.color}18` }}
              style={{
                padding: "28px 28px 24px",
                borderRadius: 20,
                background: "#ffffff",
                border: `1px solid ${f.color}18`,
                boxShadow: `0 2px 12px rgba(0,0,0,0.04)`,
                transition: "box-shadow 0.3s",
                cursor: "default",
              }}
            >
              <div
                style={{
                  width: 48, height: 48, borderRadius: 14, marginBottom: 20,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: `${f.color}10`, border: `1px solid ${f.color}22`,
                }}
              >
                <f.icon size={22} style={{ color: f.color }} />
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 800, marginBottom: 10, color: "#0f172a" }}>{f.title}</h3>
              <p style={{ fontSize: 14, lineHeight: 1.65, color: "#64748b" }}>{f.body}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
