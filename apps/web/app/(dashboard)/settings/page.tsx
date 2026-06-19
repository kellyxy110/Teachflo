import { getSettings } from "@/app/actions/settings";
import { SettingsClient } from "./SettingsClient";

export default async function SettingsPage() {
  const { school, teacher } = await getSettings();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="text-text-2 text-sm mt-0.5">
          Manage your school profile and teacher details.
        </p>
      </div>

      <SettingsClient school={school} teacher={teacher} />
    </div>
  );
}
