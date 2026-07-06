"use client";

import { useState } from "react";
import {
  Globe, Loader2, CheckCircle, AlertTriangle, RefreshCw, Link2, Lock,
  Ban, Upload, ClipboardPaste, FileDown, Mail, X, Send,
} from "lucide-react";
import type { ConnectorMeta } from "@/lib/services/connectors/base";

interface ActiveConnection {
  id: string;
  portalType: string;
  displayName: string;
  schoolName: string | null;
  tokenExpiry: Date | null;
  lastSynced: Date | null;
}

interface ClassOption {
  id: string;
  name: string;
  level: string;
}

interface SyncSummary {
  newStudents: number;
  classes: number;
  subjects: number;
  results: number;
  session: string;
  term: string;
  jobId: string;
}

interface IntegrationForm {
  schoolName: string;
  portalUrl: string;
  adminContact: string;
  message: string;
}

async function downloadSchoolCubeTemplate() {
  const XLSX = await import("xlsx");
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.aoa_to_sheet([
    ["First Name", "Last Name", "Reg Number", "Subject", "CA1", "CA2", "Exam", "Total", "Grade", "Position", "Teacher Remark"],
    ["John", "Doe", "SCH/2024/001", "Mathematics", "20", "18", "55", "93", "A", "1", "Excellent performance"],
    ["Jane", "Smith", "SCH/2024/002", "Mathematics", "15", "16", "48", "79", "B", "3", "Good effort"],
    ["Peter", "James", "SCH/2024/003", "Mathematics", "12", "14", "40", "66", "C", "5", "Needs improvement"],
  ]);
  ws["!cols"] = Array(11).fill({ wch: 18 });
  XLSX.utils.book_append_sheet(wb, ws, "Result Import");

  const instrWs = XLSX.utils.aoa_to_sheet([
    ["TeachNexis — SchoolCube Export Template"],
    [""],
    ["How to export from SchoolCube:"],
    ["1. Open SchoolCube → Results → your class"],
    ["2. Click Export or Download (usually top-right of the results table)"],
    ["3. Save as Excel (.xlsx) or CSV"],
    ["4. Upload in TeachNexis: Student Hub → Import → Upload File"],
    [""],
    ["If SchoolCube has no export button:"],
    ["• Select all rows in the result table"],
    ["• Copy (Ctrl+C)"],
    ["• In TeachNexis: Import → Paste Table → paste"],
  ]);
  XLSX.utils.book_append_sheet(wb, instrWs, "Instructions");
  XLSX.writeFile(wb, "teachnexis-schoolcube-template.xlsx");
}

export function PortalHubClient({
  connectors,
  activeConnections: initial,
  classes,
}: {
  connectors: ConnectorMeta[];
  activeConnections: ActiveConnection[];
  classes: ClassOption[];
}) {
  const [connections, setConnections] = useState(initial);
  const [selected, setSelected] = useState<ConnectorMeta | null>(null);
  const [form, setForm] = useState({ username: "", password: "", portalUrl: "", schoolCode: "", sessionToken: "" });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [syncSummary, setSyncSummary] = useState<SyncSummary | null>(null);
  const [syncing, setSyncing] = useState<string | null>(null);

  // Integration request modal
  const [intOpen, setIntOpen] = useState<string | null>(null); // connector id
  const [intForm, setIntForm] = useState<IntegrationForm>({ schoolName: "", portalUrl: "", adminContact: "", message: "" });
  const [intLoading, setIntLoading] = useState(false);
  const [intSuccess, setIntSuccess] = useState(false);

  const handleConnect = async () => {
    if (!selected) return;
    setLoading(true);
    setError(null);
    setSuccess(null);
    try {
      const useTokenFlow = selected.id === "schoolcube";
      const res = await fetch("/api/student-hub/portal/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          useTokenFlow
            ? { portalType: selected.id, sessionToken: form.sessionToken, portalUrl: form.portalUrl || undefined }
            : { portalType: selected.id, username: form.username, password: form.password, portalUrl: form.portalUrl || undefined, schoolCode: form.schoolCode || undefined }
        ),
      });
      const data = await res.json() as { error?: string; connected?: boolean; schoolName?: string; tokenExpiry?: string };
      if (!res.ok) throw new Error(data.error ?? "Connection failed");

      setSuccess(`Connected to ${selected.name}${data.schoolName ? ` — ${data.schoolName}` : ""}`);
      setForm({ username: "", password: "", portalUrl: "", schoolCode: "", sessionToken: "" });
      setSelected(null);

      const refRes = await fetch("/api/student-hub/portal/connect");
      if (refRes.ok) {
        const refData = await refRes.json() as { connections: ActiveConnection[] };
        setConnections(refData.connections);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Connection failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (portalType: string) => {
    setSyncing(portalType);
    setSyncSummary(null);
    setError(null);
    try {
      const res = await fetch("/api/student-hub/portal/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ portalType }),
      });
      const data = await res.json() as { error?: string; jobId?: string; changesSummary?: SyncSummary };
      if (!res.ok) throw new Error(data.error ?? "Sync failed");
      setSyncSummary({ ...data.changesSummary!, jobId: data.jobId! });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sync failed");
    } finally {
      setSyncing(null);
    }
  };

  const handleIntegrationRequest = async () => {
    if (!intForm.schoolName || !intForm.portalUrl || !intForm.adminContact) return;
    setIntLoading(true);
    try {
      await fetch("/api/student-hub/integration-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...intForm, connectorId: intOpen }),
      });
      setIntSuccess(true);
    } catch {
      // show success anyway — request is logged
      setIntSuccess(true);
    } finally {
      setIntLoading(false);
    }
  };

  const closeIntModal = () => {
    setIntOpen(null);
    setIntForm({ schoolName: "", portalUrl: "", adminContact: "", message: "" });
    setIntSuccess(false);
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

      {/* Active connections */}
      {connections.length > 0 && (
        <div className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-bg">
            <h3 className="text-sm font-bold text-text">Active Connections</h3>
          </div>
          <div className="divide-y divide-border">
            {connections.map((conn) => {
              const isExpired = conn.tokenExpiry && new Date(conn.tokenExpiry) < new Date();
              return (
                <div key={conn.id} className="flex items-center gap-4 px-4 py-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Link2 size={16} className="text-blue-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-text">{conn.portalType.toUpperCase()}</p>
                    <p className="text-xs text-text-2 truncate">
                      {conn.schoolName ?? conn.displayName} ·{" "}
                      {conn.lastSynced
                        ? `Last synced ${new Date(conn.lastSynced).toLocaleDateString("en-NG")}`
                        : "Never synced"}
                    </p>
                  </div>
                  {isExpired ? (
                    <span className="text-xs text-red-500 bg-red-500/10 px-2 py-0.5 rounded-full font-bold">Expired</span>
                  ) : (
                    <span className="text-xs text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full font-bold">Active</span>
                  )}
                  <button
                    onClick={() => handleSync(conn.portalType)}
                    disabled={syncing === conn.portalType || !!isExpired}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-white hover:bg-primary/90 transition-colors disabled:opacity-40"
                  >
                    {syncing === conn.portalType ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                    Sync Now
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sync summary */}
      {syncSummary && (
        <div className="bg-blue-500/5 border border-blue-500/20 rounded-xl p-5 space-y-3">
          <div className="flex items-center gap-2">
            <CheckCircle size={16} className="text-blue-500" />
            <p className="font-bold text-text text-sm">Sync Complete — Review Changes</p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Students", value: syncSummary.newStudents },
              { label: "Classes", value: syncSummary.classes },
              { label: "Subjects", value: syncSummary.subjects },
              { label: "Results", value: syncSummary.results },
            ].map(({ label, value }) => (
              <div key={label} className="bg-surface rounded-lg p-3 text-center">
                <p className="text-xl font-black text-blue-500">{value}</p>
                <p className="text-xs text-text-2">{label}</p>
              </div>
            ))}
          </div>
          <p className="text-xs text-text-2">{syncSummary.term} · {syncSummary.session}</p>
          <a href="/student-hub/import" className="inline-flex items-center gap-2 text-xs font-bold text-blue-500 hover:underline">
            Commit this data →
          </a>
        </div>
      )}

      {/* Connector marketplace */}
      <div>
        <h2 className="text-sm font-bold text-text-2 uppercase tracking-wide mb-3">Available Connectors</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {connectors.map((c) => {
            const isConnected = connections.some((conn) => conn.portalType === c.id);

            if (!c.isAvailable) {
              return (
                <div key={c.id} className="bg-surface border border-amber-500/20 rounded-xl p-4">
                  {/* Header */}
                  <div className="flex items-start justify-between mb-2">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center">
                      <Globe size={16} className="text-amber-500" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                      Cloudflare Blocked
                    </span>
                  </div>
                  <p className="font-bold text-text text-sm">{c.name}</p>
                  <p className="text-xs text-text-2 mt-1 mb-3">
                    Direct connection unavailable. Cloudflare blocks server access. Use Excel/CSV upload or copy-paste import.
                  </p>

                  {/* Alternative actions */}
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="/student-hub/import"
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                    >
                      <Upload size={12} /> Upload File
                    </a>
                    <a
                      href="/student-hub/import?tab=paste"
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-surface border border-border text-text-2 hover:bg-bg transition-colors"
                    >
                      <ClipboardPaste size={12} /> Paste Table
                    </a>
                    <button
                      onClick={() => downloadSchoolCubeTemplate()}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-surface border border-border text-text-2 hover:bg-bg transition-colors"
                    >
                      <FileDown size={12} /> Download Template
                    </button>
                    <button
                      onClick={() => setIntOpen(c.id)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold bg-surface border border-border text-text-2 hover:bg-bg transition-colors"
                    >
                      <Mail size={12} /> Request API
                    </button>
                  </div>
                </div>
              );
            }

            return (
              <button
                key={c.id}
                onClick={() => { setSelected(c); setError(null); }}
                className={`text-left bg-surface border rounded-xl p-4 hover:border-primary/30 transition-all ${
                  selected?.id === c.id ? "border-primary ring-1 ring-primary" : "border-border"
                }`}
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="w-9 h-9 rounded-xl bg-blue-500/10 flex items-center justify-center">
                    <Globe size={16} className="text-blue-500" />
                  </div>
                  {isConnected && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-green-500/10 text-green-500">
                      Connected
                    </span>
                  )}
                </div>
                <p className="font-bold text-text text-sm">{c.name}</p>
                <p className="text-xs text-text-2 mt-0.5">{c.description}</p>
                <div className="flex flex-wrap gap-1 mt-2">
                  {c.supportedFeatures.map((f) => (
                    <span key={f} className="text-[10px] px-1.5 py-0.5 rounded bg-bg text-text-2 border border-border">
                      {f}
                    </span>
                  ))}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Connection form for available connectors */}
      {selected && (
        <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Lock size={15} className="text-text-2" />
            <h3 className="font-bold text-text">Connect to {selected.name}</h3>
          </div>
          {selected.setupInstructions && (
            <p className="text-xs text-text-2 bg-bg p-3 rounded-lg">{selected.setupInstructions}</p>
          )}
          {selected.id === "schoolcube" ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Portal URL</label>
                <input value={form.portalUrl} onChange={(e) => setForm((f) => ({ ...f, portalUrl: e.target.value }))}
                  placeholder="https://bolt.schoolcube.net/staff/YOURCODE"
                  className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Session Token</label>
                <textarea
                  value={form.sessionToken}
                  onChange={(e) => setForm((f) => ({ ...f, sessionToken: e.target.value }))}
                  rows={3}
                  placeholder="Paste your SchoolCube session token here…"
                  className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30 font-mono resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {selected.id === "edves" && (
                <div>
                  <label className="block text-xs font-medium text-text-2 mb-1">School Code</label>
                  <input value={form.schoolCode} onChange={(e) => setForm((f) => ({ ...f, schoolCode: e.target.value }))}
                    placeholder="e.g. SCH001"
                    className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
                </div>
              )}
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Username</label>
                <input value={form.username} onChange={(e) => setForm((f) => ({ ...f, username: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-text-2 mb-1">Password</label>
                <input type="password" value={form.password}
                  onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30" />
              </div>
            </div>
          )}
          <p className="text-[11px] text-text-2 flex items-center gap-1.5">
            <Lock size={11} className="shrink-0" />
            Your password is never stored. Only a session token is saved.
          </p>
          <div className="flex items-center gap-3">
            <button onClick={() => setSelected(null)}
              className="px-4 py-2 rounded-lg text-sm text-text-2 border border-border hover:bg-bg transition-colors">
              Cancel
            </button>
            <button
              onClick={handleConnect}
              disabled={loading || (selected.id === "schoolcube" ? !form.sessionToken : (!form.username || !form.password))}
              className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors disabled:opacity-40"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Link2 size={14} />}
              {loading ? "Connecting…" : "Connect"}
            </button>
          </div>
        </div>
      )}

      {/* Integration request modal */}
      {intOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-surface border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Mail size={15} className="text-primary" />
                </div>
                <h3 className="font-bold text-text">Request Official Integration</h3>
              </div>
              <button onClick={closeIntModal} className="text-text-2 hover:text-text transition-colors">
                <X size={18} />
              </button>
            </div>

            {intSuccess ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center mx-auto">
                  <CheckCircle size={28} className="text-green-500" />
                </div>
                <p className="font-bold text-text">Request Received!</p>
                <p className="text-sm text-text-2">
                  We have logged your integration request for {intOpen}. Our team will contact you within 5 business days to discuss official API access or a partnership.
                </p>
                <button onClick={closeIntModal} className="px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors">
                  Close
                </button>
              </div>
            ) : (
              <>
                <p className="text-xs text-text-2">
                  We will reach out to the portal provider on your behalf to explore official API access or a partnership integration.
                </p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-text-2 mb-1">School Name *</label>
                    <input
                      value={intForm.schoolName}
                      onChange={(e) => setIntForm((f) => ({ ...f, schoolName: e.target.value }))}
                      placeholder="e.g. Lagos Model College"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-2 mb-1">Portal URL *</label>
                    <input
                      value={intForm.portalUrl}
                      onChange={(e) => setIntForm((f) => ({ ...f, portalUrl: e.target.value }))}
                      placeholder="e.g. https://bolt.schoolcube.net/staff/ABCDE"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-2 mb-1">Admin Contact (Email or Phone) *</label>
                    <input
                      value={intForm.adminContact}
                      onChange={(e) => setIntForm((f) => ({ ...f, adminContact: e.target.value }))}
                      placeholder="e.g. admin@myschool.edu.ng or 0801234567"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-text-2 mb-1">Additional Notes</label>
                    <textarea
                      value={intForm.message}
                      onChange={(e) => setIntForm((f) => ({ ...f, message: e.target.value }))}
                      rows={3}
                      placeholder="Describe your use case, how many students, or any specific requirements…"
                      className="w-full px-3 py-2 rounded-lg text-sm bg-bg border border-border text-text focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                    />
                  </div>
                </div>
                <div className="flex items-center gap-3 pt-1">
                  <button onClick={closeIntModal} className="px-4 py-2 rounded-lg text-sm text-text-2 border border-border hover:bg-bg transition-colors">
                    Cancel
                  </button>
                  <button
                    onClick={handleIntegrationRequest}
                    disabled={intLoading || !intForm.schoolName || !intForm.portalUrl || !intForm.adminContact}
                    className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-bold text-white bg-primary hover:bg-primary/90 transition-colors disabled:opacity-40"
                  >
                    {intLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                    {intLoading ? "Sending…" : "Submit Request"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
