export type Chunk = { id: string; docId: string; index: number; text: string };

export function chunkText(docId: string, text: string, size = 800, overlap = 100): Chunk[] {
  const clean = (text || '').replace(/\r/g, '');
  const chunks: Chunk[] = [];
  let i = 0, idx = 0;
  while (i < clean.length) {
    const end = Math.min(i + size, clean.length);
    const piece = clean.slice(i, end);
    chunks.push({ id: `${docId}:${idx}`, docId, index: idx, text: piece });
    idx += 1;
    i = end - overlap;
    if (i < 0) i = 0;
  }
  return chunks;
}


