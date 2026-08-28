import { BookOpen, FileText, Upload } from "lucide-react";
import { getLibraryResources } from "@/app/actions/library";
import { LibraryClient } from "./LibraryClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";

export default async function LibraryPage() {
  const { lessons, exams, documents, allSubjects } = await getLibraryResources();
  const total = lessons.length + exams.length + documents.length;

  return (
    <div className="space-y-6">
      <PageHeader title="Library" description={`${total} resource${total !== 1 ? "s" : ""} — lessons, assessments, and documents in one place.`} primaryAction={<div className="flex flex-wrap gap-2"><ButtonLink href="/lessons/new" variant="secondary" size="sm"><BookOpen size={14} aria-hidden="true" />New lesson</ButtonLink><ButtonLink href="/exams/new" size="sm"><FileText size={14} aria-hidden="true" />New assessment</ButtonLink></div>} />

      <LibraryClient
        lessons={lessons}
        exams={exams}
        documents={documents}
        subjects={allSubjects}
      />
    </div>
  );
}
