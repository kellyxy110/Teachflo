"use client";

import { BookOpen, HelpCircle, Lightbulb, ListOrdered, AlertTriangle } from "lucide-react";

export type LearningMode =
  | "explain"
  | "test"
  | "hint"
  | "step-by-step"
  | "review-mistakes";

const MODES: Array<{
  id: LearningMode;
  label: string;
  icon: React.ComponentType<{ size?: number }>;
  color: string;
  description: string;
}> = [
  {
    id: "explain",
    label: "Explain",
    icon: BookOpen,
    color: "text-primary bg-primary-50 border-primary/20",
    description: "Clear teaching with examples",
  },
  {
    id: "test",
    label: "Test Me",
    icon: HelpCircle,
    color: "text-waec bg-primary-50 border-waec/20",
    description: "Practice questions on weak areas",
  },
  {
    id: "hint",
    label: "Hints Only",
    icon: Lightbulb,
    color: "text-warning bg-warning-50 border-warning/20",
    description: "Guided discovery, no answers",
  },
  {
    id: "step-by-step",
    label: "Step by Step",
    icon: ListOrdered,
    color: "text-success bg-success-50 border-success/20",
    description: "Solve with numbered steps",
  },
  {
    id: "review-mistakes",
    label: "Review Mistakes",
    icon: AlertTriangle,
    color: "text-danger bg-danger-50 border-danger/20",
    description: "Analyze what went wrong",
  },
];

interface Props {
  active: LearningMode;
  onChange: (mode: LearningMode) => void;
}

export function ModeSelector({ active, onChange }: Props) {
  return (
    <div className="flex gap-1.5 overflow-x-auto pb-1">
      {MODES.map((m) => {
        const Icon = m.icon;
        const isActive = active === m.id;
        return (
          <button
            key={m.id}
            onClick={() => onChange(m.id)}
            title={m.description}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all whitespace-nowrap ${
              isActive
                ? m.color
                : "text-muted bg-bg border-border hover:text-text hover:border-border"
            }`}
          >
            <Icon size={13} />
            {m.label}
          </button>
        );
      })}
    </div>
  );
}
