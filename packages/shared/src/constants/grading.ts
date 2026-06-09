export const GRADING_SCALE = {
  A: { min: 70, max: 100, label: "Distinction" },
  B: { min: 60, max: 69, label: "Credit" },
  C: { min: 50, max: 59, label: "Merit" },
  D: { min: 45, max: 49, label: "Pass" },
  E: { min: 40, max: 44, label: "Pass" },
  F: { min: 0, max: 39, label: "Fail" },
} as const;

export type Grade = keyof typeof GRADING_SCALE;

export function calculateGrade(total: number): Grade {
  for (const [grade, { min, max }] of Object.entries(GRADING_SCALE)) {
    if (total >= min && total <= max) return grade as Grade;
  }
  return "F";
}

export function calculateTotal(ca1: number, ca2: number, exam: number): number {
  return Math.min(ca1, 20) + Math.min(ca2, 20) + Math.min(exam, 60);
}
