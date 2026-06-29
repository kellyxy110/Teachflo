"use client";

import { useState, useCallback, useEffect, useMemo, useRef } from "react";
import { Search, Star, Clock, X } from "lucide-react";
import katex from "katex";
import { SYMBOL_CATEGORIES, type LatexSymbol } from "@/lib/latex-symbols";

const FAVORITES_KEY = "tf_latex_fav";
const RECENT_KEY = "tf_latex_recent";
const MAX_RECENT = 24;

const ALL_SYMBOLS: LatexSymbol[] = SYMBOL_CATEGORIES.flatMap((c) => c.symbols);
const SYMBOL_MAP = new Map<string, LatexSymbol>(ALL_SYMBOLS.map((s) => [s.latex, s]));

function renderLatex(latex: string): string {
  try {
    return katex.renderToString(latex, { displayMode: false, throwOnError: false });
  } catch {
    return `<span class="font-mono text-xs">${latex}</span>`;
  }
}

function readLS<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeLS(key: string, val: unknown) {
  try { localStorage.setItem(key, JSON.stringify(val)); } catch {}
}

interface Props {
  onInsert: (latex: string) => void;
  onClose: () => void;
}

export function LatexSymbolPalette({ onInsert, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("recent");
  const [favorites, setFavorites] = useState<string[]>(() => readLS(FAVORITES_KEY, []));
  const [recent, setRecent] = useState<string[]>(() => readLS(RECENT_KEY, []));
  const [hovered, setHovered] = useState<LatexSymbol | null>(null);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const handleInsert = useCallback((sym: LatexSymbol) => {
    onInsert(`$${sym.latex}$`);
    setRecent((prev) => {
      const next = [sym.latex, ...prev.filter((v) => v !== sym.latex)].slice(0, MAX_RECENT);
      writeLS(RECENT_KEY, next);
      return next;
    });
  }, [onInsert]);

  const toggleFavorite = useCallback((latex: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const next = prev.includes(latex)
        ? prev.filter((v) => v !== latex)
        : [latex, ...prev];
      writeLS(FAVORITES_KEY, next);
      return next;
    });
  }, []);

  const displayedSymbols = useMemo(() => {
    if (query.trim()) {
      const q = query.toLowerCase();
      return ALL_SYMBOLS.filter((s) =>
        s.description.toLowerCase().includes(q) ||
        s.latex.toLowerCase().includes(q) ||
        s.label.toLowerCase().includes(q),
      ).slice(0, 160);
    }
    if (activeCategory === "recent") {
      return recent.map((l) => SYMBOL_MAP.get(l)).filter(Boolean) as LatexSymbol[];
    }
    if (activeCategory === "favorites") {
      return favorites.map((l) => SYMBOL_MAP.get(l)).filter(Boolean) as LatexSymbol[];
    }
    const cat = SYMBOL_CATEGORIES.find((c) => c.id === activeCategory);
    return cat?.symbols ?? [];
  }, [query, activeCategory, recent, favorites]);

  const catTabs = [
    { id: "recent", name: "Recent", icon: <Clock size={11} /> },
    { id: "favorites", name: "Favorites", icon: <Star size={11} /> },
    ...SYMBOL_CATEGORIES.map((c) => ({ id: c.id, name: c.name, icon: null })),
  ];

  return (
    <div className="flex flex-col" style={{ height: 380 }}>
      {/* Header */}
      <div className="flex items-center gap-2 px-3 pt-3 pb-2 shrink-0">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
          <input
            ref={searchRef}
            type="text"
            placeholder={`Search ${ALL_SYMBOLS.length} symbols...`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-8 pr-7 py-1.5 text-xs bg-bg border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20 text-text placeholder:text-muted"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-text"
            >
              <X size={11} />
            </button>
          )}
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded hover:bg-bg text-muted hover:text-text transition-colors shrink-0"
          title="Close palette"
        >
          <X size={14} />
        </button>
      </div>

      {/* Category tabs */}
      {!query && (
        <div className="flex gap-1 overflow-x-auto px-3 pb-2 shrink-0 scrollbar-hide">
          {catTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveCategory(tab.id)}
              className={`flex items-center gap-1 whitespace-nowrap px-2 py-1 rounded text-[11px] font-medium transition-colors shrink-0 ${
                activeCategory === tab.id
                  ? "bg-primary text-white"
                  : "bg-bg text-text-2 hover:bg-border/30 border border-border"
              }`}
            >
              {tab.icon}
              {tab.name}
            </button>
          ))}
        </div>
      )}

      {/* Hover preview */}
      <div className="mx-3 mb-2 px-3 py-1.5 bg-bg border border-border rounded-lg flex items-center gap-3 min-h-[36px] shrink-0">
        {hovered ? (
          <>
            <div
              className="text-base text-text shrink-0"
              dangerouslySetInnerHTML={{ __html: renderLatex(hovered.latex) }}
            />
            <div className="min-w-0 flex-1 overflow-hidden">
              <p className="text-[10px] font-mono text-primary truncate">\{hovered.latex.replace(/^\\/,"")}</p>
              <p className="text-[9px] text-muted truncate">{hovered.description}</p>
            </div>
          </>
        ) : (
          <p className="text-[10px] text-muted">Hover a symbol to preview · Click to insert · ★ to save</p>
        )}
      </div>

      {/* Symbol grid */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 min-h-0">
        {query && (
          <p className="text-[10px] text-muted mb-2">
            {displayedSymbols.length} result{displayedSymbols.length !== 1 ? "s" : ""}
            {displayedSymbols.length === 160 ? " (showing first 160)" : ""}
          </p>
        )}
        {displayedSymbols.length === 0 ? (
          <div className="text-center py-8 text-xs text-muted">
            {query
              ? "No symbols match your search"
              : activeCategory === "recent"
              ? "No recently used symbols yet — click a symbol to use it"
              : "No favorites saved yet — hover a symbol and click ★"}
          </div>
        ) : (
          <div className="grid gap-1" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(36px, 1fr))" }}>
            {displayedSymbols.map((sym, idx) => {
              const isFav = favorites.includes(sym.latex);
              return (
                <div key={`${sym.latex}-${idx}`} className="relative group">
                  <button
                    onClick={() => handleInsert(sym)}
                    onMouseEnter={() => setHovered(sym)}
                    onMouseLeave={() => setHovered(null)}
                    title={`${sym.description}\n${sym.latex}`}
                    className="w-full h-9 flex items-center justify-center rounded border border-border hover:border-primary/50 hover:bg-primary/5 text-text text-sm transition-colors bg-surface font-mono overflow-hidden"
                  >
                    <span className="text-[13px] leading-none">{sym.label}</span>
                  </button>
                  <button
                    onClick={(e) => toggleFavorite(sym.latex, e)}
                    className={`absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full flex items-center justify-center transition-opacity z-10 ${
                      isFav
                        ? "opacity-100 bg-yellow-400"
                        : "opacity-0 group-hover:opacity-100 bg-border hover:bg-yellow-300"
                    }`}
                    title={isFav ? "Remove favorite" : "Add to favorites"}
                  >
                    <Star size={7} className="fill-white text-white" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
