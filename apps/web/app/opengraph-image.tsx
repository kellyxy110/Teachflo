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
          background: "linear-gradient(135deg, #04081a 0%, #0a1628 50%, #0f172a 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "40px 60px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              marginBottom: "24px",
              fontSize: "16px",
              fontWeight: 700,
              color: "#93c5fd",
              letterSpacing: "0.2em",
              textTransform: "uppercase" as const,
            }}
          >
            WAEC · JAMB · JUPEB · JSS1–SS3
          </div>

          <div
            style={{
              fontSize: "72px",
              fontWeight: 900,
              color: "#f1f5f9",
              lineHeight: 1.1,
              textAlign: "center" as const,
              marginBottom: "8px",
            }}
          >
            TeachFlow
          </div>

          <div
            style={{
              fontSize: "72px",
              fontWeight: 900,
              lineHeight: 1.1,
              textAlign: "center" as const,
              marginBottom: "32px",
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            AI Learning OS
          </div>

          <div
            style={{
              fontSize: "22px",
              color: "#94a3b8",
              textAlign: "center" as const,
              maxWidth: "700px",
              lineHeight: 1.5,
              marginBottom: "40px",
            }}
          >
            AI-powered education platform for Nigerian secondary schools. Generate lessons, build exams, track skills — powered by 18 free AI models.
          </div>

          <div
            style={{
              display: "flex",
              gap: "32px",
              fontSize: "14px",
              color: "#10b981",
              fontWeight: 600,
            }}
          >
            <span>✓ Free Forever</span>
            <span>✓ 18 AI Models</span>
            <span>✓ Code Lab</span>
            <span>✓ WAEC Aligned</span>
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "24px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            fontSize: "14px",
            color: "#475569",
          }}
        >
          Built by Ekeleme Kelechi David · KellyxyHub
        </div>
      </div>
    ),
    { ...size }
  );
}
