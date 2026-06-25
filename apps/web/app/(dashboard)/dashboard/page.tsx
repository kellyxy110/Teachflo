import { redirect } from "next/navigation";
import { safeCurrentUser } from "@/lib/auth";
import { OnboardingWizard } from "@/components/beta/OnboardingWizard";
import { ProfileCompletionCard } from "@/components/dashboard/ProfileCompletionCard";
import {
  GraduationCap, Users, BookOpen, PenSquare,
  TrendingUp, AlertTriangle, FileText, ArrowRight,
  Sparkles, Brain, Code2, Upload,
} from "lucide-react";
import Link from "next/link";
import { db } from "@/lib/db";
import { getCurrentTeacher } from "@/lib/auth";
import { withCache } from "@/lib/cache";

function StatCard({
  icon: Icon, label, value, sub, href,
  color = "text-primary", bg = "bg-primary-50",
}: {
  icon: React.ElementType; label: string; value: string | number;
  sub?: string; href: string; color?: string; bg?: string;
}) {
  return (
    <Link href={href} className="bg-surface rounded-xl border border-border p-4 md:p-5 hover:border-primary/40 hover:shadow-md transition-all group cursor-pointer active:scale-[0.98]">
      <div className="flex items-start justify-between">
        <div className="min-w-0">
          <p className="text-xs md:text-sm text-text-2 font-medium truncate">{label}</p>
          <p className="text-2xl md:text-3xl font-bold text-text mt-1">{value}</p>
          {sub && <p className="text-[11px] md:text-xs text-muted mt-1 truncate">{sub}</p>}
        </div>
        <div className={`${bg} p-2 md:p-2.5 rounded-lg group-hover:scale-110 transition-transform shrink-0`}>
          <Icon size={18} className={color} />
        </div>
      </div>
    </Link>
  );
}

function QuickAction({
  icon: Icon, label, href, color, bg,
}: {
  icon: React.ElementType; label: string; href: string; color: string; bg: string;
}) {
  return (
    <Link
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-xl bg-surface border border-border hover:border-primary/30 hover:shadow-md transition-all active:scale-[0.97] group"
    >
      <div className={`${bg} p-3 rounded-xl group-hover:scale-110 transition-transform`}>
        <Icon size={22} className={color} />
      </div>
      <span className="text-xs font-semibold text-text text-center leading-tight">{label}</span>
    </Link>
  );
}

export default async function DashboardPage() {
  const user = await safeCurrentUser();
  const teacher = await getCurrentTeacher();

  if (!teacher) redirect("/onboarding");

  const cacheKey = `dashboard-stats:${teacher.schoolId}`;

  const [stats, recentLessons, recentExams] = await Promise.all([
    withCache<{ classCount: number; studentCount: number; lessonCount: number; homeworkCount: number }>(
      cacheKey,
      60,
      async () => {
        const [classCount, studentCount, lessonCount, homeworkCount] = await Promise.all([
          db.class.count({ where: { schoolId: teacher.schoolId } }),
          db.student.count({ where: { schoolId: teacher.schoolId, isActive: true } }),
          db.lesson.count({ where: { schoolId: teacher.schoolId } }),
          db.homework.count({ where: { schoolId: teacher.schoolId, status: "ACTIVE" } }),
        ]);
        return { classCount, studentCount, lessonCount, homeworkCount };
      },
    ),
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

  const { classCount, studentCount, lessonCount, homeworkCount } = stats;

  const firstName = teacher.firstName ?? user?.firstName ?? "Teacher";
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="space-y-5 md:space-y-6 max-w-5xl">
      <OnboardingWizard />

      {/* Greeting */}
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl md:text-2xl font-bold text-text truncate">
            {greeting}, {firstName}
          </h1>
          <p className="text-text-2 text-xs md:text-sm mt-0.5 truncate">{teacher.school.name}</p>
        </div>
        <Link
          href="/exams/new"
          className="hidden sm:flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors shrink-0"
        >
          <FileText size={16} />
          New Exam
        </Link>
      </div>

      {/* Profile completion nudge */}
      <ProfileCompletionCard
        firstName={teacher.firstName}
        qualification={teacher.qualification ?? null}
        trcnNumber={teacher.trcnNumber ?? null}
        trcnStatus={teacher.trcnStatus ?? null}
        yearsOfExp={teacher.yearsOfExp ?? null}
        bio={teacher.bio ?? null}
        subjects={teacher.subjects}
        photoUrl={teacher.photoUrl ?? null}
        phone={teacher.phone ?? null}
      />

      {/* Quick Actions — prominent on mobile */}
      <div>
        <h3 className="text-sm font-semibold text-text-2 mb-3">Quick Actions</h3>
        <div className="grid grid-cols-4 gap-2 md:gap-3">
          <QuickAction icon={BookOpen} label="Lesson Planner" href="/lessons/new" color="text-primary" bg="bg-primary-50" />
          <QuickAction icon={FileText} label="New Exam" href="/exams/new" color="text-waec" bg="bg-purple-50 dark:bg-purple-500/10" />
          <QuickAction icon={Sparkles} label="Study Buddy" href="/study-buddy" color="text-warning" bg="bg-warning-50" />
          <QuickAction icon={Code2} label="Code Lab" href="/code-lab" color="text-success" bg="bg-success-50" />
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-4">
        <StatCard icon={GraduationCap} label="Classes" value={classCount}
          href="/classes"
          sub={classCount === 0 ? "Add your first class" : `${classCount} active`}
          color="text-primary" bg="bg-primary-50" />
        <StatCard icon={Users} label="Students" value={studentCount}
          href="/students"
          sub={studentCount === 0 ? "No students yet" : `across ${classCount} classes`}
          color="text-success" bg="bg-success-50" />
        <StatCard icon={BookOpen} label="Lessons" value={lessonCount}
          href="/lessons"
          sub="This term" color="text-warning" bg="bg-warning-50" />
        <StatCard icon={PenSquare} label="Homework" value={homeworkCount}
          href="/homework"
          sub={homeworkCount === 0 ? "All clear" : "assignments open"}
          color="text-danger" bg="bg-danger-50" />
      </div>

      {/* Recent Activity + Performance — stacked on mobile, side by side on desktop */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="bg-surface rounded-xl border border-border p-4 md:p-5">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="font-semibold text-text text-sm md:text-base">Recent Lessons</h3>
            <Link href="/lessons"
              className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          {recentLessons.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 md:py-8 text-center">
              <BookOpen size={32} className="text-border mb-2" />
              <p className="text-sm text-muted">No lessons yet</p>
              <Link href="/lessons/new" className="text-xs text-primary mt-1 hover:underline">
                Generate your first lesson plan
              </Link>
            </div>
          ) : (
            <div className="space-y-1">
              {recentLessons.map((l) => (
                <Link key={l.id} href={`/lessons/${l.id}`} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 hover:bg-bg/50 rounded-lg px-2 -mx-2 transition-colors active:bg-bg/80">
                  <div className="min-w-0 flex-1 mr-2">
                    <p className="text-sm font-medium text-text truncate">{l.topic}</p>
                    <p className="text-xs text-muted">{l.subject} · {l.classLevel}</p>
                  </div>
                  <ArrowRight size={14} className="text-muted shrink-0" />
                </Link>
              ))}
            </div>
          )}
        </div>

        <div className="bg-surface rounded-xl border border-border p-4 md:p-5">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="font-semibold text-text text-sm md:text-base">Performance</h3>
            <Link href="/analytics"
              className="text-xs text-primary hover:underline flex items-center gap-1">
              Full analytics <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-2 md:space-y-3">
            <Link href="/scores" className="flex items-center gap-3 p-3 bg-bg rounded-lg hover:bg-bg/80 transition-colors active:bg-bg/60">
              <div className="bg-success-50 p-2 rounded-lg shrink-0">
                <TrendingUp size={16} className="text-success" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">School Average</p>
                <p className="text-xs text-muted truncate">
                  {studentCount > 0 ? "Enter scores to see performance" : "Add students to get started"}
                </p>
              </div>
            </Link>
            <Link href="/analytics" className="flex items-center gap-3 p-3 bg-bg rounded-lg hover:bg-bg/80 transition-colors active:bg-bg/60">
              <div className="bg-warning-50 p-2 rounded-lg shrink-0">
                <AlertTriangle size={16} className="text-warning" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-text">At-Risk Students</p>
                <p className="text-xs text-muted truncate">No at-risk students identified yet</p>
              </div>
            </Link>
          </div>
        </div>
      </div>

      {/* Recent Exams */}
      {recentExams.length > 0 && (
        <div className="bg-surface rounded-xl border border-border p-4 md:p-5">
          <div className="flex items-center justify-between mb-3 md:mb-4">
            <h3 className="font-semibold text-text text-sm md:text-base">Recent Exams</h3>
            <Link href="/exams"
              className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowRight size={12} />
            </Link>
          </div>
          <div className="space-y-1">
            {recentExams.map((exam) => (
              <Link key={exam.id} href={`/exams/${exam.id}`} className="flex items-center justify-between py-2.5 border-b border-border last:border-0 hover:bg-bg/50 rounded-lg px-2 -mx-2 transition-colors active:bg-bg/80">
                <div className="min-w-0 flex-1 mr-2">
                  <p className="text-sm font-medium text-text truncate">{exam.title}</p>
                  <p className="text-xs text-muted">
                    {exam.subject} · {exam.classLevel} · {exam._count.questions}q
                  </p>
                </div>
                <span className={`text-[10px] md:text-xs px-2 py-0.5 rounded font-medium shrink-0
                  ${exam.examType === "WAEC_MOCK" ? "bg-purple-100 text-purple-700 dark:bg-purple-500/15 dark:text-purple-400" :
                    exam.examType === "JAMB_PREP" ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-500/15 dark:text-cyan-400" :
                    exam.examType === "JUPEB_PREP" ? "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400" :
                    "bg-gray-100 text-gray-600 dark:bg-gray-500/15 dark:text-gray-400"}`}>
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
