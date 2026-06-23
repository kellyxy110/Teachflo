"use client";

import { useEffect, useRef } from "react";
import { ShieldCheck, X, CheckCircle, AlertTriangle, XCircle, ExternalLink } from "lucide-react";
import type { TrustReport } from "@/lib/trust";

const TIER_LABELS: Record<string, string> = {
  platinum: "Platinum Certified",
  gold: "Gold Certified",
  silver: "Silver Certified",
  verified: "Verified",
  review: "Needs Review",
};

const STATUS_ICON = {
  pass: <CheckCircle size={14} className="text-green-500 shrink-0" />,
  warn: <AlertTriangle size={14} className="text-amber-500 shrink-0" />,
  fail: <XCircle size={14} className="text-red-500 shrink-0" />,
};

export function TrustModal({ report, onClose }: { report: TrustReport; onClose: () => void }) {
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleKey);
    return () => document.removeEventListener("keydown", handleKey);
  }, [onClose]);

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => e.target === overlayRef.current && onClose()}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative w-full max-w-md rounded-2xl p-6 space-y-5 animate-in fade-in zoom-in-95"
        style={{
          background: "var(--color-surface, #f8fafc)",
          border: "1px solid var(--color-border, #e2e8f0)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.15)",
        }}
      >
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-bg transition-colors text-text-2"
        >
          <X size={16} />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "#0A1628" }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 32 32">
              <polygon points="16,3 29,10.5 24.5,26 7.5,26 3,10.5" fill="rgba(0,200,255,0.12)" stroke="#00C8FF" strokeWidth="1.5" strokeLinejoin="round"/>
              <polygon points="16,8.5 23.5,13 21,21.5 11,21.5 8.5,13" fill="rgba(11,206,188,0.2)" stroke="rgba(11,206,188,0.6)" strokeWidth="0.8" strokeLinejoin="round"/>
            </svg>
          </div>
          <div>
            <h3 className="font-bold text-text text-sm">SiteNexis Verification Report</h3>
            <p className="text-xs text-text-2">Academic content quality assurance</p>
          </div>
        </div>

        {/* Score */}
        <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-bg border border-border">
          <div className="text-center">
            <p className="text-3xl font-black text-primary">{report.score}</p>
            <p className="text-[10px] font-bold text-text-2 uppercase tracking-wider">Trust Score</p>
          </div>
          <div className="h-10 w-px bg-border" />
          <div>
            <p className="text-sm font-bold text-text">{TIER_LABELS[report.tier]}</p>
            <p className="text-xs text-text-2">
              {report.checks.filter((c) => c.status === "pass").length}/{report.checks.length} checks passed
            </p>
          </div>
        </div>

        {/* Checks */}
        <div className="space-y-2">
          {report.checks.map((check) => (
            <div
              key={check.label}
              className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-bg border border-border"
            >
              {STATUS_ICON[check.status]}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-semibold text-text">{check.label}</p>
                <p className="text-[11px] text-text-2 leading-snug">{check.detail}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-border">
          <p className="text-[10px] text-text-2">
            Verified {new Date(report.generatedAt).toLocaleDateString("en-NG", {
              day: "numeric", month: "short", year: "numeric",
            })}
          </p>
          <a
            href="https://sitenexis.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[10px] font-semibold text-primary hover:underline"
          >
            SiteNexis <ExternalLink size={9} />
          </a>
        </div>
      </div>
    </div>
  );
}
