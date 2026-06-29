import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";
import type {
  CurriculumNode,
  NodeType,
  EdgeRelation,
  ClassLevel,
  Term,
  CurriculumDifficulty,
} from "@prisma/client";

// ─── Contract Types ───────────────────────────────────────────────────────────

export interface TopicContext {
  node: CurriculumNode;
  prerequisites: CurriculumNode[];
  learningObjectives: CurriculumNode[];
  relatedConcepts: CurriculumNode[];
  crossSubjectConnections: { node: CurriculumNode; subject: string }[];
  examStandards: string[];
  bloomLevels: string[];
  misconceptions: string[];
  formulae: Record<string, string> | null;
}

export interface NodeSearchFilters {
  type?: NodeType;
  subject?: string;
  classLevel?: ClassLevel;
  term?: Term;
}

export interface AddNodeInput {
  schoolId: string;
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
  metadata?: Record<string, unknown>;
  createdBy?: string;
}

// ─── Read Operations ──────────────────────────────────────────────────────────

export async function getNode(id: string): Promise<CurriculumNode | null> {
  return db.curriculumNode.findFirst({
    where: { id, isActive: true },
  });
}

export async function getTopicByLabel(
  label: string,
  subject: string,
  classLevel: ClassLevel,
  term?: Term,
): Promise<CurriculumNode | null> {
  return db.curriculumNode.findFirst({
    where: {
      type: "TOPIC",
      label: { equals: label, mode: "insensitive" },
      subject,
      classLevel,
      ...(term ? { term } : {}),
      isActive: true,
      schoolId: null,
    },
  });
}

export async function getTopicsForClass(
  subject: string,
  classLevel: ClassLevel,
  term?: Term,
  schoolId?: string,
): Promise<CurriculumNode[]> {
  return db.curriculumNode.findMany({
    where: {
      type: "TOPIC",
      subject,
      classLevel,
      ...(term ? { term } : {}),
      isActive: true,
      OR: [{ schoolId: null }, ...(schoolId ? [{ schoolId }] : [])],
    },
    orderBy: [{ week: "asc" }, { label: "asc" }],
  });
}

export async function getPrerequisites(
  nodeId: string,
  depth = 2,
): Promise<{ node: CurriculumNode; depth: number }[]> {
  const cappedDepth = Math.min(Math.max(1, depth), 5);
  const visited = new Set<string>();
  const result: { node: CurriculumNode; depth: number }[] = [];

  let frontier = [nodeId];

  for (let d = 1; d <= cappedDepth; d++) {
    if (frontier.length === 0) break;

    const edges = await db.curriculumEdge.findMany({
      where: {
        sourceId: { in: frontier },
        relationship: "REQUIRES",
        target: { isActive: true },
      },
      include: { target: true },
    });

    const nextFrontier: string[] = [];
    for (const edge of edges) {
      if (!visited.has(edge.targetId)) {
        visited.add(edge.targetId);
        result.push({ node: edge.target, depth: d });
        nextFrontier.push(edge.targetId);
      }
    }
    frontier = nextFrontier;
  }

  return result;
}

export async function getRelated(
  nodeId: string,
  relationships?: EdgeRelation[],
): Promise<{ node: CurriculumNode; relationship: EdgeRelation; direction: "outgoing" | "incoming" }[]> {
  const relFilter = relationships && relationships.length > 0
    ? { in: relationships }
    : undefined;

  const [outgoing, incoming] = await Promise.all([
    db.curriculumEdge.findMany({
      where: {
        sourceId: nodeId,
        ...(relFilter ? { relationship: relFilter } : {}),
        target: { isActive: true },
      },
      include: { target: true },
    }),
    db.curriculumEdge.findMany({
      where: {
        targetId: nodeId,
        ...(relFilter ? { relationship: relFilter } : {}),
        source: { isActive: true },
      },
      include: { source: true },
    }),
  ]);

  const results: { node: CurriculumNode; relationship: EdgeRelation; direction: "outgoing" | "incoming" }[] = [];

  for (const e of outgoing) {
    results.push({ node: e.target, relationship: e.relationship, direction: "outgoing" });
  }
  for (const e of incoming) {
    results.push({ node: e.source, relationship: e.relationship, direction: "incoming" });
  }

  return results;
}

export async function getTopicContext(nodeId: string): Promise<TopicContext> {
  const node = await db.curriculumNode.findFirst({
    where: { id: nodeId, isActive: true },
  });
  if (!node) throw new Error("Node not found");

  const [prerequisiteEdges, incomingPartOfEdges, crossSubjectEdges] = await Promise.all([
    db.curriculumEdge.findMany({
      where: { sourceId: nodeId, relationship: "REQUIRES", target: { isActive: true } },
      include: { target: true },
    }),
    db.curriculumEdge.findMany({
      where: {
        targetId: nodeId,
        relationship: "PART_OF",
        source: { isActive: true, type: { in: ["LEARNING_OBJECTIVE", "CONCEPT"] } },
      },
      include: { source: true },
    }),
    db.curriculumEdge.findMany({
      where: { sourceId: nodeId, relationship: "CROSS_SUBJECT", target: { isActive: true } },
      include: { target: true },
    }),
  ]);

  const learningObjectives = incomingPartOfEdges
    .filter((e) => e.source.type === "LEARNING_OBJECTIVE")
    .map((e) => e.source);

  const relatedConcepts = incomingPartOfEdges
    .filter((e) => e.source.type === "CONCEPT")
    .map((e) => e.source);

  const crossSubjectConnections = crossSubjectEdges.map((e) => ({
    node: e.target,
    subject: e.target.subject ?? "",
  }));

  return {
    node,
    prerequisites: prerequisiteEdges.map((e) => e.target),
    learningObjectives,
    relatedConcepts,
    crossSubjectConnections,
    examStandards: node.examStandards,
    bloomLevels: node.bloomLevels,
    misconceptions: node.misconceptions,
    formulae: node.formulae as Record<string, string> | null,
  };
}

export async function findLearningPath(
  fromId: string,
  toId: string,
): Promise<CurriculumNode[] | null> {
  if (fromId === toId) {
    const node = await getNode(fromId);
    return node ? [node] : null;
  }

  const visited = new Set<string>([fromId]);
  const queue: { id: string; path: string[] }[] = [{ id: fromId, path: [fromId] }];

  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current.path.length > 15) continue; // safety cap

    const edges = await db.curriculumEdge.findMany({
      where: {
        sourceId: current.id,
        relationship: { in: ["TEACHES_BEFORE"] },
        target: { isActive: true },
      },
      select: { targetId: true },
    });

    for (const edge of edges) {
      if (edge.targetId === toId) {
        const fullPath = [...current.path, toId];
        const nodes = await db.curriculumNode.findMany({
          where: { id: { in: fullPath }, isActive: true },
        });
        const nodeMap = new Map(nodes.map((n) => [n.id, n]));
        return fullPath.map((id) => nodeMap.get(id)).filter(Boolean) as CurriculumNode[];
      }

      if (!visited.has(edge.targetId)) {
        visited.add(edge.targetId);
        queue.push({ id: edge.targetId, path: [...current.path, edge.targetId] });
      }
    }
  }

  return null;
}

export async function searchNodes(
  query: string,
  filters: NodeSearchFilters = {},
  limit = 20,
): Promise<CurriculumNode[]> {
  const cappedLimit = Math.min(Math.max(1, limit), 100);
  const words = query.trim().split(/\s+/).filter(Boolean);

  return db.curriculumNode.findMany({
    where: {
      isActive: true,
      ...(filters.type ? { type: filters.type } : {}),
      ...(filters.subject ? { subject: filters.subject } : {}),
      ...(filters.classLevel ? { classLevel: filters.classLevel } : {}),
      ...(filters.term ? { term: filters.term } : {}),
      OR: [
        { label: { contains: query, mode: "insensitive" } },
        { description: { contains: query, mode: "insensitive" } },
        { keywords: { hasSome: words } },
        { subject: { contains: query, mode: "insensitive" } },
      ],
    },
    orderBy: { label: "asc" },
    take: cappedLimit,
  });
}

// ─── Write Operations (school-specific only) ──────────────────────────────────

export async function addNode(input: AddNodeInput): Promise<CurriculumNode> {
  if (!input.schoolId) throw new Error("Cannot modify global curriculum nodes");
  if (!input.label.trim()) throw new Error("label is required");
  if (input.label.length > 200) throw new Error("label must be 200 characters or fewer");

  return db.curriculumNode.create({
    data: {
      schoolId: input.schoolId,
      type: input.type,
      label: input.label.trim(),
      description: input.description?.trim() ?? null,
      subject: input.subject?.trim() ?? null,
      classLevel: input.classLevel ?? null,
      term: input.term ?? null,
      week: input.week ?? null,
      difficulty: input.difficulty ?? null,
      estimatedMinutes: input.estimatedMinutes ?? null,
      bloomLevels: input.bloomLevels ?? [],
      examStandards: input.examStandards ?? [],
      keywords: input.keywords ?? [],
      misconceptions: input.misconceptions ?? [],
      formulae: input.formulae ?? Prisma.JsonNull,
      metadata: input.metadata ? (input.metadata as Prisma.InputJsonValue) : Prisma.JsonNull,
      createdBy: input.createdBy ?? null,
    },
  });
}

export async function addEdge(
  sourceId: string,
  targetId: string,
  relationship: EdgeRelation,
  weight?: number,
): Promise<void> {
  if (sourceId === targetId) {
    throw new Error("Self-referential edges are not permitted");
  }

  const [source, target] = await Promise.all([
    db.curriculumNode.findFirst({ where: { id: sourceId }, select: { id: true } }),
    db.curriculumNode.findFirst({ where: { id: targetId }, select: { id: true } }),
  ]);

  if (!source) throw new Error("Source node not found");
  if (!target) throw new Error("Target node not found");

  await db.curriculumEdge.create({
    data: { sourceId, targetId, relationship, weight: weight ?? 1.0 },
  });
}

// ─── Cycle Detection (used before adding REQUIRES edges) ─────────────────────

export async function wouldCreateCycle(
  sourceId: string,
  targetId: string,
): Promise<boolean> {
  // Check if targetId can reach sourceId via REQUIRES edges (DFS)
  const visited = new Set<string>();
  const stack = [targetId];

  while (stack.length > 0) {
    const current = stack.pop()!;
    if (current === sourceId) return true;
    if (visited.has(current)) continue;
    visited.add(current);

    const edges = await db.curriculumEdge.findMany({
      where: { sourceId: current, relationship: "REQUIRES" },
      select: { targetId: true },
    });

    for (const e of edges) stack.push(e.targetId);
  }

  return false;
}
