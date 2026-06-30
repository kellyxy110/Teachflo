"use client";
import { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  TrendingUp,
  FileText,
  Target,
  Flame,
  Lightbulb,
  BarChart2,
  Zap,
  CheckCircle,
  XCircle,
} from "lucide-react";

// ── Glowing Bento Card ───────────────────────────────────────────────────────
function BentoCard({
  delay,
  className,
  children,
  glowRgb = "59,130,246",
}: {
  delay: number;
  className: string;
  children: React.ReactNode;
  glowRgb?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [hovered, setHovered] = useState(false);

  function onMove(e: React.MouseEvent) {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.65, delay, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -6, scale: 1.015, transition: { duration: 0.3, ease: "easeOut" } }}
      onMouseMove={onMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={`relative rounded-2xl overflow-hidden cursor-default ${className}`}
      style={{
        background: "rgba(13,22,53,0.65)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: `1px solid ${hovered ? `rgba(${glowRgb},0.45)` : "rgba(255,255,255,0.07)"}`,
        boxShadow: hovered
          ? `0 0 28px rgba(${glowRgb},0.22), 0 8px 40px rgba(0,0,0,0.35)`
          : "0 4px 20px rgba(0,0,0,0.25)",
        transition: "border-color 0.3s ease, box-shadow 0.4s ease",
      }}
    >
      {/* Mouse-tracking spotlight */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          zIndex: 2,
          opacity: hovered ? 1 : 0,
          background: `radial-gradient(280px circle at ${mouse.x}px ${mouse.y}px, rgba(${glowRgb},0.13), transparent 70%)`,
          transition: "opacity 0.25s ease",
        }}
      />

      {/* Animated corner glow on hover */}
      <motion.div
        className="absolute inset-0 pointer-events-none rounded-2xl"
        animate={{ opacity: hovered ? 1 : 0 }}
        transition={{ duration: 0.3 }}
        style={{
          zIndex: 1,
          background: `radial-gradient(ellipse at top left, rgba(${glowRgb},0.08), transparent 60%)`,
        }}
      />

      <div className="relative" style={{ zIndex: 3 }}>
        {children}
      </div>
    </motion.div>
  );
}

const card = (delay: number, className: string, children: React.ReactNode, glowRgb?: string) => (
  <BentoCard delay={delay} className={className} glowRgb={glowRgb}>{children}</BentoCard>
);

function SkillBar({ label, pct, color }: { label: string; pct: number; color: string }) {
  return (
    <div className="mb-2">
      <div className="flex justify-between text-xs mb-1" style={{ color: "#94a3b8" }}>
        <span>{label}</span>
        <span style={{ color }}>{pct}%</span>
      </div>
      <div className="h-1.5 rounded-full" style={{ background: "rgba(255,255,255,0.07)" }}>
        <motion.div
          initial={{ width: 0 }}
          whileInView={{ width: `${pct}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.9, delay: 0.3, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ background: `linear-gradient(90deg, ${color}, ${color}88)` }}
        />
      </div>
    </div>
  );
}

// ── Daily Challenge ──────────────────────────────────────────────────────────
const DAILY_CHALLENGES = [
  // ── Physics ───────────────────────────────────────────────────
  {
    subject: "Physics", level: "SS1", board: "WAEC",
    question: "A stone of mass 2 kg is thrown vertically upward with velocity 20 m/s. What is the maximum height reached? (g = 10 m/s²)",
    options: ["10 m", "20 m", "40 m", "200 m"], answer: 1,
    explanation: "Using v² = u² − 2gh → 0 = 400 − 2(10)h → h = 20 m.",
  },
  {
    subject: "Physics", level: "SS2", board: "WAEC",
    question: "What is the SI unit of electric resistance?",
    options: ["Ampere", "Volt", "Ohm", "Watt"], answer: 2,
    explanation: "The SI unit of resistance is the Ohm (Ω), named after Georg Ohm.",
  },
  {
    subject: "Physics", level: "SS3", board: "JAMB",
    question: "An object travels 60 m in 3 s. What is its average speed?",
    options: ["10 m/s", "15 m/s", "20 m/s", "30 m/s"], answer: 2,
    explanation: "Speed = Distance ÷ Time = 60 ÷ 3 = 20 m/s.",
  },
  // ── Chemistry ─────────────────────────────────────────────────
  {
    subject: "Chemistry", level: "SS2", board: "WAEC",
    question: "What is the IUPAC name for CH₃CH₂OH?",
    options: ["Methanol", "Ethanol", "Propanol", "Butanol"], answer: 1,
    explanation: "CH₃CH₂OH has 2 carbon atoms with an -OH group → Ethanol.",
  },
  {
    subject: "Chemistry", level: "SS1", board: "WAEC",
    question: "Which of the following is a noble gas?",
    options: ["Chlorine", "Nitrogen", "Argon", "Hydrogen"], answer: 2,
    explanation: "Argon (Ar) is in Group 18 — the noble gases. It has a full outer electron shell.",
  },
  {
    subject: "Chemistry", level: "SS3", board: "JAMB",
    question: "What is the molar mass of NaCl? (Na=23, Cl=35.5)",
    options: ["48.5 g/mol", "58.5 g/mol", "68.5 g/mol", "78.5 g/mol"], answer: 1,
    explanation: "Molar mass of NaCl = 23 + 35.5 = 58.5 g/mol.",
  },
  // ── Mathematics ───────────────────────────────────────────────
  {
    subject: "Mathematics", level: "SS1", board: "JAMB",
    question: "Simplify: log₁₀ 100 + log₁₀ 10",
    options: ["2", "3", "10", "1000"], answer: 1,
    explanation: "log₁₀ 100 = 2, log₁₀ 10 = 1. So 2 + 1 = 3.",
  },
  {
    subject: "Mathematics", level: "SS2", board: "WAEC",
    question: "If 2x + 5 = 13, find the value of x.",
    options: ["3", "4", "5", "6"], answer: 1,
    explanation: "2x + 5 = 13 → 2x = 8 → x = 4.",
  },
  {
    subject: "Mathematics", level: "SS3", board: "JAMB",
    question: "What is the area of a circle with radius 7 cm? (π ≈ 22/7)",
    options: ["44 cm²", "154 cm²", "308 cm²", "616 cm²"], answer: 1,
    explanation: "Area = πr² = (22/7) × 7² = (22/7) × 49 = 154 cm².",
  },
  // ── Biology ───────────────────────────────────────────────────
  {
    subject: "Biology", level: "SS2", board: "WAEC",
    question: "Which organelle is responsible for protein synthesis?",
    options: ["Mitochondria", "Ribosome", "Golgi apparatus", "Lysosome"], answer: 1,
    explanation: "Ribosomes translate mRNA into amino acid chains (proteins).",
  },
  {
    subject: "Biology", level: "SS1", board: "WAEC",
    question: "What is the powerhouse of the cell?",
    options: ["Nucleus", "Ribosome", "Mitochondria", "Cell membrane"], answer: 2,
    explanation: "The mitochondria produces ATP through cellular respiration — the cell's energy currency.",
  },
  {
    subject: "Biology", level: "SS3", board: "JAMB",
    question: "Which blood group is the universal donor?",
    options: ["A", "B", "AB", "O"], answer: 3,
    explanation: "Blood group O has no antigens on red blood cells, so it can be donated to anyone.",
  },
  // ── English Language ──────────────────────────────────────────
  {
    subject: "English", level: "SS1", board: "WAEC",
    question: "Choose the correct option: The team ___ playing well today.",
    options: ["are", "is", "were", "have"], answer: 1,
    explanation: "'Team' is a collective noun treated as singular → 'is'.",
  },
  {
    subject: "English", level: "SS2", board: "WAEC",
    question: "Identify the figure of speech: 'The stars danced in the night sky.'",
    options: ["Simile", "Metaphor", "Personification", "Hyperbole"], answer: 2,
    explanation: "Stars cannot literally dance — attributing a human action to a non-human thing is personification.",
  },
  // ── Government ────────────────────────────────────────────────
  {
    subject: "Government", level: "SS2", board: "WAEC",
    question: "Which arm of government is responsible for making laws in Nigeria?",
    options: ["Executive", "Judiciary", "Legislature", "Civil Service"], answer: 2,
    explanation: "The Legislature (National Assembly) is responsible for law-making in Nigeria.",
  },
  // ── Economics ─────────────────────────────────────────────────
  {
    subject: "Economics", level: "SS3", board: "JAMB",
    question: "When supply increases and demand remains constant, the equilibrium price will:",
    options: ["Rise", "Fall", "Stay the same", "Double"], answer: 1,
    explanation: "An increase in supply shifts the supply curve right, leading to a lower equilibrium price.",
  },
];

function DailyChallenge() {
  const challenge = useMemo(() => {
    const dayIndex = Math.floor(Date.now() / 86400000) % DAILY_CHALLENGES.length;
    return DAILY_CHALLENGES[dayIndex];
  }, []);
  const [selected, setSelected] = useState<number | null>(null);
  const [started, setStarted] = useState(false);

  const pick = (i: number) => { if (selected !== null) return; setSelected(i); };

  if (!started) {
    return (
      <>
        <div className="absolute inset-0 pointer-events-none"
          style={{ background: "radial-gradient(ellipse at bottom left, rgba(245,158,11,0.1), transparent 70%)" }} />
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-xl" style={{ background: "rgba(245,158,11,0.15)" }}>
            <Flame size={18} style={{ color: "#f59e0b" }} />
          </div>
          <span className="text-sm font-bold" style={{ color: "#e2e8f0" }}>Daily Challenge</span>
          <span className="ml-auto text-xs font-bold" style={{ color: "#f59e0b" }}>New daily</span>
        </div>
        <div className="flex-1 rounded-xl p-4 mb-4"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}>
          <div className="text-xs font-semibold mb-2" style={{ color: "#fbbf24" }}>
            {challenge.subject} • {challenge.level} • {challenge.board}
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "#e2e8f0" }}>{challenge.question}</p>
        </div>
        <button onClick={() => setStarted(true)}
          className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff" }}>
          Attempt Challenge →
        </button>
      </>
    );
  }

  return (
    <>
      <div className="absolute inset-0 pointer-events-none"
        style={{ background: "radial-gradient(ellipse at bottom left, rgba(245,158,11,0.1), transparent 70%)" }} />
      <div className="flex items-center gap-2 mb-3">
        <div className="p-2 rounded-xl" style={{ background: "rgba(245,158,11,0.15)" }}>
          <Flame size={18} style={{ color: "#f59e0b" }} />
        </div>
        <span className="text-sm font-bold" style={{ color: "#e2e8f0" }}>Daily Challenge</span>
        {selected !== null && (
          <span className="ml-auto text-xs font-bold"
            style={{ color: selected === challenge.answer ? "#10b981" : "#ef4444" }}>
            {selected === challenge.answer ? "Correct!" : "Wrong"}
          </span>
        )}
      </div>
      <div className="text-xs font-semibold mb-2 px-1" style={{ color: "#fbbf24" }}>
        {challenge.subject} • {challenge.level} • {challenge.board}
      </div>
      <p className="text-xs leading-relaxed mb-3 px-1" style={{ color: "#94a3b8" }}>{challenge.question}</p>
      <div className="space-y-1.5 mb-3">
        {challenge.options.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = selected !== null && i === challenge.answer;
          const isWrong = isSelected && i !== challenge.answer;
          return (
            <button key={i} onClick={() => pick(i)}
              className="w-full text-left px-3 py-2 rounded-lg text-xs transition-all"
              style={{
                background: isCorrect ? "rgba(16,185,129,0.15)" : isWrong ? "rgba(220,38,38,0.12)" : "rgba(255,255,255,0.04)",
                border: isCorrect ? "1px solid rgba(16,185,129,0.4)" : isWrong ? "1px solid rgba(220,38,38,0.3)" : "1px solid rgba(255,255,255,0.08)",
                color: isCorrect ? "#10b981" : isWrong ? "#ef4444" : "#c7d2fe",
              }}>
              <span style={{ color: "#475569" }}>{String.fromCharCode(65 + i)}.</span> {opt}
              {isCorrect && <CheckCircle size={12} className="inline ml-1.5" />}
              {isWrong && <XCircle size={12} className="inline ml-1.5" />}
            </button>
          );
        })}
      </div>
      <AnimatePresence>
        {selected !== null && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="rounded-lg p-3"
            style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <p className="text-xs leading-relaxed" style={{ color: "#94a3b8" }}>{challenge.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function MiniStat({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div className="flex-1 rounded-xl p-3 text-center"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
      <Icon size={16} style={{ color, margin: "0 auto 6px" }} />
      <div className="text-lg font-black" style={{ color: "#f1f5f9" }}>{value}</div>
      <div className="text-xs" style={{ color: "#64748b" }}>{label}</div>
    </div>
  );
}

// ── Section header with parallax target ──────────────────────────────────────
function BentoHeader() {
  return (
    <motion.div
      id="bento-header"
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.7, ease: [0.23, 1, 0.32, 1] }}
      className="text-center mb-14"
    >
      <motion.p
        initial={{ opacity: 0, letterSpacing: "0.2em" }}
        whileInView={{ opacity: 1, letterSpacing: "0.3em" }}
        viewport={{ once: true }}
        transition={{ duration: 0.8 }}
        className="text-xs font-bold uppercase mb-3"
        style={{ color: "#475569" }}
      >
        Dashboard Preview
      </motion.p>
      <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: "#f1f5f9" }}>
        Your learning{" "}
        <span className="gradient-text">command centre</span>
      </h2>
      <p className="text-base max-w-xl mx-auto" style={{ color: "#64748b" }}>
        Skill tracking, AI tools, exam results and daily challenges — all in one adaptive grid.
      </p>
    </motion.div>
  );
}

// ── Background orbs ───────────────────────────────────────────────────────────
function BentoOrbs() {
  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden">
      <div id="bento-orb-1" className="absolute w-96 h-96 rounded-full"
        style={{ top: "5%", left: "-8%", background: "radial-gradient(circle, rgba(59,130,246,0.07), transparent 70%)" }} />
      <div id="bento-orb-2" className="absolute w-80 h-80 rounded-full"
        style={{ bottom: "10%", right: "-5%", background: "radial-gradient(circle, rgba(139,92,246,0.07), transparent 70%)" }} />
      <div id="bento-orb-3" className="absolute w-64 h-64 rounded-full"
        style={{ top: "50%", left: "50%", transform: "translate(-50%,-50%)", background: "radial-gradient(circle, rgba(6,182,212,0.04), transparent 70%)" }} />
    </div>
  );
}

// ── Main export ───────────────────────────────────────────────────────────────
export function BentoGrid() {
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    (async () => {
      const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (prefersReduced) return;

      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      if (!sectionRef.current) return;

      // Header parallax — moves up slightly faster than scroll
      gsap.to("#bento-header", {
        y: -50,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top bottom",
          end: "center top",
          scrub: 1,
        },
      });

      // Background orbs parallax at different rates
      gsap.to("#bento-orb-1", {
        y: -90, x: 20,
        ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: 2 },
      });
      gsap.to("#bento-orb-2", {
        y: -120,
        ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: 1.5 },
      });
      gsap.to("#bento-orb-3", {
        y: -40,
        ease: "none",
        scrollTrigger: { trigger: sectionRef.current, start: "top bottom", end: "bottom top", scrub: 3 },
      });
    })();
  }, []);

  return (
    <section ref={sectionRef} id="bento" className="relative py-28 px-6 overflow-hidden" style={{ background: "#04081a" }}>
      <BentoOrbs />

      <div className="max-w-6xl mx-auto relative">
        <BentoHeader />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto">

          {/* SKILL PROGRESS */}
          {card(0, "md:col-span-2 p-6", (
            <>
              <div className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)", transform: "translate(30%,-30%)" }} />
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 rounded-xl" style={{ background: "rgba(59,130,246,0.15)" }}>
                  <TrendingUp size={18} style={{ color: "#3b82f6" }} />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: "#e2e8f0" }}>Skill Progress</div>
                  <div className="text-xs" style={{ color: "#64748b" }}>Biology • SS2 • This term</div>
                </div>
                <span className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                  +12% this week
                </span>
              </div>
              <SkillBar label="Cell Biology" pct={82} color="#3b82f6" />
              <SkillBar label="Genetics" pct={61} color="#8b5cf6" />
              <SkillBar label="Ecology" pct={74} color="#06b6d4" />
              <SkillBar label="Evolution" pct={48} color="#f59e0b" />
              <SkillBar label="Reproduction" pct={55} color="#10b981" />
            </>
          ), "59,130,246")}

          {/* DAILY CHALLENGE */}
          {card(0.1, "p-6 flex flex-col", <DailyChallenge />, "245,158,11")}

          {/* AI LESSON GENERATOR */}
          {card(0.15, "p-6", (
            <>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at top right, rgba(139,92,246,0.12), transparent 60%)" }} />
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl" style={{ background: "rgba(139,92,246,0.15)" }}>
                  <Brain size={18} style={{ color: "#8b5cf6" }} />
                </div>
                <span className="text-sm font-bold" style={{ color: "#e2e8f0" }}>AI Lesson Generator</span>
              </div>
              <div className="space-y-2 mb-4">
                {[
                  { label: "Subject", value: "Chemistry" },
                  { label: "Topic", value: "Mole Concept" },
                  { label: "Mode", value: "WAEC" },
                ].map(({ label, value }) => (
                  <div key={label} className="flex justify-between items-center rounded-lg px-3 py-2 text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span style={{ color: "#64748b" }}>{label}</span>
                    <span className="font-semibold" style={{ color: "#e2e8f0" }}>{value}</span>
                  </div>
                ))}
              </div>
              <button className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff" }}>
                <Zap size={14} /> Generate in 8s
              </button>
            </>
          ), "139,92,246")}

          {/* EXAM RESULTS */}
          {card(0.2, "p-6", (
            <>
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl" style={{ background: "rgba(6,182,212,0.15)" }}>
                  <FileText size={18} style={{ color: "#06b6d4" }} />
                </div>
                <span className="text-sm font-bold" style={{ color: "#e2e8f0" }}>Exam Results</span>
              </div>
              <div className="flex gap-2 mb-4">
                <MiniStat label="Avg Score" value="74%" icon={BarChart2} color="#06b6d4" />
                <MiniStat label="Pass Rate" value="88%" icon={Target} color="#10b981" />
              </div>
              <div className="space-y-2">
                {[
                  { label: "Mathematics WAEC Mock", grade: "B", color: "#3b82f6", pct: 68 },
                  { label: "Biology Theory", grade: "A", color: "#10b981", pct: 82 },
                  { label: "Physics Practical", grade: "C", color: "#f59e0b", pct: 55 },
                ].map(({ label, grade, color, pct }) => (
                  <div key={label} className="flex items-center gap-3 rounded-lg px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}>
                    <span className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                      style={{ background: `${color}22`, color }}>{grade}</span>
                    <span className="text-xs flex-1 truncate" style={{ color: "#94a3b8" }}>{label}</span>
                    <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </>
          ), "6,182,212")}

          {/* WEAK TOPICS */}
          {card(0.25, "p-6", (
            <>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at bottom right, rgba(220,38,38,0.08), transparent 70%)" }} />
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl" style={{ background: "rgba(220,38,38,0.12)" }}>
                  <Target size={18} style={{ color: "#ef4444" }} />
                </div>
                <span className="text-sm font-bold" style={{ color: "#e2e8f0" }}>Weak Topics</span>
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full"
                  style={{ background: "rgba(220,38,38,0.15)", color: "#ef4444" }}>Needs work</span>
              </div>
              <div className="space-y-2">
                {[
                  { topic: "Quadratic Equations", skill: "APPLY", pct: 32 },
                  { topic: "Organic Chemistry", skill: "ANALYZE", pct: 41 },
                  { topic: "Evolution", skill: "UNDERSTAND", pct: 48 },
                ].map(({ topic, skill, pct }) => (
                  <div key={topic} className="flex items-center gap-3 rounded-xl p-3"
                    style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)" }}>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: "#e2e8f0" }}>{topic}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>{skill}</div>
                    </div>
                    <div className="text-sm font-black" style={{ color: "#ef4444" }}>{pct}%</div>
                  </div>
                ))}
              </div>
            </>
          ), "239,68,68")}

          {/* STUDY RECOMMENDATIONS */}
          {card(0.3, "md:col-span-2 p-6", (
            <>
              <div className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at top left, rgba(16,185,129,0.08), transparent 60%)" }} />
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 rounded-xl" style={{ background: "rgba(16,185,129,0.15)" }}>
                  <Lightbulb size={18} style={{ color: "#10b981" }} />
                </div>
                <span className="text-sm font-bold" style={{ color: "#e2e8f0" }}>AI Study Recommendations</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { title: "Review Quadratic Equations", desc: "Your last 3 attempts averaged 32%. Study Buddy has prepared a step-by-step session.", tag: "Mathematics", color: "#3b82f6", action: "Start Review" },
                  { title: "Practice Organic Chem MCQs", desc: "15 WAEC-style questions targeting your weak functional groups & naming conventions.", tag: "Chemistry", color: "#8b5cf6", action: "Practice Now" },
                  { title: "Evolution Essay Prep", desc: "AI-generated essay framework for Natural Selection — your most missed WAEC topic.", tag: "Biology", color: "#10b981", action: "Open Guide" },
                ].map(({ title, desc, tag, color, action }) => (
                  <div key={title} className="rounded-xl p-4 flex flex-col gap-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full self-start"
                      style={{ background: `${color}22`, color }}>{tag}</span>
                    <div className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>{title}</div>
                    <p className="text-xs leading-relaxed flex-1" style={{ color: "#64748b" }}>{desc}</p>
                    <button className="text-xs font-bold py-2 rounded-lg transition-all hover:opacity-90"
                      style={{ background: `${color}22`, color, border: `1px solid ${color}30` }}>
                      {action} →
                    </button>
                  </div>
                ))}
              </div>
            </>
          ), "16,185,129")}

        </div>
      </div>
    </section>
  );
}
