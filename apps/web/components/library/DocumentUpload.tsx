"use client";

import { useState, useRef, useCallback } from "react";
import { Upload, FileText, X, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";

const CLASS_LEVELS = ["JS1", "JS2", "JS3", "SS1", "SS2", "SS3"];

type UploadState = "idle" | "uploading" | "success" | "error";

export function DocumentUpload({ subjects }: { subjects: string[] }) {
  const [state, setState] = useState<UploadState>("idle");
  const [dragOver, setDragOver] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [result, setResult] = useState<{ pages: number; chunks: number } | null>(null);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleFile = useCallback((f: File) => {
    if (f.type !== "application/pdf") {
      setError("Only PDF files are supported");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("File must be under 10MB");
      return;
    }
    setFile(f);
    setError("");
    if (!title) {
      setTitle(f.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " "));
    }
  }, [title]);

  async function handleUpload() {
    if (!file || !title.trim() || !subject.trim()) return;

    setState("uploading");
    setError("");

    const formData = new FormData();
    formData.append("file", file);
    formData.append("title", title.trim());
    formData.append("subject", subject.trim());
    if (classLevel) formData.append("classLevel", classLevel);

    try {
      const res = await fetch("/api/documents/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setState("error");
        setError(data.error || "Upload failed");
        return;
      }

      setState("success");
      setResult({ pages: data.pages, chunks: data.chunks });
      router.refresh();
    } catch {
      setState("error");
      setError("Network error — please try again");
    }
  }

  function reset() {
    setFile(null);
    setTitle("");
    setSubject("");
    setClassLevel("");
    setState("idle");
    setResult(null);
    setError("");
  }

  if (state === "success" && result) {
    return (
      <div className="bg-success-50 border border-success/20 rounded-xl p-6 text-center">
        <CheckCircle size={32} className="text-success mx-auto mb-2" />
        <h3 className="font-semibold text-text mb-1">Document processed</h3>
        <p className="text-sm text-text-2">
          {result.pages} pages extracted into {result.chunks} searchable chunks.
          This document is now available for RAG retrieval in Study Buddy.
        </p>
        <button
          onClick={reset}
          className="mt-4 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-600 transition-colors"
        >
          Upload another
        </button>
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 space-y-4">
      <h3 className="text-sm font-semibold text-text flex items-center gap-2">
        <Upload size={15} className="text-primary" />
        Upload PDF for RAG
      </h3>

      {/* Drop zone */}
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
            dragOver
              ? "border-primary bg-primary-50"
              : "border-border hover:border-primary/40 hover:bg-bg"
          }`}
        >
          <FileText size={28} className="mx-auto text-muted mb-2" />
          <p className="text-sm text-text-2">
            Drop a PDF here or <span className="text-primary font-medium">click to browse</span>
          </p>
          <p className="text-xs text-muted mt-1">PDF only, max 10MB</p>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />
        </div>
      ) : (
        <div className="flex items-center gap-3 bg-bg rounded-lg px-3 py-2">
          <FileText size={18} className="text-primary shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-text truncate">{file.name}</p>
            <p className="text-xs text-muted">{(file.size / 1024).toFixed(0)} KB</p>
          </div>
          <button
            onClick={() => { setFile(null); setTitle(""); }}
            className="p-1 text-muted hover:text-danger transition-colors"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Metadata fields */}
      {file && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="sm:col-span-3">
            <label className="block text-xs font-medium text-text-2 mb-1">Title</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Biology SS2 Textbook Chapter 5"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-bg"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="e.g. Biology"
              list="subject-list"
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-bg"
            />
            <datalist id="subject-list">
              {subjects.map((s) => <option key={s} value={s} />)}
            </datalist>
          </div>
          <div>
            <label className="block text-xs font-medium text-text-2 mb-1">Class Level</label>
            <select
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary bg-bg"
            >
              <option value="">Any level</option>
              {CLASS_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleUpload}
              disabled={state === "uploading" || !title.trim() || !subject.trim()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-primary text-white text-sm font-medium rounded-lg hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {state === "uploading" ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload size={14} />
                  Upload & Process
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-danger bg-danger-50 rounded-lg px-3 py-2">
          <AlertCircle size={14} />
          {error}
        </div>
      )}

      {state === "uploading" && (
        <div className="text-xs text-muted text-center">
          Extracting text, chunking, and generating embeddings — this may take a moment for large documents.
        </div>
      )}
    </div>
  );
}
