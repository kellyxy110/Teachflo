import { getTeacherExams } from "@/app/actions/questions";
import { QuestionBuilderClient } from "./QuestionBuilderClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatusMessage } from "@/components/ui/Status";
import { getPrivateSourceSelection } from "@/app/actions/documents";
import { SourceBackedQuestionForm } from "./SourceBackedQuestionForm";

export default async function NewQuestionPage({ searchParams }: { searchParams: Promise<{ sourceDocumentId?: string; sourceChunkId?: string }> }) {
  const exams = await getTeacherExams();
  const params = await searchParams;
  const source = params.sourceDocumentId && params.sourceChunkId ? await getPrivateSourceSelection(params.sourceDocumentId, params.sourceChunkId) : null;

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
      {source && <SourceBackedQuestionForm source={{ documentId: source.document.id, chunkId: source.chunk.id, excerpt: source.sourceReference.exactExcerpt, location: source.sourceReference.sourceLocation?.page ? `Page ${source.sourceReference.sourceLocation.page}` : source.sourceReference.sourceLocation?.paragraph ? `Paragraph ${source.sourceReference.sourceLocation.paragraph}` : source.sourceReference.sourceLocation?.lineStart ? `Lines ${source.sourceReference.sourceLocation.lineStart}–${source.sourceReference.sourceLocation.lineEnd ?? source.sourceReference.sourceLocation.lineStart}` : "Location unavailable", subject: source.document.subject, topic: source.document.title, classLevel: source.document.classLevel ?? "SS1" }} />}
      <QuestionBuilderClient exams={exams} />
    </div>
  );
}
