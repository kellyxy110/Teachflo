"use client";

interface LogoProps {
  /** "light" = white wordmark for dark backgrounds; "dark" = slate wordmark for white backgrounds */
  variant?: "light" | "dark";
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  wordmarkOnly?: boolean;
}

const ICON_SIZES = { sm: 26, md: 34, lg: 44 };
const TEXT_SIZES = { sm: 13, md: 17, lg: 22 };
const ICON_INNER = { sm: 14, md: 18, lg: 24 };

export function Logo({
  variant = "dark",
  size = "md",
  iconOnly = false,
  wordmarkOnly = false,
}: LogoProps) {
  const iconSize = ICON_SIZES[size];
  const textSize = TEXT_SIZES[size];
  const innerSize = ICON_INNER[size];
  const radius = Math.round(iconSize * 0.26);
  const teachColor = variant === "light" ? "rgba(255,255,255,0.92)" : "#1e293b";

  return (
    <div style={{ display: "inline-flex", alignItems: "center", gap: 9, lineHeight: 1, userSelect: "none" }}>
      {!wordmarkOnly && (
        <div
          aria-hidden="true"
          style={{
            width: iconSize,
            height: iconSize,
            borderRadius: radius,
            background: "linear-gradient(135deg, #3b82f6 0%, #7c3aed 100%)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            boxShadow: "0 2px 8px rgba(59,130,246,0.35)",
          }}
        >
          {/* Stylised "T" letterform */}
          <svg
            width={innerSize}
            height={innerSize}
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            {/* Crossbar */}
            <rect x="1.5" y="2" width="17" height="4" rx="2" fill="white" />
            {/* Stem */}
            <rect x="8" y="6" width="4" height="12" rx="2" fill="white" />
            {/* Accent dot — suggests neural/AI connection */}
            <circle cx="16.5" cy="15.5" r="2" fill="rgba(255,255,255,0.55)" />
          </svg>
        </div>
      )}
      {!iconOnly && (
        <span
          style={{
            fontSize: textSize,
            fontWeight: 700,
            letterSpacing: "-0.025em",
            lineHeight: 1,
            fontFamily: "inherit",
          }}
        >
          <span style={{ color: teachColor }}>Teach</span>
          <span
            style={{
              background: "linear-gradient(90deg, #3b82f6 0%, #7c3aed 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            Nexis
          </span>
        </span>
      )}
    </div>
  );
}
