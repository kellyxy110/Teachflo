"use client";
import { motion } from "framer-motion";
import { Globe, Cpu, Users, ShieldCheck } from "lucide-react";

const PILLARS = [
  {
    icon: Globe,
    color: "#3b82f6",
    glow: "rgba(59,130,246,0.15)",
    title: "Built for Nigeria",
    body: "Every topic, question, and lesson plan is grounded in the NERDC curriculum. Aligned with WAEC, JAMB, JUPEB, and NECO — not adapted from foreign content.",
  },
  {
    icon: Cpu,
    color: "#8b5cf6",
    glow: "rgba(139,92,246,0.15)",
    title: "18 Free AI Models",
    body: "No API key. No credit card. TeachNexis routes each task — lesson generation, exam creation, tutoring — to the best available free model automatically.",
  },
  {
    icon: Users,
    color: "#10b981",
    glow: "rgba(16,185,129,0.15)",
    title: "Teacher-First Design",
    body: "Built by a Nigerian developer who understands classroom reality. Digital attendance, health records, report cards, and AI tools that teachers actually want to use.",
  },
  {
    icon: ShieldCheck,
    color: "#f59e0b",
    glow: "rgba(245,158,11,0.15)",
    title: "Free Forever",
    body: "The core platform is completely free with no time limit. No trial period, no feature gating, no hidden cost. Schools should not have to pay to teach better.",
  },
];

const card = {
  hidden: { opacity: 0, y: 30 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.1, ease: "easeOut" },
  }),
};

export function WhyTeachNexisSection() {
  return (
    <section
      id="why"
      className="py-24 px-6"
      style={{ background: "linear-gradient(180deg, #04081a 0%, #080d20 100%)" }}
    >
      <div className="max-w-6xl mx-auto">
        {/* Heading */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-16"
        >
          <span
            className="inline-block text-xs font-black uppercase tracking-[0.2em] mb-4 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(59,130,246,0.08)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.15)" }}
          >
            Why TeachNexis
          </span>
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-black leading-tight mb-4" style={{ color: "#f1f5f9" }}>
            Built different.<br />
            <span className="gradient-text">By design.</span>
          </h2>
          <p className="max-w-xl mx-auto text-base" style={{ color: "#64748b" }}>
            Most EdTech is built for Western markets and adapted. TeachNexis is built from the ground up for Nigerian secondary schools.
          </p>
        </motion.div>

        {/* Pillars grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PILLARS.map((p, i) => (
            <motion.div
              key={p.title}
              variants={card}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true }}
              custom={i}
              className="relative rounded-2xl p-6 flex flex-col gap-4"
              style={{
                background: `radial-gradient(ellipse at top left, ${p.glow} 0%, rgba(255,255,255,0.02) 60%)`,
                border: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: `${p.color}18`, border: `1px solid ${p.color}30` }}
              >
                <p.icon size={20} style={{ color: p.color }} />
              </div>
              <div>
                <h3 className="font-bold text-base mb-1.5" style={{ color: "#f1f5f9" }}>{p.title}</h3>
                <p className="text-sm leading-relaxed" style={{ color: "#64748b" }}>{p.body}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
