export const CURRICULUM_LEVELS = {
  JS1: {
    label: "Junior Secondary 1",
    ageRange: "10-12",
    examBoard: "School-based",
    bloomsTargetLevel: ["Remember", "Understand"],
    typicalCaMax: 20,
    typicalExamMax: 60,
  },
  JS2: {
    label: "Junior Secondary 2",
    ageRange: "11-13",
    examBoard: "School-based",
    bloomsTargetLevel: ["Remember", "Understand", "Apply"],
    typicalCaMax: 20,
    typicalExamMax: 60,
  },
  JS3: {
    label: "Junior Secondary 3",
    ageRange: "12-14",
    examBoard: "BECE / School",
    bloomsTargetLevel: ["Remember", "Understand", "Apply", "Analyze"],
    typicalCaMax: 20,
    typicalExamMax: 60,
  },
  SS1: {
    label: "Senior Secondary 1",
    ageRange: "13-15",
    examBoard: "School-based",
    bloomsTargetLevel: ["Understand", "Apply", "Analyze"],
    typicalCaMax: 20,
    typicalExamMax: 60,
    note: "Foundation year for WAEC/JAMB topics",
  },
  SS2: {
    label: "Senior Secondary 2",
    ageRange: "14-16",
    examBoard: "School + WAEC Mock",
    bloomsTargetLevel: ["Apply", "Analyze", "Evaluate"],
    typicalCaMax: 20,
    typicalExamMax: 60,
    note: "WAEC topics deepened. JAMB preparation begins.",
  },
  SS3: {
    label: "Senior Secondary 3",
    ageRange: "15-17",
    examBoard: "WAEC, NECO, JAMB, JUPEB",
    bloomsTargetLevel: ["Analyze", "Evaluate", "Create"],
    typicalCaMax: 20,
    typicalExamMax: 60,
    note: "Terminal year. All instruction should be exam-facing.",
  },
} as const;

export type ClassLevel = keyof typeof CURRICULUM_LEVELS;

export const CLASS_LEVELS: ClassLevel[] = ["JS1", "JS2", "JS3", "SS1", "SS2", "SS3"];

export const JUNIOR_LEVELS: ClassLevel[] = ["JS1", "JS2", "JS3"];
export const SENIOR_LEVELS: ClassLevel[] = ["SS1", "SS2", "SS3"];

export const PHYSICS_CURRICULUM = {
  SS1: {
    firstTerm: [
      "Measurement and Units",
      "Scalar and Vector Quantities",
      "Motion (Kinematics)",
      "Newton's Laws of Motion",
      "Linear Momentum and Impulse",
    ],
    secondTerm: [
      "Work, Energy, and Power",
      "Simple Machines",
      "Elasticity",
      "Projectile Motion",
      "Circular Motion",
    ],
    thirdTerm: [
      "Gravitational Field",
      "Simple Harmonic Motion",
      "Waves — Basic Concepts",
      "Sound Waves",
    ],
  },
  SS2: {
    firstTerm: [
      "Heat Energy and Temperature",
      "Thermal Expansion",
      "Gas Laws",
      "Heat Transfer (Conduction, Convection, Radiation)",
      "Vapour Pressure and Humidity",
    ],
    secondTerm: [
      "Electric Field and Coulomb's Law",
      "Electric Potential and Capacitance",
      "Current Electricity",
      "Ohm's Law and Resistors",
      "Cells and Batteries",
    ],
    thirdTerm: [
      "Magnetic Field",
      "Electromagnetic Induction",
      "Alternating Current (AC)",
      "Transformers",
    ],
  },
  SS3: {
    firstTerm: [
      "Light — Reflection and Refraction",
      "Lenses and Mirrors",
      "Optical Instruments",
      "Dispersion and Colour",
      "Photoelectric Effect",
    ],
    secondTerm: [
      "Electromagnetic Waves",
      "Cathode Rays and X-Rays",
      "Radioactivity",
      "Nuclear Reactions (Fission and Fusion)",
      "Electronics — Semiconductors and Diodes",
    ],
    thirdTerm: [
      "WAEC/JAMB Revision — All Topics",
      "Past Question Practice",
      "Speed Drills and Exam Technique",
    ],
  },
};

export const WAEC_HIGH_YIELD = {
  Physics: [
    { topic: "Waves and Sound", frequencyScore: 95 },
    { topic: "Electricity and Magnetism", frequencyScore: 92 },
    { topic: "Newton's Laws", frequencyScore: 88 },
    { topic: "Light and Optics", frequencyScore: 85 },
    { topic: "Radioactivity", frequencyScore: 80 },
  ],
  Chemistry: [
    { topic: "Acid-Base Reactions", frequencyScore: 95 },
    { topic: "Electrochemistry", frequencyScore: 90 },
    { topic: "Organic Chemistry", frequencyScore: 88 },
    { topic: "Equilibrium", frequencyScore: 82 },
    { topic: "Periodic Table Trends", frequencyScore: 78 },
  ],
} as const;

export const AT_RISK_THRESHOLDS = {
  highRisk: { maxScore: 39, label: "High Risk — Failing", color: "#DC2626" },
  mediumRisk: { minScore: 40, maxScore: 49, label: "At Risk — Borderline", color: "#F59E0B" },
  watching: { minScore: 50, maxScore: 59, label: "Monitoring — Below Average", color: "#F97316" },
  safe: { minScore: 60, label: "Performing", color: "#16A34A" },
} as const;
