"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  TrendingUp, Grid3X3, BarChart2,
  Plus, Minus, RefreshCw, Calculator,
} from "lucide-react";

// ── Types ────────────────────────────────────────────────────────
type Tab = "grapher" | "matrix" | "statistics";
type MatrixSize = 2 | 3;
type MatrixOp = "add" | "subtract" | "multiply" | "determinant" | "inverse";

// ── Safe expression evaluator ────────────────────────────────────
function parseAndEval(expr: string, x: number): number | null {
  const safe = /^[\d\s\.\+\-\*\/\^\(\)xXeE,sincotagqrbpl]+$/i;
  const cleaned = expr.trim();
  if (!safe.test(cleaned)) return null;
  try {
    const js = cleaned
      .replace(/\^/g, "**")
      .replace(/\bsin\b/g, "Math.sin")
      .replace(/\bcos\b/g, "Math.cos")
      .replace(/\btan\b/g, "Math.tan")
      .replace(/\bsqrt\b/g, "Math.sqrt")
      .replace(/\babs\b/g, "Math.abs")
      .replace(/\blog\b/g, "Math.log10")
      .replace(/\bln\b/g, "Math.log")
      .replace(/\bexp\b/g, "Math.exp")
      .replace(/\bpi\b/gi, "Math.PI")
      .replace(/\be\b/g, "Math.E")
      .replace(/([0-9])\s*x/g, "$1*x")
      .replace(/([0-9])\s*X/g, "$1*X")
      .replace(/x/g, `(${x})`)
      .replace(/X/g, `(${x})`);
    // eslint-disable-next-line no-new-func
    const result = new Function(`return (${js})`)();
    return typeof result === "number" && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

// ── Matrix helpers ────────────────────────────────────────────────
type Matrix = number[][];

function makeMatrix(n: number): Matrix {
  return Array.from({ length: n }, () => Array(n).fill(0));
}

function matAdd(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((v, j) => v + b[i][j]));
}

function matSub(a: Matrix, b: Matrix): Matrix {
  return a.map((row, i) => row.map((v, j) => v - b[i][j]));
}

function matMul(a: Matrix, b: Matrix): Matrix {
  const n = a.length;
  const res = makeMatrix(n);
  for (let i = 0; i < n; i++)
    for (let j = 0; j < n; j++)
      for (let k = 0; k < n; k++)
        res[i][j] += a[i][k] * b[k][j];
  return res;
}

function det2(m: Matrix): number {
  return m[0][0] * m[1][1] - m[0][1] * m[1][0];
}

function det3(m: Matrix): number {
  return (
    m[0][0] * (m[1][1] * m[2][2] - m[1][2] * m[2][1]) -
    m[0][1] * (m[1][0] * m[2][2] - m[1][2] * m[2][0]) +
    m[0][2] * (m[1][0] * m[2][1] - m[1][1] * m[2][0])
  );
}

function inv2(m: Matrix): Matrix | null {
  const d = det2(m);
  if (Math.abs(d) < 1e-10) return null;
  return [
    [m[1][1] / d, -m[0][1] / d],
    [-m[1][0] / d, m[0][0] / d],
  ];
}

function inv3(m: Matrix): Matrix | null {
  const d = det3(m);
  if (Math.abs(d) < 1e-10) return null;
  const c: Matrix = makeMatrix(3);
  for (let i = 0; i < 3; i++)
    for (let j = 0; j < 3; j++) {
      const sub = m.filter((_, r) => r !== i).map((row) => row.filter((_, c) => c !== j));
      const sign = (i + j) % 2 === 0 ? 1 : -1;
      c[j][i] = (sign * det2(sub)) / d;
    }
  return c;
}

function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(4)).toString();
}

// ── Statistics helpers ────────────────────────────────────────────
function parseData(raw: string): number[] {
  return raw.split(/[\s,;\n]+/).map(Number).filter((n) => !isNaN(n));
}

function mean(arr: number[]): number {
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function median(arr: number[]): number {
  const s = [...arr].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? (s[m - 1] + s[m]) / 2 : s[m];
}

function mode(arr: number[]): number[] {
  const freq = new Map<number, number>();
  for (const v of arr) freq.set(v, (freq.get(v) ?? 0) + 1);
  const max = Math.max(...freq.values());
  return [...freq.entries()].filter(([, f]) => f === max).map(([v]) => v);
}

function stdDev(arr: number[], m: number): number {
  return Math.sqrt(arr.reduce((s, v) => s + (v - m) ** 2, 0) / arr.length);
}

// ── Grapher ───────────────────────────────────────────────────────
const COLORS = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

function Grapher() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [fns, setFns] = useState<string[]>(["x^2", ""]);
  const [xMin, setXMin] = useState(-10);
  const [xMax, setXMax] = useState(10);
  const [yMin, setYMin] = useState(-10);
  const [yMax, setYMax] = useState(10);
  const [error, setError] = useState<string | null>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const W = canvas.width;
    const H = canvas.height;

    const toCanvasX = (x: number) => ((x - xMin) / (xMax - xMin)) * W;
    const toCanvasY = (y: number) => H - ((y - yMin) / (yMax - yMin)) * H;

    ctx.clearRect(0, 0, W, H);

    // Background
    ctx.fillStyle = "#0b1120";
    ctx.fillRect(0, 0, W, H);

    // Grid
    ctx.strokeStyle = "rgba(255,255,255,0.06)";
    ctx.lineWidth = 1;
    for (let x = Math.ceil(xMin); x <= xMax; x++) {
      const cx = toCanvasX(x);
      ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, H); ctx.stroke();
    }
    for (let y = Math.ceil(yMin); y <= yMax; y++) {
      const cy = toCanvasY(y);
      ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(W, cy); ctx.stroke();
    }

    // Axes
    ctx.strokeStyle = "rgba(255,255,255,0.3)";
    ctx.lineWidth = 1.5;
    const ax = toCanvasX(0);
    const ay = toCanvasY(0);
    if (ax >= 0 && ax <= W) { ctx.beginPath(); ctx.moveTo(ax, 0); ctx.lineTo(ax, H); ctx.stroke(); }
    if (ay >= 0 && ay <= H) { ctx.beginPath(); ctx.moveTo(0, ay); ctx.lineTo(W, ay); ctx.stroke(); }

    // Axis labels
    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "10px Inter, sans-serif";
    ctx.textAlign = "center";
    for (let x = Math.ceil(xMin); x <= xMax; x++) {
      if (x === 0) continue;
      ctx.fillText(String(x), toCanvasX(x), ay + 14);
    }
    ctx.textAlign = "right";
    for (let y = Math.ceil(yMin); y <= yMax; y++) {
      if (y === 0) continue;
      ctx.fillText(String(y), ax - 4, toCanvasY(y) + 4);
    }

    // Plot functions
    let hasError = false;
    fns.forEach((fn, idx) => {
      if (!fn.trim()) return;
      ctx.strokeStyle = COLORS[idx % COLORS.length];
      ctx.lineWidth = 2;
      ctx.beginPath();
      let started = false;
      const steps = W * 2;
      for (let i = 0; i <= steps; i++) {
        const x = xMin + (i / steps) * (xMax - xMin);
        const y = parseAndEval(fn, x);
        if (y === null) { hasError = true; started = false; continue; }
        if (y < yMin - 50 || y > yMax + 50) { started = false; continue; }
        const cx = toCanvasX(x);
        const cy = toCanvasY(y);
        if (!started) { ctx.moveTo(cx, cy); started = true; } else { ctx.lineTo(cx, cy); }
      }
      ctx.stroke();
    });
    setError(hasError ? "Invalid expression — use x, +, -, *, /, ^, sin(), cos(), sqrt()" : null);
  }, [fns, xMin, xMax, yMin, yMax]);

  useEffect(() => { draw(); }, [draw]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2">
          <canvas
            ref={canvasRef}
            width={600}
            height={400}
            className="w-full rounded-xl border border-border"
            style={{ background: "#0b1120" }}
          />
        </div>
        <div className="space-y-3">
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-text-2 uppercase tracking-wider">Functions</p>
            {fns.map((fn, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                <input
                  value={fn}
                  onChange={(e) => { const n = [...fns]; n[i] = e.target.value; setFns(n); }}
                  placeholder={`f${i + 1}(x)`}
                  className="flex-1 text-sm px-3 py-2 rounded-lg border border-border bg-bg text-text font-mono focus:outline-none focus:border-primary/60"
                />
                {fns.length > 1 && (
                  <button onClick={() => setFns(fns.filter((_, j) => j !== i))} className="text-muted hover:text-danger transition-colors">
                    <Minus size={14} />
                  </button>
                )}
              </div>
            ))}
            {fns.length < 5 && (
              <button onClick={() => setFns([...fns, ""])} className="flex items-center gap-1 text-xs text-primary hover:underline">
                <Plus size={12} /> Add function
              </button>
            )}
            {error && <p className="text-xs text-danger">{error}</p>}
          </div>

          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <p className="text-xs font-bold text-text-2 uppercase tracking-wider">View Range</p>
            {[
              { label: "X min", val: xMin, set: setXMin },
              { label: "X max", val: xMax, set: setXMax },
              { label: "Y min", val: yMin, set: setYMin },
              { label: "Y max", val: yMax, set: setYMax },
            ].map(({ label, val, set }) => (
              <div key={label} className="flex items-center gap-2">
                <span className="text-xs text-text-2 w-14 shrink-0">{label}</span>
                <input
                  type="number"
                  value={val}
                  onChange={(e) => set(Number(e.target.value))}
                  className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-border bg-bg text-text focus:outline-none focus:border-primary/60"
                />
              </div>
            ))}
            <button
              onClick={() => { setXMin(-10); setXMax(10); setYMin(-10); setYMax(10); }}
              className="flex items-center gap-1 text-xs text-muted hover:text-text transition-colors"
            >
              <RefreshCw size={11} /> Reset view
            </button>
          </div>

          <div className="bg-surface border border-border rounded-xl p-3">
            <p className="text-xs font-bold text-text-2 mb-2">Examples</p>
            <div className="flex flex-wrap gap-1.5">
              {["x^2", "sin(x)", "cos(x)", "2*x+1", "x^3-x", "sqrt(x)", "1/x", "exp(x/5)"].map((ex) => (
                <button
                  key={ex}
                  onClick={() => { const n = [...fns]; n[0] = ex; setFns(n); }}
                  className="text-xs px-2.5 py-1 rounded-full border border-border text-text-2 font-mono hover:border-primary/50 hover:text-primary transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Matrix Calculator ─────────────────────────────────────────────
function MatrixCalc() {
  const [size, setSize] = useState<MatrixSize>(2);
  const [A, setA] = useState<Matrix>(makeMatrix(2));
  const [B, setB] = useState<Matrix>(makeMatrix(2));
  const [op, setOp] = useState<MatrixOp>("add");
  const [result, setResult] = useState<Matrix | number | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setA(makeMatrix(size));
    setB(makeMatrix(size));
    setResult(null);
    setErr(null);
  }, [size]);

  const update = (mat: "A" | "B", i: number, j: number, v: string) => {
    const num = v === "" || v === "-" ? 0 : parseFloat(v) || 0;
    if (mat === "A") { const n = A.map((r) => [...r]); n[i][j] = num; setA(n); }
    else { const n = B.map((r) => [...r]); n[i][j] = num; setB(n); }
    setResult(null); setErr(null);
  };

  const compute = () => {
    setErr(null); setResult(null);
    try {
      if (op === "add") setResult(matAdd(A, B));
      else if (op === "subtract") setResult(matSub(A, B));
      else if (op === "multiply") setResult(matMul(A, B));
      else if (op === "determinant") {
        setResult(size === 2 ? det2(A) : det3(A));
      } else if (op === "inverse") {
        const inv = size === 2 ? inv2(A) : inv3(A);
        if (!inv) setErr("Matrix is singular (determinant = 0) — inverse does not exist");
        else setResult(inv);
      }
    } catch {
      setErr("Calculation error");
    }
  };

  const needsB = op === "add" || op === "subtract" || op === "multiply";

  const MatrixInput = ({ mat, label }: { mat: "A" | "B"; label: string }) => (
    <div>
      <p className="text-xs font-bold text-text-2 mb-2">Matrix {label}</p>
      <div className="inline-grid gap-1" style={{ gridTemplateColumns: `repeat(${size}, 1fr)` }}>
        {(mat === "A" ? A : B).map((row, i) =>
          row.map((v, j) => (
            <input
              key={`${i}-${j}`}
              type="number"
              value={v === 0 ? "" : v}
              onChange={(e) => update(mat, i, j, e.target.value)}
              placeholder="0"
              className="w-16 text-center text-sm px-2 py-2 rounded-lg border border-border bg-bg text-text font-mono focus:outline-none focus:border-primary/60"
            />
          ))
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-2">Size:</span>
          {([2, 3] as MatrixSize[]).map((s) => (
            <button
              key={s}
              onClick={() => setSize(s)}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border"
              style={size === s
                ? { background: "var(--color-primary)", color: "#fff", borderColor: "var(--color-primary)" }
                : { borderColor: "var(--color-border)", color: "var(--color-text-2)" }
              }
            >
              {s}×{s}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm text-text-2">Operation:</span>
          {(["add", "subtract", "multiply", "determinant", "inverse"] as MatrixOp[]).map((o) => (
            <button
              key={o}
              onClick={() => { setOp(o); setResult(null); setErr(null); }}
              className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all border"
              style={op === o
                ? { background: "rgba(59,130,246,0.15)", color: "#60a5fa", borderColor: "rgba(59,130,246,0.4)" }
                : { borderColor: "var(--color-border)", color: "var(--color-text-2)" }
              }
            >
              {o}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap items-start gap-8">
        <MatrixInput mat="A" label="A" />
        {needsB && (
          <>
            <div className="self-center text-xl font-bold text-text-2 mt-6">
              {op === "add" ? "+" : op === "subtract" ? "−" : "×"}
            </div>
            <MatrixInput mat="B" label="B" />
          </>
        )}
        <div className="self-center mt-6">
          <span className="text-xl font-bold text-text-2">=</span>
        </div>
        <div className="mt-6">
          {result !== null ? (
            typeof result === "number" ? (
              <div className="text-3xl font-black text-primary">{fmtNum(result)}</div>
            ) : (
              <div className="space-y-1">
                {(result as Matrix).map((row, i) => (
                  <div key={i} className="flex gap-1">
                    {row.map((v, j) => (
                      <span key={j} className="w-16 text-center text-sm px-2 py-2 rounded-lg bg-primary/10 text-text font-mono border border-primary/20">
                        {fmtNum(v)}
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className="text-text-2 text-sm">—</div>
          )}
        </div>
      </div>

      {err && <p className="text-sm text-danger">{err}</p>}

      <button
        onClick={compute}
        className="flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors"
      >
        <Calculator size={15} /> Calculate
      </button>
    </div>
  );
}

// ── Statistics ────────────────────────────────────────────────────
function StatisticsCalc() {
  const [raw, setRaw] = useState("12, 15, 18, 22, 15, 30, 22, 18, 15, 25");
  const data = parseData(raw);
  const valid = data.length >= 2;
  const m = valid ? mean(data) : 0;
  const med = valid ? median(data) : 0;
  const modes = valid ? mode(data) : [];
  const sd = valid ? stdDev(data, m) : 0;
  const sorted = [...data].sort((a, b) => a - b);
  const range = valid ? sorted[sorted.length - 1] - sorted[0] : 0;

  // Frequency for bar chart
  const freq = new Map<number, number>();
  for (const v of data) freq.set(v, (freq.get(v) ?? 0) + 1);
  const freqEntries = [...freq.entries()].sort((a, b) => a[0] - b[0]);
  const maxFreq = Math.max(...freq.values(), 1);

  const StatRow = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between items-center py-2 border-b border-border last:border-0">
      <span className="text-sm text-text-2">{label}</span>
      <span className="text-sm font-bold text-text font-mono">{value}</span>
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="space-y-3">
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs font-bold text-text-2 uppercase tracking-wider mb-2">Data Input</p>
            <textarea
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={4}
              placeholder="Enter numbers separated by commas, spaces, or newlines"
              className="w-full text-sm px-3 py-2 rounded-lg border border-border bg-bg text-text font-mono resize-none focus:outline-none focus:border-primary/60"
            />
            <p className="text-xs text-text-2 mt-1">{data.length} values loaded</p>
          </div>

          {valid && (
            <div className="bg-surface border border-border rounded-xl p-4">
              <p className="text-xs font-bold text-text-2 uppercase tracking-wider mb-3">Results</p>
              <StatRow label="Count (n)" value={String(data.length)} />
              <StatRow label="Sum (Σx)" value={fmtNum(data.reduce((a, b) => a + b, 0))} />
              <StatRow label="Mean (x̄)" value={fmtNum(m)} />
              <StatRow label="Median" value={fmtNum(med)} />
              <StatRow label="Mode" value={modes.map(fmtNum).join(", ")} />
              <StatRow label="Range" value={fmtNum(range)} />
              <StatRow label="Variance (σ²)" value={fmtNum(sd * sd)} />
              <StatRow label="Std Dev (σ)" value={fmtNum(sd)} />
              <StatRow label="Min" value={fmtNum(sorted[0])} />
              <StatRow label="Max" value={fmtNum(sorted[sorted.length - 1])} />
            </div>
          )}
        </div>

        <div className="space-y-3">
          {valid && (
            <>
              <div className="bg-surface border border-border rounded-xl p-4">
                <p className="text-xs font-bold text-text-2 uppercase tracking-wider mb-4">Frequency Distribution</p>
                <div className="space-y-2">
                  {freqEntries.map(([val, cnt]) => (
                    <div key={val} className="flex items-center gap-2">
                      <span className="text-xs font-mono text-text-2 w-12 shrink-0">{fmtNum(val)}</span>
                      <div className="flex-1 h-5 bg-bg rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full bg-primary transition-all"
                          style={{ width: `${(cnt / maxFreq) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs text-text-2 w-6 text-right shrink-0">{cnt}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-4">
                <p className="text-xs font-bold text-text-2 uppercase tracking-wider mb-3">Sorted Data</p>
                <div className="flex flex-wrap gap-1.5">
                  {sorted.map((v, i) => (
                    <span key={i} className="text-xs font-mono px-2 py-1 rounded-md bg-bg border border-border text-text-2">
                      {v}
                    </span>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────
export function MathWorkspaceClient() {
  const [tab, setTab] = useState<Tab>("grapher");

  const tabs: { id: Tab; label: string; icon: React.ReactNode; desc: string }[] = [
    { id: "grapher", label: "Function Grapher", icon: <TrendingUp size={16} />, desc: "Plot mathematical functions" },
    { id: "matrix", label: "Matrix Calculator", icon: <Grid3X3 size={16} />, desc: "2×2 and 3×3 matrix operations" },
    { id: "statistics", label: "Statistics", icon: <BarChart2 size={16} />, desc: "Mean, median, mode, std dev" },
  ];

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex gap-2 border-b border-border pb-0 overflow-x-auto">
        {tabs.map(({ id, label, icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-semibold whitespace-nowrap border-b-2 transition-all"
            style={tab === id
              ? { borderColor: "var(--color-primary)", color: "var(--color-primary)" }
              : { borderColor: "transparent", color: "var(--color-text-2)" }
            }
          >
            {icon}
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="min-h-[420px]">
        {tab === "grapher" && <Grapher />}
        {tab === "matrix" && (
          <div className="bg-surface border border-border rounded-xl p-6">
            <MatrixCalc />
          </div>
        )}
        {tab === "statistics" && <StatisticsCalc />}
      </div>
    </div>
  );
}
