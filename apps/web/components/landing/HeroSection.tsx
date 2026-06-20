"use client";
import { useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Zap, ChevronDown } from "lucide-react";
import { motion } from "framer-motion";

const ThreeHero = dynamic(
  () => import("./ThreeHero").then((m) => m.ThreeHero),
  { ssr: false }
);

export function HeroSection() {
  const titleRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    (async () => {
      const { gsap } = await import("gsap");
      const { ScrollTrigger } = await import("gsap/ScrollTrigger");
      gsap.registerPlugin(ScrollTrigger);
      if (!titleRef.current) return;

      // Fade title out only as it scrolls off — scroll-triggered, not auto-playing
      gsap.to(titleRef.current, {
        scrollTrigger: {
          trigger: titleRef.current,
          start: "top 20%",
          end: "bottom top",
          scrub: 1,
        },
        y: -40,
        opacity: 0,
      });
    })();
  }, []);

  return (
    <section
      aria-label="Hero"
      className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden"
      style={{ background: "linear-gradient(180deg, #04081a 0%, #0a0f28 60%, #04081a 100%)" }}
    >
      {/* Three.js canvas — lazy, client-only */}
      <ThreeHero />

      {/* Gradient overlays */}
      <div
        className="absolute inset-0 pointer-events-none"
        aria-hidden="true"
        style={{ background: "radial-gradient(ellipse 80% 60% at 50% 40%, rgba(59,130,246,0.07) 0%, transparent 70%)" }}
      />
      <div
        className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none"
        aria-hidden="true"
        style={{ background: "linear-gradient(to bottom, transparent, #04081a)" }}
      />

      {/* Main content */}
      <div className="relative z-10 text-center px-6 max-w-4xl mx-auto" ref={titleRef}>
        {/* Single alignment badge */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 mb-8 text-xs font-bold px-4 py-2 rounded-full"
          style={{
            background: "rgba(59,130,246,0.1)",
            border: "1px solid rgba(59,130,246,0.25)",
            color: "#93c5fd",
          }}
        >
          <Zap size={12} aria-hidden="true" />
          WAEC · JAMB · JUPEB · JSS1–SS3
        </motion.div>

        {/* H1 — only H1 on the page */}
        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl sm:text-6xl md:text-7xl font-black leading-[1.05] mb-6 tracking-tight"
          style={{ color: "#f1f5f9" }}
        >
          TeachFlow
          <br />
          <span className="gradient-text">AI Learning OS</span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.22 }}
          className="text-base sm:text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
          style={{ color: "#94a3b8" }}
        >
          The AI-powered operating system for Nigerian secondary schools.
          Generate lesson plans, build exams, track skills, and master every subject — faster.
        </motion.p>

        {/* CTAs — primary + secondary only */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/sign-up"
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-bold text-white text-base transition-all hover:scale-105 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              boxShadow: "0 0 40px rgba(59,130,246,0.4), 0 4px 20px rgba(0,0,0,0.4)",
            }}
          >
            <Zap size={18} aria-hidden="true" />
            Start Learning Free
          </Link>
          <a
            href="#modes"
            onClick={(e) => {
              e.preventDefault();
              document.getElementById("modes")?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-2xl font-semibold text-base transition-all hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400"
            style={{
              background: "rgba(255,255,255,0.06)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#e2e8f0",
            }}
          >
            Explore Features
          </a>
        </motion.div>

        {/* Trust signals */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 text-sm"
          style={{ color: "#475569" }}
        >
          <span style={{ color: "#10b981" }}>✓</span> No credit card required
          {" · "}
          <span style={{ color: "#10b981" }}>✓</span> 7 free AI models
          {" · "}
          <span style={{ color: "#10b981" }}>✓</span> Set up in 2 minutes
        </motion.p>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.0, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
        style={{ color: "#334155" }}
        aria-hidden="true"
      >
        <span className="text-xs uppercase tracking-[0.2em]">Explore</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ repeat: Infinity, duration: 1.8, ease: "easeInOut" }}
        >
          <ChevronDown size={18} />
        </motion.div>
      </motion.div>
    </section>
  );
}
