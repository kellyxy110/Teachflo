"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveHealthRecord, addClinicVisit } from "@/app/actions/health";
import {
  ArrowLeft, Save, Loader2, Check,
  Droplets, Dna, AlertTriangle, Pill,
  Phone, Mail, UserCheck, HeartPulse,
  Plus, X, Stethoscope, StickyNote,
} from "lucide-react";
import Link from "next/link";

type Student = {
  id: string;
  firstName: string;
  lastName: string;
  regNumber: string | null;
  gender: string | null;
  class: { name: string };
};

type Record = {
  id: string;
  bloodGroup: string | null;
  genotype: string | null;
  allergies: string[];
  conditions: string[];
  medications: string[];
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRel: string | null;
  parentPhone: string | null;
  parentEmail: string | null;
  healthNotes: string | null;
  clinicVisits: unknown;
  immunizations: unknown;
} | null;

const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"];
const GENOTYPES = ["AA", "AS", "AC", "SS", "SC", "CC"];
const RELATIONSHIPS = ["Father", "Mother", "Guardian", "Uncle", "Aunt", "Sibling", "Other"];

function TagInput({ name, label, values, onChange }: {
  name: string; label: string; values: string[]; onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");

  function add() {
    const v = input.trim();
    if (v && !values.includes(v)) {
      onChange([...values, v]);
    }
    setInput("");
  }

  function remove(i: number) {
    onChange(values.filter((_, idx) => idx !== i));
  }

  return (
    <div>
      <label className="block text-xs font-semibold text-text-2 mb-1.5">{label}</label>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); add(); } }}
          placeholder={`Add ${label.toLowerCase()}...`}
          className="flex-1 bg-surface border border-border rounded-lg px-3 py-2 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <button
          type="button"
          onClick={add}
          className="px-3 py-2 bg-primary/10 text-primary rounded-lg text-sm font-bold hover:bg-primary/20 transition-colors"
        >
          <Plus size={16} />
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {values.map((v, i) => (
            <span key={i} className="flex items-center gap-1 bg-border/30 text-text text-xs font-medium px-2.5 py-1 rounded-lg">
              {v}
              <button type="button" onClick={() => remove(i)} className="text-muted hover:text-danger transition-colors">
                <X size={12} />
              </button>
              <input type="hidden" name={name} value={v} />
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export function HealthDetailClient({ student, record }: { student: Student; record: Record }) {
  const router = useRouter();
  const [saving, startSave] = useTransition();
  const [saved, setSaved] = useState(false);
  const [tab, setTab] = useState<"info" | "visits">("info");

  const [allergies, setAllergies] = useState<string[]>(record?.allergies ?? []);
  const [conditions, setConditions] = useState<string[]>(record?.conditions ?? []);
  const [medications, setMedications] = useState<string[]>(record?.medications ?? []);

  const [showVisitForm, setShowVisitForm] = useState(false);
  const [visitSaving, startVisitSave] = useTransition();

  const visits = (record?.clinicVisits as { date: string; reason: string; treatment: string; notes: string; recordedBy: string }[] ?? []);

  function handleSubmit(formData: FormData) {
    for (const a of allergies) formData.append("allergies", a);
    for (const c of conditions) formData.append("conditions", c);
    for (const m of medications) formData.append("medications", m);

    startSave(async () => {
      await saveHealthRecord(student.id, formData);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  function handleVisitSubmit(formData: FormData) {
    startVisitSave(async () => {
      await addClinicVisit(student.id, formData);
      setShowVisitForm(false);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      {/* Back + Student header */}
      <div className="flex items-center gap-3">
        <Link href="/health" className="p-2 rounded-lg hover:bg-border/20 text-muted hover:text-text transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-bold text-text truncate">
            {student.lastName} {student.firstName}
          </h1>
          <p className="text-xs text-muted">
            {student.class.name} {student.regNumber ? `· ${student.regNumber}` : ""}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-500/10 p-2 rounded-lg">
          <HeartPulse size={18} className="text-red-500" />
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-surface border border-border rounded-xl overflow-hidden">
        <button
          onClick={() => setTab("info")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "info" ? "bg-primary text-white" : "text-text-2 hover:bg-border/20"
          }`}
        >
          <HeartPulse size={15} />Health Info
        </button>
        <button
          onClick={() => setTab("visits")}
          className={`flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 text-sm font-medium transition-colors ${
            tab === "visits" ? "bg-primary text-white" : "text-text-2 hover:bg-border/20"
          }`}
        >
          <Stethoscope size={15} />Clinic Visits ({visits.length})
        </button>
      </div>

      {/* HEALTH INFO TAB */}
      {tab === "info" && (
        <form action={handleSubmit} className="space-y-5">
          {/* Medical basics */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-sm font-bold text-text mb-3 flex items-center gap-2">
              <Droplets size={15} className="text-red-500" />Medical Information
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-2 mb-1.5">Blood Group</label>
                <select
                  name="bloodGroup"
                  defaultValue={record?.bloodGroup ?? ""}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select</option>
                  {BLOOD_GROUPS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-2 mb-1.5">
                  <span className="flex items-center gap-1"><Dna size={12} />Genotype</span>
                </label>
                <select
                  name="genotype"
                  defaultValue={record?.genotype ?? ""}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select</option>
                  {GENOTYPES.map((g) => (
                    <option key={g} value={g}>{g}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Allergies, conditions, medications */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-4">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <AlertTriangle size={15} className="text-amber-500" />Health Conditions
            </h3>
            <TagInput name="allergies" label="Allergies" values={allergies} onChange={setAllergies} />
            <TagInput name="conditions" label="Medical Conditions" values={conditions} onChange={setConditions} />
            <TagInput name="medications" label="Current Medications" values={medications} onChange={setMedications} />
          </div>

          {/* Emergency contact */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <Phone size={15} className="text-primary" />Emergency Contact
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-2 mb-1.5">Contact Name</label>
                <input
                  name="emergencyContactName"
                  defaultValue={record?.emergencyContactName ?? ""}
                  placeholder="Full name"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-2 mb-1.5">Relationship</label>
                <select
                  name="emergencyContactRel"
                  defaultValue={record?.emergencyContactRel ?? ""}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">Select</option>
                  {RELATIONSHIPS.map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-2 mb-1.5">
                  <span className="flex items-center gap-1"><Phone size={12} />Phone Number</span>
                </label>
                <input
                  name="emergencyContactPhone"
                  type="tel"
                  defaultValue={record?.emergencyContactPhone ?? ""}
                  placeholder="080..."
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Parent contact */}
          <div className="bg-surface border border-border rounded-xl p-4 space-y-3">
            <h3 className="text-sm font-bold text-text flex items-center gap-2">
              <UserCheck size={15} className="text-success" />Parent / Guardian
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-text-2 mb-1.5">
                  <span className="flex items-center gap-1"><Phone size={12} />Parent Phone</span>
                </label>
                <input
                  name="parentPhone"
                  type="tel"
                  defaultValue={record?.parentPhone ?? ""}
                  placeholder="080..."
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-2 mb-1.5">
                  <span className="flex items-center gap-1"><Mail size={12} />Parent Email</span>
                </label>
                <input
                  name="parentEmail"
                  type="email"
                  defaultValue={record?.parentEmail ?? ""}
                  placeholder="parent@email.com"
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
          </div>

          {/* Health notes */}
          <div className="bg-surface border border-border rounded-xl p-4">
            <h3 className="text-sm font-bold text-text mb-2 flex items-center gap-2">
              <StickyNote size={15} className="text-muted" />Health Notes
            </h3>
            <textarea
              name="healthNotes"
              defaultValue={record?.healthNotes ?? ""}
              placeholder="Additional health notes, dietary needs, special requirements..."
              rows={3}
              className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
            />
          </div>

          {/* Save button */}
          <div className="sticky bottom-16 md:bottom-0 z-10">
            <button
              type="submit"
              disabled={saving || saved}
              className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-[0.98] ${
                saved
                  ? "bg-emerald-500 text-white"
                  : "bg-primary text-white hover:bg-primary-600"
              } disabled:opacity-70`}
            >
              {saving ? (
                <><Loader2 size={16} className="animate-spin" />Saving...</>
              ) : saved ? (
                <><Check size={16} />Saved</>
              ) : (
                <><Save size={16} />Save Health Record</>
              )}
            </button>
          </div>
        </form>
      )}

      {/* CLINIC VISITS TAB */}
      {tab === "visits" && (
        <div className="space-y-4">
          <button
            onClick={() => setShowVisitForm(!showVisitForm)}
            className="w-full flex items-center justify-center gap-2 bg-primary text-white py-3 rounded-xl text-sm font-bold hover:bg-primary-600 transition-colors active:scale-[0.98]"
          >
            <Plus size={16} />Log Clinic Visit
          </button>

          {showVisitForm && (
            <form action={handleVisitSubmit} className="bg-surface border border-border rounded-xl p-4 space-y-3">
              <h3 className="text-sm font-bold text-text">New Clinic Visit</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-text-2 mb-1.5">Date</label>
                  <input
                    name="visitDate"
                    type="date"
                    defaultValue={new Date().toISOString().slice(0, 10)}
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-text-2 mb-1.5">Reason</label>
                  <input
                    name="reason"
                    placeholder="Headache, fever, injury..."
                    className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-2 mb-1.5">Treatment Given</label>
                <input
                  name="treatment"
                  placeholder="Rest, paracetamol, first aid..."
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-text-2 mb-1.5">Notes</label>
                <textarea
                  name="notes"
                  placeholder="Additional observations..."
                  rows={2}
                  className="w-full bg-bg border border-border rounded-lg px-3 py-2.5 text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={visitSaving}
                  className="flex-1 flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-lg text-sm font-bold hover:bg-primary-600 transition-colors disabled:opacity-70"
                >
                  {visitSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                  Save Visit
                </button>
                <button
                  type="button"
                  onClick={() => setShowVisitForm(false)}
                  className="px-4 py-2.5 bg-border/20 text-text-2 rounded-lg text-sm font-medium hover:bg-border/30 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {visits.length === 0 && !showVisitForm && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Stethoscope size={32} className="text-border mb-2" />
              <p className="text-sm text-muted">No clinic visits recorded</p>
            </div>
          )}

          {visits.length > 0 && (
            <div className="space-y-2">
              {visits.map((visit, i) => (
                <div key={i} className="bg-surface border border-border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-bold text-primary">
                      {new Date(visit.date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" })}
                    </span>
                    {visit.recordedBy && (
                      <span className="text-[10px] text-muted">by {visit.recordedBy}</span>
                    )}
                  </div>
                  {visit.reason && (
                    <p className="text-sm text-text mb-1">
                      <span className="font-semibold">Reason:</span> {visit.reason}
                    </p>
                  )}
                  {visit.treatment && (
                    <p className="text-sm text-text mb-1">
                      <span className="font-semibold">Treatment:</span> {visit.treatment}
                    </p>
                  )}
                  {visit.notes && (
                    <p className="text-xs text-muted mt-1">{visit.notes}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
