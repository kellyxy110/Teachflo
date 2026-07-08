"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Zap, Calendar } from "lucide-react";

export function FinalCTASection() {
  return (
    <section
      className="landing-section"
      style={{
        padding: "140px 24px",
        background: "linear-gradient(160deg, #050d1f 0%, #0a1628 50%, #050d1f 100%)",
        position: "relative",
        overflow: "hidden",
        textAlign: "center",
      }}
    >
      {/* Background glows */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <div style={{
          position: "absolute", top: "30%", left: "20%",
          width: 600, height: 600,
          background: "radial-gradient(circle, rgba(37,99,235,0.08), transparent 70%)",
          filter: "blur(40px)",
        }} />
        <div style={{
          position: "absolute", top: "40%", right: "15%",
          width: 500, height: 500,
          background: "radial-gradient(circle, rgba(139,92,246,0.06), transparent 70%)",
          filter: "blur(40px)",
        }} />
      </div>

      <div style={{ maxWidth: 700, margin: "0 auto", position: "relative", zIndex: 1 }}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ marginBottom: 24 }}
        >
          <span style={{
            display: "inline-block", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.18em", textTransform: "uppercase",
            padding: "6px 14px", borderRadius: 100,
            background: "rgba(59,130,246,0.1)", color: "#60a5fa",
            border: "1px solid rgba(59,130,246,0.25)",
          }}>
            Get Started Today
          </span>
        </motion.div>

        <motion.h2
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6, delay: 0.1 }}
          style={{
            fontSize: "clamp(2.4rem, 5vw, 4rem)",
            fontWeight: 900, lineHeight: 1.08,
            letterSpacing: "-0.04em",
            color: "#f8fafc", marginBottom: 20,
          }}
        >
          Ready To Transform
          <br />
          <span style={{
            background: "linear-gradient(135deg, #60a5fa, #a78bfa, #f472b6)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
          }}>
            Education?
          </span>
        </motion.h2>

        <motion.p
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
          style={{ fontSize: 18, color: "#64748b", lineHeight: 1.7, marginBottom: 44 }}
        >
          Join the next generation of intelligent Nigerian schools.
          <br />
          Free forever. Set up in 2 minutes. No credit card.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.3 }}
          style={{ display: "flex", justifyContent: "center", gap: 14, flexWrap: "wrap" }}
        >
          <Link
            href="/sign-up"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "16px 32px", borderRadius: 16,
              background: "linear-gradient(135deg, #2563eb, #7c3aed)",
              color: "#fff", fontWeight: 800, fontSize: 16,
              boxShadow: "0 0 60px rgba(37,99,235,0.35), 0 8px 32px rgba(0,0,0,0.3)",
              textDecoration: "none",
              transition: "transform 0.2s, box-shadow 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.04)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
          >
            <Zap size={18} aria-hidden /> Start Free — No Card Needed
          </Link>
          <Link
            href="/sign-in"
            style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              padding: "16px 28px", borderRadius: 16,
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.12)",
              color: "#94a3b8", fontWeight: 600, fontSize: 15,
              textDecoration: "none",
              transition: "background 0.2s",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.09)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
          >
            <Calendar size={16} aria-hidden /> Sign In
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.5 }}
          style={{ marginTop: 36, display: "flex", justifyContent: "center", gap: 24, flexWrap: "wrap" }}
        >
          {[
            "✓ Free forever for core features",
            "✓ Nigerian curriculum built-in",
            "✓ 18 AI models included",
          ].map((item) => (
            <span key={item} style={{ fontSize: 13, color: "#475569", fontWeight: 500 }}>{item}</span>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
