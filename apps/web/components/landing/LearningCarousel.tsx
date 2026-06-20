"use client";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { BookOpen, FileText, Lightbulb, Brain } from "lucide-react";

const LESSONS = [
  { subject: "Mathematics", topic: "Quadratic Equations & Factorisation", level: "SS2", mode: "WAEC", color: "#3b82f6", icon: "📐" },
  { subject: "Biology", topic: "Cell Division — Mitosis & Meiosis", level: "SS1", mode: "JAMB", color: "#10b981", icon: "🔬" },
  { subject: "Chemistry", topic: "Mole Concept & Stoichiometry", level: "SS2", mode: "WAEC", color: "#8b5cf6", icon: "⚗️" },
  { subject: "Physics", topic: "Newton's Laws of Motion", level: "SS1", mode: "WAEC", color: "#06b6d4", icon: "⚡" },
  { subject: "English", topic: "Essay Writing — Argumentative", level: "SS3", mode: "WAEC", color: "#f59e0b", icon: "✍️" },
  { subject: "Economics", topic: "Supply, Demand & Equilibrium", level: "SS2", mode: "WAEC", color: "#ec4899", icon: "📊" },
  { subject: "Government", topic: "Nigerian Constitution & 1999 Amendments", level: "SS3", mode: "WAEC", color: "#14b8a6", icon: "🏛️" },
  { subject: "Chemistry", topic: "Organic Chemistry — Hydrocarbons", level: "SS3", mode: "JUPEB", color: "#f97316", icon: "🧪" },
];

const PRACTICE_QUESTIONS = [
  { question: "Calculate the pH of 0.01M HCl solution", subject: "Chemistry", difficulty: "WAEC", topic: "Acids & Bases", color: "#8b5cf6" },
  { question: "If f(x) = 2x² − 3x + 1, find f′(x)", subject: "Mathematics", difficulty: "JAMB", topic: "Calculus", color: "#3b82f6" },
  { question: "State and explain Newton's 3rd Law with a real example", subject: "Physics", difficulty: "WAEC", topic: "Laws of Motion", color: "#06b6d4" },
  { question: "Describe the process of osmosis in plant cells", subject: "Biology", difficulty: "WAEC", topic: "Cell Transport", color: "#10b981" },
  { question: "Write the electron configuration of Fe (Z=26)", subject: "Chemistry", difficulty: "JAMB", topic: "Atomic Structure", color: "#f59e0b" },
  { question: "Solve the simultaneous equations: 2x + y = 7, x − y = 2", subject: "Mathematics", difficulty: "WAEC", topic: "Algebra", color: "#ec4899" },
];

function LessonCard({ lesson }: { lesson: typeof LESSONS[0] }) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-2xl p-5 shrink-0 w-64 cursor-pointer"
      style={{
        background: "rgba(13,22,53,0.7)",
        border: `1px solid ${lesson.color}30`,
        backdropFilter: "blur(12px)",
      }}
    >
      <div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top right, ${lesson.color}10, transparent 70%)` }}
      />
      <div className="text-4xl mb-3">{lesson.icon}</div>
      <div className="flex items-center gap-2 mb-2">
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${lesson.color}20`, color: lesson.color }}
        >
          {lesson.level}
        </span>
        <span
          className="text-xs font-semibold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(255,255,255,0.06)", color: "#94a3b8", border: "1px solid rgba(255,255,255,0.08)" }}
        >
          {lesson.mode}
        </span>
      </div>
      <p className="text-xs font-semibold mb-1" style={{ color: lesson.color }}>{lesson.subject}</p>
      <h4 className="text-sm font-bold leading-snug" style={{ color: "#e2e8f0" }}>{lesson.topic}</h4>
      <div
        className="mt-4 flex items-center gap-1.5 text-xs font-semibold"
        style={{ color: lesson.color }}
      >
        <BookOpen size={13} /> View Lesson →
      </div>
    </motion.div>
  );
}

function QuestionCard({ q }: { q: typeof PRACTICE_QUESTIONS[0] }) {
  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.02 }}
      transition={{ duration: 0.25 }}
      className="relative rounded-2xl p-5 shrink-0 w-72 cursor-pointer"
      style={{
        background: "rgba(13,22,53,0.7)",
        border: `1px solid ${q.color}25`,
        backdropFilter: "blur(12px)",
      }}
    >
      <div className="flex items-start gap-3 mb-3">
        <div
          className="p-2 rounded-xl shrink-0"
          style={{ background: `${q.color}15` }}
        >
          <FileText size={16} style={{ color: q.color }} />
        </div>
        <div>
          <div className="text-xs font-bold" style={{ color: q.color }}>{q.subject}</div>
          <div className="text-xs" style={{ color: "#64748b" }}>{q.topic} · {q.difficulty}</div>
        </div>
      </div>
      <p className="text-sm leading-relaxed" style={{ color: "#c7d2fe" }}>{q.question}</p>
      <div
        className="mt-4 text-xs font-semibold"
        style={{ color: q.color }}
      >
        Practice with AI →
      </div>
    </motion.div>
  );
}

function HorizontalScrollRow({ children, speed = 1 }: { children: React.ReactNode; speed?: number }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const animRef = useRef<number>(0);
  const xRef = useRef(0);
  const pausedRef = useRef(false);
  const visibleRef = useRef(true);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Respect reduced motion
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const run = () => {
      if (!pausedRef.current && visibleRef.current) {
        xRef.current -= speed * 0.5;
        const half = track.scrollWidth / 2;
        if (Math.abs(xRef.current) >= half) xRef.current = 0;
        track.style.transform = `translateX(${xRef.current}px)`;
      }
      animRef.current = requestAnimationFrame(run);
    };
    animRef.current = requestAnimationFrame(run);

    // Pause on hover
    const el = track.parentElement;
    if (el) {
      el.addEventListener("mouseenter", () => { pausedRef.current = true; });
      el.addEventListener("mouseleave", () => { pausedRef.current = false; });
    }

    // Pause when off-screen (IntersectionObserver)
    const io = new IntersectionObserver(
      ([entry]) => { visibleRef.current = entry.isIntersecting; },
      { threshold: 0.05 }
    );
    io.observe(track);

    return () => {
      cancelAnimationFrame(animRef.current);
      io.disconnect();
    };
  }, [speed]);

  return (
    <div className="overflow-hidden">
      <div ref={trackRef} className="flex gap-4" style={{ width: "max-content" }}>
        {children}
        {children}
      </div>
    </div>
  );
}

export function LearningCarousel() {
  return (
    <section style={{ background: "#04081a" }} className="py-24 overflow-hidden">
      <div className="max-w-6xl mx-auto px-6 mb-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center"
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: "#475569" }}>
            Content Library
          </p>
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: "#f1f5f9" }}>
            Lessons & questions, <span className="gradient-text">ready to go</span>
          </h2>
        </motion.div>
      </div>

      {/* Lessons row */}
      <div className="mb-6">
        <div className="px-6 mb-4 flex items-center gap-2">
          <BookOpen size={16} style={{ color: "#3b82f6" }} />
          <span className="text-sm font-bold" style={{ color: "#94a3b8" }}>Recommended Lessons</span>
        </div>
        <HorizontalScrollRow speed={0.8}>
          {LESSONS.map((l, i) => <LessonCard key={i} lesson={l} />)}
        </HorizontalScrollRow>
      </div>

      {/* Questions row (reverse) */}
      <div>
        <div className="px-6 mb-4 flex items-center gap-2">
          <Brain size={16} style={{ color: "#8b5cf6" }} />
          <span className="text-sm font-bold" style={{ color: "#94a3b8" }}>Practice Questions</span>
        </div>
        <HorizontalScrollRow speed={-0.6}>
          {PRACTICE_QUESTIONS.map((q, i) => <QuestionCard key={i} q={q} />)}
        </HorizontalScrollRow>
      </div>
    </section>
  );
}
