import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TeachFlow OS — AI Learning for Nigerian Schools";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#04081a",
          fontFamily: "system-ui, sans-serif",
          position: "relative",
        }}
      >
        {/* Background grid lines */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage:
              "linear-gradient(rgba(59,130,246,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(59,130,246,0.06) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
            display: "flex",
          }}
        />

        {/* Glow blob top */}
        <div
          style={{
            position: "absolute",
            top: -100,
            left: "50%",
            width: 600,
            height: 400,
            borderRadius: "50%",
            background: "rgba(59,130,246,0.12)",
            filter: "blur(80px)",
            display: "flex",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "0 80px",
            zIndex: 1,
          }}
        >
          {/* Curriculum badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 28,
              background: "rgba(59,130,246,0.12)",
              border: "1px solid rgba(59,130,246,0.3)",
              borderRadius: 999,
              padding: "8px 20px",
              fontSize: 14,
              fontWeight: 700,
              color: "#93c5fd",
              letterSpacing: "0.15em",
              textTransform: "uppercase" as const,
            }}
          >
            🇳🇬  WAEC · JAMB · JUPEB · JSS1 – SS3
          </div>

          {/* Main title */}
          <div
            style={{
              fontSize: 80,
              fontWeight: 900,
              color: "#f1f5f9",
              lineHeight: 1.05,
              textAlign: "center" as const,
              marginBottom: 8,
              letterSpacing: "-2px",
            }}
          >
            TeachFlow OS
          </div>

          {/* Subtitle with color block */}
          <div
            style={{
              fontSize: 32,
              fontWeight: 700,
              color: "#3b82f6",
              textAlign: "center" as const,
              marginBottom: 28,
            }}
          >
            AI Learning OS for Nigerian Schools
          </div>

          {/* Description */}
          <div
            style={{
              fontSize: 20,
              color: "#64748b",
              textAlign: "center" as const,
              maxWidth: 720,
              lineHeight: 1.6,
              marginBottom: 44,
            }}
          >
            Generate WAEC-ready lesson notes in 10 seconds, build smart exams with distractor analysis, and track every student's skill graph — powered by 7 free AI models.
          </div>

          {/* Feature pills */}
          <div style={{ display: "flex", gap: 16 }}>
            {[
              "✓ Free Forever",
              "✓ Lesson Generator",
              "✓ Exam Builder",
              "✓ Study Buddy",
              "✓ Code Lab",
            ].map((label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  background: "rgba(16,185,129,0.1)",
                  border: "1px solid rgba(16,185,129,0.25)",
                  borderRadius: 8,
                  padding: "8px 16px",
                  fontSize: 13,
                  fontWeight: 700,
                  color: "#10b981",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "linear-gradient(90deg, #3b82f6, #8b5cf6, #3b82f6)",
            display: "flex",
          }}
        />

        {/* Footer credit */}
        <div
          style={{
            position: "absolute",
            bottom: 20,
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "#334155",
          }}
        >
          teachflow-oos.vercel.app · Built by KellyxyHub
        </div>
      </div>
    ),
    { ...size }
  );
}
