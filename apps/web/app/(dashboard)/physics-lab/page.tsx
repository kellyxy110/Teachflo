import { Activity } from "lucide-react";
import { PhysicsLabClient } from "./PhysicsLabClient";

export const metadata = { title: "Virtual Physics Lab" };

export default function PhysicsLabPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Activity size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-text">Virtual Physics Lab</h1>
        </div>
        <p className="text-sm text-text-2">
          Projectile motion, circuit analysis, and wave simulations — SS1–SS3 Physics (WAEC/JAMB).
        </p>
      </div>
      <PhysicsLabClient />
    </div>
  );
}
