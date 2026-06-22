"use client";

import { useState, useTransition } from "react";
import { updateSchool, updateTeacher } from "@/app/actions/settings";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
  "Yobe","Zamfara",
];

const PLAN_STYLES: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-600 border-gray-200",
  BASIC: "bg-blue-50 text-primary border-blue-200",
  PRO: "bg-purple-50 text-purple-700 border-purple-200",
  ENTERPRISE: "bg-amber-50 text-amber-700 border-amber-200",
};

type Props = {
  school: {
    id: string;
    name: string;
    code: string;
    state: string;
    lga: string | null;
    address: string | null;
    plan: string;
  };
  teacher: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    role: string;
    subjects: string[];
    photoUrl: string | null;
    bio: string | null;
    qualification: string | null;
    department: string | null;
    yearsOfExp: number | null;
  };
};

function SaveButton({ pending }: { pending: boolean }) {
  return (
    <button
      type="submit"
      disabled={pending}
      className="px-5 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-primary/90 transition-colors disabled:opacity-60"
    >
      {pending ? "Saving…" : "Save Changes"}
    </button>
  );
}

function Toast({ message, ok }: { message: string; ok: boolean }) {
  return (
    <div
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium animate-in fade-in slide-in-from-bottom-2 ${
        ok
          ? "bg-success/10 text-success border-success/30"
          : "bg-danger/10 text-danger border-danger/30"
      }`}
    >
      <span>{ok ? "✓" : "✕"}</span>
      {message}
    </div>
  );
}

export function SettingsClient({ school, teacher }: Props) {
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [schoolPending, startSchool] = useTransition();
  const [teacherPending, startTeacher] = useTransition();

  function showToast(message: string, ok: boolean) {
    setToast({ message, ok });
    setTimeout(() => setToast(null), 3000);
  }

  function handleSchool(formData: FormData) {
    startSchool(async () => {
      try {
        await updateSchool(formData);
        showToast("School profile updated", true);
      } catch {
        showToast("Failed to save school profile", false);
      }
    });
  }

  function handleTeacher(formData: FormData) {
    startTeacher(async () => {
      try {
        await updateTeacher(formData);
        showToast("Teacher profile updated", true);
      } catch {
        showToast("Failed to save teacher profile", false);
      }
    });
  }

  return (
    <>
      {toast && <Toast message={toast.message} ok={toast.ok} />}

      <div className="space-y-6">
        {/* School Profile */}
        <section className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div>
              <h2 className="font-semibold text-text">School Profile</h2>
              <p className="text-xs text-muted mt-0.5">
                School code: <span className="font-mono">{school.code}</span>
              </p>
            </div>
            <span
              className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${
                PLAN_STYLES[school.plan] ?? PLAN_STYLES.FREE
              }`}
            >
              {school.plan}
            </span>
          </div>

          <form action={handleSchool} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text mb-1.5">
                  School Name <span className="text-danger">*</span>
                </label>
                <input
                  name="name"
                  type="text"
                  required
                  defaultValue={school.name}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-bg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  State <span className="text-danger">*</span>
                </label>
                <select
                  name="state"
                  required
                  defaultValue={school.state}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-bg"
                >
                  <option value="">Select state…</option>
                  {NIGERIAN_STATES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  LGA <span className="text-xs text-muted">(optional)</span>
                </label>
                <input
                  name="lga"
                  type="text"
                  defaultValue={school.lga ?? ""}
                  placeholder="e.g. Ibadan North"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-bg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text mb-1.5">
                  Address <span className="text-xs text-muted">(optional)</span>
                </label>
                <input
                  name="address"
                  type="text"
                  defaultValue={school.address ?? ""}
                  placeholder="e.g. 12 School Road, Ibadan"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-bg"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <SaveButton pending={schoolPending} />
            </div>
          </form>
        </section>

        {/* Teacher Profile */}
        <section className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border">
            <h2 className="font-semibold text-text">Teacher Profile</h2>
            <p className="text-xs text-muted mt-0.5">Role: {teacher.role}</p>
          </div>

          <form action={handleTeacher} className="p-6 space-y-4">
            {/* Profile Photo */}
            <div className="flex items-center gap-5 pb-4 border-b border-border">
              <div className="shrink-0">
                {teacher.photoUrl ? (
                  <img
                    src={teacher.photoUrl}
                    alt={`${teacher.firstName}'s photo`}
                    className="w-20 h-20 rounded-full object-cover border-2 border-primary/30"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border-2 border-primary/20">
                    {teacher.firstName[0]}{teacher.lastName[0]}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-text mb-1.5">
                  Profile Photo URL
                </label>
                <input
                  name="photoUrl"
                  type="url"
                  defaultValue={teacher.photoUrl ?? ""}
                  placeholder="https://example.com/my-photo.jpg"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-bg"
                />
                <p className="text-xs text-muted mt-1">
                  Paste a link to your profile photo. Supported: Clerk avatar, Google, LinkedIn, or any public URL.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  First Name <span className="text-danger">*</span>
                </label>
                <input
                  name="firstName"
                  type="text"
                  required
                  defaultValue={teacher.firstName}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-bg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Last Name
                </label>
                <input
                  name="lastName"
                  type="text"
                  defaultValue={teacher.lastName}
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-bg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text mb-1.5">
                  Email
                </label>
                <input
                  type="email"
                  value={teacher.email}
                  disabled
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-muted bg-bg/50 cursor-not-allowed"
                />
                <p className="text-xs text-muted mt-1">
                  Email is managed through your Clerk account.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Department
                </label>
                <input
                  name="department"
                  type="text"
                  defaultValue={teacher.department ?? ""}
                  placeholder="e.g. Science, Arts, Commercial"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-bg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Qualification
                </label>
                <input
                  name="qualification"
                  type="text"
                  defaultValue={teacher.qualification ?? ""}
                  placeholder="e.g. B.Sc Education, M.Ed"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-bg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Years of Experience
                </label>
                <input
                  name="yearsOfExp"
                  type="number"
                  min={0}
                  max={50}
                  defaultValue={teacher.yearsOfExp ?? ""}
                  placeholder="e.g. 8"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-bg"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text mb-1.5">
                  Subjects Taught
                  <span className="text-xs text-muted font-normal ml-1">(comma-separated)</span>
                </label>
                <input
                  name="subjects"
                  type="text"
                  defaultValue={teacher.subjects.join(", ")}
                  placeholder="e.g. Mathematics, Physics"
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-bg"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-text mb-1.5">
                  Bio
                </label>
                <textarea
                  name="bio"
                  rows={3}
                  defaultValue={teacher.bio ?? ""}
                  placeholder="Tell us about yourself — teaching philosophy, achievements, areas of expertise..."
                  className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-bg resize-y"
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <SaveButton pending={teacherPending} />
            </div>
          </form>
        </section>

        {/* Danger Zone */}
        <section className="bg-surface border border-danger/20 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-danger/20">
            <h2 className="font-semibold text-danger">Danger Zone</h2>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text">Delete School Account</p>
              <p className="text-xs text-muted mt-0.5">
                Permanently removes all data. This cannot be undone.
              </p>
            </div>
            <button
              type="button"
              className="px-4 py-2 text-sm font-medium text-danger border border-danger/30 rounded-lg hover:bg-danger/5 transition-colors"
              onClick={() =>
                alert("Please contact support to delete your account.")
              }
            >
              Delete Account
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
