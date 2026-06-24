"use client";

import { useState, useTransition } from "react";
import { updateSchool, updateTeacher } from "@/app/actions/settings";
import { Star, User, GraduationCap, BookOpen, FileText, Shield } from "lucide-react";

// ── Constants ─────────────────────────────────────────────────────

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
  "Yobe","Zamfara",
];

const QUALIFICATIONS = [
  { value: "NCE", label: "NCE — Nigeria Certificate in Education" },
  { value: "B.Ed", label: "B.Ed — Bachelor of Education" },
  { value: "B.Sc+PGDE", label: "B.Sc + PGDE — Postgraduate Diploma in Education" },
  { value: "M.Ed", label: "M.Ed — Master of Education" },
  { value: "M.Sc", label: "M.Sc / MA — Postgraduate (Other)" },
  { value: "Ph.D", label: "Ph.D — Doctor of Philosophy" },
];

const ROLES = [
  { value: "TEACHER", label: "Subject Teacher" },
  { value: "FORM_TEACHER", label: "Form Teacher" },
  { value: "HOD", label: "Head of Department (HOD)" },
  { value: "VICE_PRINCIPAL", label: "Vice Principal" },
  { value: "PRINCIPAL", label: "Principal" },
];

const SUBJECTS = [
  "Mathematics","English Language","Physics","Chemistry","Biology",
  "Agricultural Science","Economics","Government","Literature in English",
  "Geography","History","Civic Education","Christian Religious Studies",
  "Islamic Studies","Further Mathematics","Technical Drawing",
  "Food and Nutrition","Computer Studies","French",
];

const CLASS_LEVELS = [
  { value: "JS1", label: "JSS 1" },
  { value: "JS2", label: "JSS 2" },
  { value: "JS3", label: "JSS 3" },
  { value: "SS1", label: "SS 1" },
  { value: "SS2", label: "SS 2" },
  { value: "SS3", label: "SS 3" },
];

const PLAN_STYLES: Record<string, string> = {
  FREE: "bg-gray-100 text-gray-600 border-gray-200",
  BASIC: "bg-blue-50 text-primary border-blue-200",
  PRO: "bg-purple-50 text-purple-700 border-purple-200",
  ENTERPRISE: "bg-amber-50 text-amber-700 border-amber-200",
};

// ── Star Rating Calculator ────────────────────────────────────────

function computeStarRating(teacher: TeacherProps): number {
  let pts = 0;

  // Qualification (max 4pts)
  const qualPoints: Record<string, number> = {
    "NCE": 1, "B.Ed": 2, "B.Sc+PGDE": 2, "M.Ed": 3, "M.Sc": 3, "Ph.D": 4,
  };
  if (teacher.qualification) pts += qualPoints[teacher.qualification] ?? 0;

  // TRCN registered (+1pt)
  if (teacher.trcnStatus === "REGISTERED") pts += 1;

  // Experience
  const exp = teacher.yearsOfExp ?? 0;
  if (exp >= 10) pts += 1;
  else if (exp >= 3) pts += 0.5;

  // Bio filled (+0.5pt)
  if (teacher.bio && teacher.bio.length > 20) pts += 0.5;

  // 2+ subjects (+0.5pt)
  if (teacher.subjects.length >= 2) pts += 0.5;

  // Normalize to 5-star scale (max raw = 7)
  return Math.min(5, Math.round((pts / 7) * 5 * 2) / 2); // half-star precision
}

function StarRating({ rating, size = 18 }: { rating: number; size?: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => {
        const filled = rating >= i + 1;
        const half = !filled && rating >= i + 0.5;
        return (
          <span key={i} className="relative inline-block" style={{ width: size, height: size }}>
            {/* Empty star */}
            <Star size={size} className="text-border absolute inset-0" />
            {/* Filled portion */}
            {(filled || half) && (
              <span
                className="absolute inset-0 overflow-hidden"
                style={{ width: half ? "50%" : "100%" }}
              >
                <Star size={size} className="text-amber-400" fill="currentColor" />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

function ratingLabel(r: number) {
  if (r >= 4.5) return "Elite Educator";
  if (r >= 3.5) return "Senior Educator";
  if (r >= 2.5) return "Experienced Educator";
  if (r >= 1.5) return "Growing Educator";
  return "New Educator";
}

// ── Types ─────────────────────────────────────────────────────────

type TeacherProps = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string;
  subjects: string[];
  classLevels: string[];
  photoUrl: string | null;
  bio: string | null;
  qualification: string | null;
  institution: string | null;
  gradYear: number | null;
  trcnNumber: string | null;
  trcnStatus: string | null;
  department: string | null;
  yearsOfExp: number | null;
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
  teacher: TeacherProps;
};

// ── Shared Components ─────────────────────────────────────────────

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
      role="alert"
      className={`fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium ${
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

function SectionHeader({ icon: Icon, title, subtitle }: {
  icon: React.ElementType; title: string; subtitle?: string;
}) {
  return (
    <div className="px-6 py-4 border-b border-border flex items-center gap-3">
      <div className="p-2 bg-primary/10 rounded-lg">
        <Icon size={15} className="text-primary" />
      </div>
      <div>
        <h2 className="font-semibold text-text text-sm">{title}</h2>
        {subtitle && <p className="text-xs text-muted mt-0.5">{subtitle}</p>}
      </div>
    </div>
  );
}

function Field({ label, children, hint, required }: {
  label: string; children: React.ReactNode; hint?: string; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-text-2 mb-1.5">
        {label} {required && <span className="text-danger">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-muted mt-1">{hint}</p>}
    </div>
  );
}

const inputCls = "w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-bg transition-colors";
const selectCls = inputCls;

// ── Main Component ────────────────────────────────────────────────

export function SettingsClient({ school, teacher }: Props) {
  const [toast, setToast] = useState<{ message: string; ok: boolean } | null>(null);
  const [schoolPending, startSchool] = useTransition();
  const [teacherPending, startTeacher] = useTransition();

  // Local state for multi-selects (checkboxes need to be controlled)
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>(teacher.subjects);
  const [selectedLevels, setSelectedLevels] = useState<string[]>(teacher.classLevels ?? []);

  // Live rating preview
  const liveTeacher = { ...teacher, subjects: selectedSubjects };
  const rating = computeStarRating(liveTeacher);

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
    // Inject multi-select values into form data
    selectedSubjects.forEach((s) => formData.append("subjects", s));
    selectedLevels.forEach((l) => formData.append("classLevels", l));
    startTeacher(async () => {
      try {
        await updateTeacher(formData);
        showToast("Teacher profile updated", true);
      } catch {
        showToast("Failed to save teacher profile", false);
      }
    });
  }

  function toggleSubject(s: string) {
    setSelectedSubjects((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]
    );
  }

  function toggleLevel(l: string) {
    setSelectedLevels((prev) =>
      prev.includes(l) ? prev.filter((x) => x !== l) : [...prev, l]
    );
  }

  return (
    <>
      {toast && <Toast message={toast.message} ok={toast.ok} />}

      <div className="space-y-6">

        {/* ── Profile Card (live rating display) ── */}
        <div className="bg-gradient-to-r from-primary/5 to-purple-500/5 border border-primary/20 rounded-xl p-5 flex items-center gap-5">
          {teacher.photoUrl ? (
            <img
              src={teacher.photoUrl}
              alt="Profile"
              className="w-16 h-16 rounded-full object-cover border-2 border-primary/30 shrink-0"
            />
          ) : (
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary text-xl font-bold border-2 border-primary/20 shrink-0">
              {teacher.firstName[0]}{teacher.lastName[0]}
            </div>
          )}
          <div className="flex-1">
            <p className="font-bold text-text text-base">{teacher.firstName} {teacher.lastName}</p>
            <p className="text-xs text-text-2 mt-0.5">{teacher.email}</p>
            <div className="flex items-center gap-2 mt-2">
              <StarRating rating={rating} size={16} />
              <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                {rating.toFixed(1)} — {ratingLabel(rating)}
              </span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className="text-3xl font-black text-amber-500">{rating.toFixed(1)}</p>
            <p className="text-[10px] text-muted">credential score</p>
            <p className="text-[10px] text-muted">out of 5.0</p>
          </div>
        </div>

        {/* ── School Profile ── */}
        <section className="bg-surface border border-border rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Shield size={15} className="text-primary" />
              </div>
              <div>
                <h2 className="font-semibold text-text text-sm">School Profile</h2>
                <p className="text-xs text-muted mt-0.5">Code: <span className="font-mono">{school.code}</span></p>
              </div>
            </div>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border ${PLAN_STYLES[school.plan] ?? PLAN_STYLES.FREE}`}>
              {school.plan}
            </span>
          </div>

          <form action={handleSchool} className="p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Field label="School Name" required>
                  <input name="name" type="text" required defaultValue={school.name} className={inputCls} />
                </Field>
              </div>
              <Field label="State" required>
                <select name="state" required defaultValue={school.state} className={selectCls}>
                  <option value="">Select state…</option>
                  {NIGERIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </Field>
              <Field label="LGA">
                <input name="lga" type="text" defaultValue={school.lga ?? ""} placeholder="e.g. Ibadan North" className={inputCls} />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Address">
                  <input name="address" type="text" defaultValue={school.address ?? ""} placeholder="e.g. 12 School Road, Ibadan" className={inputCls} />
                </Field>
              </div>
            </div>
            <div className="flex justify-end pt-2">
              <SaveButton pending={schoolPending} />
            </div>
          </form>
        </section>

        {/* ── Teacher Profile form ── */}
        <form
          action={handleTeacher}
          className="space-y-4"
        >
          {/* 1. Personal Info */}
          <section className="bg-surface border border-border rounded-xl overflow-hidden">
            <SectionHeader icon={User} title="Personal Information" subtitle="Your name, contact details, and photo" />
            <div className="p-6 space-y-4">
              {/* Avatar */}
              <div className="flex items-center gap-5 pb-4 border-b border-border">
                <div className="shrink-0">
                  {teacher.photoUrl ? (
                    <img src={teacher.photoUrl} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-primary/30" />
                  ) : (
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center text-primary text-2xl font-bold border-2 border-primary/20">
                      {teacher.firstName[0]}{teacher.lastName[0]}
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <Field label="Profile Photo URL" hint="Paste a direct image URL. Accepted: Clerk avatar, Google, LinkedIn, or any public .jpg/.png link.">
                    <input
                      name="photoUrl"
                      type="url"
                      defaultValue={teacher.photoUrl ?? ""}
                      placeholder="https://example.com/your-photo.jpg"
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name" required>
                  <input name="firstName" type="text" required defaultValue={teacher.firstName} className={inputCls} />
                </Field>
                <Field label="Last Name">
                  <input name="lastName" type="text" defaultValue={teacher.lastName} className={inputCls} />
                </Field>
                <Field label="Phone Number" hint="WhatsApp or mobile number">
                  <input
                    name="phone"
                    type="tel"
                    defaultValue={teacher.phone ?? ""}
                    placeholder="e.g. 08012345678"
                    className={inputCls}
                  />
                </Field>
                <Field label="Email" hint="Managed through your Clerk account — cannot be changed here.">
                  <input type="email" value={teacher.email} disabled className={`${inputCls} opacity-50 cursor-not-allowed`} />
                </Field>
              </div>
            </div>
          </section>

          {/* 2. Credentials */}
          <section className="bg-surface border border-border rounded-xl overflow-hidden">
            <SectionHeader
              icon={GraduationCap}
              title="Academic Credentials"
              subtitle="Your highest qualification, institution, and TRCN registration — these directly boost your credential star rating"
            />
            <div className="p-6 space-y-4">
              {/* Rating hint */}
              <div className="flex items-start gap-2.5 bg-amber-500/5 border border-amber-500/20 rounded-xl p-3">
                <Star size={14} className="text-amber-500 shrink-0 mt-0.5" fill="currentColor" />
                <p className="text-xs text-text-2">
                  <strong className="text-text">How your rating is calculated:</strong> Qualification (1–4pts) + TRCN Registered (+1pt) + Experience (+0.5–1pt) + Bio (+0.5pt) + 2+ subjects (+0.5pt), normalized to 5 stars.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Highest Qualification" hint="NCE=1★ · B.Ed/PGDE=2★ · M.Ed=3★ · Ph.D=4★">
                  <select name="qualification" defaultValue={teacher.qualification ?? ""} className={selectCls}>
                    <option value="">Select qualification…</option>
                    {QUALIFICATIONS.map((q) => (
                      <option key={q.value} value={q.value}>{q.label}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Institution Attended">
                  <input
                    name="institution"
                    type="text"
                    defaultValue={teacher.institution ?? ""}
                    placeholder="e.g. University of Lagos"
                    className={inputCls}
                  />
                </Field>

                <Field label="Year of Graduation">
                  <input
                    name="gradYear"
                    type="number"
                    min={1970}
                    max={new Date().getFullYear()}
                    defaultValue={teacher.gradYear ?? ""}
                    placeholder="e.g. 2015"
                    className={inputCls}
                  />
                </Field>

                <Field label="TRCN Status" hint="Adds +1 to your credential score">
                  <select name="trcnStatus" defaultValue={teacher.trcnStatus ?? ""} className={selectCls}>
                    <option value="">Select status…</option>
                    <option value="REGISTERED">✅ Registered</option>
                    <option value="PENDING">⏳ Pending Registration</option>
                    <option value="EXEMPTED">🔹 Exempted</option>
                    <option value="NOT_APPLICABLE">— Not Applicable</option>
                  </select>
                </Field>

                <div className="sm:col-span-2">
                  <Field label="TRCN Registration Number" hint="Your Teachers Registration Council of Nigeria number (e.g. TRCN/YA2005/NIG/00012345)">
                    <input
                      name="trcnNumber"
                      type="text"
                      defaultValue={teacher.trcnNumber ?? ""}
                      placeholder="e.g. TRCN/YA2005/NIG/00012345"
                      className={inputCls}
                    />
                  </Field>
                </div>
              </div>
            </div>
          </section>

          {/* 3. Teaching Info */}
          <section className="bg-surface border border-border rounded-xl overflow-hidden">
            <SectionHeader icon={BookOpen} title="Teaching Information" subtitle="Your role, subjects, and class levels" />
            <div className="p-6 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Field label="Role / Position">
                  <select name="role" defaultValue={teacher.role} className={selectCls}>
                    {ROLES.map((r) => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Department">
                  <input
                    name="department"
                    type="text"
                    defaultValue={teacher.department ?? ""}
                    placeholder="e.g. Science, Arts"
                    className={inputCls}
                  />
                </Field>
                <Field label="Years of Experience" hint="Adds +0.5★ (3–9yrs) or +1★ (10+yrs)">
                  <input
                    name="yearsOfExp"
                    type="number"
                    min={0}
                    max={50}
                    defaultValue={teacher.yearsOfExp ?? ""}
                    placeholder="e.g. 8"
                    className={inputCls}
                  />
                </Field>
              </div>

              {/* Subjects multi-select */}
              <Field label="Subjects Taught" hint="Select all subjects you teach — 2+ subjects adds +0.5★">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-1">
                  {SUBJECTS.map((s) => (
                    <label
                      key={s}
                      className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs cursor-pointer transition-all ${
                        selectedSubjects.includes(s)
                          ? "bg-primary/10 border-primary/40 text-primary font-medium"
                          : "border-border text-text-2 hover:border-primary/30 hover:bg-bg"
                      }`}
                    >
                      <input
                        type="checkbox"
                        className="sr-only"
                        checked={selectedSubjects.includes(s)}
                        onChange={() => toggleSubject(s)}
                      />
                      <span className={`w-3.5 h-3.5 rounded border flex items-center justify-center shrink-0 ${
                        selectedSubjects.includes(s) ? "bg-primary border-primary" : "border-border"
                      }`}>
                        {selectedSubjects.includes(s) && (
                          <svg width="8" height="6" viewBox="0 0 8 6" fill="none">
                            <path d="M1 3L3 5L7 1" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </span>
                      {s}
                    </label>
                  ))}
                </div>
              </Field>

              {/* Class levels multi-select */}
              <Field label="Class Levels Taught">
                <div className="flex flex-wrap gap-2 mt-1">
                  {CLASS_LEVELS.map(({ value, label }) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => toggleLevel(value)}
                      className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${
                        selectedLevels.includes(value)
                          ? "bg-primary text-white border-primary shadow-sm"
                          : "border-border text-text-2 hover:border-primary/40 hover:bg-bg"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          </section>

          {/* 4. Bio */}
          <section className="bg-surface border border-border rounded-xl overflow-hidden">
            <SectionHeader
              icon={FileText}
              title="Professional Bio"
              subtitle="Your teaching philosophy, achievements, and areas of expertise (+0.5★ when filled)"
            />
            <div className="p-6">
              <textarea
                name="bio"
                rows={5}
                maxLength={1200}
                defaultValue={teacher.bio ?? ""}
                placeholder="I am a dedicated educator with X years of experience teaching... My approach to teaching Mathematics focuses on real-world applications relevant to Nigerian students..."
                className={`${inputCls} resize-y`}
              />
              <p className="text-xs text-muted mt-1.5">Maximum 200 words. A complete bio adds +0.5 to your credential star rating.</p>
            </div>
          </section>

          {/* Save */}
          <div className="flex items-center justify-between bg-surface border border-border rounded-xl px-6 py-4">
            <div className="flex items-center gap-2">
              <StarRating rating={rating} size={18} />
              <span className="text-sm font-semibold text-text">{rating.toFixed(1)} — {ratingLabel(rating)}</span>
            </div>
            <SaveButton pending={teacherPending} />
          </div>
        </form>

        {/* Danger Zone */}
        <section className="bg-surface border border-danger/20 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-danger/20">
            <h2 className="font-semibold text-danger text-sm">Danger Zone</h2>
          </div>
          <div className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-text">Delete School Account</p>
              <p className="text-xs text-muted mt-0.5">Permanently removes all data. This cannot be undone.</p>
            </div>
            <button
              type="button"
              onClick={() => alert("Please contact support to delete your account.")}
              className="px-4 py-2 text-sm font-medium text-danger border border-danger/30 rounded-lg hover:bg-danger/5 transition-colors"
            >
              Delete Account
            </button>
          </div>
        </section>
      </div>
    </>
  );
}
