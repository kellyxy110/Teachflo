import { FlaskConical } from "lucide-react";
import { ChemLabClient } from "@/app/(dashboard)/chem-lab/ChemLabClient";

export const metadata = { title: "Virtual Chemistry Lab" };

export default function StudentChemLabPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <FlaskConical size={20} className="text-primary" />
          <h1 className="text-2xl font-bold text-text">Virtual Chemistry Lab</h1>
        </div>
        <p className="text-sm text-text-2">
          Periodic table, equation balancing, and titration curves.
        </p>
      </div>
      <ChemLabClient />
    </div>
  );
}
