"use client";

import Link from "next/link";
import { BookOpen, ClipboardPaste, FileUp, Sparkles, CopyPlus } from "lucide-react";

const modes = [
  { title: "Write Manually", description: "Start with your own lesson structure and teaching notes.", icon: BookOpen, href: "?mode=manual", enabled: true },
  { title: "Paste Existing Note", description: "Bring in a note you already use and preserve its wording.", icon: ClipboardPaste, href: "?mode=paste", enabled: true },
  { title: "Import From Book/Document", description: "Use a source document with traceable excerpts.", icon: FileUp, href: undefined, enabled: false },
  { title: "Generate With AI", description: "Create a draft, then review and edit it before saving.", icon: Sparkles, href: "#ai-generator", enabled: true },
  { title: "Adapt Existing Lesson", description: "Create a new version from a saved lesson.", icon: CopyPlus, href: undefined, enabled: false },
];

export function LessonCreationModes() {
  return <section aria-labelledby="creation-modes" className="space-y-3">
    <div><h2 id="creation-modes" className="text-lg font-semibold text-text">How would you like to start?</h2><p className="text-sm text-text-2">TeachNexis does not require AI to create a lesson. Choose a source, then review before saving.</p></div>
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {modes.map(({ title, description, icon: Icon, enabled, href }) => enabled ? <Link key={title} href={href!} className="rounded-xl border border-primary bg-primary/5 p-4 transition-colors hover:bg-primary/10"><Icon size={18} className="text-primary" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold text-text">{title}</h3><p className="mt-1 text-xs text-text-2">{description}</p><span className="mt-3 inline-block text-xs font-medium text-primary">Continue →</span></Link> : <div key={title} className="rounded-xl border border-border bg-surface p-4 opacity-75"><Icon size={18} className="text-muted" aria-hidden="true" /><h3 className="mt-3 text-sm font-semibold text-text">{title}</h3><p className="mt-1 text-xs text-text-2">{description}</p><span className="mt-3 inline-block text-xs text-muted">Coming soon</span></div>)}
    </div>
  </section>;
}
