import { getStudentsForTeacher } from "@/app/actions/study-buddy";
import { ExamV2Creator } from "./ExamV2Creator";

export default async function NewExamV2Page() {
  const students = await getStudentsForTeacher();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">AI Exam 2.0</h1>
        <p className="text-sm text-text-2 mt-0.5">
          Adaptive, curriculum-aware, student-aware assessment engine
        </p>
      </div>
      <ExamV2Creator students={students} />
    </div>
  );
}
