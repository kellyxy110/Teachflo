const gradeStyles: Record<string, string> = {
  A: "bg-green-100 text-green-700",
  B: "bg-blue-100 text-blue-700",
  C: "bg-yellow-100 text-yellow-700",
  D: "bg-orange-100 text-orange-700",
  E: "bg-orange-50 text-orange-600",
  F: "bg-red-100 text-red-700",
};

export function GradeBadge({ grade }: { grade: string }) {
  return (
    <span
      className={`inline-flex items-center justify-center w-8 h-7 rounded text-xs font-bold ${gradeStyles[grade] ?? "bg-gray-100 text-gray-600"}`}
    >
      {grade}
    </span>
  );
}
