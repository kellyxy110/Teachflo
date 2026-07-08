"use client";
import { useEffect, useRef, useState } from "react";
import { motion, useInView } from "framer-motion";

const STATS = [
  { value: 100, suffix: "+", label: "AI Features", sub: "Across every teaching task", color: "#3b82f6" },
  { value: 10, suffix: "x", label: "Faster Lesson Planning", sub: "From hours to seconds", color: "#8b5cf6" },
  { value: 618, suffix: "", label: "Curriculum Topics", sub: "Fully mapped with NERDC", color: "#10b981" },
  { value: 18, suffix: "+", label: "Free AI Models", sub: "No API key, no credit card", color: "#f59e0b" },
];

function AnimatedNumber({ target, suffix, active }: { target: number; suffix: string; active: boolean }) {
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!active) return;
    const duration = 1800;
    const steps = 60;
    const increment = target / steps;
    let current = 0;
    let frame = 0;

    const timer = setInterval(() => {
      frame++;
      current = Math.min(Math.round(increment * frame), target);
      setDisplay(current);
      if (current >= target) clearInterval(timer);
    }, duration / steps);

    return () => clearInterval(timer);
  }, [active, target]);

  return (
    <span>
      {display.toLocaleString()}
      {suffix}
    </span>
  );
}

export function StatsSection() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section
      className="landing-section"
      ref={ref}
      style={{
        padding: "100px 24px",
        background: "linear-gradient(135deg, #050d1f 0%, #0f172a 100%)",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Background decoration */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          width: 800, height: 400,
          background: "radial-gradient(ellipse, rgba(37,99,235,0.06), transparent 70%)",
          filter: "blur(30px)",
        }} />
      </div>

      <div style={{ maxWidth: 1100, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 64 }}
        >
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.5vw, 2.8rem)",
            fontWeight: 900, letterSpacing: "-0.03em",
            color: "#f8fafc", marginBottom: 12,
          }}>
            Numbers that matter.
          </h2>
          <p style={{ color: "#475569", fontSize: 16 }}>
            Real capabilities, not marketing claims.
          </p>
        </motion.div>

        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: 2,
          borderRadius: 20,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.06)",
        }}>
          {STATS.map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              style={{
                padding: "48px 36px",
                background: "rgba(255,255,255,0.025)",
                borderRight: i < STATS.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none",
                textAlign: "center",
              }}
            >
              <div style={{
                fontSize: "clamp(2.8rem, 5vw, 4rem)",
                fontWeight: 900,
                color: stat.color,
                lineHeight: 1,
                marginBottom: 10,
                fontVariantNumeric: "tabular-nums",
              }}>
                <AnimatedNumber target={stat.value} suffix={stat.suffix} active={inView} />
              </div>
              <div style={{ fontSize: 16, fontWeight: 800, color: "#f1f5f9", marginBottom: 6 }}>
                {stat.label}
              </div>
              <div style={{ fontSize: 13, color: "#475569" }}>{stat.sub}</div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
