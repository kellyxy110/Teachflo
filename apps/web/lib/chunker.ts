export function chunkText(
  text: string,
  maxChunkSize = 500,
  overlap = 50
): string[] {
  const paragraphs = text.split(/\n\n+/);
  const chunks: string[] = [];
  let current = "";

  for (const para of paragraphs) {
    if (current.length + para.length > maxChunkSize && current.length > 0) {
      chunks.push(current.trim());
      current = current.slice(-overlap) + " " + para;
    } else {
      current += (current ? "\n\n" : "") + para;
    }
  }

  if (current.trim().length > 0) {
    chunks.push(current.trim());
  }

  return chunks;
}
