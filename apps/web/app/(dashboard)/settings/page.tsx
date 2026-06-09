import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="text-text-2 text-sm mt-0.5">
          Configure your school profile, notifications, and subscription.
        </p>
      </div>

      <div className="bg-surface rounded-xl border border-border p-12 text-center">
        <Settings size={40} className="text-muted mx-auto mb-3" />
        <h3 className="font-semibold text-text">Settings coming soon</h3>
        <p className="text-sm text-text-2 mt-1">
          School profile, notification preferences, and subscription management.
        </p>
      </div>
    </div>
  );
}
