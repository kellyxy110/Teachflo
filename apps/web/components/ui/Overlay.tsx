"use client";

import type { ReactNode } from "react";
import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { IconButton } from "./Button";
import { cn } from "./cn";

function NativeOverlay({ open, onClose, title, description, children, className }: { open: boolean; onClose: () => void; title: string; description?: string; children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const descriptionId = useId();
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog ref={ref} onCancel={(event) => { event.preventDefault(); onClose(); }} onClose={onClose} aria-labelledby={titleId} aria-describedby={description ? descriptionId : undefined} className={cn("m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg overflow-auto rounded-2xl border border-border bg-surface p-0 text-text shadow-[var(--shadow-overlay)] backdrop:bg-black/50", className)}>
      <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-border bg-surface p-4">
        <div>
          <h2 id={titleId} className="font-semibold text-text">{title}</h2>
          {description && <p id={descriptionId} className="mt-1 text-sm text-text-2">{description}</p>}
        </div>
        <IconButton onClick={onClose} aria-label={`Close ${title}`} className="-mr-2 -mt-2 shrink-0"><X size={18} /></IconButton>
      </div>
      <div className="p-4">{children}</div>
    </dialog>
  );
}

export function Dialog(props: Parameters<typeof NativeOverlay>[0]) {
  return <NativeOverlay {...props} />;
}

export function Drawer(props: Parameters<typeof NativeOverlay>[0]) {
  return <NativeOverlay {...props} className={cn("mb-0 mr-0 h-full max-h-full w-full max-w-md rounded-none sm:rounded-l-2xl", props.className)} />;
}
