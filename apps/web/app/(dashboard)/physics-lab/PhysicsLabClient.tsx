"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Play, RotateCcw, Zap, Activity, Waves } from "lucide-react";

type Tab = "projectile" | "circuit" | "wave";

// ── Projectile Motion ─────────────────────────────────────────────
const g = 9.8;

function ProjectileLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const [angle, setAngle] = useState(45);
  const [speed, setSpeed] = useState(30);
  const [running, setRunning] = useState(false);
  const [t, setT] = useState(0);
  const [stats, setStats] = useState<{ maxH: number; range: number; tof: number } | null>(null);

  const rad = (angle * Math.PI) / 180;
  const vx = speed * Math.cos(rad);
  const vy = speed * Math.sin(rad);
  const tof = (2 * vy) / g;
  const maxH = (vy * vy) / (2 * g);
  const range = vx * tof;

  const drawFrame = useCallback(
    (time: number) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      const PAD = 40;
      const scaleX = (W - PAD * 2) / (range > 0 ? range : 1);
      const scaleY = (H - PAD * 2) / (maxH > 0 ? maxH * 1.3 : 1);

      const toCanvas = (px: number, py: number) => ({
        x: PAD + px * scaleX,
        y: H - PAD - py * scaleY,
      });

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0b1120";
      ctx.fillRect(0, 0, W, H);

      // Ground
      ctx.strokeStyle = "rgba(255,255,255,0.2)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(PAD, H - PAD);
      ctx.lineTo(W - PAD, H - PAD);
      ctx.stroke();

      // Trajectory path
      ctx.strokeStyle = "rgba(59,130,246,0.3)";
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      for (let i = 0; i <= 200; i++) {
        const ti = (i / 200) * tof;
        const px = vx * ti;
        const py = vy * ti - 0.5 * g * ti * ti;
        if (py < 0) break;
        const c = toCanvas(px, py);
        if (i === 0) ctx.moveTo(c.x, c.y); else ctx.lineTo(c.x, c.y);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      // Current position
      const cx = vx * time;
      const cy = vy * time - 0.5 * g * time * time;
      if (cy >= 0) {
        const p = toCanvas(cx, cy);
        ctx.fillStyle = "#3b82f6";
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        ctx.fill();

        // Velocity vector
        const scale = 3;
        ctx.strokeStyle = "#ef4444";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x + vx * scale, p.y - (vy - g * time) * scale);
        ctx.stroke();
      }

      // Labels
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "11px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillText(`Range: ${range.toFixed(1)} m`, PAD, 20);
      ctx.textAlign = "center";
      ctx.fillText(`Max H: ${maxH.toFixed(1)} m`, W / 2, 20);
      ctx.textAlign = "right";
      ctx.fillText(`ToF: ${tof.toFixed(2)} s`, W - PAD, 20);
    },
    [angle, speed, vx, vy, g, tof, maxH, range]
  );

  useEffect(() => {
    drawFrame(0);
    setStats({ maxH, range, tof });
  }, [angle, speed, drawFrame, maxH, range, tof]);

  const startAnim = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    let startTime: number | null = null;
    setRunning(true);

    const step = (ts: number) => {
      if (!startTime) startTime = ts;
      const elapsed = (ts - startTime) / 1000;
      setT(elapsed);
      drawFrame(elapsed);
      if (elapsed < tof) {
        animRef.current = requestAnimationFrame(step);
      } else {
        drawFrame(tof);
        setRunning(false);
      }
    };
    animRef.current = requestAnimationFrame(step);
  };

  const reset = () => {
    if (animRef.current) cancelAnimationFrame(animRef.current);
    setRunning(false);
    setT(0);
    drawFrame(0);
  };

  useEffect(() => () => { if (animRef.current) cancelAnimationFrame(animRef.current); }, []);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <canvas ref={canvasRef} width={580} height={340} className="w-full rounded-xl border border-border" />
      </div>
      <div className="space-y-3">
        <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
          <p className="text-xs font-bold text-text-2 uppercase tracking-wider">Parameters</p>
          {[
            { label: `Angle: ${angle}°`, min: 1, max: 89, val: angle, set: setAngle },
            { label: `Speed: ${speed} m/s`, min: 5, max: 100, val: speed, set: setSpeed },
          ].map(({ label, min, max, val, set }) => (
            <div key={label}>
              <p className="text-xs text-text-2 mb-1">{label}</p>
              <input
                type="range" min={min} max={max} value={val}
                onChange={(e) => { set(Number(e.target.value)); reset(); }}
                className="w-full"
              />
            </div>
          ))}
          <div className="flex gap-2">
            <button
              onClick={startAnim} disabled={running}
              className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              <Play size={13} /> Launch
            </button>
            <button onClick={reset} className="px-3 py-2 rounded-lg border border-border text-text-2 hover:border-primary/40 transition-colors">
              <RotateCcw size={14} />
            </button>
          </div>
        </div>

        {stats && (
          <div className="bg-surface border border-border rounded-xl p-4 space-y-2">
            <p className="text-xs font-bold text-text-2 uppercase tracking-wider">Calculated</p>
            {[
              { label: "Max Height", value: `${stats.maxH.toFixed(2)} m`, eq: "H = v²sin²θ / 2g" },
              { label: "Range", value: `${stats.range.toFixed(2)} m`, eq: "R = v²sin(2θ) / g" },
              { label: "Time of Flight", value: `${stats.tof.toFixed(2)} s`, eq: "T = 2v sinθ / g" },
              { label: "Time (t)", value: `${t.toFixed(2)} s`, eq: "" },
            ].map(({ label, value, eq }) => (
              <div key={label} className="py-1.5 border-b border-border last:border-0">
                <div className="flex justify-between">
                  <span className="text-xs text-text-2">{label}</span>
                  <span className="text-sm font-bold text-text">{value}</span>
                </div>
                {eq && <p className="text-[10px] text-muted font-mono">{eq}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Circuit Simulator ─────────────────────────────────────────────
type CircuitMode = "series" | "parallel";

function CircuitSim() {
  const [mode, setMode] = useState<CircuitMode>("series");
  const [voltage, setVoltage] = useState(12);
  const [resistors, setResistors] = useState([10, 20, 30]);

  const totalR =
    mode === "series"
      ? resistors.reduce((a, b) => a + b, 0)
      : 1 / resistors.reduce((a, r) => a + 1 / r, 0);

  const totalI = voltage / totalR;
  const totalP = voltage * totalI;

  const componentCurrents = mode === "series"
    ? resistors.map(() => totalI)
    : resistors.map((r) => voltage / r);

  const componentVoltages = mode === "series"
    ? resistors.map((r) => totalI * r)
    : resistors.map(() => voltage);

  const componentPowers = resistors.map((r, i) => componentCurrents[i] * componentVoltages[i]);

  const addResistor = () => { if (resistors.length < 5) setResistors([...resistors, 10]); };
  const removeResistor = (i: number) => { if (resistors.length > 1) setResistors(resistors.filter((_, j) => j !== i)); };
  const setResistor = (i: number, v: number) => { const n = [...resistors]; n[i] = v; setResistors(n); };

  const COLORS_R = ["#3b82f6", "#ef4444", "#10b981", "#f59e0b", "#8b5cf6"];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex gap-2">
          {(["series", "parallel"] as CircuitMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              className="px-4 py-2 rounded-xl text-sm font-semibold capitalize border transition-all"
              style={mode === m
                ? { background: "var(--color-primary)", color: "#fff", borderColor: "var(--color-primary)" }
                : { borderColor: "var(--color-border)", color: "var(--color-text-2)" }
              }
            >
              {m}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-text-2">EMF:</span>
          <input
            type="number" value={voltage} min={1} max={240}
            onChange={(e) => setVoltage(Number(e.target.value))}
            className="w-20 text-sm px-2 py-1.5 rounded-lg border border-border bg-bg text-text focus:outline-none focus:border-primary/60"
          />
          <span className="text-sm text-text-2">V</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Resistor inputs */}
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-text-2 uppercase tracking-wider">Resistors</p>
            <button onClick={addResistor} disabled={resistors.length >= 5} className="text-xs text-primary hover:underline disabled:opacity-40">
              + Add
            </button>
          </div>
          {resistors.map((r, i) => (
            <div key={i} className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS_R[i] }} />
              <span className="text-sm text-text-2 w-6">R{i + 1}</span>
              <input
                type="number" value={r} min={0.1}
                onChange={(e) => setResistor(i, parseFloat(e.target.value) || 1)}
                className="flex-1 text-sm px-2 py-1.5 rounded-lg border border-border bg-bg text-text font-mono focus:outline-none focus:border-primary/60"
              />
              <span className="text-sm text-text-2">Ω</span>
              {resistors.length > 1 && (
                <button onClick={() => removeResistor(i)} className="text-muted hover:text-danger transition-colors text-xs">✕</button>
              )}
            </div>
          ))}
        </div>

        {/* Results */}
        <div className="space-y-3">
          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs font-bold text-text-2 uppercase tracking-wider mb-3">Circuit Totals</p>
            {[
              { label: "Total Resistance", value: `${totalR.toFixed(3)} Ω`, formula: mode === "series" ? "R_T = R₁ + R₂ + ..." : "1/R_T = 1/R₁ + 1/R₂ + ..." },
              { label: "Total Current", value: `${totalI.toFixed(4)} A`, formula: "I = V / R" },
              { label: "Total Power", value: `${totalP.toFixed(3)} W`, formula: "P = V × I" },
            ].map(({ label, value, formula }) => (
              <div key={label} className="py-2 border-b border-border last:border-0">
                <div className="flex justify-between items-center">
                  <span className="text-sm text-text-2">{label}</span>
                  <span className="text-sm font-bold text-text">{value}</span>
                </div>
                <p className="text-[10px] text-muted font-mono">{formula}</p>
              </div>
            ))}
          </div>

          <div className="bg-surface border border-border rounded-xl p-4">
            <p className="text-xs font-bold text-text-2 uppercase tracking-wider mb-3">Per Resistor</p>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-text-2">
                    <th className="text-left pb-2">R</th>
                    <th className="text-right pb-2">Value (Ω)</th>
                    <th className="text-right pb-2">V (V)</th>
                    <th className="text-right pb-2">I (A)</th>
                    <th className="text-right pb-2">P (W)</th>
                  </tr>
                </thead>
                <tbody>
                  {resistors.map((r, i) => (
                    <tr key={i} className="border-t border-border">
                      <td className="py-1.5 font-semibold" style={{ color: COLORS_R[i] }}>R{i + 1}</td>
                      <td className="text-right font-mono text-text">{r}</td>
                      <td className="text-right font-mono text-text">{componentVoltages[i].toFixed(3)}</td>
                      <td className="text-right font-mono text-text">{componentCurrents[i].toFixed(4)}</td>
                      <td className="text-right font-mono text-text">{componentPowers[i].toFixed(3)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Wave Visualizer ───────────────────────────────────────────────
function WaveLab() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animRef = useRef<number | null>(null);
  const [amp, setAmp] = useState(80);
  const [freq, setFreq] = useState(2);
  const [speed2, setSpeed2] = useState(100);
  const [showTwo, setShowTwo] = useState(false);
  const [amp2, setAmp2] = useState(60);
  const [freq2, setFreq2] = useState(3);
  const tRef = useRef(0);

  const wavelength = speed2 / freq;
  const period = 1 / freq;

  useEffect(() => {
    let running = true;
    const step = (ts: number) => {
      if (!running) return;
      tRef.current = ts / 1000;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const W = canvas.width;
      const H = canvas.height;
      const midY = H / 2;

      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = "#0b1120";
      ctx.fillRect(0, 0, W, H);

      // Centre line
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(0, midY); ctx.lineTo(W, midY); ctx.stroke();
      ctx.setLineDash([]);

      const drawWave = (a: number, f: number, color: string) => {
        ctx.strokeStyle = color;
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let x = 0; x <= W; x++) {
          const y = midY - a * Math.sin(2 * Math.PI * (x / W * 3 * f - tRef.current * f));
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      };

      drawWave(amp, freq, "#3b82f6");
      if (showTwo) {
        drawWave(amp2, freq2, "#ef4444");
        // Superposition
        ctx.strokeStyle = "#10b981";
        ctx.lineWidth = 2.5;
        ctx.beginPath();
        for (let x = 0; x <= W; x++) {
          const y1 = amp * Math.sin(2 * Math.PI * (x / W * 3 * freq - tRef.current * freq));
          const y2 = amp2 * Math.sin(2 * Math.PI * (x / W * 3 * freq2 - tRef.current * freq2));
          const y = midY - (y1 + y2);
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      // Labels
      ctx.fillStyle = "rgba(255,255,255,0.5)";
      ctx.font = "10px Inter, sans-serif";
      ctx.textAlign = "left";
      ctx.fillStyle = "#3b82f6"; ctx.fillText("Wave 1", 10, 18);
      if (showTwo) {
        ctx.fillStyle = "#ef4444"; ctx.fillText("Wave 2", 10, 34);
        ctx.fillStyle = "#10b981"; ctx.fillText("Sum", 10, 50);
      }

      animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    return () => { running = false; if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [amp, freq, amp2, freq2, showTwo]);

  const Slider = ({ label, min, max, val, set, unit }: { label: string; min: number; max: number; val: number; set: (v: number) => void; unit: string }) => (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-text-2">{label}</span>
        <span className="font-mono text-text">{val} {unit}</span>
      </div>
      <input type="range" min={min} max={max} value={val} onChange={(e) => set(Number(e.target.value))} className="w-full" />
    </div>
  );

  return (
    <div className="space-y-4">
      <canvas ref={canvasRef} width={720} height={280} className="w-full rounded-xl border border-border" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-text-2 uppercase tracking-wider" style={{ color: "#3b82f6" }}>Wave 1</p>
          <Slider label="Amplitude" min={10} max={120} val={amp} set={setAmp} unit="px" />
          <Slider label="Frequency" min={1} max={10} val={freq} set={setFreq} unit="Hz" />
          <Slider label="Wave Speed" min={20} max={300} val={speed2} set={setSpeed2} unit="m/s" />
          <div className="pt-2 border-t border-border text-xs space-y-1 text-text-2">
            <div className="flex justify-between"><span>Wavelength (λ = v/f)</span><span className="font-mono text-text">{wavelength.toFixed(1)} m</span></div>
            <div className="flex justify-between"><span>Period (T = 1/f)</span><span className="font-mono text-text">{period.toFixed(3)} s</span></div>
          </div>
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "#ef4444" }}>Wave 2 (Superposition)</p>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={showTwo} onChange={(e) => setShowTwo(e.target.checked)} className="w-3.5 h-3.5" />
              <span className="text-xs text-text-2">Enable</span>
            </label>
          </div>
          {showTwo && (
            <>
              <Slider label="Amplitude" min={10} max={120} val={amp2} set={setAmp2} unit="px" />
              <Slider label="Frequency" min={1} max={10} val={freq2} set={setFreq2} unit="Hz" />
              <p className="text-xs text-text-2 pt-2 border-t border-border">
                Green = superposition (sum of both waves). Shows constructive/destructive interference.
              </p>
            </>
          )}
          {!showTwo && (
            <p className="text-xs text-text-2">Enable Wave 2 to see wave superposition and interference patterns.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export function PhysicsLabClient() {
  const [tab, setTab] = useState<Tab>("projectile");

  const tabs = [
    { id: "projectile" as Tab, label: "Projectile Motion", icon: <Zap size={15} /> },
    { id: "circuit" as Tab, label: "Circuit Simulator", icon: <Activity size={15} /> },
    { id: "wave" as Tab, label: "Wave Visualizer", icon: <Waves size={15} /> },
  ];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-border overflow-x-auto">
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
            {icon} {label}
          </button>
        ))}
      </div>
      <div className="min-h-[380px]">
        {tab === "projectile" && <ProjectileLab />}
        {tab === "circuit" && <CircuitSim />}
        {tab === "wave" && <WaveLab />}
      </div>
    </div>
  );
}
