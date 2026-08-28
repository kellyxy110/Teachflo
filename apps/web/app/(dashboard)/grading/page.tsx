import Link from "next/link";
import { ClipboardCheck } from "lucide-react";
import { requireSchool } from "@/lib/auth";
import { listGradingQueue } from "@/lib/services/assessments/grading";
import { EmptyState } from "@/components/ui/States";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusBadge } from "@/components/ui/Status";

export default async function GradingPage() {
  const { teacher, schoolId } = await requireSchool();
  const queue = await listGradingQueue({ id: teacher.id, schoolId });
  return <div className="mx-auto max-w-6xl space-y-6"><PageHeader breadcrumb={[{ label: "Teaching" }, { label: "Grading" }]} title="Grading" description="Review submitted assessments, award marks, and release results when ready." />{queue.length === 0 ? <EmptyState icon={<ClipboardCheck size={36} />} title="No attempts need review" description="Submitted student attempts will appear here when grading is required." /> : <div className="overflow-hidden rounded-xl border border-border bg-surface"><ul className="divide-y divide-border">{queue.map((entry) => <li key={entry.id}><Link href={`/grading/${entry.id}`} className="flex flex-wrap items-center justify-between gap-3 p-4 hover:bg-bg"><div><p className="font-semibold text-text">{entry.title}</p><p className="mt-1 text-sm text-text-2">{entry.student} · Submitted {entry.submittedAt?.toLocaleString() ?? "—"}</p></div><div className="flex items-center gap-2"><StatusBadge tone={entry.status === "GRADED" ? "success" : "warning"}>{entry.status.replaceAll("_", " ")}</StatusBadge><span className="text-sm text-text-2">{entry.pending} pending</span></div></Link></li>)}</ul></div>}</div>;
}
