import { ExamGeneratorClient } from "./ExamGeneratorClient";
import { PageHeader } from "@/components/ui/PageHeader";

export default function NewExamPage() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        breadcrumb={[
          { label: "Teaching" },
          { label: "Assessments", href: "/exams" },
          { label: "Create" },
        ]}
        title="Create Assessment"
        description="Configure an assessment, generate a structured draft, review every question, then save it to TeachNexis. AI output remains a teacher-reviewed draft until you save it."
      />
      <ExamGeneratorClient />
    </div>
  );
}
