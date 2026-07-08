"use client";
import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, ChevronRight } from "lucide-react";

const STEPS = [
  {
    id: "teacher",
    label: "Teacher Opens Lesson Studio",
    icon: "👩‍🏫",
    color: "#3b82f6",
    content: "Mathematics · SS3 · Quadratic Equations",
  },
  {
    id: "ai",
    label: "AI Generates Full Lesson Note",
    icon: "✨",
    color: "#8b5cf6",
    content: "8-section lesson note ready in 4 seconds",
  },
  {
    id: "exam",
    label: "Exam Built from Lesson Content",
    icon: "📝",
    color: "#10b981",
    content: "30 WAEC-calibre questions with marking scheme",
  },
  {
    id: "analytics",
    label: "Student Results Updated",
    icon: "📊",
    color: "#f59e0b",
    content: "Class average: 71.4% · Top scorer: Chidinma E.",
  },
];

const LESSON_LINES = [
  { label: "LEARNING OBJECTIVES", value: "Students will factorise quadratic expressions and solve quadratic equations using three methods.", delay: 0 },
  { label: "ENTRY BEHAVIOUR", value: "Students can expand algebraic expressions and solve simple linear equations.", delay: 0.3 },
  { label: "INSTRUCTIONAL MATERIALS", value: "Chart showing the quadratic formula. Graph paper. Worked examples from 2019–2024 WAEC papers.", delay: 0.6 },
  { label: "PRESENTATION (STEP 1)", value: "Teacher introduces the standard form ax² + bx + c = 0 using a real-world projectile example...", delay: 0.9 },
  { label: "CLASS EXERCISE", value: "Solve: (i) x² – 5x + 6 = 0  (ii) 2x² + 7x – 15 = 0  (iii) x² = 4x – 3", delay: 1.2 },
];

export function VideoShowcaseSection() {
  const [activeStep, setActiveStep] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    const stepTimer = setInterval(() => {
      setActiveStep((s) => (s + 1) % STEPS.length);
      setVisibleLines(0);
    }, 4000);
    return () => clearInterval(stepTimer);
  }, []);

  useEffect(() => {
    if (activeStep !== 1) return;
    let i = 0;
    const lineTimer = setInterval(() => {
      i++;
      setVisibleLines(i);
      if (i >= LESSON_LINES.length) clearInterval(lineTimer);
    }, 600);
    return () => clearInterval(lineTimer);
  }, [activeStep]);

  return (
    <section
      className="landing-section"
      style={{
        padding: "120px 24px",
        background: "linear-gradient(180deg, #050d1f 0%, #0a1628 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background glow */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: "radial-gradient(ellipse 80% 50% at 50% 50%, rgba(37,99,235,0.07), transparent 70%)",
      }} />

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 64 }}
        >
          <span style={{
            display: "inline-block", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.18em", textTransform: "uppercase",
            padding: "6px 14px", borderRadius: 100, marginBottom: 20,
            background: "rgba(139,92,246,0.12)", color: "#a78bfa",
            border: "1px solid rgba(139,92,246,0.25)",
          }}>
            See It In Action
          </span>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 900, lineHeight: 1.1,
            letterSpacing: "-0.03em", marginBottom: 16, color: "#f8fafc",
          }}>
            From idea to full lesson in seconds.
          </h2>
          <p style={{ fontSize: 17, color: "#64748b", maxWidth: 500, margin: "0 auto" }}>
            Watch how TeachNexis transforms a subject name into a complete, curriculum-aligned teaching experience.
          </p>
        </motion.div>

        {/* Main showcase */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7, delay: 0.2 }}
          style={{
            borderRadius: 24,
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            backdropFilter: "blur(20px)",
            WebkitBackdropFilter: "blur(20px)",
            overflow: "hidden",
          }}
        >
          {/* Steps progress bar */}
          <div style={{
            display: "flex",
            borderBottom: "1px solid rgba(255,255,255,0.07)",
          }}>
            {STEPS.map((step, i) => (
              <button
                key={step.id}
                onClick={() => { setActiveStep(i); setVisibleLines(0); }}
                style={{
                  flex: 1, padding: "16px 12px",
                  background: activeStep === i ? `${step.color}10` : "transparent",
                  border: "none", cursor: "pointer",
                  borderBottom: activeStep === i ? `2px solid ${step.color}` : "2px solid transparent",
                  transition: "all 0.3s",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 8, justifyContent: "center" }}>
                  {activeStep > i
                    ? <CheckCircle2 size={14} style={{ color: step.color }} />
                    : <span style={{ fontSize: 14 }}>{step.icon}</span>
                  }
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: activeStep === i ? step.color : "#475569",
                    letterSpacing: "0.04em",
                    display: "none",
                  }}
                    className="step-label"
                  >
                    {step.label}
                  </span>
                </div>
              </button>
            ))}
          </div>

          {/* Content area */}
          <div style={{ padding: "40px 48px", minHeight: 340 }}>
            <AnimatePresence mode="wait">
              {activeStep === 0 && (
                <motion.div
                  key="teacher"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                  style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 560 }}
                >
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9" }}>Opening Lesson Studio…</div>
                  <div style={{
                    padding: "20px 24px", borderRadius: 16,
                    background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)",
                  }}>
                    <div style={{ fontSize: 12, color: "#60a5fa", fontWeight: 700, marginBottom: 12, letterSpacing: "0.08em" }}>LESSON DETAILS</div>
                    {[
                      { label: "Subject", value: "Mathematics" },
                      { label: "Class", value: "SS3" },
                      { label: "Topic", value: "Quadratic Equations" },
                      { label: "Alignment", value: "NERDC · WAEC 2024" },
                    ].map(({ label, value }) => (
                      <div key={label} style={{ display: "flex", justifyContent: "space-between", padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
                        <span style={{ fontSize: 13, color: "#64748b" }}>{label}</span>
                        <span style={{ fontSize: 13, color: "#e2e8f0", fontWeight: 600 }}>{value}</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "12px 20px", borderRadius: 12, background: "linear-gradient(135deg, #2563eb, #7c3aed)", color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", width: "fit-content" }}>
                    <Sparkles size={14} /> Generate Full Lesson Note
                  </div>
                </motion.div>
              )}

              {activeStep === 1 && (
                <motion.div
                  key="ai"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 24 }}>
                    <div style={{
                      display: "flex", alignItems: "center", gap: 6,
                      padding: "6px 12px", borderRadius: 8,
                      background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.25)",
                    }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#a78bfa", animation: "pulse 1.5s infinite" }} />
                      <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700 }}>AI GENERATING</span>
                    </div>
                    <span style={{ fontSize: 13, color: "#64748b" }}>Mathematics · SS3 · Quadratic Equations</span>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 620 }}>
                    {LESSON_LINES.slice(0, visibleLines).map((line, i) => (
                      <motion.div
                        key={line.label}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{
                          padding: "12px 16px", borderRadius: 10,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                      >
                        <div style={{ fontSize: 10, color: "#8b5cf6", fontWeight: 700, letterSpacing: "0.1em", marginBottom: 4 }}>{line.label}</div>
                        <div style={{ fontSize: 13, color: "#cbd5e1", lineHeight: 1.5 }}>{line.value}</div>
                      </motion.div>
                    ))}
                    {visibleLines < LESSON_LINES.length && (
                      <div style={{ display: "flex", gap: 4, paddingLeft: 16 }}>
                        {[0, 1, 2].map((i) => (
                          <motion.div
                            key={i}
                            animate={{ y: [0, -4, 0] }}
                            transition={{ duration: 0.6, delay: i * 0.15, repeat: Infinity }}
                            style={{ width: 6, height: 6, borderRadius: "50%", background: "#8b5cf6" }}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                </motion.div>
              )}

              {activeStep === 2 && (
                <motion.div
                  key="exam"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                  style={{ maxWidth: 580 }}
                >
                  <div style={{ fontSize: 22, fontWeight: 800, color: "#f1f5f9", marginBottom: 20 }}>Exam Generated</div>
                  {[1, 2, 3].map((n) => (
                    <div key={n} style={{
                      padding: "14px 16px", borderRadius: 12, marginBottom: 10,
                      background: "rgba(16,185,129,0.05)", border: "1px solid rgba(16,185,129,0.15)",
                    }}>
                      <div style={{ fontSize: 12, color: "#94a3b8", marginBottom: 6 }}>Question {n}</div>
                      <div style={{ fontSize: 13, color: "#e2e8f0", marginBottom: 10 }}>
                        {n === 1 && "Solve the equation x² – 7x + 12 = 0 by factorisation."}
                        {n === 2 && "Using the quadratic formula, solve 3x² + 5x – 2 = 0."}
                        {n === 3 && "A ball is thrown upward. Its height h = 20t – 5t². When does it return to ground level?"}
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        {["A", "B", "C", "D"].map((opt) => (
                          <div key={opt} style={{
                            padding: "4px 10px", borderRadius: 6, fontSize: 11,
                            background: opt === "A" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.04)",
                            border: `1px solid ${opt === "A" ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.07)"}`,
                            color: opt === "A" ? "#34d399" : "#475569",
                            fontWeight: 600,
                          }}>
                            {opt}
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  <div style={{ fontSize: 12, color: "#64748b", marginTop: 8 }}>
                    + 27 more questions with full marking scheme
                  </div>
                </motion.div>
              )}

              {activeStep === 3 && (
                <motion.div
                  key="analytics"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
                  style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, maxWidth: 620 }}
                >
                  {[
                    { label: "Class Average", value: "71.4%", color: "#3b82f6", sub: "↑ 8.2 pts from last term" },
                    { label: "Top Scorer", value: "Chidinma E.", color: "#10b981", sub: "Score: 94/100" },
                    { label: "Below 60%", value: "7 students", color: "#f59e0b", sub: "Needs attention" },
                    { label: "Pass Rate", value: "82%", color: "#8b5cf6", sub: "Target: 80% ✓" },
                  ].map((stat) => (
                    <div key={stat.label} style={{
                      padding: "20px 20px", borderRadius: 16,
                      background: `${stat.color}08`, border: `1px solid ${stat.color}20`,
                    }}>
                      <div style={{ fontSize: 11, color: "#64748b", fontWeight: 700, letterSpacing: "0.08em", marginBottom: 8 }}>
                        {stat.label}
                      </div>
                      <div style={{ fontSize: 26, fontWeight: 900, color: stat.color, marginBottom: 4 }}>{stat.value}</div>
                      <div style={{ fontSize: 11, color: "#475569" }}>{stat.sub}</div>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Progress bar */}
          <div style={{ height: 2, background: "rgba(255,255,255,0.05)" }}>
            <motion.div
              key={activeStep}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 4, ease: "linear" }}
              style={{ height: "100%", background: STEPS[activeStep].color }}
            />
          </div>
        </motion.div>

        {/* Step labels below */}
        <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, padding: "0 4px" }}>
          {STEPS.map((step, i) => (
            <div
              key={step.id}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                opacity: activeStep === i ? 1 : 0.4,
                transition: "opacity 0.3s",
              }}
            >
              <span style={{ fontSize: 13 }}>{step.icon}</span>
              <span style={{ fontSize: 12, color: activeStep === i ? step.color : "#475569", fontWeight: 600 }}>
                {step.label}
              </span>
              {i < STEPS.length - 1 && <ChevronRight size={14} style={{ color: "#1e293b" }} />}
            </div>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1 } 50% { opacity: 0.4 } }
        @media (max-width: 768px) {
          .step-label { display: none !important; }
        }
      `}</style>
    </section>
  );
}
