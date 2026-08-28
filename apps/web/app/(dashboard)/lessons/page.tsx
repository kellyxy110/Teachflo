import { Plus } from "lucide-react";
import { getLessons } from "@/app/actions/lessons";
import { LessonsListClient } from "./LessonsListClient";
import { PageHeader } from "@/components/ui/PageHeader";
import { ButtonLink } from "@/components/ui/Button";

export default async function LessonsPage() {
  const lessons = await getLessons();

  return (
    <div className="space-y-6">
      <PageHeader title="Lessons" description={`${lessons.length} saved lesson${lessons.length !== 1 ? "s" : ""}`} primaryAction={<ButtonLink href="/lessons/new"><Plus size={16} aria-hidden="true" />New lesson</ButtonLink>} />

      <LessonsListClient lessons={lessons} />
    </div>
  );
}
