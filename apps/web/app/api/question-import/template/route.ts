import * as XLSX from "xlsx";

export async function GET() {
  const headers = [["Question", "Type", "Option A", "Option B", "Option C", "Option D", "Correct Answer", "Marks", "Explanation", "Subject", "Topic"]];
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(headers), "Questions");
  const body = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
  return new Response(body, { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": "attachment; filename=teachnexis-question-import-template.xlsx", "Cache-Control": "no-store" } });
}
