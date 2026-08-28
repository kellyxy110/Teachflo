import Link from "next/link";
import { getStudentResultView } from "@/app/actions/grading";
import { StatusMessage } from "@/components/ui/Status";
import { MathText } from "@/components/ui/MathText";

export default async function StudentResultPage({ params }: { params: Promise<{ examId: string; attemptId: string }> }) {
  const { attemptId } = await params;
  const result = await getStudentResultView(attemptId);
  return <div className="mx-auto max-w-2xl space-y-5"><Link href="/s/exams" className="text-sm text-text-2 hover:text-text">← Back to assessments</Link><h1 className="text-2xl font-bold text-text">{result.title}</h1>{!result.released ? <StatusMessage tone="info" title="Results awaiting release">Your assessment has been submitted. Your teacher will release results when grading is complete.</StatusMessage> : <section className="rounded-xl border border-border bg-surface p-6"><p className="text-sm text-text-2">Result</p><p className="mt-2 text-4xl font-black text-text">{result.totalScore ?? 0} / {result.maxScore ?? 0}</p><p className="mt-1 text-sm text-text-2">{result.percentage?.toFixed(1) ?? "0.0"}%</p>{Array.isArray(result.responses) && <ul className="mt-5 divide-y divide-border">{result.responses.map((response) => <li key={response.id} className="py-3 text-sm text-text-2"><span>{response.score ?? 0} / {response.maxScore}</span>{response.feedback ? <span> · <MathText text={response.feedback} /></span> : null}</li>)}</ul>}</section>}</div>;
}
