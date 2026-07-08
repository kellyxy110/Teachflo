"use client";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Users, BookOpen, ClipboardList, BarChart3, HeartPulse, Sparkles, FileText, Bell, Calendar } from "lucide-react";

const ROLES = [
  {
    id: "teacher",
    label: "Teacher",
    icon: "👩‍🏫",
    color: "#3b82f6",
    desc: "Full teaching toolkit — lessons, exams, attendance, student records, and AI assistant.",
    panels: [
      {
        title: "Today's Classes",
        icon: Calendar,
        color: "#3b82f6",
        items: ["Mathematics SS3 — 8:00 AM", "Physics JS2 — 10:30 AM", "English Language SS2 — 1:00 PM"],
      },
      {
        title: "AI Lesson Ready",
        icon: Sparkles,
        color: "#8b5cf6",
        badge: "New",
        items: ["Quadratic Equations (SS3)", "Wave Motion (JS2)", "Essay Writing (SS2)"],
      },
      {
        title: "Quick Actions",
        icon: ClipboardList,
        color: "#10b981",
        items: ["Take Attendance", "Generate Exam", "View Report Cards", "Open AI Tutor"],
      },
    ],
    stats: [
      { label: "Students", value: "147", color: "#3b82f6" },
      { label: "Lessons Today", value: "3", color: "#8b5cf6" },
      { label: "Pending Exams", value: "2", color: "#f59e0b" },
      { label: "AI Credits", value: "∞", color: "#10b981" },
    ],
  },
  {
    id: "principal",
    label: "Principal",
    icon: "🏫",
    color: "#8b5cf6",
    desc: "School-wide oversight — staff performance, student analytics, and administrative reporting.",
    panels: [
      {
        title: "School Overview",
        icon: BarChart3,
        color: "#8b5cf6",
        items: ["Total Students: 420", "Teachers Active: 18", "Classes: 12", "Today's Attendance: 94%"],
      },
      {
        title: "Performance by Class",
        icon: FileText,
        color: "#3b82f6",
        items: ["SS3 Average: 72% ↑", "SS2 Average: 68% →", "JS3 Average: 65% ↓", "JS1 Average: 71% ↑"],
      },
      {
        title: "Alerts",
        icon: Bell,
        color: "#ef4444",
        badge: "3",
        items: ["7 students below 40%", "2 teachers absent today", "Term exams in 3 weeks"],
      },
    ],
    stats: [
      { label: "Total Students", value: "420", color: "#8b5cf6" },
      { label: "Pass Rate", value: "83%", color: "#10b981" },
      { label: "Teachers", value: "18", color: "#3b82f6" },
      { label: "Active Alerts", value: "3", color: "#ef4444" },
    ],
  },
  {
    id: "student",
    label: "Student",
    icon: "🎓",
    color: "#10b981",
    desc: "Personal learning hub — AI tutor, assignments, quizzes, progress, and revision resources.",
    panels: [
      {
        title: "My Progress",
        icon: BarChart3,
        color: "#10b981",
        items: ["Mathematics: 74%", "Physics: 68%", "English: 81%", "Biology: 77%"],
      },
      {
        title: "AI Tutor",
        icon: Sparkles,
        color: "#8b5cf6",
        items: ["Explain Quadratic Formula", "Test Me on Wave Motion", "Review My Mistakes", "Step-by-Step: Titration"],
      },
      {
        title: "Upcoming",
        icon: Calendar,
        color: "#f59e0b",
        badge: "Due Soon",
        items: ["Math Assignment — Tomorrow", "Physics Practical — Friday", "Mid-term Exam — Next Week"],
      },
    ],
    stats: [
      { label: "My Average", value: "74%", color: "#10b981" },
      { label: "Rank in Class", value: "8th", color: "#3b82f6" },
      { label: "Quizzes Done", value: "24", color: "#8b5cf6" },
      { label: "Study Streak", value: "7 days", color: "#f59e0b" },
    ],
  },
  {
    id: "parent",
    label: "Parent",
    icon: "👨‍👩‍👧",
    color: "#f59e0b",
    desc: "Stay connected — track your child's attendance, scores, teacher messages, and school fees.",
    panels: [
      {
        title: "Chidinma's Performance",
        icon: BarChart3,
        color: "#f59e0b",
        items: ["Term Average: 79%", "Best Subject: English (88%)", "Class Position: 5th of 38", "Attendance: 96%"],
      },
      {
        title: "Recent Scores",
        icon: FileText,
        color: "#3b82f6",
        items: ["Mathematics CA: 38/50", "Physics Test: 42/50", "English Essay: 44/50", "Biology Practical: 46/50"],
      },
      {
        title: "Messages",
        icon: Bell,
        color: "#10b981",
        badge: "1 New",
        items: ["Mrs. Okafor: Chidinma is improving in Math.", "School: PTA meeting — Saturday 10 AM", "Portal: Term 3 fees are due."],
      },
    ],
    stats: [
      { label: "Term Average", value: "79%", color: "#f59e0b" },
      { label: "Attendance", value: "96%", color: "#10b981" },
      { label: "Class Position", value: "5th", color: "#3b82f6" },
      { label: "Messages", value: "1 new", color: "#8b5cf6" },
    ],
  },
];

export function DashboardShowcaseSection() {
  const [activeRole, setActiveRole] = useState(0);
  const role = ROLES[activeRole];

  return (
    <section
      id="dashboard"
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
          style={{ textAlign: "center", marginBottom: 56 }}
        >
          <span style={{
            display: "inline-block", fontSize: 11, fontWeight: 800,
            letterSpacing: "0.18em", textTransform: "uppercase",
            padding: "6px 14px", borderRadius: 100, marginBottom: 20,
            background: "rgba(16,185,129,0.07)", color: "#059669",
            border: "1px solid rgba(16,185,129,0.2)",
          }}>
            For Everyone
          </span>
          <h2 style={{
            fontSize: "clamp(1.8rem, 3.5vw, 3rem)",
            fontWeight: 900, lineHeight: 1.1,
            letterSpacing: "-0.03em", marginBottom: 16, color: "#0f172a",
          }}>
            One Platform.
            <br />
            <span style={{
              background: "linear-gradient(135deg, #059669, #0284c7)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
            }}>
              Every Role Covered.
            </span>
          </h2>
          <p style={{ fontSize: 17, color: "#64748b", maxWidth: 500, margin: "0 auto", lineHeight: 1.7 }}>
            Whether you&apos;re a teacher, principal, student, or parent — TeachNexis has a dedicated experience built for you.
          </p>
        </motion.div>

        {/* Role tabs */}
        <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 40, flexWrap: "wrap" }}>
          {ROLES.map((r, i) => (
            <button
              key={r.id}
              onClick={() => setActiveRole(i)}
              style={{
                display: "flex", alignItems: "center", gap: 8,
                padding: "10px 20px", borderRadius: 100,
                background: activeRole === i ? r.color : "rgba(0,0,0,0.03)",
                border: `2px solid ${activeRole === i ? r.color : "rgba(0,0,0,0.07)"}`,
                color: activeRole === i ? "#fff" : "#64748b",
                fontWeight: 700, fontSize: 14, cursor: "pointer",
                transition: "all 0.25s",
                boxShadow: activeRole === i ? `0 4px 20px ${r.color}30` : "none",
              }}
            >
              <span style={{ fontSize: 16 }}>{r.icon}</span>
              {r.label}
            </button>
          ))}
        </div>

        {/* Dashboard preview */}
        <AnimatePresence mode="wait">
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -16 }}
            transition={{ duration: 0.3 }}
          >
            {/* Top bar */}
            <div style={{
              padding: "16px 24px",
              borderRadius: "20px 20px 0 0",
              background: `linear-gradient(135deg, ${role.color}15, ${role.color}08)`,
              border: `1px solid ${role.color}20`,
              borderBottom: "none",
              display: "flex", alignItems: "center", justifyContent: "space-between",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ fontSize: 20 }}>{role.icon}</span>
                <div>
                  <div style={{ fontSize: 11, color: role.color, fontWeight: 700, letterSpacing: "0.08em" }}>
                    {role.label.toUpperCase()} DASHBOARD
                  </div>
                  <div style={{ fontSize: 13, color: "#64748b" }}>{role.desc}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 6 }}>
                {["#ef4444", "#f59e0b", "#22c55e"].map((c) => (
                  <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c, opacity: 0.7 }} />
                ))}
              </div>
            </div>

            {/* Stats row */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 0,
              borderLeft: `1px solid ${role.color}20`,
              borderRight: `1px solid ${role.color}20`,
            }}>
              {role.stats.map((stat, i) => (
                <div key={stat.label} style={{
                  padding: "16px 20px",
                  borderRight: i < 3 ? `1px solid rgba(0,0,0,0.05)` : "none",
                  borderBottom: "1px solid rgba(0,0,0,0.05)",
                  background: "#fafafa",
                }}>
                  <div style={{ fontSize: 22, fontWeight: 900, color: stat.color, marginBottom: 2 }}>{stat.value}</div>
                  <div style={{ fontSize: 11, color: "#94a3b8", fontWeight: 600 }}>{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Panel grid */}
            <div style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              border: `1px solid ${role.color}20`,
              borderTop: "none",
              borderRadius: "0 0 20px 20px",
              overflow: "hidden",
            }}>
              {role.panels.map((panel, i) => (
                <div
                  key={panel.title}
                  style={{
                    padding: "24px",
                    borderRight: i < 2 ? "1px solid rgba(0,0,0,0.05)" : "none",
                    background: "#ffffff",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
                    <div style={{
                      width: 32, height: 32, borderRadius: 8,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      background: `${panel.color}10`,
                    }}>
                      <panel.icon size={14} style={{ color: panel.color }} />
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: "#0f172a", flex: 1 }}>{panel.title}</span>
                    {panel.badge && (
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: "2px 7px", borderRadius: 100,
                        background: `${panel.color}15`, color: panel.color,
                      }}>
                        {panel.badge}
                      </span>
                    )}
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {panel.items.map((item) => (
                      <div key={item} style={{
                        fontSize: 12, color: "#64748b",
                        padding: "7px 10px", borderRadius: 8,
                        background: "rgba(0,0,0,0.025)",
                        border: "1px solid rgba(0,0,0,0.04)",
                        lineHeight: 1.4,
                      }}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <style>{`
        @media (max-width: 768px) {
          #dashboard [style*="grid-template-columns: repeat(4"] {
            grid-template-columns: repeat(2, 1fr) !important;
          }
          #dashboard [style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </section>
  );
}
