"use client";

import { useState, useRef } from "react";
import { Upload, FileText, X, Loader2, AlertCircle } from "lucide-react";

const CLASS_LEVELS = ["JS1", "JS2", "JS3", "SS1", "SS2", "SS3"];

interface UploadedDoc {
  id: string;
  title: string;
  subject: string;
  classLevel: string | null;
  fileName: string;
  fileSize: number;
  pageCount: number | null;
  chunkCount: number;
  createdAt: Date;
}

export function DocumentUploadInline({
  subjects,
  onUploaded,
}: {
  subjects: string[];
  onUploaded: (doc: UploadedDoc) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [subject, setSubject] = useState("");
  const [classLevel, setClassLevel] = useState("");
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  function handleFile(f: File) {
    if (f.type !== "application/pdf") {
      setError("PDF only");
      return;
    }
    if (f.size > 10 * 1024 * 1024) {
      setError("Max 10MB");
      return;
    }
    setFile(f);
    setError("");
    if (!title) setTitle(f.name.replace(/\.pdf$/i, "").replace(/[_-]/g, " "));
  }

  async function handleUpload() {
    if (!file || !title.trim() || !subject.trim()) return;
    setUploading(true);
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
        setError(data.error || "Upload failed");
        setUploading(false);
        return;
      }

      onUploaded({
        id: data.id,
        title: title.trim(),
        subject: subject.trim(),
        classLevel: classLevel || null,
        fileName: file.name,
        fileSize: file.size,
        pageCount: data.pages,
        chunkCount: data.chunks,
        createdAt: new Date(),
      });

      setFile(null);
      setTitle("");
      setSubject("");
      setClassLevel("");
    } catch {
      setError("Network error");
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      {!file ? (
        <div
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const f = e.dataTransfer.files[0];
            if (f) handleFile(f);
          }}
          className="border border-dashed border-border rounded-lg p-4 text-center cursor-pointer hover:border-primary/40 transition-colors"
        >
          <Upload size={16} className="mx-auto text-muted mb-1" />
          <p className="text-[10px] text-muted">Drop PDF or click</p>
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
        <>
          <div className="flex items-center gap-2 bg-bg rounded-lg px-2 py-1.5">
            <FileText size={12} className="text-primary shrink-0" />
            <p className="text-[10px] font-medium text-text truncate flex-1">{file.name}</p>
            <button onClick={() => { setFile(null); setTitle(""); }} className="text-muted hover:text-danger">
              <X size={10} />
            </button>
          </div>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Title"
            className="w-full px-2 py-1.5 border border-border rounded-lg text-[11px] focus:outline-none focus:border-primary bg-bg"
          />
          <div className="flex gap-1.5">
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              list="ks-subjects"
              className="flex-1 px-2 py-1.5 border border-border rounded-lg text-[11px] focus:outline-none focus:border-primary bg-bg"
            />
            <datalist id="ks-subjects">
              {subjects.map((s) => <option key={s} value={s} />)}
            </datalist>
            <select
              value={classLevel}
              onChange={(e) => setClassLevel(e.target.value)}
              className="px-2 py-1.5 border border-border rounded-lg text-[11px] focus:outline-none focus:border-primary bg-bg"
            >
              <option value="">Level</option>
              {CLASS_LEVELS.map((l) => <option key={l} value={l}>{l}</option>)}
            </select>
          </div>
          <button
            onClick={handleUpload}
            disabled={uploading || !title.trim() || !subject.trim()}
            className="w-full flex items-center justify-center gap-1.5 px-3 py-1.5 bg-primary text-white text-[11px] font-medium rounded-lg hover:bg-primary-600 disabled:opacity-40 transition-colors"
          >
            {uploading ? <Loader2 size={11} className="animate-spin" /> : <Upload size={11} />}
            {uploading ? "Processing..." : "Upload"}
          </button>
        </>
      )}
      {error && (
        <div className="flex items-center gap-1 text-[10px] text-danger">
          <AlertCircle size={10} /> {error}
        </div>
      )}
    </div>
  );
}
