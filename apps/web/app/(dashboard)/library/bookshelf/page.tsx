import { Upload } from "lucide-react";
import { getPrivateBookshelfDocuments } from "@/app/actions/documents";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";
import { DocumentUpload } from "@/components/library/DocumentUpload";
import { BookshelfClient } from "./BookshelfClient";

export default async function BookshelfPage() {
  const documents = await getPrivateBookshelfDocuments();
  const subjects = [...new Set(documents.map((document) => document.subject))].sort();

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Bookshelf"
        description="Your private teaching sources, ready to keep and reuse. Uploading and browsing sources does not require AI."
        primaryAction={<ButtonLink href="#upload-source" size="sm"><Upload size={14} aria-hidden="true" />Upload source</ButtonLink>}
      />
      <section id="upload-source" aria-labelledby="upload-heading" className="space-y-2">
        <h2 id="upload-heading" className="sr-only">Upload a private source</h2>
        <p className="text-sm text-text-2">Your uploaded sources are private to you.</p>
        <DocumentUpload subjects={subjects} variant="bookshelf" />
      </section>
      <BookshelfClient documents={documents.map((document) => ({ ...document, createdAt: document.createdAt.toISOString() }))} />
    </div>
  );
}
