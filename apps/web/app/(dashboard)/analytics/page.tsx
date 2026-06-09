import { TrendingUp } from "lucide-react";

export default function AnalyticsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Analytics</h1>
        <p className="text-text-2 text-sm mt-0.5">
          Class performance, subject heatmaps, and at-risk student identification.
        </p>
      </div>

      <div className="bg-surface rounded-xl border border-border p-12 text-center">
        <TrendingUp size={40} className="text-muted mx-auto mb-3" />
        <h3 className="font-semibold text-text">No data yet</h3>
        <p className="text-sm text-text-2 mt-1">
          Enter student scores to unlock analytics and performance insights.
        </p>
      </div>
    </div>
  );
}
