"use server";

import { requireSchool } from "@/lib/auth";
import {
  getNode,
  getTopicsForClass,
  getPrerequisites,
  getRelated,
  getTopicContext,
  findLearningPath,
  searchNodes,
  addNode,
  addEdge,
  wouldCreateCycle,
} from "@/lib/curriculum-graph";
import type { NodeType, EdgeRelation, ClassLevel, Term, CurriculumDifficulty } from "@prisma/client";
import type { NodeSearchFilters } from "@/lib/curriculum-graph";

// ─── Public read operations (global curriculum nodes require no auth) ─────────

export async function getCurriculumNode(id: string) {
  if (!id?.trim()) throw new Error("id is required");
  return getNode(id);
}

export async function getCurriculumTopics(
  subject: string,
  classLevel: ClassLevel,
  term?: Term,
) {
  if (!subject?.trim()) throw new Error("subject is required");
  // Include school-specific nodes for the authenticated school when available
  let schoolId: string | undefined;
  try {
    const ctx = await requireSchool();
    schoolId = ctx.schoolId;
  } catch {
    // Unauthenticated — return global nodes only
  }
  return getTopicsForClass(subject, classLevel, term, schoolId);
}

export async function getCurriculumPrerequisites(nodeId: string, depth?: number) {
  if (!nodeId?.trim()) throw new Error("nodeId is required");
  return getPrerequisites(nodeId, depth);
}

export async function getCurriculumRelated(
  nodeId: string,
  relationships?: EdgeRelation[],
) {
  if (!nodeId?.trim()) throw new Error("nodeId is required");
  return getRelated(nodeId, relationships);
}

export async function getCurriculumTopicContext(nodeId: string) {
  if (!nodeId?.trim()) throw new Error("nodeId is required");
  return getTopicContext(nodeId);
}

export async function getCurriculumLearningPath(fromId: string, toId: string) {
  if (!fromId?.trim() || !toId?.trim()) throw new Error("fromId and toId are required");
  return findLearningPath(fromId, toId);
}

export async function searchCurriculumNodes(
  query: string,
  filters: NodeSearchFilters = {},
  limit?: number,
) {
  if (typeof query !== "string") throw new Error("query must be a string");
  if (query.length > 200) throw new Error("query must be 200 characters or fewer");
  return searchNodes(query, filters, limit);
}

// ─── Authenticated write operations (school-specific nodes only) ──────────────

export async function addCurriculumNode(input: {
  type: NodeType;
  label: string;
  description?: string;
  subject?: string;
  classLevel?: ClassLevel;
  term?: Term;
  week?: number;
  difficulty?: CurriculumDifficulty;
  estimatedMinutes?: number;
  bloomLevels?: string[];
  examStandards?: string[];
  keywords?: string[];
  misconceptions?: string[];
  formulae?: Record<string, string>;
}) {
  const { schoolId, teacher } = await requireSchool();
  return addNode({ ...input, schoolId, createdBy: teacher.id });
}

export async function addCurriculumEdge(
  sourceId: string,
  targetId: string,
  relationship: EdgeRelation,
  weight?: number,
) {
  await requireSchool();

  if (!sourceId?.trim() || !targetId?.trim()) throw new Error("sourceId and targetId are required");

  if (relationship === "REQUIRES") {
    const cycle = await wouldCreateCycle(sourceId, targetId);
    if (cycle) throw new Error("This relationship would create a circular prerequisite chain");
  }

  return addEdge(sourceId, targetId, relationship, weight);
}
