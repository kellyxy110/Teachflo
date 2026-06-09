import { db } from "@/lib/db";
import { requireSchool } from "@/lib/auth";
import { ScoreTable } from "./ScoreTable";

const SUBJECTS = [
  "Mathematics","English Language","Physics","Chemistry","Biology",
  "Agricultural Science","Economics","Government","Literature in English",
  "Geography","History","Civic Education","Christian Religious Studies",
  "Islamic Studies","Further Mathematics","Technical Drawing",
  "Food and Nutrition","Computer Studies","French",
];

const TERMS = ["FIRST","SECOND","THIRD"] as const;
const CURRENT_SESSION = `${new Date().getFullYear()}/${new Date().getFullYear() + 1}`;

export default async function ScoresPage({
  searchParams,
}: {
  searchParams: Promise<{ classId?: string; subject?: string; term?: string }>;
}) {
  const params = await searchParams;
  const { schoolId } = await requireSchool();

  const classes = await db.class.findMany({
    where: { schoolId },
    orderBy: [{ level: "asc" }, { name: "asc" }],
  });

  const selectedClassId = params.classId ?? "";
  const selectedSubject = params.subject ?? "";
  const selectedTerm = (params.term as typeof TERMS[number]) ?? "FIRST";

  let students: Array<{
    id: string;
    firstName: string;
    lastName: string;
    scores: Array<{
      id: string;
      ca1: number | null;
      ca2: number | null;
      exam: number | null;
      total: number | null;
      grade: string | null;
    }>;
  }> = [];

  if (selectedClassId && selectedSubject) {
    students = await db.student.findMany({
      where: { classId: selectedClassId, schoolId, isActive: true },
      include: {
        scores: {
          where: {
            subject: selectedSubject,
            term: selectedTerm,
            session: CURRENT_SESSION,
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Scores</h1>
        <p className="text-text-2 text-sm mt-0.5">
          Enter CA1, CA2, and Exam scores. Totals and grades are calculated automatically.
        </p>
      </div>

      {/* Filter bar */}
      <form method="GET" className="flex flex-wrap gap-3 bg-surface rounded-xl border border-border p-4">
        <div className="flex-1 min-w-36">
          <label className="block text-xs font-medium text-text-2 mb-1">Class</label>
          <select
            name="classId"
            defaultValue={selectedClassId}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
          >
            <option value="">Select class...</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-44">
          <label className="block text-xs font-medium text-text-2 mb-1">Subject</label>
          <select
            name="subject"
            defaultValue={selectedSubject}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
          >
            <option value="">Select subject...</option>
            {SUBJECTS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 min-w-32">
          <label className="block text-xs font-medium text-text-2 mb-1">Term</label>
          <select
            name="term"
            defaultValue={selectedTerm}
            className="w-full px-3 py-2 border border-border rounded-lg text-sm text-text focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary bg-surface"
          >
            {TERMS.map((t) => (
              <option key={t} value={t}>{t.charAt(0) + t.slice(1).toLowerCase()} Term</option>
            ))}
          </select>
        </div>

        <div className="flex items-end">
          <button
            type="submit"
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
          >
            Load Scores
          </button>
        </div>
      </form>

      {/* Score table */}
      {selectedClassId && selectedSubject ? (
        <ScoreTable
          students={students}
          classId={selectedClassId}
          subject={selectedSubject}
          term={selectedTerm}
          session={CURRENT_SESSION}
        />
      ) : (
        <div className="bg-surface rounded-xl border border-border p-12 text-center">
          <p className="font-medium text-text">Select a class and subject above</p>
          <p className="text-sm text-text-2 mt-1">
            Then click &ldquo;Load Scores&rdquo; to view and enter scores.
          </p>
        </div>
      )}
    </div>
  );
}
