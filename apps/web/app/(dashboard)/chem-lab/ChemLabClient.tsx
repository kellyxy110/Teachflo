"use client";

import { useState } from "react";
import { Atom, Scale, Beaker } from "lucide-react";

type Tab = "periodic" | "balancer" | "titration";

// ── Periodic Table Data ───────────────────────────────────────────
interface Element {
  num: number; sym: string; name: string; mass: number;
  cat: string; period: number; group: number;
  config?: string; mp?: number; bp?: number;
}

const CAT_COLORS: Record<string, { bg: string; text: string }> = {
  "Alkali Metal":      { bg: "rgba(239,68,68,0.15)",   text: "#ef4444" },
  "Alkaline Earth":    { bg: "rgba(245,158,11,0.15)",  text: "#f59e0b" },
  "Transition Metal":  { bg: "rgba(59,130,246,0.15)",  text: "#60a5fa" },
  "Post-Transition":   { bg: "rgba(139,92,246,0.15)",  text: "#a78bfa" },
  "Metalloid":         { bg: "rgba(16,185,129,0.15)",  text: "#10b981" },
  "Nonmetal":          { bg: "rgba(6,182,212,0.15)",   text: "#06b6d4" },
  "Noble Gas":         { bg: "rgba(99,102,241,0.15)",  text: "#818cf8" },
  "Halogen":           { bg: "rgba(236,72,153,0.15)",  text: "#ec4899" },
  "Lanthanide":        { bg: "rgba(168,85,247,0.15)",  text: "#c084fc" },
  "Actinide":          { bg: "rgba(249,115,22,0.15)",  text: "#fb923c" },
};

const ELEMENTS: Element[] = [
  // Period 1
  { num:1,  sym:"H",  name:"Hydrogen",    mass:1.008,   cat:"Nonmetal",        period:1, group:1,  mp:-259,  bp:-253, config:"1s¹" },
  { num:2,  sym:"He", name:"Helium",      mass:4.003,   cat:"Noble Gas",       period:1, group:18, mp:-272,  bp:-269, config:"1s²" },
  // Period 2
  { num:3,  sym:"Li", name:"Lithium",     mass:6.941,   cat:"Alkali Metal",    period:2, group:1,  mp:180,   bp:1342, config:"[He] 2s¹" },
  { num:4,  sym:"Be", name:"Beryllium",   mass:9.012,   cat:"Alkaline Earth",  period:2, group:2,  mp:1287,  bp:2470, config:"[He] 2s²" },
  { num:5,  sym:"B",  name:"Boron",       mass:10.81,   cat:"Metalloid",       period:2, group:13, mp:2075,  bp:4000, config:"[He] 2s² 2p¹" },
  { num:6,  sym:"C",  name:"Carbon",      mass:12.01,   cat:"Nonmetal",        period:2, group:14, mp:3550,  bp:4827, config:"[He] 2s² 2p²" },
  { num:7,  sym:"N",  name:"Nitrogen",    mass:14.01,   cat:"Nonmetal",        period:2, group:15, mp:-210,  bp:-196, config:"[He] 2s² 2p³" },
  { num:8,  sym:"O",  name:"Oxygen",      mass:16.00,   cat:"Nonmetal",        period:2, group:16, mp:-218,  bp:-183, config:"[He] 2s² 2p⁴" },
  { num:9,  sym:"F",  name:"Fluorine",    mass:19.00,   cat:"Halogen",         period:2, group:17, mp:-220,  bp:-188, config:"[He] 2s² 2p⁵" },
  { num:10, sym:"Ne", name:"Neon",        mass:20.18,   cat:"Noble Gas",       period:2, group:18, mp:-249,  bp:-246, config:"[He] 2s² 2p⁶" },
  // Period 3
  { num:11, sym:"Na", name:"Sodium",      mass:22.99,   cat:"Alkali Metal",    period:3, group:1,  mp:98,    bp:883,  config:"[Ne] 3s¹" },
  { num:12, sym:"Mg", name:"Magnesium",   mass:24.31,   cat:"Alkaline Earth",  period:3, group:2,  mp:650,   bp:1090, config:"[Ne] 3s²" },
  { num:13, sym:"Al", name:"Aluminium",   mass:26.98,   cat:"Post-Transition", period:3, group:13, mp:660,   bp:2519, config:"[Ne] 3s² 3p¹" },
  { num:14, sym:"Si", name:"Silicon",     mass:28.09,   cat:"Metalloid",       period:3, group:14, mp:1414,  bp:3265, config:"[Ne] 3s² 3p²" },
  { num:15, sym:"P",  name:"Phosphorus",  mass:30.97,   cat:"Nonmetal",        period:3, group:15, mp:44,    bp:281,  config:"[Ne] 3s² 3p³" },
  { num:16, sym:"S",  name:"Sulfur",      mass:32.07,   cat:"Nonmetal",        period:3, group:16, mp:115,   bp:445,  config:"[Ne] 3s² 3p⁴" },
  { num:17, sym:"Cl", name:"Chlorine",    mass:35.45,   cat:"Halogen",         period:3, group:17, mp:-101,  bp:-34,  config:"[Ne] 3s² 3p⁵" },
  { num:18, sym:"Ar", name:"Argon",       mass:39.95,   cat:"Noble Gas",       period:3, group:18, mp:-189,  bp:-186, config:"[Ne] 3s² 3p⁶" },
  // Period 4 — selected
  { num:19, sym:"K",  name:"Potassium",   mass:39.10,   cat:"Alkali Metal",    period:4, group:1,  mp:64,    bp:759,  config:"[Ar] 4s¹" },
  { num:20, sym:"Ca", name:"Calcium",     mass:40.08,   cat:"Alkaline Earth",  period:4, group:2,  mp:842,   bp:1484, config:"[Ar] 4s²" },
  { num:26, sym:"Fe", name:"Iron",        mass:55.85,   cat:"Transition Metal", period:4, group:8, mp:1538,  bp:2862, config:"[Ar] 3d⁶ 4s²" },
  { num:29, sym:"Cu", name:"Copper",      mass:63.55,   cat:"Transition Metal", period:4, group:11,mp:1085,  bp:2562, config:"[Ar] 3d¹⁰ 4s¹" },
  { num:30, sym:"Zn", name:"Zinc",        mass:65.38,   cat:"Transition Metal", period:4, group:12,mp:420,   bp:907,  config:"[Ar] 3d¹⁰ 4s²" },
  { num:35, sym:"Br", name:"Bromine",     mass:79.90,   cat:"Halogen",         period:4, group:17, mp:-7,    bp:59,   config:"[Ar] 3d¹⁰ 4s² 4p⁵" },
  { num:36, sym:"Kr", name:"Krypton",     mass:83.80,   cat:"Noble Gas",       period:4, group:18, mp:-157,  bp:-153, config:"[Ar] 3d¹⁰ 4s² 4p⁶" },
  // Period 5 — selected
  { num:47, sym:"Ag", name:"Silver",      mass:107.9,   cat:"Transition Metal", period:5, group:11,mp:962,   bp:2162, config:"[Kr] 4d¹⁰ 5s¹" },
  { num:50, sym:"Sn", name:"Tin",         mass:118.7,   cat:"Post-Transition", period:5, group:14, mp:232,   bp:2602, config:"[Kr] 4d¹⁰ 5s² 5p²" },
  { num:53, sym:"I",  name:"Iodine",      mass:126.9,   cat:"Halogen",         period:5, group:17, mp:114,   bp:184,  config:"[Kr] 4d¹⁰ 5s² 5p⁵" },
  // Period 6 — selected
  { num:79, sym:"Au", name:"Gold",        mass:197.0,   cat:"Transition Metal", period:6, group:11,mp:1064,  bp:2856, config:"[Xe] 4f¹⁴ 5d¹⁰ 6s¹" },
  { num:80, sym:"Hg", name:"Mercury",     mass:200.6,   cat:"Transition Metal", period:6, group:12,mp:-39,   bp:357,  config:"[Xe] 4f¹⁴ 5d¹⁰ 6s²" },
  { num:82, sym:"Pb", name:"Lead",        mass:207.2,   cat:"Post-Transition", period:6, group:14, mp:327,   bp:1749, config:"[Xe] 4f¹⁴ 5d¹⁰ 6s² 6p²" },
];

// Visual layout: 18 groups × short periods. Simplified grid for key WAEC elements.
const GRID_ELEMENTS: (Element | null)[][] = (() => {
  const rows: (Element | null)[][] = Array.from({ length: 7 }, () => Array(18).fill(null));
  for (const el of ELEMENTS) {
    if (el.period <= 7 && el.group <= 18) {
      rows[el.period - 1][el.group - 1] = el;
    }
  }
  return rows;
})();

function PeriodicTable() {
  const [selected, setSelected] = useState<Element | null>(ELEMENTS[0]);
  const [filter, setFilter] = useState("");

  const cats = Object.keys(CAT_COLORS);

  return (
    <div className="space-y-4">
      <div className="flex gap-2 flex-wrap">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Search element…"
          className="text-sm px-3 py-2 rounded-lg border border-border bg-bg text-text focus:outline-none focus:border-primary/60"
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-1.5">
        {cats.map((c) => (
          <span key={c} className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{ background: CAT_COLORS[c].bg, color: CAT_COLORS[c].text }}>
            {c}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <div className="inline-grid gap-0.5" style={{ gridTemplateColumns: "repeat(18, 44px)" }}>
          {GRID_ELEMENTS.map((row, ri) =>
            row.map((el, gi) => {
              if (!el) return <div key={`${ri}-${gi}`} className="w-11 h-11" />;
              const c = CAT_COLORS[el.cat] ?? { bg: "rgba(100,100,100,0.1)", text: "#94a3b8" };
              const matches = filter === "" || el.name.toLowerCase().includes(filter.toLowerCase()) || el.sym.toLowerCase().includes(filter.toLowerCase());
              return (
                <button
                  key={el.num}
                  onClick={() => setSelected(el)}
                  className="w-11 h-11 rounded flex flex-col items-center justify-center transition-all"
                  style={{
                    background: selected?.num === el.num ? c.text : c.bg,
                    border: `1px solid ${c.text}40`,
                    opacity: matches ? 1 : 0.2,
                    color: selected?.num === el.num ? "#fff" : c.text,
                  }}
                  title={el.name}
                >
                  <span className="text-[8px] leading-none opacity-60">{el.num}</span>
                  <span className="text-[11px] font-black leading-none">{el.sym}</span>
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* Selected element detail */}
      {selected && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <div className="flex items-start gap-6 flex-wrap">
            <div
              className="w-24 h-24 rounded-2xl flex flex-col items-center justify-center shrink-0"
              style={{ background: (CAT_COLORS[selected.cat] ?? CAT_COLORS["Nonmetal"]).bg, border: `2px solid ${(CAT_COLORS[selected.cat] ?? CAT_COLORS["Nonmetal"]).text}40` }}
            >
              <span className="text-xs opacity-50 mb-0.5">{selected.num}</span>
              <span className="text-3xl font-black" style={{ color: (CAT_COLORS[selected.cat] ?? CAT_COLORS["Nonmetal"]).text }}>{selected.sym}</span>
              <span className="text-[10px] opacity-60">{selected.mass}</span>
            </div>
            <div className="flex-1 grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { label: "Full Name", value: selected.name },
                { label: "Category", value: selected.cat },
                { label: "Atomic Mass", value: `${selected.mass} u` },
                { label: "Electron Config", value: selected.config ?? "—" },
                { label: "Melting Point", value: selected.mp !== undefined ? `${selected.mp}°C` : "—" },
                { label: "Boiling Point", value: selected.bp !== undefined ? `${selected.bp}°C` : "—" },
                { label: "Period", value: String(selected.period) },
                { label: "Group", value: String(selected.group) },
              ].map(({ label, value }) => (
                <div key={label}>
                  <p className="text-[10px] text-text-2 uppercase tracking-wider mb-0.5">{label}</p>
                  <p className="text-sm font-semibold text-text">{value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Equation Balancer ─────────────────────────────────────────────
// Presets for WAEC common reactions
const REACTION_PRESETS = [
  { label: "Combustion of methane", eq: "CH₄ + O₂ → CO₂ + H₂O", balanced: "CH₄ + 2O₂ → CO₂ + 2H₂O" },
  { label: "Electrolysis of water", eq: "H₂O → H₂ + O₂", balanced: "2H₂O → 2H₂ + O₂" },
  { label: "Burning of iron", eq: "Fe + O₂ → Fe₂O₃", balanced: "4Fe + 3O₂ → 2Fe₂O₃" },
  { label: "Neutralisation (HCl + NaOH)", eq: "HCl + NaOH → NaCl + H₂O", balanced: "HCl + NaOH → NaCl + H₂O" },
  { label: "Photosynthesis", eq: "CO₂ + H₂O → C₆H₁₂O₆ + O₂", balanced: "6CO₂ + 6H₂O → C₆H₁₂O₆ + 6O₂" },
  { label: "Haber process (NH₃)", eq: "N₂ + H₂ → NH₃", balanced: "N₂ + 3H₂ → 2NH₃" },
  { label: "Decomposition of CaCO₃", eq: "CaCO₃ → CaO + CO₂", balanced: "CaCO₃ → CaO + CO₂" },
  { label: "Burning of ethanol", eq: "C₂H₅OH + O₂ → CO₂ + H₂O", balanced: "C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O" },
  { label: "Copper + silver nitrate", eq: "Cu + AgNO₃ → Cu(NO₃)₂ + Ag", balanced: "Cu + 2AgNO₃ → Cu(NO₃)₂ + 2Ag" },
  { label: "Contact process (SO₂→SO₃)", eq: "SO₂ + O₂ → SO₃", balanced: "2SO₂ + O₂ → 2SO₃" },
];

function EquationBalancer() {
  const [selected, setSelected] = useState(REACTION_PRESETS[0]);
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-2">Select a reaction to see its unbalanced form, then reveal the balanced equation with coefficients.</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {REACTION_PRESETS.map((r) => (
          <button
            key={r.label}
            onClick={() => { setSelected(r); setRevealed(false); }}
            className="text-left px-3 py-2.5 rounded-xl border text-sm transition-all"
            style={selected.label === r.label
              ? { borderColor: "var(--color-primary)", background: "rgba(59,130,246,0.08)", color: "var(--color-text)" }
              : { borderColor: "var(--color-border)", color: "var(--color-text-2)" }
            }
          >
            {r.label}
          </button>
        ))}
      </div>

      <div className="bg-surface border border-border rounded-xl p-6 space-y-4">
        <div>
          <p className="text-xs font-bold text-text-2 uppercase tracking-wider mb-2">Unbalanced</p>
          <p className="text-lg font-mono text-text">{selected.eq}</p>
        </div>

        <div>
          <p className="text-xs font-bold text-text-2 uppercase tracking-wider mb-2">Balanced</p>
          {revealed ? (
            <p className="text-xl font-mono font-bold text-primary">{selected.balanced}</p>
          ) : (
            <button
              onClick={() => setRevealed(true)}
              className="px-5 py-2 rounded-xl text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors"
            >
              Reveal balanced equation
            </button>
          )}
        </div>

        {revealed && (
          <div className="pt-3 border-t border-border">
            <p className="text-xs font-bold text-text-2 uppercase tracking-wider mb-2">Balancing tip</p>
            <p className="text-sm text-text-2">
              Count atoms on each side. Adjust coefficients (never subscripts) until atom counts are equal on both sides.
              The law of conservation of mass means atoms are neither created nor destroyed.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Titration Curve ───────────────────────────────────────────────
function TitrationCurve() {
  const [concAcid, setConcAcid] = useState(0.1);
  const [volAcid, setVolAcid] = useState(25);
  const [concBase, setConcBase] = useState(0.1);
  const [type, setType] = useState<"strong-strong" | "weak-strong">("strong-strong");

  // Compute pH at each titrant volume
  const pHCurve = () => {
    const data: { vol: number; pH: number }[] = [];
    const na = concAcid * volAcid / 1000; // moles of acid

    for (let vb = 0; vb <= volAcid * 2.5; vb += 0.5) {
      const nb = concBase * vb / 1000; // moles of base added
      const totalVol = (volAcid + vb) / 1000;
      let pH: number;

      if (type === "strong-strong") {
        if (nb < na) {
          // Excess acid
          const hConc = (na - nb) / totalVol;
          pH = -Math.log10(hConc);
        } else if (nb === na) {
          pH = 7;
        } else {
          // Excess base
          const ohConc = (nb - na) / totalVol;
          const pOH = -Math.log10(ohConc);
          pH = 14 - pOH;
        }
      } else {
        // Weak acid / strong base (simplified Henderson-Hasselbalch, pKa ~4.74 acetic acid)
        const pKa = 4.74;
        if (nb < 0.01 * na) {
          // Very small addition
          const hConc = Math.sqrt(1.8e-5 * concAcid);
          pH = -Math.log10(hConc);
        } else if (nb < na) {
          // Buffer region
          const ratio = nb / (na - nb);
          pH = pKa + Math.log10(ratio);
        } else if (Math.abs(nb - na) < 0.0001) {
          // Equivalence — salt of weak acid
          pH = 7 + (pKa - 14) / 2 + Math.log10(concBase) / 2;
          pH = Math.max(7, Math.min(11, pH));
        } else {
          // Excess strong base
          const ohConc = (nb - na) / totalVol;
          const pOH = -Math.log10(ohConc);
          pH = 14 - pOH;
        }
      }

      data.push({ vol: vb, pH: Math.max(0, Math.min(14, pH)) });
    }
    return data;
  };

  const curve = pHCurve();
  const eqVol = (concAcid * volAcid) / concBase;
  const maxVol = volAcid * 2.5;
  const W = 520;
  const H = 280;
  const PAD = { l: 45, r: 20, t: 20, b: 35 };
  const scaleX = (v: number) => PAD.l + (v / maxVol) * (W - PAD.l - PAD.r);
  const scaleY = (pH: number) => PAD.t + ((14 - pH) / 14) * (H - PAD.t - PAD.b);

  const pathD = curve.map(({ vol, pH }, i) => `${i === 0 ? "M" : "L"}${scaleX(vol).toFixed(1)},${scaleY(pH).toFixed(1)}`).join(" ");
  const eqX = scaleX(eqVol);
  const eqY = scaleY(7);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2">
        <svg width={W} height={H} className="w-full rounded-xl border border-border bg-[#0b1120]" viewBox={`0 0 ${W} ${H}`}>
          {/* pH grid lines */}
          {[0, 2, 4, 7, 10, 12, 14].map((pH) => (
            <g key={pH}>
              <line x1={PAD.l} y1={scaleY(pH)} x2={W - PAD.r} y2={scaleY(pH)} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
              <text x={PAD.l - 4} y={scaleY(pH) + 4} textAnchor="end" fill="rgba(255,255,255,0.4)" fontSize="9">{pH}</text>
            </g>
          ))}
          {/* Vol grid */}
          {[0, 10, 20, 25, 30, 40, 50].map((v) => {
            if (v > maxVol) return null;
            return (
              <g key={v}>
                <line x1={scaleX(v)} y1={PAD.t} x2={scaleX(v)} y2={H - PAD.b} stroke="rgba(255,255,255,0.07)" strokeWidth="1" />
                <text x={scaleX(v)} y={H - PAD.b + 14} textAnchor="middle" fill="rgba(255,255,255,0.4)" fontSize="9">{v}</text>
              </g>
            );
          })}
          {/* Axes */}
          <line x1={PAD.l} y1={PAD.t} x2={PAD.l} y2={H - PAD.b} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          <line x1={PAD.l} y1={H - PAD.b} x2={W - PAD.r} y2={H - PAD.b} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
          {/* pH=7 neutral line */}
          <line x1={PAD.l} y1={scaleY(7)} x2={W - PAD.r} y2={scaleY(7)} stroke="rgba(16,185,129,0.4)" strokeWidth="1" strokeDasharray="4,4" />
          {/* Equivalence point */}
          <line x1={eqX} y1={PAD.t} x2={eqX} y2={H - PAD.b} stroke="rgba(245,158,11,0.4)" strokeWidth="1" strokeDasharray="4,4" />
          <circle cx={eqX} cy={eqY} r="4" fill="#f59e0b" />
          {/* Curve */}
          <path d={pathD} stroke="#3b82f6" strokeWidth="2" fill="none" />
          {/* Labels */}
          <text x={PAD.l - 35} y={H / 2} fill="rgba(255,255,255,0.5)" fontSize="10" transform={`rotate(-90, ${PAD.l - 35}, ${H / 2})`}>pH</text>
          <text x={W / 2} y={H - 4} textAnchor="middle" fill="rgba(255,255,255,0.5)" fontSize="10">Volume of base added (mL)</text>
          <text x={eqX + 4} y={PAD.t + 12} fill="#f59e0b" fontSize="9">Eq. point</text>
        </svg>
      </div>
      <div className="space-y-3">
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-text-2 uppercase tracking-wider">Titration Type</p>
          {(["strong-strong", "weak-strong"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setType(t)}
              className="w-full text-left px-3 py-2 rounded-lg text-xs border transition-all"
              style={type === t
                ? { borderColor: "var(--color-primary)", background: "rgba(59,130,246,0.08)", color: "var(--color-text)" }
                : { borderColor: "var(--color-border)", color: "var(--color-text-2)" }
              }
            >
              {t === "strong-strong" ? "Strong acid + Strong base" : "Weak acid (CH₃COOH) + Strong base"}
            </button>
          ))}
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
          <p className="text-xs font-bold text-text-2 uppercase tracking-wider">Parameters</p>
          {[
            { label: `Acid conc: ${concAcid} M`, min: 0.01, max: 1, step: 0.01, val: concAcid, set: setConcAcid },
            { label: `Acid vol: ${volAcid} mL`, min: 5, max: 50, step: 1, val: volAcid, set: setVolAcid },
            { label: `Base conc: ${concBase} M`, min: 0.01, max: 1, step: 0.01, val: concBase, set: setConcBase },
          ].map(({ label, min, max, step, val, set }) => (
            <div key={label}>
              <p className="text-xs text-text-2 mb-1">{label}</p>
              <input type="range" min={min} max={max} step={step} value={val} onChange={(e) => set(parseFloat(e.target.value))} className="w-full" />
            </div>
          ))}
        </div>
        <div className="bg-surface border border-border rounded-xl p-4 space-y-1.5 text-xs">
          <p className="font-bold text-text-2 uppercase tracking-wider mb-2">Key Values</p>
          {[
            { label: "Equivalence vol", value: `${eqVol.toFixed(1)} mL` },
            { label: "Equivalence pH", value: type === "strong-strong" ? "7.0" : "~9" },
            { label: "Initial pH", value: `-log(${concAcid}) = ${(-Math.log10(concAcid)).toFixed(2)}` },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between">
              <span className="text-text-2">{label}</span>
              <span className="font-mono text-text">{value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
export function ChemLabClient() {
  const [tab, setTab] = useState<Tab>("periodic");

  const tabs = [
    { id: "periodic" as Tab, label: "Periodic Table", icon: <Atom size={15} /> },
    { id: "balancer" as Tab, label: "Equation Balancer", icon: <Scale size={15} /> },
    { id: "titration" as Tab, label: "Titration Curve", icon: <Beaker size={15} /> },
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
      <div className="min-h-[420px]">
        {tab === "periodic" && <PeriodicTable />}
        {tab === "balancer" && (
          <div className="max-w-3xl">
            <EquationBalancer />
          </div>
        )}
        {tab === "titration" && <TitrationCurve />}
      </div>
    </div>
  );
}
