import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import { ClipboardList } from "lucide-react";

export default async function StudentScoresPage() {
  const student = await requireStudent();

  const scores = await db.score.findMany({
    where: { studentId: student.id },
    orderBy: [{ session: "desc" }, { term: "desc" }, { subject: "asc" }],
  });

  const sessions = [...new Set(scores.map((s) => `${s.term} Term · ${s.session}`))];

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-text">My Scores</h1>
        </div>
        <p className="text-sm text-text-2">
          Your academic scores across all subjects and terms.
        </p>
      </div>

      {scores.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <ClipboardList size={32} className="text-text-2 mx-auto mb-3" />
          <p className="text-sm text-text-2">No scores recorded yet. They&apos;ll appear here once your teacher enters them.</p>
        </div>
      ) : (
        sessions.map((sessionLabel) => {
          const sessionScores = scores.filter(
            (s) => `${s.term} Term · ${s.session}` === sessionLabel
          );
          return (
            <div key={sessionLabel} className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="px-5 py-3 bg-bg border-b border-border">
                <h2 className="text-sm font-bold text-text">{sessionLabel}</h2>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left">
                    <th className="px-5 py-2.5 font-semibold text-text-2">Subject</th>
                    <th className="px-3 py-2.5 font-semibold text-text-2 text-center">CA1</th>
                    <th className="px-3 py-2.5 font-semibold text-text-2 text-center">CA2</th>
                    <th className="px-3 py-2.5 font-semibold text-text-2 text-center">Exam</th>
                    <th className="px-3 py-2.5 font-semibold text-text-2 text-center">Total</th>
                    <th className="px-3 py-2.5 font-semibold text-text-2 text-center">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {sessionScores.map((s) => (
                    <tr key={s.id} className="border-b border-border last:border-0">
                      <td className="px-5 py-2.5 font-medium text-text">{s.subject}</td>
                      <td className="px-3 py-2.5 text-center text-text">{s.ca1 ?? "—"}</td>
                      <td className="px-3 py-2.5 text-center text-text">{s.ca2 ?? "—"}</td>
                      <td className="px-3 py-2.5 text-center text-text">{s.exam ?? "—"}</td>
                      <td className="px-3 py-2.5 text-center font-bold text-text">{s.total ?? "—"}</td>
                      <td className="px-3 py-2.5 text-center">
                        {s.grade && (
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            s.grade === "A" || s.grade === "B" ? "bg-green-500/10 text-green-500"
                            : s.grade === "C" ? "bg-amber-500/10 text-amber-500"
                            : "bg-red-500/10 text-red-500"
                          }`}>
                            {s.grade}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          );
        })
      )}
    </div>
  );
}
