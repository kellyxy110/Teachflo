import { redirect } from "next/navigation";
import { safeCurrentUser } from "@/lib/auth";
import {
  GraduationCap, Users, BookOpen, PenSquare,
  TrendingUp, AlertTriangle, FileText, ArrowRight,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentTeacher } from "@/lib/auth";

function StatCard({
  icon: Icon, label, value, sub, href,
  color = "text-primary", bg = "bg-primary-50",
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; href: string; color?: string; bg?: string;
}) {
  return (
    <Link href={href} className="bg-surface rounded-xl border border-border p-5 hover:border-primary/40 hover:shadow-md transition-all group cursor-pointer">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-text-2 font-medium">{label}</p>
          <p className="text-3xl font-bold text-text mt-1">{value}</p>
          {sub && <p className="text-xs text-muted mt-1">{sub}</p>}
        </div>
        <div className={`${bg} p-2.5 rounded-lg group-hover:scale-110 transition-transform`}>
          <Icon size={20} className={color} />
        </div>
      </div>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await safeCurrentUser();
  const teacher = await getCurrentTeacher();

  if (!teacher) redirect("/onboarding");

  const [classCount, studentCount, lessonCount, homeworkCount, recentLessons, recentExams] =
    await Promise.all([
      db.class.count({ where: { schoolId: teacher.schoolId } }),
      db.student.count({ where: { schoolId: teacher.schoolId, isActive: true } }),
      db.lesson.count({ where: { schoolId: teacher.schoolId } }),
      db.homework.count({ where: { schoolId: teacher.schoolId, status: "ACTIVE" } }),
      db.lesson.findMany({
        where: { schoolId: teacher.schoolId },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      db.exam.findMany({
        where: { schoolId: teacher.schoolId },
        orderBy: { createdAt: "desc" },
        take: 3,
        include: { _count: { select: { questions: true } } },
      }),
    ]);

  const firstName = teacher.firstName ?? user?.firstName ?? "Teacher";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">
            {greeting}, {firstName}
          </h1>
          <p className="text-text-2 text-sm mt-0.5">{teacher.school.name}</p>
        </div>
        <Link
          href="/exams/new"
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors"
        >
          <FileText size={16} />
          New Exam
        </Link>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={GraduationCap} label="Total Classes" value={classCount}
          href="/classes"
          sub={classCount === 0 ? "Add your first class" : `${classCount} active`}
          color="text-primary" bg="bg-primary-50" />
        <StatCard icon={Users} label="Total Students" value={studentCount}
          href="/students"
          sub={studentCount === 0 ? "No students yet" : `across ${classCount} classes`}
          color="text-success" bg="bg-success-50" />
        <StatCard icon={BookOpen} label="Lessons Generated" value={lessonCount}
          href="/lessons"
          sub="This term" color="text-warning" bg="bg-warning-50" />
        <StatCard icon={PenSquare} label="Pending Homework" value={homeworkCount}
          href="/homework"
          sub={homeworkCount === 0 ? "All clear" : "assignments open"}
          color="text-danger" bg="bg-danger-50" />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text">Recent Lessons</h3>
            <Link href="/lessons"
              className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentLessons.length === 0 ? (
            <div className="flex items-center justify-center py-8 text-muted text-sm">
              No lessons yet. Generate your first lesson plan.
            </div>
          ) : (
            <div className="space-y-2">
              {recentLessons.map((l) => (
                <Link key={l.id} href={`/lessons/${l.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-bg/50 rounded-lg px-2 -mx-2 transition-colors">
                  <div>
                    <p className="text-sm font-medium text-text">{l.topic}</p>
                    <p className="text-xs text-muted">{l.subject} · {l.classLevel}</p>
                  </div>
                  <span className="text-xs text-primary">View →</span>
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text">Performance Snapshot</h3>
            <Link href="/analytics"
              className="text-xs text-primary hover:underline flex items-center gap-1">
              Full analytics <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-3">
            <Link href="/scores" className="flex items-center gap-3 p-3 bg-bg rounded-lg hover:bg-bg/80 transition-colors">
              <TrendingUp size={16} className="text-success shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">School Average</p>
                <p className="text-xs text-muted">
                  {studentCount > 0 ? "Enter scores to see performance" : "Add students to get started"}
                </p>
              </div>
            </Link>
            <Link href="/analytics" className="flex items-center gap-3 p-3 bg-bg rounded-lg hover:bg-bg/80 transition-colors">
              <AlertTriangle size={16} className="text-warning shrink-0" />
              <div>
                <p className="text-sm font-medium text-text">At-Risk Students</p>
                <p className="text-xs text-muted">No at-risk students identified yet</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {recentExams.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text">Recent Exams</h3>
            <Link href="/exams"
              className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2">
            {recentExams.map((exam) => (
              <Link key={exam.id} href={`/exams/${exam.id}`} className="flex items-center justify-between py-2 border-b border-border last:border-0 hover:bg-bg/50 rounded-lg px-2 -mx-2 transition-colors">
                <div>
                  <p className="text-sm font-medium text-text">{exam.title}</p>
                  <p className="text-xs text-muted">
                    {exam.subject} · {exam.classLevel} · {exam._count.questions} questions
                  </p>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded font-medium
                  ${exam.examType === "WAEC_MOCK" ? "bg-purple-100 text-purple-700" :
                    exam.examType === "JAMB_PREP" ? "bg-cyan-100 text-cyan-700" :
                    exam.examType === "JUPEB_PREP" ? "bg-amber-100 text-amber-700" :
                    "bg-gray-100 text-gray-600"}`}>
                  {exam.examType.replace("_", " ")}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
