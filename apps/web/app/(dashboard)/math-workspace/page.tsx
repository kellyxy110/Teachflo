import { Calculator } from "lucide-react";
import { MathWorkspaceClient } from "./MathWorkspaceClient";

export const metadata = { title: "Mathematics Workspace" };

export default function MathWorkspacePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Calculator size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-text">Mathematics Workspace</h1>
        </div>
        <p className="text-sm text-text-2">
          Function grapher, matrix calculator, and statistics tools — aligned with WAEC/JAMB maths.
        </p>
      </div>
      <MathWorkspaceClient />
    </div>
  );
}
