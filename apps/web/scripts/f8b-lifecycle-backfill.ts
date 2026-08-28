import { db } from "@/lib/db";

/** Development-only, idempotent compatibility backfill. It never invents publication history. */
async function main() {
  const marker = process.env.DATABASE_URL ?? "";
  if (!marker.includes("wxgnufdacfncwxbedzap") || marker.includes("cnodlvmgdueykdriiati")) throw new Error("F8B backfill requires the approved Development database.");
  const questions = await db.question.findMany({ include: { versions: true } });
  let versionsCreated = 0;
  for (const question of questions) {
    if (question.versions.length) continue;
    await db.questionVersion.create({ data: { questionId: question.id, version: 1, payload: {
      type: question.type, stem: question.stem, questionText: question.questionText, optionA: question.optionA, optionB: question.optionB, optionC: question.optionC, optionD: question.optionD, optionE: question.optionE,
      correctOption: question.correctOption, markScheme: question.markScheme, solution: question.solution, explanation: question.explanation, defaultMarks: question.defaultMarks, section: question.section,
    } } });
    versionsCreated += 1;
  }
  const legacyAttempts = await db.examAttempt.count({ where: { publicationId: null } });
  console.log(JSON.stringify({ questionsScanned: questions.length, versionsCreated, legacyAttempts, publicationHistory: "not manufactured" }));
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "F8B backfill failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
