"use client";
import { motion } from "framer-motion";
import {
  Brain,
  TrendingUp,
  FileText,
  Target,
  Flame,
  Lightbulb,
  BarChart2,
  Zap,
} from "lucide-react";

// Framer Motion's useReducedMotion automatically detects prefers-reduced-motion.
// Stagger is applied via delay prop — cards animate sequentially on scroll, not all at once.
function BentoCard({
  delay,
  className,
  children,
}: {
  delay: number;
  className: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay, ease: [0.23, 1, 0.32, 1] }}
      whileHover={{ y: -4, scale: 1.01 }}
      className={`relative rounded-2xl overflow-hidden cursor-default ${className}`}
      style={{
        background: "rgba(13,22,53,0.6)",
        border: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(16px)",
      }}
    >
      {children}
    </motion.div>
  );
}

const card = (delay: number, className: string, children: React.ReactNode) => (
  <BentoCard delay={delay} className={className}>{children}</BentoCard>
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

function MiniStat({ label, value, icon: Icon, color }: { label: string; value: string; icon: React.ElementType; color: string }) {
  return (
    <div
      className="flex-1 rounded-xl p-3 text-center"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
    >
      <Icon size={16} style={{ color, margin: "0 auto 6px" }} />
      <div className="text-lg font-black" style={{ color: "#f1f5f9" }}>{value}</div>
      <div className="text-xs" style={{ color: "#64748b" }}>{label}</div>
    </div>
  );
}

export function BentoGrid() {
  return (
    <section style={{ background: "#04081a" }} className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-14"
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: "#475569" }}>
            Dashboard Preview
          </p>
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: "#f1f5f9" }}>
            Your learning <span className="gradient-text">command centre</span>
          </h2>
          <p className="text-base max-w-xl mx-auto" style={{ color: "#64748b" }}>
            Everything you need — skill tracking, AI tools, exam results, and daily challenges — in one adaptive bento grid.
          </p>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-auto">

          {/* SKILL PROGRESS — large */}
          {card(0, "md:col-span-2 p-6", (
            <>
              <div
                className="absolute top-0 right-0 w-48 h-48 rounded-full pointer-events-none"
                style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12), transparent 70%)", transform: "translate(30%,-30%)" }}
              />
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 rounded-xl" style={{ background: "rgba(59,130,246,0.15)" }}>
                  <TrendingUp size={18} style={{ color: "#3b82f6" }} />
                </div>
                <div>
                  <div className="text-sm font-bold" style={{ color: "#e2e8f0" }}>Skill Progress</div>
                  <div className="text-xs" style={{ color: "#64748b" }}>Biology • SS2 • This term</div>
                </div>
                <span
                  className="ml-auto text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}
                >
                  +12% this week
                </span>
              </div>
              <SkillBar label="Cell Biology" pct={82} color="#3b82f6" />
              <SkillBar label="Genetics" pct={61} color="#8b5cf6" />
              <SkillBar label="Ecology" pct={74} color="#06b6d4" />
              <SkillBar label="Evolution" pct={48} color="#f59e0b" />
              <SkillBar label="Reproduction" pct={55} color="#10b981" />
            </>
          ))}

          {/* DAILY CHALLENGE */}
          {card(0.08, "p-6 flex flex-col", (
            <>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at bottom left, rgba(245,158,11,0.1), transparent 70%)" }}
              />
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl" style={{ background: "rgba(245,158,11,0.15)" }}>
                  <Flame size={18} style={{ color: "#f59e0b" }} />
                </div>
                <span className="text-sm font-bold" style={{ color: "#e2e8f0" }}>Daily Challenge</span>
                <span className="ml-auto text-xs font-bold" style={{ color: "#f59e0b" }}>🔥 7 day streak</span>
              </div>
              <div
                className="flex-1 rounded-xl p-4 mb-4"
                style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.15)" }}
              >
                <div className="text-xs font-semibold mb-2" style={{ color: "#fbbf24" }}>Physics • SS1 • WAEC</div>
                <p className="text-sm leading-relaxed" style={{ color: "#e2e8f0" }}>
                  A stone of mass 2 kg is thrown vertically upward with velocity 20 m/s. What is the maximum height reached?
                </p>
              </div>
              <button
                className="w-full py-2.5 rounded-xl text-sm font-bold transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", color: "#fff" }}
              >
                Attempt Challenge →
              </button>
            </>
          ))}

          {/* AI LESSON GENERATOR */}
          {card(0.12, "p-6", (
            <>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at top right, rgba(139,92,246,0.12), transparent 60%)" }}
              />
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
                  <div
                    key={label}
                    className="flex justify-between items-center rounded-lg px-3 py-2 text-sm"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span style={{ color: "#64748b" }}>{label}</span>
                    <span className="font-semibold" style={{ color: "#e2e8f0" }}>{value}</span>
                  </div>
                ))}
              </div>
              <button
                className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90"
                style={{ background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", color: "#fff" }}
              >
                <Zap size={14} /> Generate in 8s
              </button>
            </>
          ))}

          {/* EXAM RESULTS */}
          {card(0.16, "p-6", (
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
                  <div
                    key={label}
                    className="flex items-center gap-3 rounded-lg px-3 py-2"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
                  >
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black shrink-0"
                      style={{ background: `${color}22`, color }}
                    >
                      {grade}
                    </span>
                    <span className="text-xs flex-1 truncate" style={{ color: "#94a3b8" }}>{label}</span>
                    <span className="text-xs font-bold" style={{ color }}>{pct}%</span>
                  </div>
                ))}
              </div>
            </>
          ))}

          {/* WEAK TOPICS */}
          {card(0.2, "p-6", (
            <>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at bottom right, rgba(220,38,38,0.08), transparent 70%)" }}
              />
              <div className="flex items-center gap-2 mb-4">
                <div className="p-2 rounded-xl" style={{ background: "rgba(220,38,38,0.12)" }}>
                  <Target size={18} style={{ color: "#ef4444" }} />
                </div>
                <span className="text-sm font-bold" style={{ color: "#e2e8f0" }}>Weak Topics</span>
                <span className="ml-auto text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: "rgba(220,38,38,0.15)", color: "#ef4444" }}>
                  Needs work
                </span>
              </div>
              <div className="space-y-2">
                {[
                  { topic: "Quadratic Equations", skill: "APPLY", pct: 32 },
                  { topic: "Organic Chemistry", skill: "ANALYZE", pct: 41 },
                  { topic: "Evolution", skill: "UNDERSTAND", pct: 48 },
                ].map(({ topic, skill, pct }) => (
                  <div
                    key={topic}
                    className="flex items-center gap-3 rounded-xl p-3"
                    style={{ background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)" }}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold truncate" style={{ color: "#e2e8f0" }}>{topic}</div>
                      <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>{skill}</div>
                    </div>
                    <div className="text-sm font-black" style={{ color: "#ef4444" }}>{pct}%</div>
                  </div>
                ))}
              </div>
            </>
          ))}

          {/* STUDY RECOMMENDATIONS */}
          {card(0.24, "md:col-span-2 p-6", (
            <>
              <div
                className="absolute inset-0 pointer-events-none"
                style={{ background: "radial-gradient(ellipse at top left, rgba(16,185,129,0.08), transparent 60%)" }}
              />
              <div className="flex items-center gap-2 mb-5">
                <div className="p-2 rounded-xl" style={{ background: "rgba(16,185,129,0.15)" }}>
                  <Lightbulb size={18} style={{ color: "#10b981" }} />
                </div>
                <span className="text-sm font-bold" style={{ color: "#e2e8f0" }}>AI Study Recommendations</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  {
                    title: "Review Quadratic Equations",
                    desc: "Your last 3 attempts averaged 32%. Study Buddy has prepared a step-by-step session.",
                    tag: "Mathematics",
                    color: "#3b82f6",
                    action: "Start Review",
                  },
                  {
                    title: "Practice Organic Chem MCQs",
                    desc: "15 WAEC-style questions targeting your weak functional groups & naming conventions.",
                    tag: "Chemistry",
                    color: "#8b5cf6",
                    action: "Practice Now",
                  },
                  {
                    title: "Evolution Essay Prep",
                    desc: "AI-generated essay framework for Natural Selection — your most missed WAEC topic.",
                    tag: "Biology",
                    color: "#10b981",
                    action: "Open Guide",
                  },
                ].map(({ title, desc, tag, color, action }) => (
                  <div
                    key={title}
                    className="rounded-xl p-4 flex flex-col gap-3"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}
                  >
                    <span
                      className="text-xs font-bold px-2 py-0.5 rounded-full self-start"
                      style={{ background: `${color}22`, color }}
                    >
                      {tag}
                    </span>
                    <div className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>{title}</div>
                    <p className="text-xs leading-relaxed flex-1" style={{ color: "#64748b" }}>{desc}</p>
                    <button
                      className="text-xs font-bold py-2 rounded-lg transition-all hover:opacity-90"
                      style={{ background: `${color}22`, color, border: `1px solid ${color}30` }}
                    >
                      {action} →
                    </button>
                  </div>
                ))}
              </div>
            </>
          ))}

        </div>
      </div>
    </section>
  );
}
