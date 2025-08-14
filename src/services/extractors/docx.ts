// Lightweight DOCX text extraction for browser using mammoth (dynamic import)
export async function extractDocxText(buffer: ArrayBuffer): Promise<string> {
  const mammoth = await import('mammoth');
  // In browser, use arrayBuffer API instead of Node Buffer
  const { value } = await (mammoth as any).extractRawText({ arrayBuffer: buffer });
  return String(value || '').trim();
}


