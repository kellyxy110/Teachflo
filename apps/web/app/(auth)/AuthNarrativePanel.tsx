"use client";

import { useState, useEffect } from "react";

const QUOTES = [
  { text: "Teaching is not delivery; it is awakening.", author: "Kellyxy" },
  { text: "Every student is a system waiting to be understood, not just assessed.", author: "TeachFlow" },
  { text: "Great classrooms are built twice: once in structure, once in empathy.", author: "Kellyxy" },
  { text: "The best teachers don't give answers — they design questions worth asking.", author: "TeachFlow" },
  { text: "Education is the most powerful weapon you can use to change the world.", author: "Nelson Mandela" },
  { text: "The art of teaching is the art of assisting discovery.", author: "Mark Van Doren" },
  { text: "Assessment should illuminate, not intimidate.", author: "TeachFlow" },
  { text: "A teacher affects eternity; no one can tell where their influence stops.", author: "Henry Adams" },
];

const MICRO_STORIES = [
  "Built for teachers who stay after the bell.",
  "Designed to reduce workload, not increase it.",
  "Where assessment becomes insight, not stress.",
  "Generate WAEC-ready lessons in 10 seconds.",
  "Track every student's learning journey — automatically.",
  "7 free AI models. Zero subscription required.",
  "From JSS1 to SS3, every curriculum covered.",
];

const INSIGHTS = [
  "Students don't fail questions — they fail patterns.",
  "The best lesson plans start with learning outcomes, not content.",
  "Spaced repetition increases retention by 200%.",
  "Formative assessment catches problems before they become failures.",
  "A teacher's most powerful tool is timely, specific feedback.",
];

export function AuthNarrativePanel() {
  const [quoteIdx, setQuoteIdx] = useState(0);
  const [storyIdx, setStoryIdx] = useState(0);
  const [insightIdx, setInsightIdx] = useState(0);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setFade(false);
      setTimeout(() => {
        setQuoteIdx((i) => (i + 1) % QUOTES.length);
        setStoryIdx((i) => (i + 1) % MICRO_STORIES.length);
        setInsightIdx((i) => (i + 1) % INSIGHTS.length);
        setFade(true);
      }, 400);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const quote = QUOTES[quoteIdx];

  return (
    <div className="relative w-full h-full bg-[#04081a] flex flex-col items-center justify-center px-10 lg:px-16">
      {/* Animated gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 -left-40 w-[500px] h-[500px] rounded-full opacity-20"
          style={{
            background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)",
            animation: "float-slow 12s ease-in-out infinite",
          }}
        />
        <div
          className="absolute -bottom-32 -right-32 w-[400px] h-[400px] rounded-full opacity-15"
          style={{
            background: "radial-gradient(circle, #8b5cf6 0%, transparent 70%)",
            animation: "float-slow 15s ease-in-out infinite reverse",
          }}
        />
        <div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #06b6d4 0%, transparent 70%)",
            animation: "float-slow 18s ease-in-out infinite",
          }}
        />
        {/* Grid overlay */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(59,130,246,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.04) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 max-w-lg space-y-10">
        {/* Logo + brand */}
        <div>
          <h1 className="text-3xl lg:text-4xl font-black text-white tracking-tight">
            TeachFlow <span className="text-blue-400">OS</span>
          </h1>
          <p className="text-blue-300/60 text-sm font-medium mt-1.5">
            AI Learning Operating System
          </p>
        </div>

        {/* Purpose card */}
        <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-2xl p-6">
          <p className="text-sm font-medium text-blue-300/80 uppercase tracking-wider mb-2">
            What is TeachFlow?
          </p>
          <p className="text-base text-slate-200 leading-relaxed">
            TeachFlow helps educators teach, assess, and understand learners
            with AI-assisted clarity — aligned to WAEC, JAMB, and JUPEB standards.
          </p>
        </div>

        {/* Rotating quote */}
        <div
          className="transition-opacity duration-400"
          style={{ opacity: fade ? 1 : 0 }}
        >
          <blockquote className="border-l-2 border-blue-500 pl-5">
            <p className="text-lg lg:text-xl text-white/90 font-medium italic leading-relaxed">
              &ldquo;{quote.text}&rdquo;
            </p>
            <footer className="mt-2 text-sm text-blue-400/70">
              — {quote.author}
            </footer>
          </blockquote>
        </div>

        {/* Micro story */}
        <p
          className="text-sm text-slate-400 transition-opacity duration-400"
          style={{ opacity: fade ? 1 : 0 }}
        >
          {MICRO_STORIES[storyIdx]}
        </p>

        {/* Today's insight */}
        <div
          className="bg-blue-500/8 border border-blue-500/15 rounded-xl px-5 py-3.5 transition-opacity duration-400"
          style={{ opacity: fade ? 1 : 0 }}
        >
          <p className="text-[10px] font-bold text-blue-400/60 uppercase tracking-widest mb-1">
            Today&apos;s Insight
          </p>
          <p className="text-sm text-blue-200/80">
            {INSIGHTS[insightIdx]}
          </p>
        </div>

        {/* Bottom features */}
        <div className="flex flex-wrap gap-2">
          {["Free Forever", "WAEC Ready", "7 AI Models", "JSS1–SS3"].map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-bold uppercase tracking-wider text-emerald-400/70 bg-emerald-500/8 border border-emerald-500/15 rounded-full px-3 py-1"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom credit */}
      <div className="absolute bottom-6 left-0 right-0 text-center">
        <p className="text-[11px] text-slate-600">
          Built by KellyxyHub
        </p>
      </div>

      <style>{`
        @keyframes float-slow {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -20px) scale(1.05); }
          66% { transform: translate(-20px, 15px) scale(0.95); }
        }
      `}</style>
    </div>
  );
}
