import Link from "next/link";
import { Plus, Sparkles, Upload, ClipboardList } from "lucide-react";
import { getQuestionBankWorkspace } from "@/app/actions/question-bank";
import { PageHeader } from "@/components/ui/PageHeader";
import { buttonStyles } from "@/components/ui/Button";
import { QuestionBankWorkspace } from "./QuestionBankWorkspace";

/**
 * Canonical reusable-question workspace. Data access and assessment mutation
 * remain server-authoritative through the F6C bridge.
 */
export default async function QuestionBankPage({
  searchParams,
}: {
  searchParams: Promise<{ assessmentId?: string }>;
}) {
  const { assessmentId } = await searchParams;
  const workspace = await getQuestionBankWorkspace(assessmentId);
  return (
    <div className="space-y-6">
      <PageHeader
        title="Question Bank"
        breadcrumb={[{ label: "Teaching" }, { label: "Question Bank" }]}
        description="Create, organise and reuse questions across quizzes, tests, examinations and learning activities."
        primaryAction={<Link href="/exams/questions/new" className={buttonStyles()}><Plus size={16} /> Create Question</Link>}
        secondaryActions={<div className="flex flex-wrap gap-2"><Link href="/exams/generate-ai" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:border-primary/40"><Sparkles size={15} /> Generate with AI</Link><Link href="/question-bank/import" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:border-primary/40"><Upload size={15} /> Import to Question Bank</Link><Link href="/exams/import" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:border-primary/40"><ClipboardList size={15} /> Legacy Exam Import</Link><Link href="/exams/new" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-semibold text-text hover:border-primary/40"><ClipboardList size={15} /> Build Assessment</Link></div>}
      />
      <QuestionBankWorkspace {...workspace} />
    </div>
  );
}
