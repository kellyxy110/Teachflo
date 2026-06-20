"use client";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Timer, Brain, Zap, Target, CheckCircle, XCircle, Trophy } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────
type GameId = "math-sprint" | "concept-match" | "fix-answer" | "quiz-battle";

// ── Math Sprint data ───────────────────────────────────────────
function generateMathQ() {
  const ops = ["+", "-", "×", "÷"] as const;
  const op = ops[Math.floor(Math.random() * ops.length)];
  let a: number, b: number, answer: number;
  switch (op) {
    case "+": a = Math.floor(Math.random() * 50) + 1; b = Math.floor(Math.random() * 50) + 1; answer = a + b; break;
    case "-": a = Math.floor(Math.random() * 80) + 20; b = Math.floor(Math.random() * 20) + 1; answer = a - b; break;
    case "×": a = Math.floor(Math.random() * 12) + 1; b = Math.floor(Math.random() * 12) + 1; answer = a * b; break;
    case "÷": b = Math.floor(Math.random() * 12) + 1; answer = Math.floor(Math.random() * 12) + 1; a = b * answer; break;
  }
  const wrong = [answer + Math.floor(Math.random() * 5) + 1, answer - Math.floor(Math.random() * 5) - 1, answer + Math.floor(Math.random() * 10) + 2];
  const opts = [...new Set([answer, ...wrong.filter(w => w !== answer)])].slice(0, 4);
  while (opts.length < 4) opts.push(answer + opts.length * 3);
  opts.sort(() => Math.random() - 0.5);
  return { q: `${a} ${op} ${b} = ?`, answer, opts };
}

// ── Concept Match data ─────────────────────────────────────────
const CONCEPTS = [
  { term: "Osmosis", def: "Movement of water through a semi-permeable membrane from low to high solute concentration" },
  { term: "Photosynthesis", def: "Process by which plants convert light energy into chemical energy (glucose)" },
  { term: "Mitosis", def: "Cell division producing two genetically identical daughter cells" },
  { term: "Covalent Bond", def: "Chemical bond formed by sharing of electron pairs between atoms" },
  { term: "Newton's 1st Law", def: "An object at rest stays at rest unless acted upon by an external force" },
  { term: "Electrolysis", def: "Decomposition of a substance using an electric current" },
];

// ── Fix the Answer data ────────────────────────────────────────
const FIX_PROBLEMS = [
  {
    problem: "Solve: 2x + 4 = 12",
    steps: [
      { text: "2x + 4 = 12", ok: true },
      { text: "2x = 12 + 4 = 16", ok: false },   // error: should subtract 4
      { text: "x = 16 ÷ 2 = 8", ok: false },
    ],
    errorStep: 1,
    explanation: "Step 2 is wrong. To isolate 2x, subtract 4 from both sides: 2x = 12 − 4 = 8, so x = 4.",
  },
  {
    problem: "Calculate the speed of an object that travels 100m in 20s",
    steps: [
      { text: "Speed = Distance ÷ Time", ok: true },
      { text: "Speed = 100 ÷ 20", ok: true },
      { text: "Speed = 0.5 m/s", ok: false },  // error: 100/20 = 5
    ],
    errorStep: 2,
    explanation: "Step 3 is wrong. 100 ÷ 20 = 5 m/s, not 0.5 m/s.",
  },
  {
    problem: "Find the area of a triangle with base 8cm and height 5cm",
    steps: [
      { text: "Area = ½ × base × height", ok: true },
      { text: "Area = base × height = 8 × 5 = 40", ok: false },  // error: forgot ½
      { text: "Area = 40 cm²", ok: false },
    ],
    errorStep: 1,
    explanation: "Step 2 is wrong. The formula ½ was dropped. Correct: Area = ½ × 8 × 5 = 20 cm².",
  },
];

// ── Quiz Battle data ───────────────────────────────────────────
const QUIZ_QS = [
  {
    q: "Which of the following is NOT a function of the liver?",
    opts: ["Production of bile", "Regulation of blood glucose", "Production of insulin", "Detoxification of drugs"],
    answer: 2,
    explanation: "The pancreas (beta cells) produces insulin, not the liver.",
  },
  {
    q: "What is the chemical formula for water?",
    opts: ["H₂O₂", "HO", "H₂O", "H₃O"],
    answer: 2,
    explanation: "Water is H₂O — two hydrogen atoms bonded to one oxygen atom.",
  },
  {
    q: "Which gas is produced during photosynthesis?",
    opts: ["Carbon dioxide", "Nitrogen", "Oxygen", "Hydrogen"],
    answer: 2,
    explanation: "Photosynthesis produces oxygen as a byproduct: 6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂.",
  },
];

// ── Math Sprint Game ───────────────────────────────────────────
function MathSprint() {
  const [q, setQ] = useState(generateMathQ);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(30);
  const [running, setRunning] = useState(false);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setTime((t) => { if (t <= 1) { clearInterval(id); setRunning(false); return 0; } return t - 1; }), 1000);
    return () => clearInterval(id);
  }, [running]);

  const answer = useCallback((opt: number) => {
    if (!running || feedback) return;
    const correct = opt === q.answer;
    setFeedback(correct ? "correct" : "wrong");
    if (correct) setScore((s) => s + 10);
    setTimeout(() => { setQ(generateMathQ()); setFeedback(null); }, 600);
  }, [q, running, feedback]);

  return (
    <div className="flex flex-col items-center gap-6">
      {!running && time > 0 ? (
        <button
          onClick={() => { setRunning(true); setScore(0); setTime(30); }}
          className="px-8 py-4 rounded-2xl font-black text-white text-lg transition-all hover:scale-105"
          style={{ background: "linear-gradient(135deg, #f59e0b, #d97706)", boxShadow: "0 0 40px rgba(245,158,11,0.3)" }}
        >
          <Zap size={20} className="inline mr-2" /> Start Sprint
        </button>
      ) : time === 0 ? (
        <div className="text-center">
          <div className="text-5xl font-black mb-2" style={{ color: "#f59e0b" }}>{score}</div>
          <div className="text-sm mb-4" style={{ color: "#94a3b8" }}>Final score — {score / 10} correct</div>
          <button onClick={() => { setTime(30); setScore(0); setRunning(false); }} className="px-6 py-3 rounded-xl font-bold text-sm" style={{ background: "rgba(245,158,11,0.2)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
            Play Again
          </button>
        </div>
      ) : (
        <div className="w-full max-w-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2" style={{ color: "#f59e0b" }}>
              <Timer size={16} /> <span className="font-bold">{time}s</span>
            </div>
            <div className="font-black text-xl" style={{ color: "#e2e8f0" }}>{score} pts</div>
          </div>
          <div
            className="rounded-2xl p-6 text-center mb-4"
            style={{ background: feedback === "correct" ? "rgba(16,185,129,0.15)" : feedback === "wrong" ? "rgba(220,38,38,0.12)" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", transition: "background 0.2s" }}
          >
            <div className="text-3xl font-black" style={{ color: "#f1f5f9" }}>{q.q}</div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {q.opts.map((opt) => (
              <button
                key={opt}
                onClick={() => answer(opt)}
                className="game-btn py-4 rounded-xl font-black text-xl transition-all hover:scale-105"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }}
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Concept Match Game ─────────────────────────────────────────
function ConceptMatch() {
  const PAIR_COUNT = 4;
  const [pairs] = useState(() => CONCEPTS.slice(0, PAIR_COUNT));
  const [selected, setSelected] = useState<{ type: "term" | "def"; idx: number } | null>(null);
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrong, setWrong] = useState<number | null>(null);
  const [score, setScore] = useState(0);

  const reset = () => { setSelected(null); setMatched(new Set()); setWrong(null); setScore(0); };

  const pick = (type: "term" | "def", idx: number) => {
    if (matched.has(idx)) return;
    if (!selected) { setSelected({ type, idx }); return; }
    if (selected.type === type) { setSelected({ type, idx }); return; }
    if (selected.idx === idx) {
      setMatched((m) => new Set([...m, idx]));
      setScore((s) => s + 20);
      setSelected(null);
    } else {
      setWrong(idx);
      setTimeout(() => { setWrong(null); setSelected(null); }, 700);
    }
  };

  const done = matched.size === PAIR_COUNT;

  return (
    <div className="w-full max-w-md mx-auto">
      {done ? (
        <div className="text-center py-6">
          <Trophy size={40} className="mx-auto mb-3" style={{ color: "#f59e0b" }} />
          <div className="text-4xl font-black mb-2" style={{ color: "#10b981" }}>Perfect!</div>
          <div className="text-sm mb-4" style={{ color: "#94a3b8" }}>All {PAIR_COUNT} pairs matched · {score} points</div>
          <button onClick={reset} className="px-6 py-3 rounded-xl font-bold text-sm" style={{ background: "rgba(16,185,129,0.2)", color: "#10b981", border: "1px solid rgba(16,185,129,0.3)" }}>Play Again</button>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider mb-2 text-center" style={{ color: "#475569" }}>Terms</div>
            {pairs.map(({ term }, i) => (
              <button
                key={i}
                onClick={() => pick("term", i)}
                className="w-full text-left p-3 rounded-xl text-sm font-semibold transition-all"
                style={{
                  background: matched.has(i) ? "rgba(16,185,129,0.15)" : selected?.type === "term" && selected.idx === i ? "rgba(59,130,246,0.2)" : wrong === i ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.04)",
                  border: matched.has(i) ? "1px solid rgba(16,185,129,0.4)" : selected?.type === "term" && selected.idx === i ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  color: matched.has(i) ? "#10b981" : "#e2e8f0",
                }}
              >
                {term}
              </button>
            ))}
          </div>
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider mb-2 text-center" style={{ color: "#475569" }}>Definitions</div>
            {pairs.map(({ def }, i) => (
              <button
                key={i}
                onClick={() => pick("def", i)}
                className="w-full text-left p-3 rounded-xl text-xs leading-snug transition-all"
                style={{
                  background: matched.has(i) ? "rgba(16,185,129,0.15)" : selected?.type === "def" && selected.idx === i ? "rgba(59,130,246,0.2)" : wrong === i ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.04)",
                  border: matched.has(i) ? "1px solid rgba(16,185,129,0.4)" : selected?.type === "def" && selected.idx === i ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
                  color: matched.has(i) ? "#10b981" : "#94a3b8",
                }}
              >
                {def}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Fix the Answer Game ─────────────────────────────────────────
function FixAnswer() {
  const [pIdx, setPIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const p = FIX_PROBLEMS[pIdx];

  const check = (stepIdx: number) => setSelected(stepIdx);
  const next = () => { setPIdx((i) => (i + 1) % FIX_PROBLEMS.length); setSelected(null); };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="text-sm font-bold mb-4 px-3 py-2 rounded-xl" style={{ background: "rgba(255,255,255,0.04)", color: "#e2e8f0" }}>
        Problem: <span style={{ color: "#60a5fa" }}>{p.problem}</span>
      </div>
      <div className="space-y-2 mb-4">
        <div className="text-xs font-semibold mb-2" style={{ color: "#64748b" }}>Which step contains the error?</div>
        {p.steps.map((step, i) => {
          const isSelected = selected === i;
          const isCorrect = selected !== null && i === p.errorStep;
          const isWrong = selected !== null && isSelected && i !== p.errorStep;
          return (
            <button
              key={i}
              onClick={() => selected === null && check(i)}
              className="w-full text-left p-3 rounded-xl text-sm transition-all"
              style={{
                background: isCorrect ? "rgba(16,185,129,0.15)" : isWrong ? "rgba(220,38,38,0.15)" : "rgba(255,255,255,0.04)",
                border: isCorrect ? "1px solid rgba(16,185,129,0.4)" : isWrong ? "1px solid rgba(220,38,38,0.4)" : "1px solid rgba(255,255,255,0.08)",
                color: isCorrect ? "#10b981" : isWrong ? "#ef4444" : "#94a3b8",
              }}
            >
              <span style={{ color: "#475569" }}>Step {i + 1}:</span> {step.text}
              {isCorrect && <CheckCircle size={14} className="inline ml-2" />}
              {isWrong && <XCircle size={14} className="inline ml-2" />}
            </button>
          );
        })}
      </div>
      {selected !== null && (
        <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.25)" }}>
          <div className="text-xs font-bold mb-1" style={{ color: "#60a5fa" }}>Explanation</div>
          <p className="text-xs leading-relaxed" style={{ color: "#cbd5e1" }}>{p.explanation}</p>
        </div>
      )}
      {selected !== null && (
        <button onClick={next} className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff" }}>
          Next Problem →
        </button>
      )}
    </div>
  );
}

// ── Quiz Battle Game ───────────────────────────────────────────
function QuizBattle() {
  const [qIdx, setQIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState({ you: 0, ai: 0 });
  const [aiAnswer, setAiAnswer] = useState<number | null>(null);
  const q = QUIZ_QS[qIdx % QUIZ_QS.length];

  const pick = (i: number) => {
    if (selected !== null) return;
    setSelected(i);
    if (i === q.answer) setScore((s) => ({ ...s, you: s.you + 1 }));
    // AI answers after 1.2s (80% correct)
    const aiCorrect = Math.random() < 0.8;
    const aiPick = aiCorrect ? q.answer : (q.answer + 1) % 4;
    setTimeout(() => {
      setAiAnswer(aiPick);
      if (aiCorrect) setScore((s) => ({ ...s, ai: s.ai + 1 }));
    }, 1200);
  };

  const next = () => { setQIdx((i) => i + 1); setSelected(null); setAiAnswer(null); };

  return (
    <div className="w-full max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-5">
        <div className="text-center">
          <div className="text-2xl font-black" style={{ color: "#3b82f6" }}>{score.you}</div>
          <div className="text-xs" style={{ color: "#64748b" }}>You</div>
        </div>
        <div className="text-sm font-bold" style={{ color: "#475569" }}>VS</div>
        <div className="text-center">
          <div className="text-2xl font-black" style={{ color: "#8b5cf6" }}>{score.ai}</div>
          <div className="text-xs" style={{ color: "#64748b" }}>AI</div>
        </div>
      </div>
      <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
        <p className="text-sm font-semibold leading-snug" style={{ color: "#e2e8f0" }}>{q.q}</p>
      </div>
      <div className="space-y-2 mb-4">
        {q.opts.map((opt, i) => {
          const isSelected = selected === i;
          const isCorrect = selected !== null && i === q.answer;
          const isAI = aiAnswer === i;
          return (
            <button
              key={i}
              onClick={() => pick(i)}
              className="w-full text-left p-3 rounded-xl text-sm transition-all"
              style={{
                background: isCorrect ? "rgba(16,185,129,0.15)" : isSelected && i !== q.answer ? "rgba(220,38,38,0.12)" : "rgba(255,255,255,0.04)",
                border: isCorrect ? "1px solid rgba(16,185,129,0.4)" : isSelected && i !== q.answer ? "1px solid rgba(220,38,38,0.3)" : "1px solid rgba(255,255,255,0.08)",
                color: "#c7d2fe",
              }}
            >
              <span style={{ color: "#475569" }}>{String.fromCharCode(65 + i)}.</span> {opt}
              {isAI && <span className="ml-2 text-xs px-1.5 py-0.5 rounded" style={{ background: "rgba(139,92,246,0.2)", color: "#a78bfa" }}>AI</span>}
            </button>
          );
        })}
      </div>
      {selected !== null && aiAnswer !== null && (
        <>
          <div className="text-xs rounded-lg p-3 mb-3 leading-relaxed" style={{ background: "rgba(59,130,246,0.08)", color: "#94a3b8" }}>
            {q.explanation}
          </div>
          <button onClick={next} className="w-full py-3 rounded-xl font-bold text-sm" style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff" }}>
            Next Question →
          </button>
        </>
      )}
    </div>
  );
}

// ── Practice Arena ─────────────────────────────────────────────
const GAMES: { id: GameId; label: string; desc: string; icon: React.ReactNode; color: string }[] = [
  { id: "math-sprint", label: "Math Sprint", desc: "Timed arithmetic challenge", icon: <Zap size={20} />, color: "#f59e0b" },
  { id: "concept-match", label: "Concept Match", desc: "Match terms to definitions", icon: <Brain size={20} />, color: "#10b981" },
  { id: "fix-answer", label: "Fix the Answer", desc: "Spot the error in a solution", icon: <Target size={20} />, color: "#3b82f6" },
  { id: "quiz-battle", label: "Quiz Battle", desc: "MCQ challenge vs AI", icon: <Trophy size={20} />, color: "#8b5cf6" },
];

export function PracticeArena() {
  const [active, setActive] = useState<GameId>("math-sprint");

  return (
    <section style={{ background: "linear-gradient(180deg, #04081a, #070d24, #04081a)" }} className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="text-center mb-12"
        >
          <p className="text-xs font-bold uppercase tracking-[0.3em] mb-3" style={{ color: "#475569" }}>
            Practice Arena
          </p>
          <h2 className="text-4xl md:text-5xl font-black mb-4" style={{ color: "#f1f5f9" }}>
            Learn by <span className="gradient-text">doing</span>
          </h2>
          <p className="text-base" style={{ color: "#64748b" }}>
            Four interactive games that build real exam skills — every answer logged to your skill graph.
          </p>
        </motion.div>

        {/* Game selector */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
          {GAMES.map(({ id, label, desc, icon, color }) => (
            <button
              key={id}
              onClick={() => setActive(id)}
              className="p-4 rounded-2xl text-left transition-all"
              style={{
                background: active === id ? `${color}18` : "rgba(13,22,53,0.6)",
                border: active === id ? `1px solid ${color}50` : "1px solid rgba(255,255,255,0.07)",
                boxShadow: active === id ? `0 0 30px ${color}20` : "none",
              }}
            >
              <div className="mb-2" style={{ color }}>{icon}</div>
              <div className="text-sm font-bold mb-0.5" style={{ color: "#e2e8f0" }}>{label}</div>
              <div className="text-xs" style={{ color: "#64748b" }}>{desc}</div>
            </button>
          ))}
        </div>

        {/* Game area */}
        <div
          className="rounded-3xl p-8 min-h-64"
          style={{ background: "rgba(13,22,53,0.6)", border: "1px solid rgba(255,255,255,0.07)", backdropFilter: "blur(16px)" }}
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.3 }}
            >
              {active === "math-sprint" && <MathSprint />}
              {active === "concept-match" && <ConceptMatch />}
              {active === "fix-answer" && <FixAnswer />}
              {active === "quiz-battle" && <QuizBattle />}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
