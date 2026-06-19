"use client";

import { Search, ChevronDown } from "lucide-react";
import { useState, useRef, useEffect } from "react";

interface Student {
  id: string;
  firstName: string;
  lastName: string;
  regNumber: string | null;
  class: { name: string; level: string };
}

interface Props {
  students: Student[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function StudentSelector({ students, selectedId, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const selected = students.find((s) => s.id === selectedId);
  const filtered = students.filter((s) => {
    const q = search.toLowerCase();
    return (
      s.firstName.toLowerCase().includes(q) ||
      s.lastName.toLowerCase().includes(q) ||
      (s.regNumber && s.regNumber.toLowerCase().includes(q)) ||
      s.class.name.toLowerCase().includes(q)
    );
  });

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm hover:border-primary/40 transition-colors"
      >
        <span className={selected ? "text-text" : "text-muted"}>
          {selected
            ? `${selected.firstName} ${selected.lastName} (${selected.class.name})`
            : "Select student..."}
        </span>
        <ChevronDown size={14} className="text-muted" />
      </button>

      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-surface border border-border rounded-lg shadow-lg z-50 max-h-64 overflow-hidden">
          <div className="p-2 border-b border-border">
            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search students..."
                className="w-full pl-8 pr-3 py-1.5 text-xs rounded-md border border-border bg-bg focus:outline-none focus:border-primary"
                autoFocus
              />
            </div>
          </div>
          <div className="overflow-y-auto max-h-48">
            {filtered.length === 0 ? (
              <p className="text-xs text-muted text-center py-4">No students found</p>
            ) : (
              filtered.map((s) => (
                <button
                  key={s.id}
                  onClick={() => {
                    onSelect(s.id);
                    setOpen(false);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 text-xs hover:bg-bg transition-colors flex justify-between items-center ${
                    s.id === selectedId ? "bg-primary-50 text-primary" : "text-text"
                  }`}
                >
                  <span className="font-medium">{s.firstName} {s.lastName}</span>
                  <span className="text-muted">{s.class.name}</span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
