import { GraduationCap, Users, ChevronRight } from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import { createClass } from "@/app/actions/classes";

const CLASS_LEVELS = ["JS1","JS2","JS3","SS1","SS2","SS3"] as const;
const TERMS = ["FIRST","SECOND","THIRD"] as const;
const CURRENT_SESSION = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

export default async function ClassesPage() {
  const { schoolId } = await requireSchool();

  const classes = await db.class.findMany({
    where: { schoolId },
    include: { _count: { select: { students: true } } },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });

  const juniorClasses = classes.filter((c) =>
    ["JS1","JS2","JS3"].includes(c.level)
  );
  const seniorClasses = classes.filter((c) =>
    ["SS1","SS2","SS3"].includes(c.level)
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Classes</h1>
          <p className="text-text-2 text-sm mt-0.5">
            {classes.length} class{classes.length !== 1 ? "es" : ""} ·{" "}
            {classes.reduce((s, c) => s + c._count.students, 0)} students total
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Create form */}
        <div className="bg-surface rounded-xl border border-border p-5">
          <h3 className="font-semibold text-text mb-4">Add New Class</h3>
          <form action={createClass} className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1">
                Class Name
              </label>
              <input
                name="name"
                required
                placeholder="e.g. SS2A"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1">
                Level
              </label>
              <select
                name="level"
                required
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
              >
                <option value="">Select level...</option>
                {CLASS_LEVELS.map((l) => (
                  <option key={l} value={l}>{l}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-text-2 mb-1">
                Term
              </label>
              <select
                name="term"
                defaultValue="FIRST"
                className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
              >
                {TERMS.map((t) => (
                  <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()} Term</option>
                ))}
              </select>
            </div>
            <input type="hidden" name="session" value={CURRENT_SESSION} />
            <button
              type="submit"
              className="w-full bg-primary text-white py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
            >
              Create Class
            </button>
          </form>
        </div>

        {/* Class lists */}
        <div className="lg:col-span-2 space-y-4">
          {classes.length === 0 ? (
            <div className="bg-surface rounded-xl border border-border p-12 text-center">
              <GraduationCap size={36} className="text-muted mx-auto mb-3" />
              <p className="font-medium text-text">No classes yet</p>
              <p className="text-sm text-text-2 mt-1">
                Use the form to add your first class.
              </p>
            </div>
          ) : (
            <>
              {juniorClasses.length > 0 && (
                <ClassSection title="Junior Secondary" classes={juniorClasses} />
              )}
              {seniorClasses.length > 0 && (
                <ClassSection title="Senior Secondary" classes={seniorClasses} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ClassSection({
  title,
  classes,
}: {
  title: string;
  classes: Array<{
    id: string;
    name: string;
    level: string;
    term: string;
    session: string;
    _count: { students: number };
  }>;
}) {
  return (
    <div className="bg-surface rounded-xl border border-border overflow-hidden">
      <div className="px-4 py-3 border-b border-border bg-bg">
        <h3 className="text-sm font-semibold text-text-2 uppercase tracking-wide">
          {title}
        </h3>
      </div>
      <div className="divide-y divide-border">
        {classes.map((cls) => (
          <Link
            key={cls.id}
            href={`/classes/${cls.id}`}
            className="flex items-center justify-between px-4 py-3 hover:bg-bg transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="bg-primary-50 p-1.5 rounded-lg">
                <GraduationCap size={16} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-semibold text-text">{cls.name}</p>
                <p className="text-xs text-muted">
                  {cls.term.charAt(0) + cls.term.slice(1).toLowerCase()} Term · {cls.session}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1.5 text-text-2">
                <Users size={14} />
                <span className="text-sm">{cls._count.students}</span>
              </div>
              <ChevronRight size={16} className="text-muted" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
