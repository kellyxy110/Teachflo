"use client";
import { useRef, useCallback } from "react";
import Link from "next/link";
import { motion, useMotionValue, useSpring, useTransform, type MotionValue } from "framer-motion";
import { Sparkles, Play, Zap, ChevronRight } from "lucide-react";

const SUBJECTS = [
  { name: "Mathematics SS3", icon: "📐", color: "#3b82f6" },
  { name: "Physics JS2", icon: "🔬", color: "#8b5cf6" },
  { name: "English Language", icon: "📚", color: "#10b981" },
];

const METRIC_CARDS = [
  { id: "perf", value: "+47%", label: "Student Performance", color: "#10b981", bg: "rgba(16,185,129,0.12)", border: "rgba(16,185,129,0.25)", x: -170, y: -90, delay: 0.2 },
  { id: "speed", value: "2 sec", label: "Lesson Generated", color: "#3b82f6", bg: "rgba(59,130,246,0.12)", border: "rgba(59,130,246,0.25)", x: 160, y: -110, delay: 0.5 },
  { id: "tutor", value: "Live", label: "AI Tutor Active", color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", border: "rgba(139,92,246,0.25)", x: 170, y: 80, delay: 0.8 },
  { id: "attend", value: "Done", label: "Attendance Complete", color: "#f59e0b", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.25)", x: -160, y: 100, delay: 1.1 },
];

function FloatingDashboard({ springX, springY }: { springX: MotionValue<number>; springY: MotionValue<number> }) {
  const rotateX = useTransform(springY, [-200, 200], [6, -6]);
  const rotateY = useTransform(springX, [-200, 200], [-6, 6]);

  return (
    <div style={{ position: "relative", width: 320, height: 420, margin: "0 auto" }}>
      {/* Glow behind cards */}
      <div
        aria-hidden
        style={{
          position: "absolute",
          inset: -40,
          background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(59,130,246,0.18), rgba(139,92,246,0.12), transparent 70%)",
          filter: "blur(20px)",
          pointerEvents: "none",
        }}
      />

      {/* Central dashboard card */}
      <motion.div
        style={{
          rotateX,
          rotateY,
          transformStyle: "preserve-3d",
          transformPerspective: 1000,
          position: "absolute",
          inset: 0,
          borderRadius: 20,
          background: "rgba(255,255,255,0.06)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          border: "1px solid rgba(255,255,255,0.13)",
          boxShadow: "0 40px 80px rgba(0,0,0,0.45), 0 0 0 1px rgba(255,255,255,0.06) inset",
          overflow: "hidden",
          padding: 24,
        }}
        animate={{ y: [0, -14, 0] }}
        transition={{ duration: 5.5, repeat: Infinity, ease: "easeInOut" }}
      >
        {/* Card header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
          <div>
            <div style={{ fontSize: 11, color: "rgba(148,163,184,0.8)", fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", marginBottom: 2 }}>
              Teacher Dashboard
            </div>
            <div style={{ fontSize: 13, color: "#f1f5f9", fontWeight: 700 }}>Good morning, Mrs. Adaeze</div>
          </div>
          <div style={{ display: "flex", gap: 5 }}>
            {["#3b82f6", "#10b981", "#f59e0b"].map((c) => (
              <div key={c} style={{ width: 8, height: 8, borderRadius: "50%", background: c }} />
            ))}
          </div>
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 16 }} />

        {/* Today's classes */}
        <div style={{ fontSize: 11, color: "rgba(148,163,184,0.7)", fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>
          Today&apos;s Classes
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {SUBJECTS.map((s) => (
            <div
              key={s.name}
              style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: "8px 12px", borderRadius: 10,
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <span style={{ fontSize: 14 }}>{s.icon}</span>
              <span style={{ fontSize: 12, color: "#e2e8f0", fontWeight: 600, flex: 1 }}>{s.name}</span>
              <ChevronRight size={12} style={{ color: "rgba(148,163,184,0.5)" }} />
            </div>
          ))}
        </div>

        <div style={{ height: 1, background: "rgba(255,255,255,0.07)", marginBottom: 16 }} />

        {/* AI Lesson Ready */}
        <div
          style={{
            padding: "12px 14px", borderRadius: 12,
            background: "rgba(59,130,246,0.12)",
            border: "1px solid rgba(59,130,246,0.22)",
            marginBottom: 16,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
            <Sparkles size={12} style={{ color: "#60a5fa" }} />
            <span style={{ fontSize: 11, color: "#60a5fa", fontWeight: 700, letterSpacing: "0.06em" }}>AI LESSON READY</span>
          </div>
          <div style={{ fontSize: 12, color: "#cbd5e1", lineHeight: 1.4 }}>Mathematics: Properties of Quadratic Equations — SS3</div>
        </div>

        {/* Bottom row */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 10, textAlign: "center",
              background: "linear-gradient(135deg, #3b82f6, #6366f1)",
              fontSize: 11, fontWeight: 700, color: "#fff", cursor: "pointer",
            }}
          >
            Generate Exam
          </div>
          <div
            style={{
              flex: 1, padding: "8px 12px", borderRadius: 10, textAlign: "center",
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)",
              fontSize: 11, fontWeight: 700, color: "#94a3b8", cursor: "pointer",
            }}
          >
            View Note
          </div>
        </div>
      </motion.div>

      {/* Metric cards */}
      {METRIC_CARDS.map((card) => (
        <motion.div
          key={card.id}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1, y: [0, -8, 0] }}
          transition={{
            opacity: { duration: 0.5, delay: card.delay + 0.8 },
            scale: { duration: 0.4, delay: card.delay + 0.8 },
            y: { duration: 4 + card.delay * 0.5, delay: card.delay, repeat: Infinity, ease: "easeInOut" },
          }}
          style={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: `translate(calc(-50% + ${card.x}px), calc(-50% + ${card.y}px))`,
            padding: "8px 12px",
            borderRadius: 12,
            background: card.bg,
            border: `1px solid ${card.border}`,
            backdropFilter: "blur(16px)",
            WebkitBackdropFilter: "blur(16px)",
            boxShadow: `0 8px 24px rgba(0,0,0,0.3)`,
            whiteSpace: "nowrap",
            zIndex: 20,
          }}
        >
          <div style={{ fontSize: 16, fontWeight: 800, color: card.color, lineHeight: 1 }}>{card.value}</div>
          <div style={{ fontSize: 10, color: "rgba(148,163,184,0.8)", fontWeight: 600, marginTop: 2 }}>{card.label}</div>
        </motion.div>
      ))}
    </div>
  );
}

export function HeroSection() {
  const rightRef = useRef<HTMLDivElement>(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 60, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 60, damping: 20 });

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = rightRef.current?.getBoundingClientRect();
    if (!rect) return;
    mouseX.set(e.clientX - rect.left - rect.width / 2);
    mouseY.set(e.clientY - rect.top - rect.height / 2);
  }, [mouseX, mouseY]);

  const handleMouseLeave = useCallback(() => {
    mouseX.set(0);
    mouseY.set(0);
  }, [mouseX, mouseY]);

  return (
    <section
      id="hero"
      aria-label="Hero"
      className="relative overflow-hidden"
      style={{
        minHeight: "100vh",
        background: "linear-gradient(160deg, #050d1f 0%, #0a1628 50%, #06101e 100%)",
        display: "flex",
        alignItems: "center",
      }}
    >
      {/* Background glow orbs */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none", overflow: "hidden" }}>
        <div style={{
          position: "absolute", top: "20%", left: "5%", width: 600, height: 600,
          background: "radial-gradient(circle, rgba(37,99,235,0.08) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
        <div style={{
          position: "absolute", top: "30%", right: "10%", width: 500, height: 500,
          background: "radial-gradient(circle, rgba(139,92,246,0.07) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
        <div style={{
          position: "absolute", bottom: "10%", left: "30%", width: 400, height: 400,
          background: "radial-gradient(circle, rgba(245,158,11,0.05) 0%, transparent 70%)",
          filter: "blur(40px)",
        }} />
        {/* Subtle grid pattern */}
        <div style={{
          position: "absolute", inset: 0, opacity: 0.03,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      </div>

      <div
        className="relative z-10 w-full max-w-7xl mx-auto px-6 lg:px-12"
        style={{
          paddingTop: 100,
          paddingBottom: 80,
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 64,
          alignItems: "center",
        }}
      >
        {/* ── Left: Content ───────────────────────────── */}
        <div>
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            style={{
              display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28,
              padding: "6px 14px", borderRadius: 100,
              background: "rgba(59,130,246,0.1)",
              border: "1px solid rgba(59,130,246,0.25)",
              color: "#60a5fa", fontSize: 12, fontWeight: 700,
            }}
          >
            <Sparkles size={12} aria-hidden />
            AI-Powered Education Platform · Nigerian Schools
          </motion.div>

          {/* H1 */}
          <motion.h1
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            style={{
              fontSize: "clamp(2.6rem, 5vw, 4.2rem)",
              fontWeight: 900,
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
              marginBottom: 24,
              color: "#f8fafc",
            }}
          >
            One workspace for
            <br />
            <span style={{ color: "#3b82f6" }}>better teaching</span>
            <br />
            <span style={{
              background: "linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}>
              and learning.
            </span>
          </motion.h1>

          {/* Body */}
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.22 }}
            style={{ fontSize: 17, lineHeight: 1.7, color: "#94a3b8", marginBottom: 36, maxWidth: 480 }}
          >
            TeachNexis connects lesson preparation, classroom records, reusable assessment content and student practice in one teacher-led workspace for Nigerian schools.
          </motion.p>

          {/* CTAs */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.34 }}
            style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 36 }}
          >
            <Link
              href="/sign-up"
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 28px", borderRadius: 14,
                background: "linear-gradient(135deg, #2563eb, #7c3aed)",
                color: "#fff", fontWeight: 700, fontSize: 15,
                boxShadow: "0 0 40px rgba(37,99,235,0.35), 0 4px 20px rgba(0,0,0,0.3)",
                textDecoration: "none",
                transition: "transform 0.2s, box-shadow 0.2s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.03)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
            >
              <Zap size={16} aria-hidden /> Get Started Free
            </Link>
            <button
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "14px 24px", borderRadius: 14,
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.12)",
                color: "#e2e8f0", fontWeight: 600, fontSize: 15, cursor: "pointer",
                transition: "background 0.2s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
            >
              <div style={{
                width: 28, height: 28, borderRadius: "50%",
                background: "rgba(255,255,255,0.12)",
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <Play size={10} style={{ marginLeft: 2 }} />
              </div>
              Watch Demo
            </button>
          </motion.div>

          {/* Trust row */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}
          >
            <span style={{ fontSize: 12, color: "#475569", fontWeight: 600 }}>Trusted by</span>
            {["Teachers", "Schools", "Tutors", "Academies", "Learning Centers"].map((label, i) => (
              <span key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {i > 0 && <span style={{ color: "#1e293b" }}>·</span>}
                <span style={{ fontSize: 12, color: "#3b82f6", fontWeight: 600 }}>{label}</span>
              </span>
            ))}
          </motion.div>
        </div>

        {/* ── Right: Floating Dashboard ────────────────── */}
        <motion.div
          ref={rightRef}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          initial={{ opacity: 0, x: 40 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.9, delay: 0.4 }}
          style={{
            position: "relative",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 480,
          }}
        >
          <FloatingDashboard springX={springX} springY={springY} />
        </motion.div>
      </div>

      {/* Bottom fade */}
      <div
        aria-hidden
        style={{
          position: "absolute", bottom: 0, left: 0, right: 0, height: 120,
          background: "linear-gradient(to bottom, transparent, #050d1f)",
          pointerEvents: "none",
        }}
      />

      {/* Mobile: stack columns */}
      <style>{`
        @media (max-width: 768px) {
          #hero > div > div {
            grid-template-columns: 1fr !important;
            gap: 40px !important;
            padding-top: 90px !important;
          }
          #hero [data-floating] {
            display: none;
          }
        }
      `}</style>
    </section>
  );
}
