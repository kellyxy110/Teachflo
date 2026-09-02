"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { AlertCircle, CheckCircle, Clock, FileText, LockKeyhole, Loader2, Search } from "lucide-react";
import { bookshelfFileType, filterBookshelfDocuments, type BookshelfDocumentRecord } from "@/lib/documents/bookshelf";

type BookshelfDocument = BookshelfDocumentRecord;
const formatType = bookshelfFileType;
const formatDate = (value: Date | string) => new Date(value).toLocaleDateString("en-NG", { day: "numeric", month: "short", year: "numeric" });

const statusInfo: Record<string, { label: string; className: string; Icon: typeof CheckCircle }> = {
  READY: { label: "Ready to browse", className: "text-success", Icon: CheckCircle },
  PROCESSING: { label: "Preparing your source", className: "text-primary", Icon: Loader2 },
  PENDING: { label: "Preparing your source", className: "text-warning", Icon: Clock },
  FAILED: { label: "Could not extract text", className: "text-danger", Icon: AlertCircle },
};

export function BookshelfClient({ documents }: { documents: BookshelfDocument[] }) {
  const [query, setQuery] = useState("");
  const [subject, setSubject] = useState("");
  const [level, setLevel] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const subjects = useMemo(() => [...new Set(documents.map((d) => d.subject))].sort(), [documents]);
  const levels = useMemo(() => [...new Set(documents.map((d) => d.classLevel).filter(Boolean))].sort() as string[], [documents]);
  const filtered = useMemo(() => {
    return filterBookshelfDocuments(documents, { query, subject, classLevel: level, fileType: type, status });
  }, [documents, query, subject, level, type, status]);

  return (
    <section aria-labelledby="sources-heading" className="space-y-4">
      <div className="flex items-end justify-between gap-3">
        <div><h2 id="sources-heading" className="text-lg font-semibold text-text">Private sources</h2><p className="text-sm text-text-2">Only you can see these documents.</p></div>
        <span className="text-sm text-muted" aria-live="polite">{filtered.length} source{filtered.length === 1 ? "" : "s"}</span>
      </div>
      {documents.length > 0 && <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2" aria-label="Filter sources">
        <label className="relative lg:col-span-2"><span className="sr-only">Search sources</span><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search sources" className="w-full pl-8 pr-3 py-2 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20" /></label>
        <Filter label="Subject" value={subject} onChange={setSubject} options={subjects} />
        <Filter label="Class level" value={level} onChange={setLevel} options={levels} />
        <Filter label="File type" value={type} onChange={setType} options={["PDF", "DOCX", "TXT"]} />
        <Filter label="Status" value={status} onChange={setStatus} options={["READY", "PROCESSING", "PENDING", "FAILED"]} />
      </div>}
      {documents.length === 0 ? <div className="border border-dashed border-border rounded-xl p-10 text-center"><LockKeyhole size={28} className="mx-auto mb-3 text-primary" aria-hidden="true" /><h3 className="font-semibold text-text">Your private sources will appear here</h3><p className="text-sm text-text-2 mt-1 max-w-md mx-auto">My Bookshelf is where your private teaching notes, books, and documents live.</p></div> : filtered.length === 0 ? <p className="py-8 text-center text-sm text-muted">No matching sources.</p> : <div className="border border-border rounded-xl overflow-hidden"><div className="hidden md:grid grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr] gap-4 px-4 py-2 bg-bg text-xs font-medium text-muted"><span>Source</span><span>Subject</span><span>Type</span><span>Status</span><span>Uploaded</span></div><ul className="divide-y divide-border">{filtered.map((doc) => <SourceRow key={doc.id} document={doc} />)}</ul></div>}
    </section>
  );
}

function Filter({ label, value, onChange, options }: { label: string; value: string; onChange: (value: string) => void; options: string[] }) {
  return <label className="text-xs text-text-2"><span className="sr-only">Filter by {label}</span><select aria-label={label} value={value} onChange={(e) => onChange(e.target.value)} className="w-full px-3 py-2 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20"><option value="">All {label.toLowerCase()}</option>{options.map((option) => <option key={option} value={option}>{option === "PROCESSING" || option === "PENDING" ? "Preparing" : option === "FAILED" ? "Failed" : option}</option>)}</select></label>;
}

function SourceRow({ document }: { document: BookshelfDocument }) {
  const info = statusInfo[document.status] ?? statusInfo.PENDING;
  const Icon = info.Icon;
  return <li className="px-4 py-3 hover:bg-bg/60"><div className="grid grid-cols-1 md:grid-cols-[minmax(0,2fr)_1fr_1fr_1fr_1fr] gap-2 md:gap-4 items-center"><div className="min-w-0 flex items-start gap-3"><FileText size={18} className="text-primary shrink-0 mt-0.5" aria-hidden="true" /><div className="min-w-0"><Link href={`/library/bookshelf/${document.id}`} className="font-medium text-text break-words hover:text-primary focus:outline-none focus-visible:ring-2 focus:ring-primary rounded">{document.title}</Link><p className="text-xs text-muted break-all">{document.fileName}</p><div className="flex flex-wrap gap-2 mt-1 text-xs text-muted"><span>{document.classLevel ?? "Any level"}</span>{document.pageCount ? <span>{document.pageCount} pages</span> : null}<span className="inline-flex items-center gap-1"><LockKeyhole size={11} aria-hidden="true" />Private</span></div></div></div><span className="text-sm text-text-2">{document.subject}</span><span className="text-sm text-text-2">{formatType(document.mimeType, document.fileName)}</span><span className={`inline-flex items-center gap-1 text-xs font-medium ${info.className}`} aria-label={info.label}><Icon size={13} className={document.status === "PROCESSING" ? "animate-spin" : ""} aria-hidden="true" />{info.label}</span><time className="text-sm text-muted" dateTime={new Date(document.createdAt).toISOString()}>{formatDate(document.createdAt)}</time></div>{document.status === "FAILED" && <p className="text-xs text-danger mt-2 ml-8">{document.error?.includes("OCR") ? "Readable text could not be extracted; OCR is not currently available." : document.error ?? "Processing failed. Your original source remains preserved."}</p>}</li>;
}
