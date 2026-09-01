import { extractPdf, type ExtractedDocument, type ExtractedBlock } from "@/lib/documents/extraction";

export type QualificationFixture = {
  id: string;
  description: string;
  pdf: Buffer;
  expected: {
    pages: number;
    markers: string[];
    locations: Array<{ marker: string; page: number }>;
    tableMarkers: string[];
  };
};

export type QualificationResult = {
  engine: string;
  fixture: string;
  classification: "TEXT_BASED" | "SCANNED" | "MIXED" | "UNKNOWN";
  pages: number;
  blocks: Array<{ sourceText: string; location: Record<string, number>; extractionMethod: string }>;
  sourceText: string;
  markdown: string | null;
  tableStructure: string[];
  warnings: string[];
  latencyMs: number;
  failure?: string;
};

export type QualificationScore = {
  sourceFidelity: number;
  stemNotation: number;
  readingOrder: number;
  tables: number;
  provenance: number;
  repeatability: number;
  performance: number;
  deploymentComplexity: number;
  overall: number;
  criticalFailures: string[];
};

function escapePdfText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/** Small, synthetic, dependency-free PDF fixture writer for qualification tests. */
export function syntheticPdf(pages: string[]): Buffer {
  const objects: string[] = ["<< /Type /Catalog /Pages 2 0 R >>", `<< /Type /Pages /Kids [${pages.map((_, i) => `${3 + i * 2} 0 R`).join(" ")}] /Count ${pages.length} >>`];
  const fontObject = 3 + pages.length * 2;
  for (let i = 0; i < pages.length; i += 1) {
    const pageObject = 3 + i * 2;
    const stream = `BT /F1 10 Tf 50 760 Td 12 TL ${pages[i].split("\n").map((line, n) => `${n ? "T* " : ""}(${escapePdfText(line)}) Tj`).join(" ")} ET`;
    objects.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 ${fontObject} 0 R >> >> /Contents ${pageObject + 1} 0 R >>`);
    objects.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`);
  }
  objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
  let pdf = "%PDF-1.4\n";
  const offsets: number[] = [0];
  objects.forEach((object, index) => { offsets.push(Buffer.byteLength(pdf, "latin1")); pdf += `${index + 1} 0 obj\n${object}\nendobj\n`; });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.slice(1).map((offset) => `${String(offset).padStart(10, "0")} 00000 n `).join("\n")}\ntrailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  return Buffer.from(pdf, "latin1");
}

const STEM_PAGE = "Mathematics: x² = 1/2, √(x), A = [1 0; 0 1], α + β\nPhysics: v = 10 m/s, 10⁻³ kg, F = ma\nChemistry: H₂O + CO₂ → H₂CO₃\nBiology table: Organ | Function\nHeart | Pumps blood";

export function qualificationFixtures(): QualificationFixture[] {
  return [
    { id: "clean-pdf", description: "clean text page", pdf: syntheticPdf(["Synthetic TeachNexis fixture\nHeading: Sets\nQuestion 1. Choose A, B or C."]), expected: { pages: 1, markers: ["Heading: Sets", "Question 1"], locations: [{ marker: "Heading: Sets", page: 1 }, { marker: "Question 1", page: 1 }], tableMarkers: [] } },
    { id: "multi-page-stem", description: "page-aware STEM and source locations", pdf: syntheticPdf([STEM_PAGE, "Question 2. (a) Solve x² - 7x + 12 = 0.\n(b) Options: A. 1  B. 2  C. 3  D. 4"]), expected: { pages: 2, markers: ["x²", "10⁻³", "H₂O", "Question 2"], locations: [{ marker: "x²", page: 1 }, { marker: "10⁻³", page: 1 }, { marker: "H₂O", page: 1 }, { marker: "Question 2", page: 2 }], tableMarkers: ["Organ | Function"] } },
    { id: "layout-table", description: "synthetic multi-column/table markers", pdf: syntheticPdf(["Column A: Definition\nColumn B: Example\n1. Set\n2. Union\nTable: Item | Unit | Value\nMass | kg | 10"]), expected: { pages: 1, markers: ["Column A", "Column B", "Table: Item"], locations: [{ marker: "Column A", page: 1 }, { marker: "Column B", page: 1 }, { marker: "Table: Item", page: 1 }], tableMarkers: ["Table: Item | Unit | Value"] } },
    { id: "exam-numbering", description: "numbered questions and MCQ options", pdf: syntheticPdf(["7(a)(ii) State the law.\nA. Option one\nB. Option two\nC. Option three\nD. Option four"]), expected: { pages: 1, markers: ["7(a)(ii)", "A. Option one", "D. Option four"], locations: [{ marker: "7(a)(ii)", page: 1 }, { marker: "A. Option one", page: 1 }, { marker: "D. Option four", page: 1 }], tableMarkers: [] } },
    { id: "headings-lists", description: "headings and ordered-list markers", pdf: syntheticPdf(["Lesson Heading\n1. First point\n2. Second point\nSubheading\n- final point"]), expected: { pages: 1, markers: ["Lesson Heading", "1. First point", "Subheading"], locations: [{ marker: "Lesson Heading", page: 1 }, { marker: "1. First point", page: 1 }, { marker: "Subheading", page: 1 }], tableMarkers: [] } },
    { id: "unicode-stem", description: "embedded-glyph qualification probe", pdf: syntheticPdf(["x² x³ 10⁻³ H₂O CO₂ α β γ √ ≤ ≥ ≠ → ⇌ 1/2"]), expected: { pages: 1, markers: ["x²", "x³", "10⁻³", "H₂O", "CO₂", "α", "√", "→"], locations: [{ marker: "x²", page: 1 }, { marker: "H₂O", page: 1 }, { marker: "→", page: 1 }], tableMarkers: [] } },
    { id: "mixed-layout", description: "mixed layout page markers", pdf: syntheticPdf(["Figure 1: ray diagram\nLeft column text\nRight column text\nTable: Symbol | Meaning\nα | angle"]), expected: { pages: 1, markers: ["Figure 1", "Left column", "Right column", "Table: Symbol"], locations: [{ marker: "Figure 1", page: 1 }, { marker: "Left column", page: 1 }, { marker: "Table: Symbol", page: 1 }], tableMarkers: ["Table: Symbol | Meaning"] } },
    { id: "scanned-classification", description: "blank synthetic page (classification probe)", pdf: syntheticPdf([""]), expected: { pages: 1, markers: [], locations: [], tableMarkers: [] } },
  ];
}

function fromBlocks(blocks: ExtractedBlock[], text: string, pages: number, fixture: QualificationFixture, engine: string, latencyMs: number, failure?: string): QualificationResult {
  const missing = fixture.expected.markers.filter((marker) => !text.includes(marker));
  const warnings = missing.map((marker) => `missing marker: ${marker}`);
  return { engine, fixture: fixture.id, classification: failure ? "UNKNOWN" : "TEXT_BASED", pages, blocks: blocks.map((b) => ({ sourceText: b.sourceText, location: b.location as Record<string, number>, extractionMethod: b.extractionMethod })), sourceText: text, markdown: text || null, tableStructure: fixture.expected.tableMarkers.filter((marker) => text.includes(marker)), warnings, latencyMs, ...(failure ? { failure } : {}) };
}

export async function runCurrentAdapter(fixture: QualificationFixture): Promise<QualificationResult> {
  const started = performance.now();
  try {
    const result = await Promise.race([
      extractPdf(fixture.pdf),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("current parser timeout")), 20000)),
    ]);
    return fromBlocks(result.blocks, result.text, result.pageCount ?? result.blocks.length, fixture, "pdf-parse", Math.round(performance.now() - started));
  }
  catch (error) { return fromBlocks([], "", 0, fixture, "pdf-parse", Math.round(performance.now() - started), error instanceof Error ? error.message : "extraction failed"); }
}

export async function runPdfInspectorAdapter(fixture: QualificationFixture): Promise<QualificationResult> {
  const started = performance.now();
  try {
    const specifier = process.env.L3BQ_PDF_INSPECTOR_MODULE ?? "@firecrawl/pdf-inspector";
    const load = new Function("specifier", "return import(specifier)") as (value: string) => Promise<unknown>;
    const mod = await load(specifier) as {
      processPdf?: (input: Buffer) => Promise<unknown> | unknown;
      extractPagesMarkdown?: (input: Buffer) => Promise<unknown> | unknown;
    };
    if (typeof mod.processPdf !== "function") throw new Error("pdf-inspector processPdf is unavailable");
    const raw = await mod.processPdf(fixture.pdf) as { pdfType?: string; markdown?: string | null; pageCount?: number; pages?: Array<{ text?: string; page?: number; num?: number }> };
    const pageExtraction = typeof mod.extractPagesMarkdown === "function"
      ? await mod.extractPagesMarkdown(fixture.pdf) as { pages?: Array<{ markdown?: string; page?: number }> }
      : null;
    const pages = pageExtraction?.pages?.length
      ? pageExtraction.pages.map((page) => ({ text: page.markdown ?? "", page: (page.page ?? 0) + 1 }))
      : (raw.pages ?? []);
    const pageCount = raw.pageCount ?? pages.length;
    const blocks = pages.map((page) => ({ sourceText: page.text ?? "", location: { page: page.page ?? page.num ?? 1 }, extractionMethod: "pdf-inspector" }));
    const text = blocks.length ? blocks.map((block) => block.sourceText).join("\n") : (raw.markdown ?? "");
    if (!blocks.length && text) blocks.push({ sourceText: text, location: { page: 1 }, extractionMethod: "pdf-inspector" });
    const type = String(raw.pdfType ?? "").toUpperCase();
    const classification = type.includes("MIXED") ? "MIXED" : type.includes("SCANNED") || type.includes("IMAGE") ? "SCANNED" : "TEXT_BASED";
    return { engine: "pdf-inspector", fixture: fixture.id, classification, pages: pageCount, blocks, sourceText: text, markdown: raw.markdown ?? null, tableStructure: fixture.expected.tableMarkers.filter((marker) => text.includes(marker)), warnings: [], latencyMs: Math.round(performance.now() - started) };
  } catch (error) { return { engine: "pdf-inspector", fixture: fixture.id, classification: "UNKNOWN", pages: 0, blocks: [], sourceText: "", markdown: null, tableStructure: [], warnings: [], latencyMs: Math.round(performance.now() - started), failure: error instanceof Error ? error.message : "adapter unavailable" }; }
}

export function scoreQualification(result: QualificationResult, fixture: QualificationFixture, repeatEqual: boolean): QualificationScore {
  const textPass = fixture.expected.markers.every((marker) => result.sourceText.includes(marker));
  const locationPass = fixture.expected.locations.every(({ marker, page }) => result.blocks.some((block) => block.sourceText.includes(marker) && block.location.page === page));
  const stemFailures: string[] = [];
  for (const marker of ["x²", "10⁻³", "H₂O", "→"]) if (fixture.expected.markers.includes(marker) && !result.sourceText.includes(marker)) stemFailures.push(`notation lost: ${marker}`);
  if (fixture.id === "scanned-classification" && result.failure) stemFailures.push("classification probe unavailable");
  const source = textPass ? 25 : 0; const stem = stemFailures.length ? 0 : 25; const reading = textPass ? 15 : 0; const tables = fixture.expected.tableMarkers.every((m) => result.sourceText.includes(m)) ? 10 : 0; const provenance = locationPass ? 10 : 0; const repeatability = repeatEqual ? 5 : 0; const performance = result.latencyMs < 1000 ? 5 : 0; const deployment = result.engine === "pdf-inspector" ? 2 : 5;
  return { sourceFidelity: source, stemNotation: stem, readingOrder: reading, tables, provenance, repeatability, performance, deploymentComplexity: deployment, overall: source + stem + reading + tables + provenance + repeatability + performance + deployment, criticalFailures: stemFailures.concat(result.warnings) };
}

export function qualifyResultShape(results: QualificationResult[], scores: QualificationScore[]) {
  return {
    results: results.map(({ sourceText, blocks, markdown, ...safe }) => ({
      ...safe,
      sourceCharacterCount: sourceText.length,
      blockCount: blocks.length,
      markdownCharacterCount: markdown?.length ?? 0,
    })),
    scores,
  };
}
