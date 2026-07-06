"use client";

import { useState } from "react";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from "recharts";
import {
  Loader2, BarChart2, Users, TrendingUp, TrendingDown,
  Award, AlertTriangle, Download,
} from "lucide-react";
import type { ClassAnalytics } from "@/lib/services/analytics/calculator";

interface ClassOption {
  id: string;
  name: string;
  level: string;
  term: string;
  session: string;
  studentCount: number;
  scoreCount: number;
}

const GRADE_COLORS: Record<string, string> = {
  A: "#22c55e",
  B: "#3b82f6",
  C: "#f59e0b",
  D: "#f97316",
  E: "#ef4444",
  F: "#6b7280",
};

export function AnalyticsClient({ classes }: { classes: ClassOption[] }) {
  const [selectedClass, setSelectedClass] = useState(classes[0]?.id ?? "");
  const [analytics, setAnalytics] = useState<ClassAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "subjects" | "students" | "rankings">(
    "overview"
  );

  const loadAnalytics = async (classId: string) => {
    if (!classId) return;
    setLoading(true);
    setError(null);
    setAnalytics(null);
    try {
      const res = await fetch(`/api/student-hub/analytics?classId=${classId}`);
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        throw new Error(d.error ?? "Failed to load analytics");
      }
      setAnalytics(await res.json() as ClassAnalytics);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  };

  const downloadBroadsheet = async () => {
    if (!analytics) return;
    const res = await fetch(
      `/api/student-hub/reports/broadsheet?classId=${selectedClass}&term=${analytics.term}&session=${encodeURIComponent(analytics.session)}`
    );
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${analytics.className}_broadsheet.xlsx`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const gradeData = analytics
    ? Object.entries(analytics.gradeDistribution).map(([g, count]) => ({ grade: g, count }))
    : [];

  const subjectAvgData = analytics?.subjectStats.map((s) => ({
    subject: s.subject.length > 12 ? s.subject.slice(0, 12) + "…" : s.subject,
    average: s.average,
    passRate: s.passRate,
  })) ?? [];

  return (
    <div className="space-y-6">
      {/* Class selector */}
      <div className="flex flex-wrap items-center gap-3">
        <select
          value={selectedClass}
          onChange={(e) => setSelectedClass(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm bg-surface border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
        >
          <option value="">Select a class…</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name} ({c.level} · {c.term} · {c.session}) — {c.studentCount} students
            </option>
          ))}
        </select>
        <button
          onClick={() => loadAnalytics(selectedClass)}
          disabled={!selectedClass || loading}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-bold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40"
        >
          {loading ? <Loader2 size={14} className="animate-spin" /> : <BarChart2 size={14} />}
          {loading ? "Computing…" : "Compute"}
        </button>
        {analytics && (
          <button onClick={downloadBroadsheet}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-surface border border-border text-text hover:bg-bg transition-colors">
            <Download size={14} /> Download Broadsheet
          </button>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          <AlertTriangle size={15} /> {error}
        </div>
      )}

      {classes.length === 0 && (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <BarChart2 size={36} className="text-text-2 mx-auto mb-3" />
          <p className="font-medium text-text">No classes with scores yet</p>
          <p className="text-sm text-text-2 mt-1">Import student results first.</p>
          <a href="/student-hub/import" className="inline-block mt-3 text-sm text-primary hover:underline">
            Import data →
          </a>
        </div>
      )}

      {analytics && (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <KpiCard icon={Users} label="Students" value={analytics.studentCount} color="text-primary" />
            <KpiCard icon={BarChart2} label="Class Average" value={`${analytics.classAverage}%`} color="text-blue-500" />
            <KpiCard icon={TrendingUp} label="Pass Rate" value={`${analytics.passRate}%`} color="text-green-500" />
            <KpiCard icon={TrendingDown} label="Fail Rate" value={`${analytics.failRate}%`} color="text-red-500" />
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1 w-fit flex-wrap">
            {(["overview", "subjects", "students", "rankings"] as const).map((t) => (
              <button key={t} onClick={() => setActiveTab(t)}
                className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === t ? "bg-primary text-white" : "text-text-2 hover:text-text"
                }`}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>

          {/* Overview */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-surface border border-border rounded-xl p-5">
                <h3 className="font-bold text-text text-sm mb-4">Grade Distribution</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie data={gradeData} dataKey="count" nameKey="grade" cx="50%" cy="50%" outerRadius={80} label={({ grade, count }) => `${grade}: ${count}`}>
                      {gradeData.map((g) => (
                        <Cell key={g.grade} fill={GRADE_COLORS[g.grade] ?? "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              <div className="bg-surface border border-border rounded-xl p-5">
                <h3 className="font-bold text-text text-sm mb-4">Subject Averages</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={subjectAvgData} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--color-text-2)" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--color-text-2)" }} />
                    <Tooltip />
                    <Bar dataKey="average" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Summary stats */}
              <div className="bg-surface border border-border rounded-xl p-5 lg:col-span-2">
                <h3 className="font-bold text-text text-sm mb-4">Class Summary</h3>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <StatBox label="Highest Average" value={`${analytics.highestAverage}%`} />
                  <StatBox label="Lowest Average" value={`${analytics.lowestAverage}%`} />
                  <StatBox label="Subjects Covered" value={String(analytics.subjectCount)} />
                  <StatBox label="Total Students" value={String(analytics.studentCount)} />
                </div>
              </div>
            </div>
          )}

          {/* Subjects */}
          {activeTab === "subjects" && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-bg border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-bold text-text-2">Subject</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-text-2">Students</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-text-2">Average</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-text-2">Highest</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-text-2">Lowest</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-text-2">Median</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-text-2">Pass Rate</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-text-2">A</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-text-2">B</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-text-2">F</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {analytics.subjectStats.map((s) => (
                      <tr key={s.subject} className="hover:bg-bg transition-colors">
                        <td className="px-4 py-3 font-medium text-text">{s.subject}</td>
                        <td className="px-4 py-3 text-right text-text-2">{s.count}</td>
                        <td className="px-4 py-3 text-right font-bold text-text">{s.average}%</td>
                        <td className="px-4 py-3 text-right text-green-500">{s.highest}</td>
                        <td className="px-4 py-3 text-right text-red-500">{s.lowest}</td>
                        <td className="px-4 py-3 text-right text-text-2">{s.median}</td>
                        <td className="px-4 py-3 text-right">
                          <span className={`font-bold ${s.passRate >= 70 ? "text-green-500" : s.passRate >= 50 ? "text-amber-500" : "text-red-500"}`}>
                            {s.passRate}%
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-text-2">{s.gradeDistribution["A"]}</td>
                        <td className="px-4 py-3 text-right text-text-2">{s.gradeDistribution["B"]}</td>
                        <td className="px-4 py-3 text-right text-red-400">{s.gradeDistribution["F"]}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Students */}
          {activeTab === "students" && (
            <div className="bg-surface border border-border rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-bg border-b border-border">
                      <th className="px-4 py-3 text-left text-xs font-bold text-text-2">#</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-text-2">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-bold text-text-2">Reg. No.</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-text-2">Average</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-text-2">Position</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-text-2">Pass</th>
                      <th className="px-4 py-3 text-right text-xs font-bold text-text-2">Fail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {analytics.students
                      .sort((a, b) => (a.position ?? 999) - (b.position ?? 999))
                      .map((s) => (
                        <tr key={s.studentId} className="hover:bg-bg transition-colors">
                          <td className="px-4 py-3 text-text-2 text-xs">{s.position ?? "—"}</td>
                          <td className="px-4 py-3 font-medium text-text">
                            {s.lastName}, {s.firstName}
                          </td>
                          <td className="px-4 py-3 text-text-2 text-xs">{s.regNumber ?? "—"}</td>
                          <td className="px-4 py-3 text-right font-bold text-text">
                            {s.average !== null ? `${s.average}%` : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            {s.position === 1 ? (
                              <span className="text-amber-500 font-bold flex items-center justify-end gap-1">
                                <Award size={13} /> 1st
                              </span>
                            ) : (
                              <span className="text-text-2">{s.position ?? "—"}</span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-green-500">{s.passCount}</td>
                          <td className="px-4 py-3 text-right text-red-400">{s.failCount}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Rankings */}
          {activeTab === "rankings" && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-surface border border-border rounded-xl p-5">
                <h3 className="font-bold text-text text-sm mb-4 flex items-center gap-2">
                  <TrendingUp size={15} className="text-green-500" /> Top Performers
                </h3>
                <div className="space-y-3">
                  {analytics.topPerformers.map((s, i) => (
                    <div key={s.studentId} className="flex items-center gap-3">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-black
                        ${i === 0 ? "bg-amber-500 text-white" : i === 1 ? "bg-gray-400 text-white" : i === 2 ? "bg-amber-700 text-white" : "bg-bg text-text-2"}`}>
                        {i + 1}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-text">{s.lastName}, {s.firstName}</p>
                        <p className="text-xs text-text-2">{s.subjectCount} subjects</p>
                      </div>
                      <p className="text-sm font-black text-green-500">{s.average}%</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-surface border border-border rounded-xl p-5">
                <h3 className="font-bold text-text text-sm mb-4 flex items-center gap-2">
                  <TrendingDown size={15} className="text-red-400" /> Need Attention
                </h3>
                <div className="space-y-3">
                  {analytics.bottomPerformers.map((s, i) => (
                    <div key={s.studentId} className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-full bg-red-500/10 flex items-center justify-center text-xs font-bold text-red-500">
                        {analytics.studentCount - i}
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-semibold text-text">{s.lastName}, {s.firstName}</p>
                        <p className="text-xs text-text-2">{s.failCount} fails</p>
                      </div>
                      <p className="text-sm font-black text-red-500">{s.average ?? "—"}%</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Pass rate chart by subject */}
              <div className="bg-surface border border-border rounded-xl p-5 lg:col-span-2">
                <h3 className="font-bold text-text text-sm mb-4">Subject Pass Rates</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={subjectAvgData} margin={{ left: -10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                    <XAxis dataKey="subject" tick={{ fontSize: 10, fill: "var(--color-text-2)" }} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "var(--color-text-2)" }} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Legend />
                    <Bar dataKey="passRate" name="Pass Rate %" fill="#22c55e" radius={[3, 3, 0, 0]} />
                    <Bar dataKey="average" name="Average" fill="var(--color-primary)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, color }: { icon: React.ElementType; label: string; value: string | number; color: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icon size={15} className={color} />
        <p className="text-xs text-text-2">{label}</p>
      </div>
      <p className={`text-2xl font-black ${color}`}>{value}</p>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-bg rounded-xl p-4">
      <p className="text-xs text-text-2 mb-1">{label}</p>
      <p className="text-xl font-black text-text">{value}</p>
    </div>
  );
}
