"use client";
import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, BookOpen, RotateCcw } from "lucide-react";

// ── Safe expression evaluator ──────────────────────────────────
function evalExpr(raw: string): string {
  if (!raw.trim()) return "0";
  try {
    const safe = raw
      .replace(/sin\(/g, "Math.sin(")
      .replace(/cos\(/g, "Math.cos(")
      .replace(/tan\(/g, "Math.tan(")
      .replace(/log\(/g, "Math.log10(")
      .replace(/ln\(/g, "Math.log(")
      .replace(/sqrt\(/g, "Math.sqrt(")
      .replace(/abs\(/g, "Math.abs(")
      .replace(/\^/g, "**")
      .replace(/π/g, String(Math.PI))
      .replace(/e(?!\d)/g, String(Math.E))
      .replace(/÷/g, "/")
      .replace(/×/g, "*");

    // Only allow safe chars
    if (/[^0-9+\-*/().%Math\s]/.test(safe.replace(/Math\.(sin|cos|tan|log10|log|sqrt|abs|PI|E)\b/g, ""))) {
      return "Error";
    }
    // eslint-disable-next-line no-new-func
    const result = new Function(`"use strict"; return (${safe})`)();
    if (typeof result !== "number" || !isFinite(result)) return "Error";
    return parseFloat(result.toPrecision(10)).toString();
  } catch {
    return "Error";
  }
}

// ── Step-by-step explanation ───────────────────────────────────
function getSteps(expr: string): string[] {
  const steps: string[] = [];
  const hasTrig = /sin|cos|tan/.test(expr);
  const hasLog = /log|ln/.test(expr);
  const hasSqrt = /sqrt/.test(expr);
  const hasPow = /\^/.test(expr);

  steps.push(`Start with: ${expr}`);
  if (hasTrig) steps.push("Evaluate trigonometric functions (in radians)");
  if (hasLog) steps.push("Apply logarithm to the argument");
  if (hasSqrt) steps.push("Compute square root of the argument");
  if (hasPow) steps.push("Evaluate exponents (^) first — BODMAS rule");
  steps.push("Apply multiplication and division (left to right)");
  steps.push("Apply addition and subtraction (left to right)");
  const result = evalExpr(expr);
  steps.push(`Result = ${result}`);
  return steps;
}

const ROWS = [
  ["sin(", "cos(", "tan(", "log(", "ln("],
  ["sqrt(", "π", "e", "^", "%"],
  ["(", ")", "7", "8", "9"],
  ["C", "÷", "4", "5", "6"],
  ["⌫", "×", "1", "2", "3"],
  ["±", "-", "+", "0", "="],
];

const SPECIAL = new Set(["sin(", "cos(", "tan(", "log(", "ln(", "sqrt(", "π", "e", "^", "(", ")", "÷", "×", "+", "-", "%", "C", "⌫", "=", "±"]);

function btnStyle(key: string, expr: string): React.CSSProperties {
  if (key === "=") return { background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", color: "#fff", fontWeight: 900, fontSize: 20 };
  if (key === "C") return { background: "rgba(220,38,38,0.15)", color: "#ef4444", border: "1px solid rgba(220,38,38,0.2)" };
  if (key === "⌫") return { background: "rgba(245,158,11,0.12)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.2)" };
  if (["sin(", "cos(", "tan(", "log(", "ln(", "sqrt("].includes(key)) return { background: "rgba(16,185,129,0.1)", color: "#10b981", border: "1px solid rgba(16,185,129,0.15)", fontSize: 11 };
  if (["÷", "×", "+", "-", "^", "%"].includes(key)) return { background: "rgba(59,130,246,0.1)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.15)" };
  if (["π", "e"].includes(key)) return { background: "rgba(139,92,246,0.1)", color: "#a78bfa", border: "1px solid rgba(139,92,246,0.15)" };
  return { background: "rgba(255,255,255,0.05)", color: "#e2e8f0", border: "1px solid rgba(255,255,255,0.07)" };
}

interface Props { open: boolean; onClose: () => void; }

export function Calculator({ open, onClose }: Props) {
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("");
  const [showSteps, setShowSteps] = useState(false);
  const [steps, setSteps] = useState<string[]>([]);
  const [history, setHistory] = useState<{ expr: string; result: string }[]>([]);

  const press = useCallback((key: string) => {
    if (key === "C") { setExpr(""); setResult(""); setSteps([]); return; }
    if (key === "⌫") { setExpr((e) => e.slice(0, -1)); return; }
    if (key === "=") {
      const r = evalExpr(expr);
      setResult(r);
      if (r !== "Error") {
        setHistory((h) => [{ expr, result: r }, ...h].slice(0, 5));
        setSteps(getSteps(expr));
      }
      return;
    }
    if (key === "±") { setExpr((e) => (e.startsWith("-") ? e.slice(1) : "-" + e)); return; }
    setExpr((e) => e + key);
    setResult("");
  }, [expr]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-40"
            style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)" }}
            onClick={onClose}
          />
          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 40 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 40 }}
            transition={{ type: "spring", damping: 20, stiffness: 280 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="w-full max-w-sm rounded-3xl overflow-hidden pointer-events-auto"
              style={{ background: "#0a0f28", border: "1px solid rgba(59,130,246,0.25)", boxShadow: "0 0 80px rgba(59,130,246,0.2), 0 40px 80px rgba(0,0,0,0.5)" }}
            >
              {/* Header */}
              <div
                className="flex items-center justify-between px-5 py-3"
                style={{ background: "rgba(59,130,246,0.08)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}
              >
                <span className="text-sm font-bold" style={{ color: "#60a5fa" }}>Scientific Calculator</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowSteps(!showSteps)}
                    className="text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
                    style={{ background: showSteps ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)", color: showSteps ? "#a78bfa" : "#64748b", border: "1px solid rgba(255,255,255,0.08)" }}
                  >
                    <BookOpen size={12} className="inline mr-1" />Steps
                  </button>
                  <button onClick={onClose} className="p-1.5 rounded-lg transition-all hover:opacity-70" style={{ color: "#64748b" }}>
                    <X size={16} />
                  </button>
                </div>
              </div>

              {/* Display */}
              <div className="px-5 py-4" style={{ background: "rgba(0,0,0,0.3)" }}>
                <div className="text-right">
                  <div className="text-sm min-h-5 truncate" style={{ color: "#475569" }}>{expr || "0"}</div>
                  <div
                    className="text-3xl font-black mt-1 truncate"
                    style={{ color: result === "Error" ? "#ef4444" : result ? "#60a5fa" : "#94a3b8" }}
                  >
                    {result || (expr ? evalExpr(expr) : "0")}
                  </div>
                </div>
              </div>

              {/* Steps panel */}
              <AnimatePresence>
                {showSteps && steps.length > 0 && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-5 py-3 space-y-1.5" style={{ borderTop: "1px solid rgba(255,255,255,0.05)", borderBottom: "1px solid rgba(255,255,255,0.05)", background: "rgba(139,92,246,0.05)" }}>
                      <div className="text-xs font-bold mb-2" style={{ color: "#8b5cf6" }}>Step-by-step solution</div>
                      {steps.map((s, i) => (
                        <div key={i} className="text-xs flex gap-2" style={{ color: "#94a3b8" }}>
                          <span style={{ color: "#3b82f6", minWidth: 16 }}>{i + 1}.</span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Buttons */}
              <div className="p-4 grid grid-cols-5 gap-2">
                {ROWS.flat().map((key, i) => (
                  <button
                    key={`${key}-${i}`}
                    onClick={() => press(key)}
                    className="game-btn h-10 rounded-xl text-sm font-bold transition-all hover:opacity-80 hover:scale-95"
                    style={btnStyle(key, expr)}
                  >
                    {key}
                  </button>
                ))}
              </div>

              {/* History */}
              {history.length > 0 && (
                <div className="px-4 pb-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xs font-semibold" style={{ color: "#475569" }}>History</span>
                    <button onClick={() => setHistory([])} style={{ color: "#475569" }}><RotateCcw size={11} /></button>
                  </div>
                  <div className="space-y-1">
                    {history.map(({ expr: e, result: r }, i) => (
                      <button
                        key={i}
                        onClick={() => { setExpr(e); setResult(r); }}
                        className="w-full text-right text-xs rounded-lg px-3 py-1.5 transition-all hover:opacity-80"
                        style={{ background: "rgba(255,255,255,0.03)", color: "#64748b" }}
                      >
                        <span>{e}</span> <span style={{ color: "#60a5fa" }}>= {r}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
