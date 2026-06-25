import { getTeacherExams } from "@/app/actions/questions";
import { ExcelImportClient } from "./ExcelImportClient";
import { Upload } from "lucide-react";

export default async function ExamImportPage() {
  const exams = await getTeacherExams();

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <div className="flex items-center gap-2">
        <Upload size={20} className="text-primary" />
        <div>
          <h1 className="text-lg md:text-xl font-bold text-text">Import Questions from Excel</h1>
          <p className="text-xs text-muted">Upload an .xlsx file to bulk-add questions to an exam</p>
        </div>
      </div>
      <ExcelImportClient
        exams={exams.map((e) => ({
          id: e.id,
          title: e.title,
          questionCount: e._count.questions,
        }))}
      />
    </div>
  );
}
