"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Zap, Lock, Building2 } from "lucide-react";

const PLANS = [
  {
    icon: Zap,
    badge: "Free Forever",
    badgeColor: "#10b981",
    price: "₦0",
    priceSub: "No credit card. No expiry. No catch.",
    cta: "Start for free",
    ctaHref: "/sign-up",
    ctaStyle: {
      background: "linear-gradient(135deg, #059669, #0284c7)",
      boxShadow: "0 0 30px rgba(5,150,105,0.25)",
    },
    highlight: false,
    color: "#10b981",
    features: [
      "AI Lesson Plan Generator (all modes)",
      "Curriculum Intelligence Graph — 618 topics",
      "AI Exam Builder with CIG grounding",
      "CBT export: Excel, CSV, JSON, Moodle XML, QTI",
      "Digital Attendance Register",
      "Student Health Records",
      "CA Report Cards with ordinal ranking",
      "AI Study Buddy (5 learning modes)",
      "Coding Lab AI mentor",
      "Mistake Intelligence & Adaptive Learning",
      "18 free AI models — no API key needed",
      "LaTeX equation editor (850+ symbols)",
    ],
  },
  {
    icon: Lock,
    badge: "Pro — Coming Soon",
    badgeColor: "#6366f1",
    price: "₦?",
    priceSub: "Set for Nigerian school affordability.",
    cta: "Notify me",
    ctaHref: "#",
    ctaStyle: {
      background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
      boxShadow: "0 0 30px rgba(99,102,241,0.3)",
    },
    highlight: true,
    color: "#6366f1",
    features: [
      "Everything in Free, always",
      "Advanced class-level analytics dashboard",
      "Team collaboration (multiple teachers)",
      "Priority AI model pool (faster responses)",
      "Student portal & progress sharing",
      "Custom school branding",
      "Export to PDF with school letterhead",
      "Dedicated support channel",
    ],
  },
  {
    icon: Building2,
    badge: "Enterprise",
    badgeColor: "#f59e0b",
    price: "Custom",
    priceSub: "For large schools and networks.",
    cta: "Contact us",
    ctaHref: "mailto:kellyxy110@gmail.com",
    ctaStyle: {
      background: "rgba(245,158,11,0.12)",
      border: "1px solid rgba(245,158,11,0.3)",
    },
    highlight: false,
    color: "#f59e0b",
    features: [
      "Everything in Pro",
      "Multi-school / school network support",
      "White-label deployment",
      "Dedicated account manager",
      "Custom AI model fine-tuning",
      "SLA-backed uptime guarantee",
      "On-premise deployment option",
      "Staff training & onboarding",
    ],
  },
];

const card = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1, y: 0,
    transition: { duration: 0.5, delay: i * 0.12 },
  }),
};

export function PricingSection() {
  return (
    <section
      id="pricing"
      className="landing-section"
      style={{ padding: "120px 24px", background: "#ffffff" }}
    >
      <div style={{ maxWidth: 1200, margin: "0 auto" }}>
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          style={{ textAlign: "center", marginBottom: 72 }}
        >
          <span style={{
            display: "inline-block", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.18em", textTransform: "uppercase",
            padding: "6px 14px", borderRadius: 100, marginBottom: 20,
            background: "rgba(16,185,129,0.07)", color: "#059669",
            border: "1px solid rgba(16,185,129,0.18)",
          }}>
            Simple Pricing
          </span>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 900, lineHeight: 1.1,
            letterSpacing: "-0.03em", marginBottom: 16, color: "#0f172a",
          }}>
            Honest pricing.
            <br />
            <span style={{
              background: "linear-gradient(135deg, #059669, #10b981)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              Free means free.
            </span>
          </h2>
          <p style={{ maxWidth: 540, margin: "0 auto", fontSize: 17, color: "#64748b", lineHeight: 1.7 }}>
            Nigerian schools should not have to pay to teach better. The core platform is, and will remain, completely free.
          </p>
        </motion.div>

        {/* Cards */}
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 20,
          alignItems: "start",
        }}>
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.badge}
              variants={card}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i}
              style={{
                borderRadius: 24,
                padding: "32px 28px",
                position: "relative",
                overflow: "hidden",
                background: plan.highlight
                  ? "linear-gradient(160deg, #0f172a, #1e1b4b)"
                  : "#ffffff",
                border: plan.highlight
                  ? "1px solid rgba(99,102,241,0.3)"
                  : "1px solid rgba(0,0,0,0.07)",
                boxShadow: plan.highlight
                  ? "0 20px 60px rgba(99,102,241,0.15)"
                  : "0 2px 12px rgba(0,0,0,0.04)",
              }}
            >
              {plan.highlight && (
                <div style={{
                  position: "absolute", top: 0, left: 0, right: 0, height: 2,
                  background: "linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)",
                }} />
              )}

              {/* Plan header */}
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                <plan.icon size={16} style={{ color: plan.color }} />
                <span style={{
                  fontSize: 11, fontWeight: 800, letterSpacing: "0.12em", textTransform: "uppercase",
                  color: plan.color,
                }}>
                  {plan.badge}
                </span>
              </div>

              <div style={{
                fontSize: 44, fontWeight: 900, marginBottom: 4, lineHeight: 1,
                color: plan.highlight ? "#f1f5f9" : "#0f172a",
              }}>
                {plan.price}
              </div>
              <p style={{ fontSize: 13, marginBottom: 24, color: plan.highlight ? "#64748b" : "#94a3b8" }}>
                {plan.priceSub}
              </p>

              <Link
                href={plan.ctaHref}
                style={{
                  display: "flex", alignItems: "center", justifyContent: "center",
                  width: "100%", padding: "13px 20px", borderRadius: 14,
                  fontWeight: 700, fontSize: 14,
                  color: plan.badge === "Enterprise" ? plan.color : "#fff",
                  textDecoration: "none", marginBottom: 28,
                  transition: "transform 0.2s",
                  ...plan.ctaStyle,
                } as React.CSSProperties}
                onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1.02)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.transform = "scale(1)"; }}
              >
                <Zap size={14} style={{ marginRight: 6 }} aria-hidden />
                {plan.cta}
              </Link>

              <div style={{ height: 1, background: plan.highlight ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", marginBottom: 24 }} />

              <ul style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {plan.features.map((f) => (
                  <li key={f} style={{
                    display: "flex", alignItems: "flex-start", gap: 10,
                    fontSize: 13, color: plan.highlight ? "#94a3b8" : "#64748b",
                    lineHeight: 1.5,
                  }}>
                    <Check size={14} style={{ color: plan.color, flexShrink: 0, marginTop: 1 }} />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
