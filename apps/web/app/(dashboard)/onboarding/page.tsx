import { redirect } from "next/navigation";
import { safeAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { setupSchool } from "@/app/actions/onboarding";
import { GraduationCap } from "lucide-react";

const NIGERIAN_STATES = [
  "Abia","Adamawa","Akwa Ibom","Anambra","Bauchi","Bayelsa","Benue","Borno",
  "Cross River","Delta","Ebonyi","Edo","Ekiti","Enugu","FCT","Gombe","Imo",
  "Jigawa","Kaduna","Kano","Katsina","Kebbi","Kogi","Kwara","Lagos","Nasarawa",
  "Niger","Ogun","Ondo","Osun","Oyo","Plateau","Rivers","Sokoto","Taraba",
  "Yobe","Zamfara",
];

export default async function OnboardingPage() {
  const { userId } = await safeAuth();
  if (!userId) redirect("/sign-in");

  const existing = await db.teacher.findUnique({ where: { clerkId: userId } });
  if (existing) redirect("/dashboard");

  return (
    <div className="min-h-screen flex items-center justify-center bg-bg">
      <div className="w-full max-w-md">
        <div className="bg-surface rounded-2xl border border-border p-8 shadow-sm">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-primary-50 p-2.5 rounded-xl">
              <GraduationCap size={24} className="text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-text">Set up your school</h1>
              <p className="text-sm text-text-2">This takes 30 seconds.</p>
            </div>
          </div>

          <form action={setupSchool} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                School Name <span className="text-danger">*</span>
              </label>
              <input
                name="schoolName"
                type="text"
                required
                placeholder="e.g. Baptist Girls Secondary School"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                State <span className="text-danger">*</span>
              </label>
              <select
                name="state"
                required
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
              >
                <option value="">Select state...</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-text mb-1.5">
                LGA <span className="text-muted text-xs">(optional)</span>
              </label>
              <input
                name="lga"
                type="text"
                placeholder="e.g. Ibadan North"
                className="w-full px-3 py-2.5 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
              />
            </div>

            <button
              type="submit"
              className="w-full bg-primary text-white py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-600 transition-colors mt-2"
            >
              Create School & Continue
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
