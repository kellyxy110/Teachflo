import Link from "next/link";
import { ArrowLeft, AlertCircle, CheckCircle, Clock, FileText, LockKeyhole, Loader2 } from "lucide-react";
import { notFound } from "next/navigation";
import { getPrivateBookshelfDocument } from "@/app/actions/documents";
import { PageHeader } from "@/components/ui/PageHeader";
import { readerFormat } from "@/lib/documents/source-reader";
import { SourceReaderClient } from "./SourceReaderClient";

function formatDate(date: Date) { return new Date(date).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" }); }
function statusLabel(status: string) { return status === "READY" ? "Ready to browse" : status === "FAILED" ? "Could not extract readable text" : "Preparing your source"; }

export default async function BookshelfDocumentPage({ params }: { params: Promise<{ documentId: string }> }) {
  const { documentId } = await params;
  const result = await getPrivateBookshelfDocument(documentId);
  if (!result) notFound();
  const { document, chunks } = result;
  const format = readerFormat(document.mimeType, document.fileName);
  const statusIcon = document.status === "READY" ? <CheckCircle size={15} aria-hidden="true" /> : document.status === "FAILED" ? <AlertCircle size={15} aria-hidden="true" /> : <Loader2 size={15} className="animate-spin" aria-hidden="true" />;

  return (
    <div className="space-y-5">
      <Link href="/library/bookshelf" className="inline-flex items-center gap-2 text-sm text-text-2 hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded"><ArrowLeft size={15} aria-hidden="true" />Back to My Bookshelf</Link>
      <PageHeader title={document.title} description={`${document.subject}${document.classLevel ? ` · ${document.classLevel}` : ""}`} />
      <section aria-label="Source metadata" className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-text-2 border-b border-border pb-4">
        <span className="inline-flex items-center gap-1.5"><FileText size={15} aria-hidden="true" />{format} · {document.fileName}</span>
        <span className="inline-flex items-center gap-1.5"><LockKeyhole size={14} aria-hidden="true" />Private</span>
        <span className="inline-flex items-center gap-1.5" aria-live="polite">{statusIcon}{statusLabel(document.status)}</span>
        {document.pageCount ? <span>{document.pageCount} pages</span> : null}
        <time dateTime={document.createdAt.toISOString()}>Uploaded {formatDate(document.createdAt)}</time>
      </section>
      {document.status === "PROCESSING" || document.status === "PENDING" ? <StatusPanel title="Preparing your source" body="Readable source content will appear here when processing is complete." /> : document.status === "FAILED" ? <StatusPanel title="Could not extract readable text" body={document.error?.includes("OCR") ? "This source appears to need OCR. OCR is not currently available, but your original source remains preserved." : `${document.error ?? "Processing failed."} Your original source remains preserved.`} danger /> : chunks.length === 0 ? <StatusPanel title="No readable source content" body="This source is marked ready, but no readable blocks are available." danger /> : <main aria-labelledby="reader-heading" className="max-w-4xl"><h2 id="reader-heading" className="text-base font-semibold text-text mb-3">Source content</h2><SourceReaderClient documentId={document.id} chunks={chunks} format={format} /></main>}
    </div>
  );
}

function StatusPanel({ title, body, danger = false }: { title: string; body: string; danger?: boolean }) {
  return <div role={danger ? "alert" : "status"} className={`border rounded-xl p-8 text-center ${danger ? "border-danger/20 bg-danger-50" : "border-border bg-surface"}`}><Clock size={24} className={`mx-auto mb-2 ${danger ? "text-danger" : "text-primary"}`} aria-hidden="true" /><h2 className="font-semibold text-text">{title}</h2><p className="text-sm text-text-2 mt-1 max-w-lg mx-auto">{body}</p></div>;
}
