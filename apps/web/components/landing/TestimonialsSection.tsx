"use client";
import { motion } from "framer-motion";

const TESTIMONIALS = [
  {
    quote: "Before TeachNexis, writing a lesson note would take me 2–3 hours. Now I generate a full, WAEC-aligned note in under a minute. It understands our curriculum perfectly.",
    name: "Mrs. Adaeze Okafor",
    role: "Senior Mathematics Teacher",
    school: "Government Secondary School, Lagos",
    initials: "AO",
    color: "#3b82f6",
    results: "90% time saved on lesson preparation",
  },
  {
    quote: "I use it to generate exams, mark scripts, and track each student's progress. The AI actually knows the difference between WAEC and JAMB question styles. It's remarkable.",
    name: "Mr. Ibrahim Musa",
    role: "HOD, Sciences Department",
    school: "Government College Biu, Borno State",
    initials: "IM",
    color: "#8b5cf6",
    results: "42% improvement in class pass rates",
  },
  {
    quote: "The AI study buddy helped my SS3 students practice on their own before WAEC. They could ask it to explain any topic, get quizzed, or review their weak areas. Results showed.",
    name: "Miss Chidinma Eze",
    role: "Biology & Chemistry Teacher",
    school: "Awka Girls Secondary School, Anambra",
    initials: "CE",
    color: "#10b981",
    results: "78% of students passed Biology WAEC",
  },
];

export function TestimonialsSection() {
  return (
    <section
      id="testimonials"
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
            background: "rgba(245,158,11,0.08)", color: "#d97706",
            border: "1px solid rgba(245,158,11,0.2)",
          }}>
            What Teachers Say
          </span>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 900, lineHeight: 1.1,
            letterSpacing: "-0.03em", color: "#0f172a", marginBottom: 16,
          }}>
            Trusted by Nigerian teachers.
            <br />
            <span style={{ color: "#d97706" }}>Built for their classrooms.</span>
          </h2>
        </motion.div>

        {/* Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 24,
        }}>
          {TESTIMONIALS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                padding: "36px 32px",
                borderRadius: 24,
                background: "#ffffff",
                border: "1px solid rgba(0,0,0,0.07)",
                boxShadow: "0 2px 20px rgba(0,0,0,0.04)",
                display: "flex",
                flexDirection: "column",
                gap: 0,
              }}
            >
              {/* Quote mark */}
              <div style={{
                fontSize: 64, lineHeight: 0.8, color: t.color,
                opacity: 0.2, fontFamily: "Georgia, serif",
                marginBottom: 16,
              }}>
                "
              </div>

              {/* Quote */}
              <p style={{
                fontSize: 16, lineHeight: 1.75,
                color: "#334155", flex: 1, marginBottom: 28,
              }}>
                {t.quote}
              </p>

              {/* Result badge */}
              <div style={{
                display: "inline-block",
                padding: "6px 12px", borderRadius: 8, marginBottom: 20,
                background: `${t.color}08`, border: `1px solid ${t.color}20`,
                fontSize: 12, fontWeight: 700, color: t.color,
                width: "fit-content",
              }}>
                ↑ {t.results}
              </div>

              <div style={{ height: 1, background: "rgba(0,0,0,0.06)", marginBottom: 20 }} />

              {/* Author */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: `linear-gradient(135deg, ${t.color}30, ${t.color}10)`,
                  border: `2px solid ${t.color}30`,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 14, fontWeight: 800, color: t.color,
                  flexShrink: 0,
                }}>
                  {t.initials}
                </div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 800, color: "#0f172a" }}>{t.name}</div>
                  <div style={{ fontSize: 12, color: "#64748b" }}>{t.role}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 1 }}>{t.school}</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
