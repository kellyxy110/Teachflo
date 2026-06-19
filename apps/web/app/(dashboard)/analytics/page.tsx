import Link from "next/link";
import { TrendingUp, Users, BookOpen, AlertTriangle, Award } from "lucide-react";
import { getAnalytics } from "@/app/actions/analytics";

const GRADE_COLORS: Record<string, string> = {
  A: "bg-green-500",
  B: "bg-blue-500",
  C: "bg-yellow-400",
  D: "bg-orange-400",
  E: "bg-red-400",
  F: "bg-red-600",
};
const GRADE_TEXT: Record<string, string> = {
  A: "text-green-700",
  B: "text-blue-700",
  C: "text-yellow-700",
  D: "text-orange-700",
  E: "text-red-600",
  F: "text-red-700",
};

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  color,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-muted uppercase tracking-wide">{label}</p>
          <p className="text-3xl font-bold text-text mt-1">{value}</p>
          {sub && <p className="text-xs text-text-2 mt-0.5">{sub}</p>}
        </div>
        <div className={`p-2.5 rounded-xl ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
    </div>
  );
}

export default async function AnalyticsPage() {
  const data = await getAnalytics();

  if (!data) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-text">Analytics</h1>
          <p className="text-text-2 text-sm mt-0.5">
            Class performance, subject breakdowns, and at-risk student identification.
          </p>
        </div>
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <TrendingUp size={40} className="text-muted mx-auto mb-3" />
          <h3 className="font-semibold text-text">No score data yet</h3>
          <p className="text-sm text-text-2 mt-1 mb-5">
            Enter student scores to unlock analytics and performance insights.
          </p>
          <Link
            href="/scores"
            className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors"
          >
            Enter Scores
          </Link>
        </div>
      </div>
    );
  }

  const gradeEntries = Object.entries(data.gradeCounts);
  const maxGradeCount = Math.max(...Object.values(data.gradeCounts), 1);
  const maxSubjectAvg = Math.max(...data.subjectStats.map((s) => s.avg), 1);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Analytics</h1>
        <p className="text-text-2 text-sm mt-0.5">
          {data.totalScores} score records across {data.totalClasses} class
          {data.totalClasses !== 1 ? "es" : ""}.
        </p>
      </div>

      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="School Average"
          value={`${data.avg}%`}
          sub="across all subjects"
          icon={TrendingUp}
          color="bg-primary"
        />
        <StatCard
          label="Pass Rate"
          value={`${data.passRate}%`}
          sub="scored 50 or above"
          icon={Award}
          color="bg-success"
        />
        <StatCard
          label="Total Students"
          value={data.totalStudents}
          sub="active"
          icon={Users}
          color="bg-purple-500"
        />
        <StatCard
          label="At-Risk Students"
          value={data.atRisk.length}
          sub="below 50 in ≥1 subject"
          icon={AlertTriangle}
          color="bg-warning"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Grade distribution */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="font-semibold text-text mb-4">Grade Distribution</h2>
          <div className="space-y-3">
            {gradeEntries.map(([grade, count]) => (
              <div key={grade} className="flex items-center gap-3">
                <span className={`w-6 text-sm font-bold shrink-0 ${GRADE_TEXT[grade]}`}>
                  {grade}
                </span>
                <div className="flex-1 h-7 bg-bg rounded-lg overflow-hidden">
                  <div
                    className={`h-full rounded-lg transition-all ${GRADE_COLORS[grade]}`}
                    style={{ width: `${(count / maxGradeCount) * 100}%` }}
                  />
                </div>
                <span className="text-xs text-muted w-8 text-right shrink-0">{count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Subject performance */}
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="font-semibold text-text mb-4">Subject Averages</h2>
          {data.subjectStats.length === 0 ? (
            <p className="text-sm text-text-2">No subject data available.</p>
          ) : (
            <div className="space-y-3">
              {data.subjectStats.slice(0, 8).map(({ subject, avg, count }) => (
                <div key={subject} className="flex items-center gap-3">
                  <span className="text-xs text-text-2 w-28 shrink-0 truncate">{subject}</span>
                  <div className="flex-1 h-7 bg-bg rounded-lg overflow-hidden">
                    <div
                      className={`h-full rounded-lg transition-all ${
                        avg >= 70
                          ? "bg-success"
                          : avg >= 50
                          ? "bg-primary"
                          : "bg-danger"
                      }`}
                      style={{ width: `${(avg / maxSubjectAvg) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-text w-10 text-right shrink-0">
                    {avg}%
                  </span>
                  <span className="text-xs text-muted w-10 shrink-0 text-right">
                    ({count})
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Class performance */}
      {data.classStats.length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h2 className="font-semibold text-text mb-4">Class Performance</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {data.classStats.map(({ name, level, avg, count }) => (
              <div
                key={name}
                className="bg-bg border border-border rounded-xl p-4 text-center"
              >
                <p className="text-xs text-muted font-medium">{level}</p>
                <p className="text-sm font-semibold text-text mt-0.5 truncate">{name}</p>
                <p
                  className={`text-2xl font-bold mt-2 ${
                    avg >= 70
                      ? "text-success"
                      : avg >= 50
                      ? "text-primary"
                      : "text-danger"
                  }`}
                >
                  {avg}%
                </p>
                <p className="text-xs text-muted mt-1">{count} scores</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* At-risk students */}
      {data.atRisk.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <AlertTriangle size={16} className="text-warning" />
            <h2 className="font-semibold text-text">At-Risk Students</h2>
            <span className="ml-auto text-xs text-muted">
              Scored below 50 in one or more subjects
            </span>
          </div>
          <div className="divide-y divide-border">
            {data.atRisk.map((s) => (
              <div
                key={s.id}
                className="flex items-center justify-between px-5 py-3 hover:bg-bg transition-colors"
              >
                <div>
                  <p className="text-sm font-medium text-text">{s.name}</p>
                  <p className="text-xs text-muted">{s.className}</p>
                </div>
                <div className="flex items-center gap-4 text-right">
                  <div>
                    <p className="text-xs text-muted">Avg</p>
                    <p
                      className={`text-sm font-bold ${
                        s.avg >= 50 ? "text-text" : "text-danger"
                      }`}
                    >
                      {s.avg}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted">Failing</p>
                    <p className="text-sm font-bold text-danger">{s.failCount}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
