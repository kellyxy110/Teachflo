import { getTeacherExams } from "@/app/actions/questions";
import { QuestionBuilderClient } from "./QuestionBuilderClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusMessage } from "@/components/ui/Status";

export default async function NewQuestionPage() {
  const exams = await getTeacherExams();

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Teaching" },
          { label: "Assessments", href: "/exams" },
          { label: "Manual questions" },
        ]}
        title="Manual Question Builder"
        description="Create questions, mark the correct answer, review the student and teacher views, then save to an existing assessment or create a new one."
      />
      <StatusMessage tone="info" title="Existing assessment workflow">
        This editor retains the current exam-owned question contract. Use the Question Bank when you want to reuse an approved canonical question across assessments.
      </StatusMessage>
      <QuestionBuilderClient exams={exams} />
    </div>
  );
}
