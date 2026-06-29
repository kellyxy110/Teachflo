import { searchCurriculumNodes } from "@/app/actions/curriculum";
import { CurriculumBrowserClient } from "./CurriculumBrowserClient";

export const dynamic = "force-dynamic";

export default async function CurriculumPage() {
  // Load all SUBJECT nodes for the sidebar/filter
  const subjects = await searchCurriculumNodes("", { type: "SUBJECT" }, 100);

  return (
    <div className="max-w-5xl mx-auto">
      <CurriculumBrowserClient subjects={subjects.map((s) => s.label)} />
    </div>
  );
}
