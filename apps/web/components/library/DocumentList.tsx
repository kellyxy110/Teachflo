"use client";

import { useState } from "react";
import {
  FileText,
  Trash2,
  CheckCircle,
  Clock,
  Loader2,
  AlertCircle,
  Database,
} from "lucide-react";
import { deleteDocument } from "@/app/actions/documents";
import { useRouter } from "next/navigation";

interface Doc {
  id: string;
  title: string;
  subject: string;
  classLevel: string | null;
  fileName: string;
  fileSize: number;
  pageCount: number | null;
  status: string;
  chunkCount: number;
  error: string | null;
  createdAt: Date;
}

const STATUS_CONFIG: Record<string, { icon: React.ComponentType<{ size?: number; className?: string }>; color: string; label: string }> = {
  READY: { icon: CheckCircle, color: "text-success", label: "Ready" },
  PROCESSING: { icon: Loader2, color: "text-primary", label: "Processing" },
  PENDING: { icon: Clock, color: "text-warning", label: "Pending" },
  FAILED: { icon: AlertCircle, color: "text-danger", label: "Failed" },
};

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(date: Date): string {
  return new Date(date).toLocaleDateString("en-NG", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function DocumentList({ documents }: { documents: Doc[] }) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const router = useRouter();

  async function handleDelete(id: string) {
    if (!confirm("Delete this document and all its RAG chunks?")) return;
    setDeleting(id);
    try {
      await deleteDocument(id);
      router.refresh();
    } catch {
      alert("Failed to delete document");
    } finally {
      setDeleting(null);
    }
  }

  if (documents.length === 0) {
    return (
      <div className="text-center py-8 text-muted">
        <Database size={28} className="mx-auto mb-2 opacity-40" />
        <p className="text-sm">No documents uploaded yet</p>
        <p className="text-xs mt-0.5">Upload PDFs above to enable RAG-powered AI responses</p>
      </div>
    );
  }

  return (
    <div className="grid gap-2">
      {documents.map((doc) => {
        const statusCfg = STATUS_CONFIG[doc.status] || STATUS_CONFIG.PENDING;
        const StatusIcon = statusCfg.icon;

        return (
          <div
            key={doc.id}
            className="bg-surface border border-border rounded-xl p-4 flex items-start justify-between gap-4 hover:border-primary/20 transition-colors"
          >
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="p-1.5 rounded-lg bg-primary-50 shrink-0 mt-0.5">
                <FileText size={14} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  {doc.classLevel && (
                    <span className="text-xs font-medium px-2 py-0.5 bg-bg rounded-full text-text-2 border border-border">
                      {doc.classLevel}
                    </span>
                  )}
                  <span className="text-xs text-muted">{doc.subject}</span>
                  <span className={`flex items-center gap-1 text-xs font-medium ${statusCfg.color}`}>
                    <StatusIcon size={11} className={doc.status === "PROCESSING" ? "animate-spin" : ""} />
                    {statusCfg.label}
                  </span>
                </div>
                <p className="text-sm font-semibold text-text truncate">{doc.title}</p>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted">
                  <span>{formatSize(doc.fileSize)}</span>
                  {doc.pageCount && <span>{doc.pageCount} pages</span>}
                  {doc.chunkCount > 0 && <span>{doc.chunkCount} chunks</span>}
                  <span>{formatDate(doc.createdAt)}</span>
                </div>
                {doc.error && (
                  <p className="text-xs text-danger mt-1">{doc.error}</p>
                )}
              </div>
            </div>
            <button
              onClick={() => handleDelete(doc.id)}
              disabled={deleting === doc.id}
              className="p-1.5 text-muted hover:text-danger transition-colors shrink-0"
              title="Delete document"
            >
              {deleting === doc.id ? (
                <Loader2 size={14} className="animate-spin" />
              ) : (
                <Trash2 size={14} />
              )}
            </button>
          </div>
        );
      })}
    </div>
  );
}
