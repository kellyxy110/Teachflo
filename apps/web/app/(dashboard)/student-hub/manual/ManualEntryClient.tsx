"use client";

import { useState } from "react";
import { Plus, GraduationCap, Users, Loader2, CheckCircle, AlertTriangle, ChevronRight } from "lucide-react";
import Link from "next/link";

interface ClassItem {
  id: string;
  name: string;
  level: string;
  session: string;
  term: string;
  studentCount: number;
}

const CLASS_LEVELS = ["JS1", "JS2", "JS3", "SS1", "SS2", "SS3"];
const TERMS = ["FIRST", "SECOND", "THIRD"];
const CURRENT_SESSION = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

export function ManualEntryClient({
  classes: initial,
  schoolId,
  teacherId,
}: {
  classes: ClassItem[];
  schoolId: string;
  teacherId: string;
}) {
  const [classes, setClasses] = useState(initial);
  const [tab, setTab] = useState<"class" | "student" | "score">("class");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Class form
  const [className, setClassName] = useState("");
  const [classLevel, setClassLevel] = useState("SS2");
  const [classTerm, setClassTerm] = useState("FIRST");
  const [classSession, setClassSession] = useState(CURRENT_SESSION);

  // Student form
  const [selectedClass, setSelectedClass] = useState(initial[0]?.id ?? "");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [gender, setGender] = useState("");

  // Score form
  const [scoreClass, setScoreClass] = useState(initial[0]?.id ?? "");
  const [subject, setSubject] = useState("");
  const [term, setTerm] = useState("FIRST");
  const [session, setSession] = useState(CURRENT_SESSION);

  const showFeedback = (msg: string, isError = false) => {
    if (isError) { setError(msg); setSuccess(null); }
    else { setSuccess(msg); setError(null); }
    setTimeout(() => { setError(null); setSuccess(null); }, 4000);
  };

  const handleCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!className.trim()) return;
    setLoading(true);
    try {
      const res = await fetch("/api/student-hub/manual/class", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: className, level: classLevel, term: classTerm, session: classSession, schoolId }),
      });
      const data = await res.json() as { error?: string; class?: ClassItem };
      if (!res.ok) throw new Error(data.error ?? "Failed to create class");
      setClasses((prev) => [...prev, { ...data.class!, studentCount: 0 }]);
      setClassName("");
      showFeedback(`Class ${className} created`);
    } catch (e) {
      showFeedback(e instanceof Error ? e.message : "Failed", true);
    } finally {
      setLoading(false);
    }
  };

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !selectedClass) return;
    setLoading(true);
    try {
      const res = await fetch("/api/student-hub/manual/student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName, lastName, regNumber: regNumber || null,
          gender: gender || null, classId: selectedClass, schoolId,
        }),
      });
      const data = await res.json() as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setClasses((prev) =>
        prev.map((c) => c.id === selectedClass ? { ...c, studentCount: c.studentCount + 1 } : c)
      );
      setFirstName(""); setLastName(""); setRegNumber(""); setGender("");
      showFeedback(`${lastName} ${firstName} added`);
    } catch (e) {
      showFeedback(e instanceof Error ? e.message : "Failed", true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
          <AlertTriangle size={15} /> {error}
        </div>
      )}
      {success && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-green-500/10 border border-green-500/20 text-green-600 text-sm">
          <CheckCircle size={15} /> {success}
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-1 bg-surface border border-border rounded-xl p-1 w-fit">
        {(["class", "student", "score"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              tab === t ? "bg-primary text-white" : "text-text-2 hover:text-text"
            }`}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Create Class */}
      {tab === "class" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-bold text-text mb-4">Create New Class</h3>
            <form onSubmit={handleCreateClass} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Class Name *</label>
                <input value={className} onChange={(e) => setClassName(e.target.value)} required
                  placeholder="e.g. SS2A"
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Level *</label>
                <select value={classLevel} onChange={(e) => setClassLevel(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {CLASS_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">Term</label>
                  <select value={classTerm} onChange={(e) => setClassTerm(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20">
                    {TERMS.map((t) => <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()} Term</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">Session</label>
                  <input value={classSession} onChange={(e) => setClassSession(e.target.value)} placeholder="2025/2026"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <button type="submit" disabled={loading || !className.trim()}
                className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-40">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Create Class
              </button>
            </form>
          </div>

          <div>
            <h3 className="text-sm font-bold text-text-2 uppercase tracking-wide mb-3">
              {classes.length} Class{classes.length !== 1 ? "es" : ""}
            </h3>
            {classes.length === 0 ? (
              <div className="bg-surface border border-dashed border-border rounded-xl p-8 text-center">
                <GraduationCap size={30} className="text-text-2 mx-auto mb-2" />
                <p className="text-sm text-text-2">No classes yet</p>
              </div>
            ) : (
              <div className="bg-surface border border-border rounded-xl overflow-hidden">
                <div className="divide-y divide-border">
                  {classes.map((c) => (
                    <Link key={c.id} href={`/classes/${c.id}`}
                      className="flex items-center gap-3 px-4 py-3 hover:bg-bg transition-colors">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <GraduationCap size={15} className="text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-text">{c.name}</p>
                        <p className="text-xs text-text-2">{c.level} · {c.term} · {c.session}</p>
                      </div>
                      <div className="flex items-center gap-1.5 text-text-2 text-xs">
                        <Users size={13} />
                        <span>{c.studentCount}</span>
                      </div>
                      <ChevronRight size={14} className="text-text-2" />
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Student */}
      {tab === "student" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-surface border border-border rounded-xl p-5">
            <h3 className="font-bold text-text mb-4">Add Student</h3>
            <form onSubmit={handleAddStudent} className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Class *</label>
                <select value={selectedClass} onChange={(e) => setSelectedClass(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20">
                  {classes.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.level})</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">First Name *</label>
                  <input value={firstName} onChange={(e) => setFirstName(e.target.value)} required placeholder="Ada"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">Last Name *</label>
                  <input value={lastName} onChange={(e) => setLastName(e.target.value)} required placeholder="Okafor"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">Reg. Number</label>
                  <input value={regNumber} onChange={(e) => setRegNumber(e.target.value)} placeholder="e.g. 2024/0045"
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">Gender</label>
                  <select value={gender} onChange={(e) => setGender(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20">
                    <option value="">Not specified</option>
                    <option value="MALE">Male</option>
                    <option value="FEMALE">Female</option>
                  </select>
                </div>
              </div>
              <button type="submit" disabled={loading || !firstName.trim() || !lastName.trim() || !selectedClass}
                className="w-full flex items-center justify-center gap-2 bg-green-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-40">
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
                Add Student
              </button>
            </form>
          </div>

          <div>
            <h3 className="text-sm font-bold text-text-2 uppercase tracking-wide mb-3">Quick Links</h3>
            <div className="space-y-2">
              {classes.map((c) => (
                <Link key={c.id} href={`/classes/${c.id}`}
                  className="flex items-center justify-between px-4 py-3 bg-surface border border-border rounded-xl hover:border-primary/30 transition-all">
                  <div>
                    <p className="text-sm font-semibold text-text">{c.name}</p>
                    <p className="text-xs text-text-2">{c.studentCount} students</p>
                  </div>
                  <ChevronRight size={15} className="text-text-2" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Score Entry */}
      {tab === "score" && (
        <div className="bg-surface border border-border rounded-xl p-5 max-w-lg">
          <h3 className="font-bold text-text mb-4">Enter Scores</h3>
          <p className="text-sm text-text-2 mb-4">
            For bulk score entry, use the{" "}
            <Link href="/scores" className="text-primary hover:underline">Result Register</Link>{" "}
            or{" "}
            <Link href="/student-hub/import" className="text-primary hover:underline">import a spreadsheet</Link>.
          </p>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1">Class</label>
              <select value={scoreClass} onChange={(e) => setScoreClass(e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text bg-bg focus:outline-none focus:ring-2 focus:ring-primary/20">
                {classes.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <Link
              href={`/scores?classId=${scoreClass}`}
              className="w-full flex items-center justify-center gap-2 bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Open Result Register <ChevronRight size={14} />
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
