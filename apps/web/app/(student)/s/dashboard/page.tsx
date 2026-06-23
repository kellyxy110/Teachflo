import { requireStudent } from "@/lib/auth";
import { db } from "@/lib/db";
import Link from "next/link";
import {
  FileText, Sparkles, Code2, Gamepad2,
  TrendingUp, Target, Award,
} from "lucide-react";

export default async function StudentDashboardPage() {
  const student = await requireStudent();

  const [examCount, scoreCount, avgScore, attemptCount] = await Promise.all([
    db.exam.count({ where: { classId: student.classId, schoolId: student.schoolId } }),
    db.score.count({ where: { studentId: student.id } }),
    db.score.aggregate({ where: { studentId: student.id }, _avg: { total: true } }),
    db.examAttempt.count({ where: { studentId: student.id } }),
  ]);

  const recentScores = await db.score.findMany({
    where: { studentId: student.id },
    orderBy: { createdAt: "desc" },
    take: 5,
    select: { subject: true, total: true, grade: true, term: true, session: true },
  });

  const avg = avgScore._avg.total ? Math.round(avgScore._avg.total) : null;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">
          {greeting}, {student.firstName}!
        </h1>
        <p className="text-sm text-text-2">
          {student.class.name} · {student.school.name}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={Target} label="Exams Available" value={examCount} color="text-primary" />
        <StatCard icon={FileText} label="Exams Taken" value={attemptCount} color="text-green-500" />
        <StatCard icon={Award} label="Subjects Scored" value={scoreCount} color="text-amber-500" />
        <StatCard icon={TrendingUp} label="Average Score" value={avg ? `${avg}%` : "—"} color="text-purple-500" />
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { href: "/s/exams", label: "Practice Exams", icon: FileText, color: "text-primary", bg: "bg-primary/10" },
          { href: "/s/study-buddy", label: "Study Buddy", icon: Sparkles, color: "text-amber-500", bg: "bg-amber-500/10" },
          { href: "/s/code-lab", label: "Code Lab", icon: Code2, color: "text-green-500", bg: "bg-green-500/10" },
          { href: "/s/practice-arena", label: "Practice Arena", icon: Gamepad2, color: "text-purple-500", bg: "bg-purple-500/10" },
        ].map(({ href, label, icon: Icon, color, bg }) => (
          <Link
            key={href}
            href={href}
            className="bg-surface border border-border rounded-xl p-5 hover:border-primary/40 hover:shadow-md transition-all group"
          >
            <div className={`${bg} p-2.5 rounded-lg w-fit mb-3 group-hover:scale-110 transition-transform`}>
              <Icon size={20} className={color} />
            </div>
            <p className="text-sm font-semibold text-text">{label}</p>
          </Link>
        ))}
      </div>

      {/* Recent scores */}
      {recentScores.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="text-sm font-bold text-text mb-3">Recent Scores</h2>
          <div className="space-y-2">
            {recentScores.map((s, i) => (
              <div key={i} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div>
                  <p className="text-sm font-medium text-text">{s.subject}</p>
                  <p className="text-xs text-text-2">{s.term} Term · {s.session}</p>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-text">{s.total ?? "—"}</span>
                  {s.grade && (
                    <span className={`ml-2 text-xs font-bold px-2 py-0.5 rounded-full ${
                      s.grade === "A" || s.grade === "B" ? "bg-green-500/10 text-green-500"
                      : s.grade === "C" ? "bg-amber-500/10 text-amber-500"
                      : "bg-red-500/10 text-red-500"
                    }`}>
                      {s.grade}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }: {
  icon: React.ElementType; label: string; value: string | number; color: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <Icon size={18} className={`${color} mb-2`} />
      <p className="text-2xl font-bold text-text">{value}</p>
      <p className="text-xs text-text-2">{label}</p>
    </div>
  );
}
