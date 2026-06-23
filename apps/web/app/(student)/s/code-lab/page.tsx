import { Code2 } from "lucide-react";
import { CodeLabClient } from "@/app/(dashboard)/code-lab/CodeLabClient";

export default function StudentCodeLabPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Code2 size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-text">Code Lab</h1>
        </div>
        <p className="text-sm text-text-2">
          Learn to code step-by-step — HTML, CSS, JavaScript, and Python.
        </p>
      </div>
      <CodeLabClient />
    </div>
  );
}
