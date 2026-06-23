import { Gamepad2 } from "lucide-react";
import { PracticeArena } from "@/components/landing/PracticeArena";

export default function StudentPracticeArenaPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Gamepad2 size={20} className="text-purple-500" />
          <h1 className="text-2xl font-bold text-text">Practice Arena</h1>
        </div>
        <p className="text-sm text-text-2">
          Fun challenges to sharpen your skills — math sprints, concept matching, and quiz battles.
        </p>
      </div>
      <div className="bg-surface border border-border rounded-xl p-6">
        <PracticeArena />
      </div>
    </div>
  );
}
