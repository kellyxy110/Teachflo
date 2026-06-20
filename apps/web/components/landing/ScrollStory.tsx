"use client";
import { useEffect, useRef } from "react";

const CHAPTERS = [
  {
    label: "01",
    keyword: "Learn",
    heading: "Every topic, explained perfectly",
    body: "AI generates full lesson plans aligned to WAEC, JAMB, and JUPEB in under 10 seconds. From Cell Biology to Quadratic Equations — instant, curriculum-perfect content.",
    accent: "#3b82f6",
    glow: "rgba(59,130,246,0.15)",
    icon: "📚",
  },
  {
    label: "02",
    keyword: "Practice",
    heading: "Study Buddy trains your weak spots",
    body: "The AI analyses your past mistakes, identifies weak skills, and adapts every session. Choose Explain, Test Me, Hint, or Step-by-step mode — the AI meets you where you are.",
    accent: "#8b5cf6",
    glow: "rgba(139,92,246,0.15)",
    icon: "🧠",
  },
  {
    label: "03",
    keyword: "Test",
    heading: "Exam-standard questions, instantly",
    body: "Generate WAEC-style MCQs with distractor analysis, JAMB past-pattern questions, and structured theory. Every question is graded instantly with detailed feedback.",
    accent: "#06b6d4",
    glow: "rgba(6,182,212,0.15)",
    icon: "✏️",
  },
  {
    label: "04",
    keyword: "Master",
    heading: "Watch your skill graph grow",
    body: "Bloom's Taxonomy skill tags track mastery from REMEMBER to CREATE. Your weakest areas get the most attention. Pass WAEC. Ace JAMB. Own every subject.",
    accent: "#10b981",
    glow: "rgba(16,185,129,0.15)",
    icon: "🏆",
  },
];

export function ScrollStory() {
  const sectionRef = useRef<HTMLElement>(null);
  const chapRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);

      const triggers: ReturnType<typeof ScrollTrigger.create>[] = [];

      chapRefs.current.forEach((el) => {
        if (!el) return;
        const number = el.querySelector(".chap-number");
        const keyword = el.querySelector(".chap-keyword");
        const heading = el.querySelector(".chap-heading");
        const body = el.querySelector(".chap-body");
        const icon = el.querySelector(".chap-icon");
        const bar = el.querySelector(".chap-bar");

        const tl = gsap.timeline({ paused: true });
        tl.fromTo(number, { opacity: 0, x: -40 }, { opacity: 1, x: 0, duration: 0.5 });
        tl.fromTo(
          keyword,
          { opacity: 0, y: 30, scale: 0.85 },
          { opacity: 1, y: 0, scale: 1, duration: 0.6 },
          "-=0.3"
        );
        tl.fromTo(heading, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.3");
        tl.fromTo(body, { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5 }, "-=0.2");
        tl.fromTo(icon, { opacity: 0, scale: 0.5, rotation: -20 }, { opacity: 1, scale: 1, rotation: 0, duration: 0.5 }, "-=0.4");
        tl.fromTo(bar, { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: "power2.out" }, "-=0.3");

        const trigger = ScrollTrigger.create({
          trigger: el,
          start: "top 75%",
          onEnter: () => tl.play(),
          onLeaveBack: () => tl.reverse(),
        });
        triggers.push(trigger);
      });

      // Parallax on each chapter bg
      chapRefs.current.forEach((el) => {
        if (!el) return;
        const bg = el.querySelector<HTMLElement>(".chap-bg");
        if (!bg) return;
        const trigger = ScrollTrigger.create({
          trigger: el,
          start: "top bottom",
          end: "bottom top",
          onUpdate: (self) => {
            if (bg) bg.style.transform = `translateY(${self.progress * 40 - 20}px)`;
          },
        });
        triggers.push(trigger);
      });

      cleanup = () => {
        triggers.forEach((t) => t.kill());
      };
    })();

    return () => cleanup?.();
  }, []);

  return (
    <section
      ref={sectionRef}
      className="relative"
      style={{ background: "#04081a" }}
    >
      {/* Section header */}
      <div className="text-center pt-24 pb-16 px-6">
        <p
          className="text-xs font-bold uppercase tracking-[0.3em] mb-4"
          style={{ color: "#475569" }}
        >
          The Learning Journey
        </p>
        <h2
          className="text-4xl md:text-5xl font-black"
          style={{ color: "#f1f5f9" }}
        >
          From curious to <span className="gradient-text">confident</span>
        </h2>
      </div>

      {/* Chapters */}
      <div className="max-w-6xl mx-auto px-6 pb-24 space-y-6">
        {CHAPTERS.map((ch, i) => (
          <div
            key={ch.label}
            ref={(el) => { chapRefs.current[i] = el; }}
            className="relative rounded-3xl overflow-hidden"
            style={{ minHeight: 280 }}
          >
            {/* Parallax background blob */}
            <div
              className="chap-bg absolute inset-0 pointer-events-none"
              style={{
                background: `radial-gradient(ellipse 60% 80% at ${i % 2 === 0 ? "80%" : "20%"} 50%, ${ch.glow}, transparent 70%)`,
              }}
            />

            {/* Glass card */}
            <div
              className="relative z-10 p-8 md:p-12 rounded-3xl"
              style={{
                background: "rgba(13,22,53,0.5)",
                border: `1px solid ${ch.accent}22`,
                backdropFilter: "blur(12px)",
              }}
            >
              <div className={`flex flex-col ${i % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"} items-center gap-8`}>
                {/* Text side */}
                <div className="flex-1 space-y-4">
                  <div className="chap-number opacity-0 text-xs font-bold uppercase tracking-[0.3em]" style={{ color: ch.accent }}>
                    Chapter {ch.label}
                  </div>
                  <div
                    className="chap-keyword opacity-0 text-5xl md:text-6xl font-black leading-none"
                    style={{ color: ch.accent, textShadow: `0 0 40px ${ch.accent}50` }}
                  >
                    {ch.keyword}
                  </div>
                  <h3
                    className="chap-heading opacity-0 text-xl md:text-2xl font-bold"
                    style={{ color: "#e2e8f0" }}
                  >
                    {ch.heading}
                  </h3>
                  <p className="chap-body opacity-0 text-base leading-relaxed" style={{ color: "#94a3b8" }}>
                    {ch.body}
                  </p>
                  {/* Progress bar */}
                  <div
                    className="chap-bar h-0.5 rounded-full origin-left"
                    style={{ background: `linear-gradient(90deg, ${ch.accent}, transparent)`, transform: "scaleX(0)" }}
                  />
                </div>

                {/* Icon side */}
                <div
                  className="chap-icon opacity-0 shrink-0 w-32 h-32 md:w-40 md:h-40 rounded-3xl flex items-center justify-center text-6xl md:text-7xl"
                  style={{
                    background: `linear-gradient(135deg, ${ch.accent}22, ${ch.accent}08)`,
                    border: `1px solid ${ch.accent}30`,
                    boxShadow: `0 0 60px ${ch.accent}20`,
                  }}
                >
                  {ch.icon}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
