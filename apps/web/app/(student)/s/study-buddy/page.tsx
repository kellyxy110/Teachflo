import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { Sparkles } from "lucide-react";
import { StudentStudyBuddyClient } from "./StudentStudyBuddyClient";

export default async function StudentStudyBuddyPage() {
  const student = await requireStudent();

  const [weakSkills, recentMistakes] = await Promise.all([
    db.mistakePattern.findMany({
      where: { studentId: student.id, resolved: false },
      orderBy: { occurrences: "desc" },
      take: 5,
      select: { skill: true, errorType: true, pattern: true, occurrences: true },
    }),
    db.questionResponse.findMany({
      where: {
        attempt: { studentId: student.id },
        isCorrect: false,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: {
        question: { select: { stem: true, skillTag: true, solution: true } },
      },
    }),
  ]);

  const context = {
    studentName: student.firstName,
    className: student.class.name,
    schoolName: student.school.name,
    weakSkills: weakSkills.map((s) => `${s.skill} (${s.errorType}: ${s.pattern})`),
    recentMistakes: recentMistakes.map((m) => ({
      question: m.question.stem.slice(0, 100),
      skill: m.question.skillTag ?? "general",
      feedback: m.feedback ?? "",
    })),
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={20} className="text-amber-500" />
          <h1 className="text-2xl font-bold text-text">Study Buddy</h1>
        </div>
        <p className="text-sm text-text-2">
          Your personal AI tutor. Ask questions, get explanations, practice problems.
        </p>
      </div>
      <StudentStudyBuddyClient context={context} />
    </div>
  );
}
