import { PrismaClient } from "@prisma/client";

const db = new PrismaClient();

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  const safe = url.match(/^postgres(?:ql)?:\/\/([^:]+):[^@]+@([^:/?]+)(?::(\d+))?\/([^?]+)/);
  if (!safe) throw new Error("DATABASE_URL is not a supported PostgreSQL URL");
  const [, user, host, port, database] = safe;
  console.log(JSON.stringify({ databaseTarget: user.includes("wxgnufdacfncwxbedzap") ? "wxgnufdacfncwxbedzap" : "UNKNOWN", protectedProjectAbsent: !user.includes("cnodlvmgdueykdriiati"), host, port: port || "5432", database }));
  await db.$queryRaw`SELECT 1`;
  console.log("SELECT 1: PASS");
  const tables = await db.$queryRaw<{ table_name: string }[]>`SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY table_name`;
  console.log("TABLES:", tables.map((x) => x.table_name).join(","));
  const cols = await db.$queryRaw<{ table_name: string; column_name: string }[]>`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND (table_name IN ('exams','exam_attempts','question_responses','assessment_publications','assessment_publication_items') OR column_name IN ('lifecycle','opensAt','closesAt','publicationId','deadlineAt')) ORDER BY table_name,column_name`;
  console.log("RELEVANT_COLUMNS:", cols.map((x) => `${x.table_name}.${x.column_name}`).join(","));
  const enums = await db.$queryRaw<{ typname: string }[]>`SELECT DISTINCT t.typname FROM pg_type t JOIN pg_enum e ON t.oid=e.enumtypid WHERE t.typname IN ('AssessmentLifecycle','ResultReleasePolicy','AnswerReleasePolicy','AssessmentGradingMode')`;
  console.log("F8B_ENUMS:", enums.map((x) => x.typname).join(",") || "NONE");
  const migrations = await db.$queryRaw<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }[]>`SELECT migration_name,finished_at,rolled_back_at FROM "_prisma_migrations" ORDER BY started_at`;
  console.log("PRISMA_MIGRATIONS:", migrations.map((x) => ({ name: x.migration_name, finished: Boolean(x.finished_at), rolledBack: Boolean(x.rolled_back_at) })));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "inspection failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
