import Link from "next/link";
import { requireTeacher } from "@/lib/auth";
import { PageHeader } from "@/components/ui/PageHeader";
import { QuestionImportWorkspace } from "./QuestionImportWorkspace";

export default async function QuestionBankImportPage() {
  await requireTeacher();
  return <div className="space-y-6"><PageHeader title="Import to Question Bank" breadcrumb={[{ label: "Teaching" }, { label: "Question Bank" }, { label: "Import" }]} description="Upload questions, review parsed candidates, then accept them into your reusable Question Bank." secondaryActions={<Link href="/question-bank" className="text-sm font-semibold text-text-2 hover:text-text">Back to Question Bank</Link>} /><QuestionImportWorkspace /></div>;
}
