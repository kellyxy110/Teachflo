import { randomUUID } from "node:crypto";
import { PrismaClient, Prisma } from "@prisma/client";
import { createQuestionVersionAlignment } from "../lib/services/curriculum/alignment";

const db = new PrismaClient();
const marker = `F9B_SYNTH_${Date.now()}_${randomUUID().slice(0, 8)}`;
const pass = (name: string, value: boolean) => { if (!value) throw new Error(`${name}:FAIL`); console.log(`${name}:PASS`); };
const rejects = async (fn: () => Promise<unknown>) => { try { await fn(); return false; } catch { return true; } };

async function main() {
  const url = process.env.DATABASE_URL ?? "";
  if (!url.includes("wxgnufdacfncwxbedzap") || url.includes("cnodlvmgdueykdriiati")) throw new Error("F9B harness requires Development database.");
  await db.$queryRaw`SELECT 1`;

  const school = await db.school.create({ data: { name: marker, code: marker, state: "Synthetic" } });
  const otherSchool = await db.school.create({ data: { name: `${marker}_B`, code: `${marker}_B`, state: "Synthetic" } });
  const teacher = await db.teacher.create({ data: { schoolId: school.id, clerkId: marker, firstName: "F9B", lastName: "Teacher", email: `${marker}@invalid.test`, subjects: ["Mathematics"], classLevels: ["SS2"] } });
  const otherTeacher = await db.teacher.create({ data: { schoolId: otherSchool.id, clerkId: `${marker}_B`, firstName: "Other", lastName: "Teacher", email: `${marker}_b@invalid.test`, subjects: ["Mathematics"], classLevels: ["SS2"] } });
  const curriculum = await db.curriculum.create({ data: { slug: marker.toLowerCase(), name: `${marker} Curriculum`, authority: "Synthetic Authority", kind: "NATIONAL_CURRICULUM" } });
  const version1 = await db.curriculumVersion.create({ data: { curriculumId: curriculum.id, versionKey: "2025.1", title: `${marker} Edition 1`, status: "PUBLISHED" } });
  pass("CURRICULUM_CREATE", curriculum.slug === marker.toLowerCase());
  pass("CURRICULUM_VERSION_CREATE", version1.versionKey === "2025.1");
  pass("VERSION_UNIQUENESS", await rejects(() => db.curriculumVersion.create({ data: { curriculumId: curriculum.id, versionKey: "2025.1", title: "duplicate" } })));
  const nodeSubject = await db.curriculumNode.create({ data: { curriculumVersionId: version1.id, stableKey: "math", type: "SUBJECT", label: "Mathematics", subject: "Mathematics", classLevel: "SS2", term: "FIRST" } });
  const nodeTopic = await db.curriculumNode.create({ data: { curriculumVersionId: version1.id, stableKey: "math.quadratics", type: "TOPIC", label: "Quadratic Equations", subject: "Mathematics", classLevel: "SS2", term: "FIRST" } });
  const nodeObjective = await db.curriculumNode.create({ data: { curriculumVersionId: version1.id, stableKey: "math.quadratics.solve", type: "LEARNING_OBJECTIVE", label: "Solve quadratic equations", subject: "Mathematics", classLevel: "SS2", term: "FIRST" } });
  pass("STABLE_SOURCE_KEY_UNIQUENESS", await rejects(() => db.curriculumNode.create({ data: { curriculumVersionId: version1.id, stableKey: "math.quadratics", type: "TOPIC", label: "Duplicate" } })));
  await db.curriculumEdge.create({ data: { sourceId: nodeTopic.id, targetId: nodeSubject.id, relationship: "PART_OF" } });
  await db.curriculumEdge.create({ data: { sourceId: nodeObjective.id, targetId: nodeTopic.id, relationship: "PART_OF" } });
  pass("NODE_CREATE", Boolean(nodeSubject.id));
  pass("NODE_HIERARCHY", (await db.curriculumEdge.count({ where: { sourceId: nodeObjective.id, targetId: nodeTopic.id } })) === 1);
  const provenance = await db.curriculumProvenance.create({ data: { curriculumVersionId: version1.id, organization: "Synthetic Authority", documentTitle: `${marker} source`, editionYear: 2025, extractionMethod: "FIXTURE", verifiedByTeacherId: teacher.id, verifiedAt: new Date() } });
  pass("PROVENANCE_CREATE", provenance.documentTitle.includes(marker));

  const question = await db.question.create({ data: { schoolId: school.id, createdByTeacherId: teacher.id, lifecycle: "APPROVED", sourceKind: "TEACHER", visibility: "SCHOOL", section: "A", number: 1, type: "CALCULATION", stem: `${marker} stem`, solution: "x=2", explanation: "Synthetic", relatedChunkIds: [], defaultMarks: 5 } });
  const v1 = await db.questionVersion.create({ data: { questionId: question.id, version: 1, payload: { stem: "x² - 4 = 0", answer: "x=2" } as Prisma.InputJsonValue } });
  const v2 = await db.questionVersion.create({ data: { questionId: question.id, version: 2, payload: { stem: "x² - 9 = 0", answer: "x=3" } as Prisma.InputJsonValue } });
  pass("UNMAPPED_QUESTIONVERSION", (await db.questionVersionCurriculumAlignment.count({ where: { questionVersionId: v2.id } })) === 0);
  const alignment1 = await createQuestionVersionAlignment({ questionVersionId: v1.id, curriculumNodeId: nodeObjective.id, curriculumVersionId: version1.id, status: "APPROVED", sourceKind: "HUMAN_CREATED" }, { teacherId: teacher.id, schoolId: school.id });
  pass("QUESTIONVERSION_ALIGNMENT", alignment1.questionVersionId === v1.id);
  pass("MULTIPLE_ALIGNMENT", Boolean(await createQuestionVersionAlignment({ questionVersionId: v1.id, curriculumNodeId: nodeTopic.id, curriculumVersionId: version1.id }, { teacherId: teacher.id, schoolId: school.id })));
  pass("ALIGNMENT_DUPLICATE_SAFETY", await rejects(() => createQuestionVersionAlignment({ questionVersionId: v1.id, curriculumNodeId: nodeObjective.id, curriculumVersionId: version1.id }, { teacherId: teacher.id, schoolId: school.id })));
  pass("SCHOOL_QUESTION_AUTHORITY", await rejects(() => createQuestionVersionAlignment({ questionVersionId: v1.id, curriculumNodeId: nodeObjective.id, curriculumVersionId: version1.id }, { teacherId: otherTeacher.id, schoolId: otherSchool.id })));
  pass("CROSS_SCHOOL_DENIAL", await rejects(() => createQuestionVersionAlignment({ questionVersionId: v1.id, curriculumNodeId: nodeObjective.id, curriculumVersionId: version1.id }, { teacherId: teacher.id, schoolId: otherSchool.id })));

  const cls = await db.class.create({ data: { schoolId: school.id, name: marker, level: "SS2", session: "2099/2100" } });
  const exam = await db.exam.create({ data: { schoolId: school.id, teacherId: teacher.id, classId: cls.id, title: marker, subject: "Mathematics", topic: "Quadratics", classLevel: "SS2", examType: "SCHOOL_TEST", difficulty: "BASIC" } });
  const item = await db.assessmentItem.create({ data: { examId: exam.id, questionId: question.id, questionVersionId: v1.id, order: 1, section: "A", marksOverride: 5, snapshot: v1.payload as Prisma.InputJsonValue } });
  const publication = await db.assessmentPublication.create({ data: { examId: exam.id, version: 1, publishedByTeacherId: teacher.id, title: marker, subject: "Mathematics", topic: "Quadratics", classLevel: "SS2", resultReleasePolicy: "AFTER_TEACHER_RELEASE", answerReleasePolicy: "NEVER", gradingMode: "AUTO", contentHash: marker } });
  const publicationItem = await db.assessmentPublicationItem.create({ data: { publicationId: publication.id, assessmentItemId: item.id, questionId: question.id, questionVersionId: v1.id, order: 1, section: "A", marks: 5, snapshot: v1.payload as Prisma.InputJsonValue } });
  const before = await db.assessmentPublicationItem.findUniqueOrThrow({ where: { id: publicationItem.id } });
  pass("HISTORICAL_QUESTIONVERSION_INTEGRITY", before.questionVersionId === v1.id && before.marks === 5);
  pass("HISTORICAL_ASSESSMENT_INTEGRITY", (await db.assessmentPublicationItem.findUniqueOrThrow({ where: { id: publicationItem.id } })).questionVersionId === v1.id);
  const oldPayload = (await db.questionVersion.findUniqueOrThrow({ where: { id: v1.id } })).payload;
  pass("VERSION_IMMUTABILITY", JSON.stringify(oldPayload) === JSON.stringify({ stem: "x² - 4 = 0", answer: "x=2" }));

  await db.questionVersionCurriculumAlignment.deleteMany({ where: { questionVersionId: { in: [v1.id, v2.id] } } });
  await db.assessmentPublicationItem.delete({ where: { id: publicationItem.id } }); await db.assessmentPublication.delete({ where: { id: publication.id } }); await db.assessmentItem.delete({ where: { id: item.id } }); await db.exam.delete({ where: { id: exam.id } }); await db.class.delete({ where: { id: cls.id } });
  await db.questionVersion.deleteMany({ where: { questionId: question.id } }); await db.question.delete({ where: { id: question.id } }); await db.curriculumEdge.deleteMany({ where: { sourceId: { in: [nodeTopic.id, nodeObjective.id] } } }); await db.curriculumProvenance.delete({ where: { id: provenance.id } }); await db.curriculumNode.deleteMany({ where: { curriculumVersionId: version1.id } }); await db.curriculumVersion.delete({ where: { id: version1.id } }); await db.curriculum.delete({ where: { id: curriculum.id } }); await db.teacher.deleteMany({ where: { id: { in: [teacher.id, otherTeacher.id] } } }); await db.school.deleteMany({ where: { id: { in: [school.id, otherSchool.id] } } });
  pass("CLEANUP", (await db.school.count({ where: { code: { startsWith: marker } } })) === 0);
}

main().catch((error) => { console.error(error instanceof Error ? error.message : "F9B harness failed"); process.exitCode = 1; }).finally(() => db.$disconnect());
