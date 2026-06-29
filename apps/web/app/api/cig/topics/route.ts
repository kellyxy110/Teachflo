import { safeAuth } from "@/lib/auth";
import { getTopicsForClass } from "@/lib/curriculum-graph";
import type { ClassLevel, Term } from "@prisma/client";

const VALID_CLASS_LEVELS: ClassLevel[] = ["JS1", "JS2", "JS3", "SS1", "SS2", "SS3"];
const VALID_TERMS: Term[] = ["FIRST", "SECOND", "THIRD"];

export async function GET(request: Request) {
  try {
    const auth = await safeAuth();
    if (!auth.userId) return Response.json({ error: "Unauthorized" }, { status: 401 });
  } catch {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const subject = searchParams.get("subject")?.trim();
  const classLevelRaw = searchParams.get("classLevel")?.trim();
  const termRaw = searchParams.get("term")?.trim();

  if (!subject || !classLevelRaw) {
    return Response.json({ error: "subject and classLevel are required" }, { status: 400 });
  }

  const classLevel = classLevelRaw as ClassLevel;
  if (!VALID_CLASS_LEVELS.includes(classLevel)) {
    return Response.json({ error: "Invalid classLevel" }, { status: 400 });
  }

  const term = termRaw && VALID_TERMS.includes(termRaw as Term)
    ? (termRaw as Term)
    : undefined;

  const topics = await getTopicsForClass(subject, classLevel, term);

  return Response.json(
    topics.map((t) => ({
      id: t.id,
      label: t.label,
      description: t.description,
      term: t.term,
      week: t.week,
      bloomLevels: t.bloomLevels,
      examStandards: t.examStandards,
      keywords: t.keywords,
      misconceptions: t.misconceptions,
      difficulty: t.difficulty,
    })),
    {
      headers: { "Cache-Control": "private, max-age=300" },
    },
  );
}
