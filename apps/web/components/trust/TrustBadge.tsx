"use client";

import { useState } from "react";
import { ShieldCheck } from "lucide-react";
import type { TrustReport } from "@/lib/trust";
import { TrustModal } from "./TrustModal";

const TIER_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  platinum: { bg: "rgba(139,92,246,0.08)", text: "#a78bfa", border: "rgba(139,92,246,0.25)" },
  gold: { bg: "rgba(245,158,11,0.08)", text: "#f59e0b", border: "rgba(245,158,11,0.25)" },
  silver: { bg: "rgba(148,163,184,0.08)", text: "#94a3b8", border: "rgba(148,163,184,0.25)" },
  verified: { bg: "rgba(59,130,246,0.08)", text: "#3b82f6", border: "rgba(59,130,246,0.25)" },
  review: { bg: "rgba(239,68,68,0.08)", text: "#ef4444", border: "rgba(239,68,68,0.25)" },
};

export function TrustBadge({ report }: { report: TrustReport }) {
  const [open, setOpen] = useState(false);
  const colors = TIER_COLORS[report.tier] ?? TIER_COLORS.verified;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all hover:scale-105 cursor-pointer"
        style={{
          background: colors.bg,
          color: colors.text,
          border: `1px solid ${colors.border}`,
        }}
        title="Click for verification details"
      >
        <ShieldCheck size={13} />
        <span>Verified</span>
        <span className="opacity-70">·</span>
        <span>{report.score}%</span>
      </button>
      {open && <TrustModal report={report} onClose={() => setOpen(false)} />}
    </>
  );
}
