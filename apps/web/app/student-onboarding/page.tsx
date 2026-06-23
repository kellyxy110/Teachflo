"use client";

import { useState } from "react";
import { GraduationCap, Loader2, AlertTriangle, CheckCircle } from "lucide-react";

export default function StudentOnboardingPage() {
  const [schoolCode, setSchoolCode] = useState("");
  const [regNumber, setRegNumber] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/student/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ schoolCode: schoolCode.trim(), regNumber: regNumber.trim() }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({ error: "Something went wrong" }));
        throw new Error(data.error ?? "Failed to link account");
      }

      setSuccess(true);
      setTimeout(() => {
        window.location.href = "/s/dashboard";
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-bg flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-4">
            <GraduationCap size={32} className="text-green-500" />
          </div>
          <h1 className="text-2xl font-black text-text">Link Your Student Account</h1>
          <p className="text-sm text-text-2 mt-2">
            Enter your school code and registration number to connect your account.
            Ask your teacher if you don&apos;t know these.
          </p>
        </div>

        {success ? (
          <div className="bg-surface border border-green-500/20 rounded-2xl p-8 text-center">
            <CheckCircle size={40} className="text-green-500 mx-auto mb-3" />
            <h2 className="text-lg font-bold text-text">Account Linked!</h2>
            <p className="text-sm text-text-2 mt-1">Redirecting to your dashboard...</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 space-y-4">
            {error && (
              <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
                <AlertTriangle size={16} />
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-text-2 mb-1.5">School Code</label>
              <input
                type="text"
                value={schoolCode}
                onChange={(e) => setSchoolCode(e.target.value)}
                placeholder="e.g. KINGS-2024"
                required
                className="w-full px-4 py-3 rounded-xl text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
              <p className="text-[11px] text-text-2 mt-1">Your school&apos;s unique code — ask your teacher</p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-text-2 mb-1.5">Registration Number</label>
              <input
                type="text"
                value={regNumber}
                onChange={(e) => setRegNumber(e.target.value)}
                placeholder="e.g. STU/2024/001"
                required
                className="w-full px-4 py-3 rounded-xl text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !schoolCode || !regNumber}
              className="w-full py-3 rounded-xl text-sm font-bold text-white bg-green-600 hover:bg-green-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : null}
              {loading ? "Linking..." : "Link My Account"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
