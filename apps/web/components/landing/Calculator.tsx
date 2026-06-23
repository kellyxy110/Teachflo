"use client";
import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, RotateCcw } from "lucide-react";

type AngleMode = "DEG" | "RAD" | "GRAD";
type Tab = "standard" | "equations" | "stats" | "vectors" | "graph";
type EqType = "quadratic" | "cubic" | "quartic" | "quintic" | "sys2" | "sys3";

// ── Math Utilities ────────────────────────────────────────────

const fmt = (n: number, sig = 8): string => {
  if (!isFinite(n)) return n > 0 ? "∞" : "-∞";
  if (isNaN(n)) return "Error";
  return parseFloat(n.toPrecision(sig)).toString();
};

function factorial(n: number): number {
  if (n < 0 || !Number.isInteger(n)) return NaN;
  if (n > 170) return Infinity;
  let r = 1;
  for (let i = 2; i <= n; i++) r *= i;
  return r;
}

function permutation(n: number, r: number) {
  if (r > n || r < 0) return NaN;
  return factorial(n) / factorial(n - r);
}

function combination(n: number, r: number) {
  if (r > n || r < 0) return NaN;
  return factorial(n) / (factorial(r) * factorial(n - r));
}

// ── Expression Evaluator ──────────────────────────────────────

function evalExpr(raw: string, mode: AngleMode): string {
  if (!raw.trim()) return "0";
  try {
    const ac = mode === "DEG" ? "*Math.PI/180" : mode === "GRAD" ? "*Math.PI/200" : "";
    const ic = mode === "DEG" ? "*180/Math.PI" : mode === "GRAD" ? "*200/Math.PI" : "";

    let e = raw.replace(/×/g, "*").replace(/÷/g, "/").replace(/−/g, "-");

    // Constants
    e = e.replace(/π/g, `(${Math.PI})`);
    e = e.replace(/φ/g, `(${(1 + Math.sqrt(5)) / 2})`);
    e = e.replace(/ℯ/g, `(${Math.E})`);

    // Power
    e = e.replace(/\^/g, "**");

    // Factorial
    e = e.replace(/(\d+(?:\.\d+)?)!/g, (_, n) => {
      const r = factorial(Number(n));
      return isNaN(r) ? "NaN" : String(r);
    });

    // Permutations / Combinations
    e = e.replace(/nPr\(([^,]+),([^)]+)\)/g, (_, n, r) => String(permutation(Number(n), Number(r))));
    e = e.replace(/nCr\(([^,]+),([^)]+)\)/g, (_, n, r) => String(combination(Number(n), Number(r))));

    // Inverse hyperbolic (before regular hyp — must not be re-matched)
    e = e.replace(/asinh\(/g, "Math.asinh(");
    e = e.replace(/acosh\(/g, "Math.acosh(");
    e = e.replace(/atanh\(/g, "Math.atanh(");

    // Hyperbolic (lookbehind prevents matching inside Math.asinh etc.)
    e = e.replace(/(?<![a-zA-Z.])sinh\(/g, "Math.sinh(");
    e = e.replace(/(?<![a-zA-Z.])cosh\(/g, "Math.cosh(");
    e = e.replace(/(?<![a-zA-Z.])tanh\(/g, "Math.tanh(");

    // Inverse trig (output in current angle mode)
    e = e.replace(/sin⁻¹\(/g, `((__x)=>Math.asin(__x)${ic})(`);
    e = e.replace(/cos⁻¹\(/g, `((__x)=>Math.acos(__x)${ic})(`);
    e = e.replace(/tan⁻¹\(/g, `((__x)=>Math.atan(__x)${ic})(`);

    // Regular trig (lookbehind prevents matching inside Math.asin etc.)
    e = e.replace(/(?<![a-zA-Z.])sin\(/g, `((__x)=>Math.sin(__x${ac}))(`);
    e = e.replace(/(?<![a-zA-Z.])cos\(/g, `((__x)=>Math.cos(__x${ac}))(`);
    e = e.replace(/(?<![a-zA-Z.])tan\(/g, `((__x)=>Math.tan(__x${ac}))(`);

    // Logs
    e = e.replace(/log₂\(/g, "Math.log2(");
    e = e.replace(/(?<![a-zA-Z.])log\(/g, "Math.log10(");
    e = e.replace(/ln\(/g, "Math.log(");
    e = e.replace(/(?<![a-zA-Z.])exp\(/g, "Math.exp(");

    // Roots
    e = e.replace(/√\(/g, "Math.sqrt(");
    e = e.replace(/∛\(/g, "Math.cbrt(");
    e = e.replace(/(?<![a-zA-Z.])abs\(/g, "Math.abs(");

    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${e})`)();
    if (typeof result !== "number" || isNaN(result)) return "Error";
    if (!isFinite(result)) return result > 0 ? "∞" : "-∞";
    return fmt(result);
  } catch {
    return "Error";
  }
}

function evalAt(expr: string, x: number, mode: AngleMode): number {
  const s = expr.replace(/\bx\b/g, `(${x})`);
  const r = evalExpr(s, mode);
  const n = parseFloat(r);
  return isFinite(n) ? n : NaN;
}

// ── Equation Solvers ──────────────────────────────────────────

function newton(f: (x: number) => number, df: (x: number) => number, x0: number): number | null {
  let x = x0;
  for (let i = 0; i < 500; i++) {
    const fx = f(x), dfx = df(x);
    if (Math.abs(dfx) < 1e-15) break;
    const x1 = x - fx / dfx;
    if (Math.abs(x1 - x) < 1e-10 && Math.abs(f(x1)) < 1e-8) return x1;
    x = x1;
  }
  return null;
}

function findRoots(f: (x: number) => number, df: (x: number) => number, seeds: number[]): number[] {
  const roots: number[] = [];
  for (const s of seeds) {
    const r = newton(f, df, s);
    if (r !== null && isFinite(r) && !roots.some(e => Math.abs(e - r) < 1e-5)) roots.push(r);
  }
  return roots.sort((a, b) => a - b);
}

function solveQuadratic(a: number, b: number, c: number): string[] {
  if (a === 0) return b === 0 ? (c === 0 ? ["All reals"] : ["No solution"]) : [`x = ${fmt(-c / b)}`];
  const d = b * b - 4 * a * c;
  if (Math.abs(d) < 1e-10) return [`x = ${fmt(-b / (2 * a))}  (double root)`, `Δ = 0`];
  if (d > 0) return [`x₁ = ${fmt((-b + Math.sqrt(d)) / (2 * a))}`, `x₂ = ${fmt((-b - Math.sqrt(d)) / (2 * a))}`, `Δ = ${fmt(d)}`];
  const re = -b / (2 * a), im = Math.sqrt(-d) / (2 * a);
  return [`x₁ = ${fmt(re)} + ${fmt(im)}i`, `x₂ = ${fmt(re)} − ${fmt(im)}i`, `Δ = ${fmt(d)} (complex)`];
}

function solvePoly(coeffs: number[]): string[] {
  const degree = coeffs.length - 1;
  if (degree < 2) return ["Need at least degree 2"];
  if (coeffs[0] === 0) return solvePoly(coeffs.slice(1));
  if (degree === 2) return solveQuadratic(coeffs[0], coeffs[1], coeffs[2]);

  const f = (x: number) => coeffs.reduce((s, c, i) => s + c * x ** (degree - i), 0);
  const df = (x: number) => coeffs.slice(0, -1).reduce((s, c, i) => s + c * (degree - i) * x ** (degree - i - 1), 0);
  const seeds = [-5000, -1000, -200, -50, -10, -3, -1, -0.3, 0, 0.3, 1, 3, 10, 50, 200, 1000, 5000];
  const roots = findRoots(f, df, seeds);
  if (!roots.length) return ["No real roots found (complex roots may exist)"];
  const subs = ["₁", "₂", "₃", "₄", "₅"];
  return roots.map((r, i) => `x${subs[i] || i + 1} = ${fmt(r)}`);
}

function solveSys2(a1: number, b1: number, c1: number, a2: number, b2: number, c2: number): string[] {
  const D = a1 * b2 - a2 * b1;
  if (Math.abs(D) < 1e-12) return [Math.abs(c1 * b2 - c2 * b1) < 1e-12 ? "∞ solutions (dependent)" : "No solution (inconsistent)"];
  return [`x = ${fmt((c1 * b2 - c2 * b1) / D)}`, `y = ${fmt((a1 * c2 - a2 * c1) / D)}`];
}

function solveSys3(m: number[][]): string[] {
  const a = m.map(r => [...r]);
  for (let col = 0; col < 3; col++) {
    let mx = col;
    for (let r = col + 1; r < 3; r++) if (Math.abs(a[r][col]) > Math.abs(a[mx][col])) mx = r;
    [a[col], a[mx]] = [a[mx], a[col]];
    if (Math.abs(a[col][col]) < 1e-12) return ["No unique solution"];
    for (let r = col + 1; r < 3; r++) {
      const f = a[r][col] / a[col][col];
      for (let k = col; k <= 3; k++) a[r][k] -= f * a[col][k];
    }
  }
  const x = [0, 0, 0];
  for (let i = 2; i >= 0; i--) {
    x[i] = a[i][3];
    for (let j = i + 1; j < 3; j++) x[i] -= a[i][j] * x[j];
    x[i] /= a[i][i];
  }
  return [`x = ${fmt(x[0])}`, `y = ${fmt(x[1])}`, `z = ${fmt(x[2])}`];
}

// ── Statistics ────────────────────────────────────────────────

function computeStats(data: number[]) {
  if (!data.length) return null;
  const n = data.length, sorted = [...data].sort((a, b) => a - b);
  const sum = data.reduce((s, x) => s + x, 0), mean = sum / n;
  const mid = Math.floor(n / 2);
  const median = n % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  const freq: Record<string, number> = {};
  data.forEach(x => { freq[x] = (freq[x] || 0) + 1; });
  const mf = Math.max(...Object.values(freq));
  const modes = Object.entries(freq).filter(([, f]) => f === mf).map(([v]) => Number(v));
  const variance = data.reduce((s, x) => s + (x - mean) ** 2, 0) / n;
  const sVar = n > 1 ? data.reduce((s, x) => s + (x - mean) ** 2, 0) / (n - 1) : 0;
  const q1 = sorted[Math.floor((n - 1) / 4)], q3 = sorted[Math.floor(3 * (n - 1) / 4)];
  return {
    n, sum: fmt(sum), mean: fmt(mean), median: fmt(median),
    mode: modes.length === n ? "No mode" : modes.map(v => fmt(v)).join(", "),
    range: fmt(sorted[n - 1] - sorted[0]), min: fmt(sorted[0]), max: fmt(sorted[n - 1]),
    popVar: fmt(variance), popStd: fmt(Math.sqrt(variance)),
    samVar: fmt(sVar), samStd: fmt(Math.sqrt(sVar)),
    Q1: fmt(q1), Q3: fmt(q3), IQR: fmt(q3 - q1),
    sumSq: fmt(data.reduce((s, x) => s + x * x, 0)),
  };
}

// ── Vectors ───────────────────────────────────────────────────

type V3 = [number, number, number];
const vMag = (v: V3) => Math.sqrt(v[0] ** 2 + v[1] ** 2 + v[2] ** 2);
const vAdd = (a: V3, b: V3): V3 => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const vSub = (a: V3, b: V3): V3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const vDot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const vCross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const vUnit = (v: V3): V3 => { const m = vMag(v); return m === 0 ? [0, 0, 0] : [v[0] / m, v[1] / m, v[2] / m]; };
const vAngle = (a: V3, b: V3) => Math.acos(Math.max(-1, Math.min(1, vDot(a, b) / (vMag(a) * vMag(b))))) * 180 / Math.PI;
const vStr = (v: V3, d: 2 | 3) => d === 2 ? `(${fmt(v[0])}, ${fmt(v[1])})` : `(${fmt(v[0])}, ${fmt(v[1])}, ${fmt(v[2])})`;

// ── Component ─────────────────────────────────────────────────

const GRAPH_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444"];

interface Props { open: boolean; onClose: () => void; }

export function Calculator({ open, onClose }: Props) {
  const [tab, setTab] = useState<Tab>("standard");
  const [expr, setExpr] = useState("");
  const [result, setResult] = useState("0");
  const [mode, setMode] = useState<AngleMode>("DEG");
  const [mem, setMem] = useState(0);
  const [hist, setHist] = useState<{ e: string; r: string }[]>([]);
  const [shift, setShift] = useState(false);

  const [eqType, setEqType] = useState<EqType>("quadratic");
  const [eqC, setEqC] = useState<string[]>(Array(12).fill(""));
  const [eqR, setEqR] = useState<string[]>([]);

  const [statsData, setStatsData] = useState("");
  const [statsR, setStatsR] = useState<ReturnType<typeof computeStats>>(null);

  const [vDim, setVDim] = useState<2 | 3>(3);
  const [vA, setVA] = useState(["", "", ""]);
  const [vB, setVB] = useState(["", "", ""]);
  const [vR, setVR] = useState<string[]>([]);

  const [gExpr, setGExpr] = useState("sin(x)");
  const [gFns, setGFns] = useState<string[]>(["sin(x)"]);
  const [gBounds, setGB] = useState({ xMin: -10, xMax: 10, yMin: -5, yMax: 5 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const append = (s: string) => setExpr(p => (p === "Error" ? s : p + s));
  const clear = () => { setExpr(""); setResult("0"); };
  const backspace = () => setExpr(p => p.slice(0, -1));

  const evaluate = () => {
    if (!expr.trim()) return;
    const r = evalExpr(expr, mode);
    setResult(r);
    if (r !== "Error") {
      setHist(h => [{ e: expr, r }, ...h].slice(0, 15));
      if (r !== "∞" && r !== "-∞") setExpr(r);
    }
  };

  const memOp = (op: string) => {
    const v = parseFloat(result);
    if (isNaN(v)) return;
    if (op === "+") setMem(m => m + v);
    else if (op === "-") setMem(m => m - v);
    else if (op === "R") append(String(mem));
    else setMem(0);
  };

  const solveEq = () => {
    const v = eqC.map(s => Number(s) || 0);
    let res: string[];
    switch (eqType) {
      case "quadratic": res = solveQuadratic(v[0], v[1], v[2]); break;
      case "cubic": res = solvePoly([v[0], v[1], v[2], v[3]]); break;
      case "quartic": res = solvePoly([v[0], v[1], v[2], v[3], v[4]]); break;
      case "quintic": res = solvePoly([v[0], v[1], v[2], v[3], v[4], v[5]]); break;
      case "sys2": res = solveSys2(v[0], v[1], v[2], v[3], v[4], v[5]); break;
      case "sys3": res = solveSys3([[v[0], v[1], v[2], v[3]], [v[4], v[5], v[6], v[7]], [v[8], v[9], v[10], v[11]]]); break;
      default: res = [];
    }
    setEqR(res);
  };

  const doStats = () => {
    const data = statsData.split(/[\s,;\n]+/).filter(Boolean).map(Number).filter(n => !isNaN(n));
    setStatsR(computeStats(data));
  };

  const doVec = (op: string) => {
    const a: V3 = [Number(vA[0]) || 0, Number(vA[1]) || 0, vDim === 3 ? Number(vA[2]) || 0 : 0];
    const b: V3 = [Number(vB[0]) || 0, Number(vB[1]) || 0, vDim === 3 ? Number(vB[2]) || 0 : 0];
    const r: string[] = [];
    switch (op) {
      case "add": r.push(`A+B = ${vStr(vAdd(a, b), vDim)}`); break;
      case "sub": r.push(`A−B = ${vStr(vSub(a, b), vDim)}`); break;
      case "dot": r.push(`A·B = ${fmt(vDot(a, b))}`); break;
      case "cross":
        if (vDim === 2) r.push(`|A×B| = ${fmt(a[0] * b[1] - a[1] * b[0])}`);
        else { const c = vCross(a, b); r.push(`A×B = ${vStr(c, 3)}`, `|A×B| = ${fmt(vMag(c))}`); }
        break;
      case "magA": r.push(`|A| = ${fmt(vMag(a))}`); break;
      case "magB": r.push(`|B| = ${fmt(vMag(b))}`); break;
      case "unitA": r.push(`Â = ${vStr(vUnit(a), vDim)}`); break;
      case "unitB": r.push(`B̂ = ${vStr(vUnit(b), vDim)}`); break;
      case "angle": r.push(`θ(A,B) = ${fmt(vAngle(a, b))}°`); break;
      case "proj": { const s = vDot(a, b) / vDot(b, b); const p: V3 = [b[0] * s, b[1] * s, b[2] * s]; r.push(`proj_B(A) = ${vStr(p, vDim)}`); break; }
    }
    setVR(r);
  };

  const drawGraph = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width, H = canvas.height;
    const { xMin, xMax, yMin, yMax } = gBounds;
    const toX = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
    const toY = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#0a0f1e";
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 0.5;
    const xT = (xMax - xMin) / 10, yT = (yMax - yMin) / 10;
    for (let x = Math.ceil(xMin / xT) * xT; x <= xMax; x += xT) { ctx.beginPath(); ctx.moveTo(toX(x), 0); ctx.lineTo(toX(x), H); ctx.stroke(); }
    for (let y = Math.ceil(yMin / yT) * yT; y <= yMax; y += yT) { ctx.beginPath(); ctx.moveTo(0, toY(y)); ctx.lineTo(W, toY(y)); ctx.stroke(); }

    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 1.5;
    if (xMin <= 0 && xMax >= 0) { ctx.beginPath(); ctx.moveTo(toX(0), 0); ctx.lineTo(toX(0), H); ctx.stroke(); }
    if (yMin <= 0 && yMax >= 0) { ctx.beginPath(); ctx.moveTo(0, toY(0)); ctx.lineTo(W, toY(0)); ctx.stroke(); }

    ctx.fillStyle = "#475569";
    ctx.font = "10px monospace";
    ctx.textAlign = "center";
    for (let x = Math.ceil(xMin); x <= xMax; x++) { if (x === 0) continue; ctx.fillText(String(x), toX(x), Math.min(H - 5, Math.max(12, toY(0) + 14))); }
    ctx.textAlign = "right";
    for (let y = Math.ceil(yMin); y <= yMax; y++) { if (y === 0) continue; ctx.fillText(String(y), Math.min(W - 5, Math.max(25, toX(0) - 5)), toY(y) + 4); }

    gFns.forEach((fn, fi) => {
      ctx.strokeStyle = GRAPH_COLORS[fi % GRAPH_COLORS.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i <= W * 2; i++) {
        const x = xMin + (i / (W * 2)) * (xMax - xMin);
        const y = evalAt(fn, x, mode);
        if (!isFinite(y) || isNaN(y) || y < yMin * 3 || y > yMax * 3) { started = false; continue; }
        const cx = toX(x), cy = toY(y);
        if (!started) { ctx.moveTo(cx, cy); started = true; } else ctx.lineTo(cx, cy);
      }
      ctx.stroke();
    });
  }, [gFns, gBounds, mode]);

  useEffect(() => { if (tab === "graph") setTimeout(drawGraph, 60); }, [tab, drawGraph]);

  // Casio-style button helper: fires action, auto-deactivates shift
  const shiftAction = (normalAction: () => void, shiftedAction: () => void) => {
    if (shift) { shiftedAction(); setShift(false); }
    else normalAction();
  };

  const eqCfg: Record<EqType, { lbl: string; n: string; cnt: number }> = {
    quadratic: { lbl: "Quadratic", n: "ax² + bx + c = 0", cnt: 3 },
    cubic: { lbl: "Cubic", n: "ax³ + bx² + cx + d = 0", cnt: 4 },
    quartic: { lbl: "Quartic", n: "ax⁴ + bx³ + cx² + dx + e = 0", cnt: 5 },
    quintic: { lbl: "Quintic", n: "ax⁵ + bx⁴ + cx³ + dx² + ex + f = 0", cnt: 6 },
    sys2: { lbl: "2×2", n: "a₁x + b₁y = c₁\na₂x + b₂y = c₂", cnt: 6 },
    sys3: { lbl: "3×3", n: "a₁x + b₁y + c₁z = d₁\na₂x + b₂y + c₂z = d₂\na₃x + b₃y + c₃z = d₃", cnt: 12 },
  };
  const eqFields: Record<EqType, string[]> = {
    quadratic: ["a", "b", "c"],
    cubic: ["a", "b", "c", "d"],
    quartic: ["a", "b", "c", "d", "e"],
    quintic: ["a", "b", "c", "d", "e", "f"],
    sys2: ["a₁", "b₁", "c₁", "a₂", "b₂", "c₂"],
    sys3: ["a₁", "b₁", "c₁", "d₁", "a₂", "b₂", "c₂", "d₂", "a₃", "b₃", "c₃", "d₃"],
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-40" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(6px)" }} onClick={onClose} />
          <motion.div initial={{ opacity: 0, scale: 0.92, y: 30 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.92, y: 30 }} transition={{ type: "spring", damping: 22, stiffness: 300 }} className="fixed inset-0 z-50 flex items-center justify-center p-3 pointer-events-none">
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Scientific Calculator"
              tabIndex={-1}
              onKeyDown={(e) => {
                if (tab !== "standard") return;
                const k = e.key;
                if (k >= "0" && k <= "9") { append(k); e.preventDefault(); }
                else if (k === "+") { append("+"); e.preventDefault(); }
                else if (k === "-") { append("−"); e.preventDefault(); }
                else if (k === "*") { append("×"); e.preventDefault(); }
                else if (k === "/") { append("÷"); e.preventDefault(); }
                else if (k === ".") { append("."); e.preventDefault(); }
                else if (k === "(") { append("("); e.preventDefault(); }
                else if (k === ")") { append(")"); e.preventDefault(); }
                else if (k === "^") { append("^"); e.preventDefault(); }
                else if (k === "%") { append("/100"); e.preventDefault(); }
                else if (k === "Enter" || k === "=") { evaluate(); e.preventDefault(); }
                else if (k === "Backspace") { backspace(); e.preventDefault(); }
                else if (k === "Escape") { onClose(); e.preventDefault(); }
                else if (k === "Delete" || (k === "c" && !e.ctrlKey)) { clear(); e.preventDefault(); }
              }}
              className="w-full max-w-sm max-h-[94vh] overflow-y-auto rounded-3xl pointer-events-auto scrollbar-thin outline-none" style={{ background: "#070d1f", border: "1px solid rgba(59,130,246,0.2)", boxShadow: "0 0 100px rgba(59,130,246,0.12), 0 40px 80px rgba(0,0,0,0.6)" }}>

              {/* Header */}
              <div className="sticky top-0 z-10 flex items-center justify-between px-4 py-2.5 gap-2" style={{ background: "rgba(7,13,31,0.97)", backdropFilter: "blur(12px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                <span className="text-sm font-black shrink-0" style={{ color: "#60a5fa" }}>
                  Scientific Calc
                  {mem !== 0 && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-violet-500/20 text-violet-300">M</span>}
                </span>
                <div className="flex items-center gap-1 flex-wrap justify-end">
                  {(["standard", "equations", "stats", "vectors", "graph"] as Tab[]).map(t => (
                    <button key={t} onClick={() => setTab(t)} className="text-[10px] px-2 py-1.5 rounded-lg font-bold transition-all" style={{ background: tab === t ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.04)", color: tab === t ? "#60a5fa" : "#475569", border: `1px solid ${tab === t ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.06)"}` }}>
                      {t === "standard" ? "Std" : t === "equations" ? "Eq" : t === "stats" ? "Stat" : t === "vectors" ? "Vec" : "Graph"}
                    </button>
                  ))}
                  <button onClick={onClose} className="p-1.5 rounded-lg ml-1" style={{ color: "#475569" }}><X size={15} /></button>
                </div>
              </div>

              {/* ═══ STANDARD (Casio fx-991ES PLUS style) ═══ */}
              {tab === "standard" && (
                <div style={{ background: "#1a1a2e", borderRadius: "0 0 24px 24px" }}>
                  {/* Calculator body branding */}
                  <div className="flex items-center justify-between px-4 pt-2 pb-0.5">
                    <span className="text-[10px] font-bold tracking-widest" style={{ color: "#6b7280" }}>TeachFlow CALC</span>
                    <span className="text-[8px] tracking-wider" style={{ color: "#4b5563" }}>NATURAL-V.P.A.M.</span>
                  </div>

                  {/* LCD Display */}
                  <div className="mx-3 mb-2 rounded-lg overflow-hidden" style={{ background: "linear-gradient(180deg, #c8d5b9 0%, #b8c9a3 100%)", border: "2px solid #3a3a4a", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.3), inset 0 -1px 4px rgba(0,0,0,0.1)" }}>
                    {/* Mode indicators */}
                    <div className="flex items-center gap-2 px-2.5 pt-1.5 pb-0">
                      {shift && <span className="text-[8px] font-black px-1 rounded" style={{ background: "#d4a017", color: "#1a1a2e" }}>SHIFT</span>}
                      <span className="text-[8px] font-bold" style={{ color: "#4a5a3a" }}>{mode}</span>
                      {mem !== 0 && <span className="text-[8px] font-bold" style={{ color: "#4a5a3a" }}>M</span>}
                    </div>
                    {/* Expression line */}
                    <div className="px-2.5 text-right">
                      <div className="text-[11px] min-h-[16px] truncate font-mono" style={{ color: "#3a4a2a" }}>{expr || " "}</div>
                    </div>
                    {/* Result line */}
                    <div className="px-2.5 pb-2 text-right">
                      <div aria-live="polite" aria-label={`Result: ${result}`} className="text-2xl font-black truncate font-mono" style={{ color: result === "Error" ? "#8b0000" : "#1a2a0a" }}>{result}</div>
                    </div>
                  </div>

                  {/* Button grid */}
                  <div className="px-2.5 pb-3 flex flex-col gap-[5px]">

                    {/* Row 1: SHIFT, MODE, angle, M+, M-, AC */}
                    <div className="grid grid-cols-6 gap-[5px]">
                      <button onClick={() => setShift(s => !s)} className="h-[34px] rounded-md text-[10px] font-black transition-all active:scale-95" style={{ background: shift ? "#d4a017" : "transparent", color: shift ? "#1a1a2e" : "#d4a017", border: "2px solid #d4a017", boxShadow: shift ? "0 0 8px rgba(212,160,23,0.4)" : "none" }}>SHIFT</button>
                      <button onClick={() => setMode(m => m === "DEG" ? "RAD" : m === "RAD" ? "GRAD" : "DEG")} className="h-[34px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#4a4a5e", color: "#e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}>{mode}</button>
                      <button onClick={() => memOp("+")} className="h-[34px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#4a4a5e", color: "#e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}>M+</button>
                      <button onClick={() => memOp("-")} className="h-[34px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#4a4a5e", color: "#e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}>M-</button>
                      <button onClick={() => memOp("R")} className="h-[34px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#4a4a5e", color: "#e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}>MR</button>
                      <button onClick={clear} className="h-[34px] rounded-md text-[10px] font-black transition-all active:scale-95" style={{ background: "#c0392b", color: "#fff", boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15)" }}>AC</button>
                    </div>

                    {/* Row 2: Trig functions + ( ) */}
                    <div className="grid grid-cols-6 gap-[5px]">
                      {[
                        { normal: "sin", shifted: "sin⁻¹", normalAct: () => append("sin("), shiftAct: () => append("sin⁻¹(") },
                        { normal: "cos", shifted: "cos⁻¹", normalAct: () => append("cos("), shiftAct: () => append("cos⁻¹(") },
                        { normal: "tan", shifted: "tan⁻¹", normalAct: () => append("tan("), shiftAct: () => append("tan⁻¹(") },
                        { normal: "sinh", shifted: "asinh", normalAct: () => append("sinh("), shiftAct: () => append("asinh(") },
                        { normal: "cosh", shifted: "acosh", normalAct: () => append("cosh("), shiftAct: () => append("acosh(") },
                        { normal: "tanh", shifted: "atanh", normalAct: () => append("tanh("), shiftAct: () => append("atanh(") },
                      ].map((btn, i) => (
                        <button key={i} onClick={() => shiftAction(btn.normalAct, btn.shiftAct)} className="relative h-[34px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#1a6b5a", color: "#e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
                          {shift && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[7px] font-bold whitespace-nowrap" style={{ color: "#d4a017" }}>{btn.shifted}</span>}
                          {shift ? btn.shifted : btn.normal}
                        </button>
                      ))}
                    </div>

                    {/* Row 3: ln, log, sqrt, x^2, (, ) */}
                    <div className="grid grid-cols-6 gap-[5px]">
                      {[
                        { normal: "ln", shifted: "eˣ", normalAct: () => append("ln("), shiftAct: () => append("exp(") },
                        { normal: "log", shifted: "10ˣ", normalAct: () => append("log("), shiftAct: () => append("10**(") },
                        { normal: "√", shifted: "∛", normalAct: () => append("√("), shiftAct: () => append("∛(") },
                        { normal: "x²", shifted: "x³", normalAct: () => append("**2"), shiftAct: () => append("**3") },
                        { normal: "(", shifted: "nPr", normalAct: () => append("("), shiftAct: () => append("nPr(") },
                        { normal: ")", shifted: "nCr", normalAct: () => append(")"), shiftAct: () => append("nCr(") },
                      ].map((btn, i) => (
                        <button key={i} onClick={() => shiftAction(btn.normalAct, btn.shiftAct)} className="relative h-[34px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#1a6b5a", color: "#e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}>
                          {shift && <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 text-[7px] font-bold whitespace-nowrap" style={{ color: "#d4a017" }}>{btn.shifted}</span>}
                          {shift ? btn.shifted : btn.normal}
                        </button>
                      ))}
                    </div>

                    {/* Row 4: Extra functions: x^n, n!, 1/x, |x|, pi, e */}
                    <div className="grid grid-cols-6 gap-[5px]">
                      <button onClick={() => append("**(") } className="h-[34px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#1a6b5a", color: "#e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}>x&#8319;</button>
                      <button onClick={() => append("!")} className="h-[34px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#1a6b5a", color: "#e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}>n!</button>
                      <button onClick={() => setExpr(e => `(1/(${e || result}))`)} className="h-[34px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#1a6b5a", color: "#e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}>x&#8315;&#185;</button>
                      <button onClick={() => append("abs(")} className="h-[34px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#1a6b5a", color: "#e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}>|x|</button>
                      <button onClick={() => append("π")} className="h-[34px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#1a6b5a", color: "#e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}>π</button>
                      <button onClick={() => append("ℯ")} className="h-[34px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#1a6b5a", color: "#e2e8f0", boxShadow: "0 2px 4px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)" }}>ℯ</button>
                    </div>

                    {/* Row 5: 7 8 9 DEL ÷ × */}
                    <div className="grid grid-cols-6 gap-[5px]">
                      {["7", "8", "9"].map(n => (
                        <button key={n} onClick={() => append(n)} className="h-[38px] rounded-md text-sm font-bold transition-all active:scale-95" style={{ background: "#2d2d3f", color: "#f1f5f9", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)" }}>{n}</button>
                      ))}
                      <button onClick={backspace} className="h-[38px] rounded-md text-[10px] font-black transition-all active:scale-95" style={{ background: "#d4a017", color: "#1a1a2e", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.2)" }}>DEL</button>
                      <button onClick={() => append("÷")} className="h-[38px] rounded-md text-sm font-bold transition-all active:scale-95" style={{ background: "#3a3a50", color: "#e2e8f0", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>÷</button>
                      <button onClick={() => append("×")} className="h-[38px] rounded-md text-sm font-bold transition-all active:scale-95" style={{ background: "#3a3a50", color: "#e2e8f0", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>×</button>
                    </div>

                    {/* Row 6: 4 5 6 + - % */}
                    <div className="grid grid-cols-6 gap-[5px]">
                      {["4", "5", "6"].map(n => (
                        <button key={n} onClick={() => append(n)} className="h-[38px] rounded-md text-sm font-bold transition-all active:scale-95" style={{ background: "#2d2d3f", color: "#f1f5f9", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)" }}>{n}</button>
                      ))}
                      <button onClick={() => append("+")} className="h-[38px] rounded-md text-sm font-bold transition-all active:scale-95" style={{ background: "#3a3a50", color: "#e2e8f0", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>+</button>
                      <button onClick={() => append("−")} className="h-[38px] rounded-md text-sm font-bold transition-all active:scale-95" style={{ background: "#3a3a50", color: "#e2e8f0", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>−</button>
                      <button onClick={() => append("/100")} className="h-[38px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#3a3a50", color: "#e2e8f0", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>%</button>
                    </div>

                    {/* Row 7: 1 2 3 EXP Ans ^ */}
                    <div className="grid grid-cols-6 gap-[5px]">
                      {["1", "2", "3"].map(n => (
                        <button key={n} onClick={() => append(n)} className="h-[38px] rounded-md text-sm font-bold transition-all active:scale-95" style={{ background: "#2d2d3f", color: "#f1f5f9", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)" }}>{n}</button>
                      ))}
                      <button onClick={() => append("*10**(")} className="h-[38px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#3a3a50", color: "#e2e8f0", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>EXP</button>
                      <button onClick={() => append(result !== "Error" ? result : "0")} className="h-[38px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#3a3a50", color: "#e2e8f0", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>Ans</button>
                      <button onClick={() => append("^")} className="h-[38px] rounded-md text-sm font-bold transition-all active:scale-95" style={{ background: "#3a3a50", color: "#e2e8f0", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>^</button>
                    </div>

                    {/* Row 8: 0, 00, ., +/-, MC, comma */}
                    <div className="grid grid-cols-6 gap-[5px]">
                      <button onClick={() => append("0")} className="h-[38px] rounded-md text-sm font-bold transition-all active:scale-95" style={{ background: "#2d2d3f", color: "#f1f5f9", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)" }}>0</button>
                      <button onClick={() => append("00")} className="h-[38px] rounded-md text-sm font-bold transition-all active:scale-95" style={{ background: "#2d2d3f", color: "#f1f5f9", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)" }}>00</button>
                      <button onClick={() => append(".")} className="h-[38px] rounded-md text-sm font-bold transition-all active:scale-95" style={{ background: "#2d2d3f", color: "#f1f5f9", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)" }}>.</button>
                      <button onClick={() => setExpr(e => e.startsWith("-") ? e.slice(1) : "-" + e)} className="h-[38px] rounded-md text-sm font-bold transition-all active:scale-95" style={{ background: "#3a3a50", color: "#e2e8f0", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>(&#8211;)</button>
                      <button onClick={() => memOp("C")} className="h-[38px] rounded-md text-[10px] font-bold transition-all active:scale-95" style={{ background: "#4a4a5e", color: "#e2e8f0", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.1)" }}>MC</button>
                      <button onClick={() => append(",")} className="h-[38px] rounded-md text-sm font-bold transition-all active:scale-95" style={{ background: "#2d2d3f", color: "#f1f5f9", boxShadow: "0 3px 6px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)" }}>,</button>
                    </div>

                    {/* Row 9: = button spanning full width */}
                    <button onClick={evaluate} className="h-[40px] rounded-md text-base font-black transition-all active:scale-[0.98]" style={{ background: "linear-gradient(180deg, #2563eb 0%, #1d4ed8 100%)", color: "#fff", boxShadow: "0 4px 12px rgba(37,99,235,0.4), inset 0 1px 0 rgba(255,255,255,0.2)", letterSpacing: "0.1em" }}>=</button>
                  </div>

                  {/* History */}
                  {hist.length > 0 && (
                    <div className="px-3 pb-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-bold" style={{ color: "#4b5563" }}>History</span>
                        <button onClick={() => setHist([])} style={{ color: "#4b5563" }}><RotateCcw size={10} /></button>
                      </div>
                      <div className="space-y-1 max-h-20 overflow-y-auto">
                        {hist.map(({ e, r }, i) => (
                          <button key={i} onClick={() => { setExpr(e); setResult(r); }} className="w-full text-right text-[10px] rounded-lg px-2.5 py-1 hover:opacity-80" style={{ background: "rgba(255,255,255,0.03)", color: "#6b7280" }}>
                            {e} <span style={{ color: "#2563eb" }}>= {r}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ EQUATIONS ═══ */}
              {tab === "equations" && (
                <div className="p-5">
                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {(["quadratic", "cubic", "quartic", "quintic", "sys2", "sys3"] as EqType[]).map(t => (
                      <button key={t} onClick={() => { setEqType(t); setEqC(Array(12).fill("")); setEqR([]); }} className="px-3 py-1.5 rounded-lg text-xs font-bold transition-all" style={{ background: eqType === t ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.04)", color: eqType === t ? "#60a5fa" : "#64748b", border: `1px solid ${eqType === t ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.07)"}` }}>
                        {eqCfg[t].lbl}
                      </button>
                    ))}
                  </div>
                  <div className="mb-4 p-3 rounded-xl text-center text-sm font-mono whitespace-pre-line" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.15)", color: "#93c5fd" }}>{eqCfg[eqType].n}</div>
                  <div className={`grid gap-2.5 mb-4 ${eqCfg[eqType].cnt <= 6 ? "grid-cols-3" : "grid-cols-4"}`}>
                    {eqFields[eqType].map((f, i) => (
                      <div key={i}>
                        <label className="text-[10px] font-bold block mb-0.5" style={{ color: "#64748b" }}>{f}</label>
                        <input type="number" value={eqC[i]} onChange={e => setEqC(p => { const n = [...p]; n[i] = e.target.value; return n; })} placeholder="0" className="w-full px-2.5 py-2 rounded-lg text-sm font-mono outline-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }} />
                      </div>
                    ))}
                  </div>
                  <button onClick={solveEq} className="w-full py-3 rounded-xl font-black text-sm" style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "#fff" }}>Solve</button>
                  {eqR.length > 0 && (
                    <div className="mt-4 space-y-2">
                      {eqR.map((r, i) => (
                        <div key={i} className="px-4 py-2.5 rounded-xl font-mono text-sm" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", color: "#6ee7b7" }}>{r}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ STATS ═══ */}
              {tab === "stats" && (
                <div className="p-5">
                  <p className="text-xs mb-2" style={{ color: "#475569" }}>Enter numbers (comma, space, or newline separated):</p>
                  <textarea value={statsData} onChange={e => setStatsData(e.target.value)} placeholder="e.g. 2, 4, 4, 4, 5, 5, 7, 9" rows={3} className="w-full px-3 py-2.5 rounded-xl text-sm font-mono outline-none resize-none mb-3" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }} />
                  <button onClick={doStats} className="w-full py-3 rounded-xl font-black text-sm mb-4" style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", color: "#fff" }}>Calculate</button>
                  {statsR && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                        {([["n", statsR.n], ["Σx", statsR.sum], ["Σx²", statsR.sumSq], ["Mean (x̄)", statsR.mean], ["Median", statsR.median], ["Mode", statsR.mode], ["Range", statsR.range], ["Min", statsR.min], ["Max", statsR.max], ["Q1", statsR.Q1], ["Q3", statsR.Q3], ["IQR", statsR.IQR]] as [string, string | number][]).map(([k, v]) => (
                          <div key={k} className="px-2.5 py-2 rounded-lg" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                            <div className="text-[10px]" style={{ color: "#475569" }}>{k}</div>
                            <div className="text-xs font-bold font-mono mt-0.5" style={{ color: "#60a5fa" }}>{String(v)}</div>
                          </div>
                        ))}
                      </div>
                      <div className="p-3 rounded-xl" style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
                        <div className="text-xs font-bold mb-1.5" style={{ color: "#60a5fa" }}>Dispersion</div>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                          <div><span style={{ color: "#475569" }}>σ: </span><span style={{ color: "#93c5fd" }}>{statsR.popStd}</span></div>
                          <div><span style={{ color: "#475569" }}>s: </span><span style={{ color: "#93c5fd" }}>{statsR.samStd}</span></div>
                          <div><span style={{ color: "#475569" }}>σ²: </span><span style={{ color: "#93c5fd" }}>{statsR.popVar}</span></div>
                          <div><span style={{ color: "#475569" }}>s²: </span><span style={{ color: "#93c5fd" }}>{statsR.samVar}</span></div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ═══ VECTORS ═══ */}
              {tab === "vectors" && (
                <div className="p-5">
                  <div className="flex gap-2 mb-4">
                    {([2, 3] as const).map(d => (
                      <button key={d} onClick={() => { setVDim(d); setVR([]); }} className="px-4 py-2 rounded-lg text-sm font-bold transition-all" style={{ background: vDim === d ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.04)", color: vDim === d ? "#60a5fa" : "#64748b", border: `1px solid ${vDim === d ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.07)"}` }}>{d}D</button>
                    ))}
                  </div>
                  <div className="grid grid-cols-2 gap-5 mb-4">
                    {[["A", vA, setVA, "#60a5fa"], ["B", vB, setVB, "#10b981"]].map(([name, vals, setFn, color]) => (
                      <div key={name as string}>
                        <div className="text-xs font-black mb-2" style={{ color: color as string }}>Vector {name as string}</div>
                        {["x", "y", "z"].slice(0, vDim).map((l, i) => (
                          <div key={l} className="mb-1.5">
                            <input type="number" value={(vals as string[])[i]} onChange={e => { const n = [...(vals as string[])]; n[i] = e.target.value; (setFn as (v: string[]) => void)(n); }} placeholder={`${l} = 0`} className="w-full px-2.5 py-2 rounded-lg text-sm font-mono outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-3 md:grid-cols-5 gap-2 mb-4">
                    {([["add", "A+B"], ["sub", "A−B"], ["dot", "A·B"], ["cross", "A×B"], ["magA", "|A|"], ["magB", "|B|"], ["unitA", "Â"], ["unitB", "B̂"], ["angle", "θ(A,B)"], ["proj", "proj"]] as [string, string][]).map(([op, lbl]) => (
                      <button key={op} onClick={() => doVec(op)} className="py-2 px-1.5 rounded-xl text-xs font-bold transition-all hover:opacity-80" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)", color: "#93c5fd" }}>{lbl}</button>
                    ))}
                  </div>
                  {vR.length > 0 && (
                    <div className="space-y-2">
                      {vR.map((r, i) => (
                        <div key={i} className="px-4 py-2.5 rounded-xl font-mono text-sm" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)", color: "#6ee7b7" }}>{r}</div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* ═══ GRAPH ═══ */}
              {tab === "graph" && (
                <div className="p-5">
                  <div className="flex gap-2 mb-3">
                    <input value={gExpr} onChange={e => setGExpr(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { const t = gExpr.trim(); if (t) { setGFns(f => f.includes(t) ? f : [...f.slice(0, 3), t]); setTimeout(drawGraph, 60); } } }} placeholder="f(x) = ..." className="flex-1 px-3 py-2 rounded-xl text-sm font-mono outline-none" style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "#e2e8f0" }} />
                    <button onClick={() => { const t = gExpr.trim(); if (t) { setGFns(f => f.includes(t) ? f : [...f.slice(0, 3), t]); setTimeout(drawGraph, 60); } }} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "rgba(59,130,246,0.25)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.4)" }}>Plot</button>
                    <button onClick={() => { setGFns([]); setTimeout(drawGraph, 60); }} className="px-3 py-2 rounded-xl text-sm" style={{ background: "rgba(255,255,255,0.04)", color: "#475569", border: "1px solid rgba(255,255,255,0.07)" }}>Clear</button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {["sin(x)", "cos(x)", "tan(x)", "x^2", "x^3", "ln(x)", "√(x)", "1/x", "exp(x)", "x^2-4"].map(fn => (
                      <button key={fn} onClick={() => { setGExpr(fn); setGFns(f => f.includes(fn) ? f : [...f.slice(0, 3), fn]); setTimeout(drawGraph, 60); }} className="px-2 py-1 rounded-lg text-[10px] font-mono transition-all hover:opacity-80" style={{ background: gFns.includes(fn) ? "rgba(59,130,246,0.25)" : "rgba(255,255,255,0.05)", color: gFns.includes(fn) ? "#60a5fa" : "#64748b", border: `1px solid ${gFns.includes(fn) ? "rgba(59,130,246,0.4)" : "rgba(255,255,255,0.07)"}` }}>{fn}</button>
                    ))}
                  </div>
                  <canvas ref={canvasRef} width={560} height={300} className="w-full rounded-xl" style={{ border: "1px solid rgba(255,255,255,0.07)" }} />
                  <div className="grid grid-cols-4 gap-2 mt-3">
                    {(["xMin", "xMax", "yMin", "yMax"] as const).map(k => (
                      <div key={k}>
                        <label className="text-[10px]" style={{ color: "#475569" }}>{k}</label>
                        <input type="number" value={gBounds[k]} onChange={e => { setGB(b => ({ ...b, [k]: Number(e.target.value) })); setTimeout(drawGraph, 100); }} className="w-full mt-0.5 px-2 py-1.5 rounded-lg text-xs font-mono outline-none" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", color: "#e2e8f0" }} />
                      </div>
                    ))}
                  </div>
                  {gFns.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {gFns.map((fn, i) => (
                        <span key={i} className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-[10px] font-mono" style={{ background: "rgba(255,255,255,0.04)", border: `1px solid ${GRAPH_COLORS[i % GRAPH_COLORS.length]}40`, color: GRAPH_COLORS[i % GRAPH_COLORS.length] }}>
                          <span className="w-2 h-2 rounded-full" style={{ background: GRAPH_COLORS[i % GRAPH_COLORS.length] }} />
                          y={fn}
                          <button onClick={() => { setGFns(f => f.filter((_, j) => j !== i)); setTimeout(drawGraph, 60); }} className="ml-0.5 opacity-60 hover:opacity-100">×</button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
