"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Search, X } from "lucide-react";
import { searchPrivateBookshelfDocument } from "@/app/actions/documents";
import { readerChunks, selectionProvenance, type ReaderChunk, type ReaderFormat, type SourceSearchResult } from "@/lib/documents/source-reader";

export function SourceReaderClient({ documentId, chunks, format }: { documentId: string; chunks: ReaderChunk[]; format: ReaderFormat }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SourceSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searched, setSearched] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [selected, setSelected] = useState<ReaderChunk | null>(null);
  const router = useRouter();
  const refs = useRef<Record<string, HTMLElement | null>>({});
  const readable = readerChunks(chunks, format);

  async function runSearch(value = query) {
    setQuery(value);
    if (!value.trim()) { setResults([]); setSearched(false); setSearchError(""); return; }
    setSearching(true);
    setSearchError("");
    try {
      const response = await searchPrivateBookshelfDocument(documentId, value);
      setResults(response?.results ?? []);
      setSearched(true);
    } catch { setResults([]); setSearched(true); setSearchError("Search could not be completed. Please try again."); }
    finally { setSearching(false); }
  }

  function focusResult(result: SourceSearchResult) {
    const target = refs.current[result.id];
    target?.focus();
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  return <div className="space-y-4">
    {selected && <button type="button" onClick={() => router.push(`/exams/questions/new?sourceDocumentId=${encodeURIComponent(documentId)}&sourceChunkId=${encodeURIComponent(selected.id)}`)} className="rounded-lg border border-primary px-3 py-2 text-xs font-semibold text-primary focus:outline-none focus-visible:ring-2 focus:ring-primary">Create Question from selected source</button>}
    <div className="space-y-2" aria-label="Search this source">
      <label htmlFor="source-search" className="text-sm font-medium text-text">Search this source</label>
      <div className="flex gap-2"><input id="source-search" value={query} onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void runSearch(); }} placeholder="Search exact source text" className="min-w-0 flex-1 px-3 py-2 border border-border rounded-lg text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/20" /><button type="button" onClick={() => void runSearch()} disabled={searching || !query.trim()} className="px-4 py-2 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">{searching ? "Searching…" : "Search"}</button>{query && <button type="button" aria-label="Clear source search" onClick={() => void runSearch("")} className="p-2 rounded-lg border border-border text-muted hover:text-text focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"><X size={16} aria-hidden="true" /></button>}</div>
      <p className="text-xs text-muted" aria-live="polite">{searching ? "Searching your authorized source…" : searched ? `${results.length} result${results.length === 1 ? "" : "s"}` : "Search uses the preserved extracted text."}</p>
      {searchError && <p role="alert" className="text-xs text-danger">{searchError}</p>}
    </div>
    {searched && results.length > 0 && <ol className="space-y-2" aria-label="Search results">{results.map((result) => <li key={result.id}><button type="button" onClick={() => focusResult(result)} className="w-full text-left border border-border rounded-lg p-3 hover:border-primary/40 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"><span className="block text-xs font-semibold text-primary">{result.locationLabel}</span><span className="block text-sm text-text mt-1 whitespace-pre-wrap break-words">{result.excerpt}</span></button></li>)}</ol>}
    {searched && results.length === 0 && <p className="text-sm text-muted border border-dashed border-border rounded-lg p-4">No matching source passages.</p>}
    {selected && <aside aria-label="Selected source" className="border border-primary/30 bg-primary-50/40 rounded-lg p-3"><div className="flex items-center justify-between gap-2"><h3 className="text-sm font-semibold text-text">Selected source</h3><button type="button" aria-label="Clear selected source" onClick={() => setSelected(null)} className="p-1 rounded focus:outline-none focus-visible:ring-2 focus:ring-primary"><X size={15} aria-hidden="true" /></button></div><p className="text-xs text-primary mt-1">{readerChunks([selected], format)[0]?.locationLabel ?? "Location unavailable"}</p><p className="text-sm text-text mt-2 whitespace-pre-wrap break-words">{selectionProvenance(selected).exactExcerpt}</p><div className="flex flex-wrap items-center gap-3 mt-2"><p className="text-xs text-muted">Source preserved · temporarily selected</p><button type="button" onClick={() => router.push(`/lessons/new?mode=manual&sourceDocumentId=${encodeURIComponent(documentId)}&sourceChunkId=${encodeURIComponent(selected.id)}`)} className="rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-primary">Add to Lesson</button></div></aside>}
    <div className="space-y-3">{readable.map((chunk) => <article key={chunk.id} id={`source-block-${chunk.id}`} ref={(node) => { refs.current[chunk.id] = node; }} tabIndex={0} aria-label={`${chunk.locationLabel}, source block ${chunk.chunkIndex + 1}`} className={`border-l-2 pl-4 py-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-r ${selected?.id === chunk.id ? "border-primary bg-primary-50/30" : "border-primary/30"}`}><div className="flex items-center justify-between gap-2"><p className="text-xs font-semibold uppercase tracking-wide text-primary">{chunk.locationLabel}</p><button type="button" onClick={() => setSelected(chunk)} aria-pressed={selected?.id === chunk.id} className="text-xs text-text-2 underline underline-offset-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded">{selected?.id === chunk.id ? "Selected" : "Select block"}</button></div><pre className="whitespace-pre-wrap break-words font-sans text-[15px] leading-7 text-text mt-2">{chunk.content}</pre></article>)}</div>
  </div>;
}
