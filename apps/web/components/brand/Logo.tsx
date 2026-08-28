"use client";

import Image from "next/image";

type LogoFormat = "horizontal" | "stacked" | "mark";
type LogoTheme = "light" | "dark";
interface LogoProps {
  /** Legacy light/dark values are retained for existing callers. */
  variant?: LogoFormat | LogoTheme;
  theme?: LogoTheme;
  size?: "sm" | "md" | "lg";
  iconOnly?: boolean;
  wordmarkOnly?: boolean;
  className?: string;
}
const DIMENSIONS = { sm: { width: 122, height: 31, mark: 31 }, md: { width: 156, height: 39, mark: 39 }, lg: { width: 205, height: 51, mark: 51 } } as const;

export function Logo({
  variant = "dark",
  theme,
  size = "md",
  iconOnly = false,
  wordmarkOnly = false,
  className,
}: LogoProps) {
  const format: LogoFormat = variant === "stacked" || variant === "mark" || variant === "horizontal" ? variant : "horizontal";
  const resolvedTheme: LogoTheme = theme ?? (variant === "light" ? "light" : "dark");
  const dimensions = DIMENSIONS[size];
  const markOnly = iconOnly || format === "mark";
  const src = markOnly
    ? `/brand/teachnexis/teachnexis-mark${resolvedTheme === "light" ? "-dark" : ""}.svg`
    : format === "stacked" ? "/brand/teachnexis/teachnexis-logo-stacked.svg" : `/brand/teachnexis/teachnexis-logo-horizontal${resolvedTheme === "light" ? "-dark" : ""}.svg`;
  if (wordmarkOnly) return <span className={className} style={{ display: "inline-flex", fontWeight: 700, letterSpacing: "-0.025em", lineHeight: 1 }}><span style={{ color: resolvedTheme === "light" ? "#fff" : "#0F172A" }}>Teach</span><span style={{ color: resolvedTheme === "light" ? "#5EEAD4" : "#14B8A6" }}>Nexis</span></span>;
  const width = markOnly ? dimensions.mark : dimensions.width;
  const height = markOnly ? dimensions.mark : format === "stacked" ? Math.round(dimensions.width * 0.83) : dimensions.height;
  return <Image src={src} alt="TeachNexis" width={width} height={height} className={className} priority={size === "lg"} unoptimized />;
}
