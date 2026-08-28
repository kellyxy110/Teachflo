import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { approveQuestionCandidate, commitApprovedQuestionCandidates, stageQuestionImport } from "../lib/services/question-import/workflow";

const DEV_PROJECT = "wxgnufdacfncwxbedzap";
const PROTECTED_PROJECT = "cnodlvmgdueykdriiati";
const rawUrl = process.env.DATABASE_URL ?? "";
if (!rawUrl.includes(DEV_PROJECT) || rawUrl.includes(PROTECTED_PROJECT)) throw new Error("QI3 harness refuses non-Development target");

const db = new PrismaClient();
const token = `QI3_COMMIT_${Date.now()}_${randomUUID().slice(0, 8)}`;

async function main() {
  const school = await db.school.create({ data: { name: `${token} School`, code: token, state: "Synthetic" } });
  const teacher = await db.teacher.create({ data: { schoolId: school.id, clerkId: `${token}_teacher`, firstName: "Synthetic", lastName: "Teacher", email: `${token.toLowerCase()}@invalid.test`, subjects: ["Mathematics"], classLevels: ["JS1"] } });
  const actor = { teacherId: teacher.id, schoolId: school.id };
  let jobId = "";
  try {
    const csv = Buffer.from('Question,Type,Correct Answer,Solution Steps,Explanation,Marks\nSolve $x+1=2$,SHORT_ANSWER,x=1,"Step 1: Subtract 1 from both sides",This explains the method,2\nUnaccepted,ESSAY,,,,4\n');
    const staged = await stageQuestionImport(actor, `${token}.csv`, csv, "text/csv");
    jobId = staged.jobId;
    const first = staged.rows[0]!;
    await approveQuestionCandidate(actor, first.id, Number((first.candidate as { reviewRevision?: number }).reviewRevision ?? 1));

    await assert.rejects(() => commitApprovedQuestionCandidates({ teacherId: "other", schoolId: school.id }, jobId), /not found/i);
    const initial = await commitApprovedQuestionCandidates(actor, jobId);
    assert.equal(initial.importedCount, 1);
    assert.equal(initial.alreadyImportedCount, 0);
    assert.equal(initial.questionIds.length, 1);

    const question = await db.question.findUniqueOrThrow({ where: { id: initial.questionIds[0] }, include: { versions: true } });
    assert.equal(question.lifecycle, "APPROVED");
    assert.equal(question.versions.length, 1);
    assert.equal(question.versions[0]!.version, 1);
    assert.equal(question.correctOption, "x=1");
    assert.equal(question.solution, "Subtract 1 from both sides");
    assert.equal(question.explanation, "This explains the method");
    const payload = question.versions[0]!.payload as { solutionSteps?: string[] };
    assert.deepEqual(payload.solutionSteps, ["Subtract 1 from both sides"]);

    const retry = await commitApprovedQuestionCandidates(actor, jobId);
    assert.equal(retry.importedCount, 0);
    assert.equal(retry.alreadyImportedCount, 1);
    assert.deepEqual(retry.questionIds, initial.questionIds);
    assert.equal(await db.question.count({ where: { schoolId: school.id } }), 1);
    assert.equal(await db.questionVersion.count({ where: { questionId: question.id } }), 1);
    console.log("QI3_COMMIT:PASS");
    console.log("LIFECYCLE_APPROVED:PASS");
    console.log("IDEMPOTENT_RETRY:PASS");
    console.log("TENANT_ISOLATION:PASS");
  } finally {
    const questions = await db.question.findMany({ where: { schoolId: school.id }, select: { id: true } });
    const questionIds = questions.map((question) => question.id);
    if (jobId) await db.importJob.deleteMany({ where: { id: jobId } });
    if (questionIds.length) await db.questionVersion.deleteMany({ where: { questionId: { in: questionIds } } });
    await db.question.deleteMany({ where: { id: { in: questionIds } } });
    await db.teacher.delete({ where: { id: teacher.id } });
    await db.school.delete({ where: { id: school.id } });
    console.log("CLEANUP:PASS");
    await db.$disconnect();
  }
}

void main().catch((error) => { console.error(error); process.exitCode = 1; });
