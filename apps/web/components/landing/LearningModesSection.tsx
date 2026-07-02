"use client";
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import dynamic from "next/dynamic";
import { BookOpen, Target, Compass, Brain, Zap, Trophy, BarChart2, FileText } from "lucide-react";
import { BentoGrid } from "./BentoGrid";
import { LearningCarousel } from "./LearningCarousel";

// Lazy-load PracticeArena — heaviest component, only needed in Explore mode
const PracticeArena = dynamic(
  () => import("./PracticeArena").then((m) => ({ default: m.PracticeArena })),
  {
    ssr: false,
    loading: () => (
      <div
        className="rounded-3xl p-16 text-center"
        style={{ background: "rgba(37,99,235,0.05)", border: "1px solid rgba(37,99,235,0.12)" }}
      >
        <div className="w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4" style={{ background: "rgba(37,99,235,0.1)" }}>
          <Trophy size={24} style={{ color: "#2563eb" }} />
        </div>
        <p className="text-sm" style={{ color: "#64748b" }}>Loading games…</p>
      </div>
    ),
  }
);

type Mode = "learn" | "practice" | "explore";

const MODES: {
  id: Mode;
  label: string;
  icon: React.ElementType;
  color: string;
  glow: string;
  headline: string;
  subline: string;
  pills: string[];
}[] = [
  {
    id: "learn",
    label: "Learn",
    icon: BookOpen,
    color: "#2563eb",
    glow: "rgba(37,99,235,0.12)",
    headline: "AI-generated content, perfectly aligned",
    subline: "Full lesson plans for any topic in WAEC, JAMB, JUPEB or ELI12 mode — generated in under 10 seconds.",
    pills: ["AI Lessons", "Exam Builder", "Bento Dashboard", "Skill Tracking"],
  },
  {
    id: "practice",
    label: "Practice",
    icon: Target,
    color: "#059669",
    glow: "rgba(5,150,105,0.12)",
    headline: "Study Buddy adapts to your weak spots",
    subline: "Choose how you want to learn: Explain, Test Me, Hint, or Step-by-Step. AI injects your skill data into every response.",
    pills: ["5 Learning Modes", "Skill Graph", "Weak Topic Focus", "Mistake Analysis"],
  },
  {
    id: "explore",
    label: "Explore",
    icon: Compass,
    color: "#d97706",
    glow: "rgba(217,119,6,0.12)",
    headline: "Challenge yourself with interactive games",
    subline: "Math Sprint, Concept Match, Fix the Answer, Quiz Battle — every game logs performance into your skill graph.",
    pills: ["4 Practice Games", "Scientific Calculator", "Real-time Scoring", "Skill Logging"],
  },
];

// ── Practice mode content (lightweight, no auto-scroll on load) ──
function PracticeContent() {
  const FEATURES = [
    {
      icon: Brain,
      color: "#10b981",
      title: "Study Buddy AI",
      desc: "5 adaptive learning modes — Explain, Test Me, Hint, Step-by-step, Review Mistakes.",
    },
    {
      icon: BarChart2,
      color: "#3b82f6",
      title: "Skill Graph",
      desc: "Every answer updates your Bloom's Taxonomy skill map across all subjects in real time.",
    },
    {
      icon: Zap,
      color: "#f59e0b",
      title: "Weak Topic Focus",
      desc: "AI detects your weakest topics and builds targeted sessions around them automatically.",
    },
    {
      icon: FileText,
      color: "#8b5cf6",
      title: "Mistake Intelligence",
      desc: "Your errors are analysed for misconceptions and fed back into future sessions.",
    },
  ];

  return (
    <div className="space-y-12">
      {/* Feature cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {FEATURES.map(({ icon: Icon, color, title, desc }, i) => (
          <motion.div
            key={title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07, duration: 0.45 }}
            className="rounded-2xl p-5"
            style={{
              background: "#ffffff",
              border: `1px solid ${color}20`,
              boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
            }}
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
              style={{ background: `${color}15` }}
            >
              <Icon size={18} style={{ color }} aria-hidden="true" />
            </div>
            <h3 className="text-sm font-bold mb-1.5" style={{ color: "#0f172a" }}>{title}</h3>
            <p className="text-xs leading-relaxed" style={{ color: "#64748b" }}>{desc}</p>
          </motion.div>
        ))}
      </div>

      {/* Lesson carousel — only mounts when Practice mode is active */}
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.25em] mb-5 px-1" style={{ color: "#475569" }}>
          Recommended content
        </p>
        <LearningCarousel />
      </div>

      <div className="text-center">
        <a
          href="/sign-up"
          className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #10b981, #0891b2)", boxShadow: "0 0 30px rgba(16,185,129,0.25)" }}
        >
          <Target size={18} aria-hidden="true" />
          Start Practising →
        </a>
      </div>
    </div>
  );
}

// ── Main section ──────────────────────────────────────────────────
export function LearningModesSection() {
  const [mode, setMode] = useState<Mode>("learn");

  const active = MODES.find((m) => m.id === mode)!;

  return (
    <section
      id="modes"
      aria-label="Learning modes"
      style={{ background: "linear-gradient(180deg, #eff6ff 0%, #fef9f0 100%)" }}
      className="py-24 px-6 relative"
    >
      <span id="practice" className="absolute top-0" />
      <div className="max-w-6xl mx-auto">
        {/* Section header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          className="text-center mb-14"
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: "#475569" }}>
            Choose your path
          </p>
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: "#0f172a" }}>
            One platform,{" "}
            <span className="gradient-text">three learning modes</span>
          </h2>
          <p className="text-base max-w-lg mx-auto" style={{ color: "#64748b" }}>
            Whether you want to study, practise, or explore — TeachFlow adapts to how you learn best.
          </p>
        </motion.div>

        {/* Mode selector — keyboard accessible */}
        <div
          className="grid grid-cols-3 gap-3 md:gap-4 mb-12"
          role="tablist"
          aria-label="Learning modes"
        >
          {MODES.map((m) => {
            const isActive = mode === m.id;
            const Icon = m.icon;
            return (
              <button
                key={m.id}
                role="tab"
                aria-selected={isActive}
                aria-controls={`panel-${m.id}`}
                onClick={() => setMode(m.id)}
                className="relative rounded-2xl p-4 md:p-6 text-left transition-all focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
                style={{
                  background: isActive ? `${m.color}10` : "#ffffff",
                  border: isActive ? `1px solid ${m.color}40` : "1px solid rgba(0,0,0,0.07)",
                  boxShadow: isActive ? `0 4px 20px ${m.color}18` : "0 1px 4px rgba(0,0,0,0.05)",
                }}
              >
                {/* Active indicator line */}
                {isActive && (
                  <motion.div
                    layoutId="mode-indicator"
                    className="absolute top-0 left-4 right-4 h-0.5 rounded-full"
                    style={{ background: `linear-gradient(90deg, transparent, ${m.color}, transparent)` }}
                  />
                )}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center mb-2 md:mb-3"
                  style={{ background: isActive ? `${m.color}18` : "rgba(0,0,0,0.05)" }}
                >
                  <Icon size={18} style={{ color: isActive ? m.color : "#94a3b8" }} aria-hidden="true" />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <Icon size={14} style={{ color: isActive ? m.color : "#475569" }} aria-hidden="true" />
                  <span
                    className="font-black text-sm md:text-base"
                    style={{ color: isActive ? m.color : "#94a3b8" }}
                  >
                    {m.label}
                  </span>
                </div>
                <p className="text-xs hidden md:block leading-snug" style={{ color: "#475569" }}>
                  {m.subline.split(".")[0]}.
                </p>

                {/* Pills */}
                <div className="flex flex-wrap gap-1 mt-3 hidden md:flex">
                  {m.pills.map((p) => (
                    <span
                      key={p}
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: isActive ? `${m.color}18` : "rgba(255,255,255,0.04)",
                        color: isActive ? m.color : "#334155",
                        border: `1px solid ${isActive ? m.color + "30" : "transparent"}`,
                      }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>

        {/* Mode description bar */}
        <AnimatePresence mode="wait">
          <motion.div
            key={`desc-${mode}`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="text-center mb-10"
          >
            <h3 className="text-xl md:text-2xl font-bold mb-2" style={{ color: "#0f172a" }}>
              {active.headline}
            </h3>
            <p className="text-sm max-w-2xl mx-auto" style={{ color: "#64748b" }}>
              {active.subline}
            </p>
          </motion.div>
        </AnimatePresence>

        {/* Mode content — AnimatePresence swap */}
        <div
          id={`panel-${mode}`}
          role="tabpanel"
          aria-label={`${active.label} mode content`}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={mode}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.35, ease: [0.23, 1, 0.32, 1] }}
            >
              {mode === "learn" && <BentoGrid />}
              {mode === "practice" && <PracticeContent />}
              {mode === "explore" && (
                <div className="space-y-8">
                  <PracticeArena />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
