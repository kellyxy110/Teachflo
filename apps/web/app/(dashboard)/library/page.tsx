import { Library, Sparkles } from "lucide-react";

export default function LibraryPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-text">Library</h1>
          <p className="text-text-2 text-sm mt-0.5">
            Browse, upload, and generate AI revision materials.
          </p>
        </div>
        <button className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors">
          <Sparkles size={16} />
          Generate AI Notes
        </button>
      </div>

      <div className="bg-surface rounded-xl border border-border p-12 text-center">
        <Library size={40} className="text-muted mx-auto mb-3" />
        <h3 className="font-semibold text-text">Library is empty</h3>
        <p className="text-sm text-text-2 mt-1">
          Upload materials or generate AI revision handbooks for your students.
        </p>
      </div>
    </div>
  );
}
