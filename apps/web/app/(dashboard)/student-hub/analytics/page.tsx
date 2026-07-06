import { BarChart2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { requireSchool } from "@/lib/auth";
import { db } from "@/lib/db";
import { AnalyticsClient } from "./AnalyticsClient";

export const metadata = { title: "Analytics — Student Data Hub" };

export default async function AnalyticsPage() {
  const { schoolId } = await requireSchool();

  const classes = await db.class.findMany({
    where: { schoolId },
    orderBy: [{ level: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      level: true,
      term: true,
      session: true,
      _count: { select: { students: true, scores: true } },
    },
  });

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/student-hub"
          className="p-1.5 rounded-lg hover:bg-surface text-text-2 hover:text-text transition-colors">
          <ArrowLeft size={18} />
        </Link>
        <div>
          <div className="flex items-center gap-2 mb-0.5">
            <BarChart2 size={18} className="text-primary" />
            <h1 className="text-xl font-bold text-text">Class Analytics</h1>
          </div>
          <p className="text-sm text-text-2">
            Pure mathematical analysis — averages, positions, grade distributions.
          </p>
        </div>
      </div>

      <AnalyticsClient
        classes={classes.map((c) => ({
          id: c.id,
          name: c.name,
          level: c.level,
          term: c.term,
          session: c.session,
          studentCount: c._count.students,
          scoreCount: c._count.scores,
        }))}
      />
    </div>
  );
}
