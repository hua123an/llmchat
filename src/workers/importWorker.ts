import { chunkText } from '../services/rag/chunker';
import { appendChunks, createDoc, type DocMeta } from '../services/rag/store';

type ImportTask = {
  docId: string;
  name: string;
  ext?: string;
  arrayBuffer: ArrayBuffer;
  chunkSize?: number;
  overlap?: number;
};

async function extractText(ext: string, buffer: ArrayBuffer): Promise<string> {
  const lower = (ext || '').toLowerCase();
  if (lower === 'pdf') {
    const { extractPdfText } = await import('../services/extractors/pdf');
    return await extractPdfText(buffer, 50);
  }
  if (lower === 'docx') {
    const { extractDocxText } = await import('../services/extractors/docx');
    return await extractDocxText(buffer);
  }
  // txt or unknown -> try text decoder
  try {
    return new TextDecoder().decode(buffer);
  } catch {
    return '';
  }
}

self.onmessage = async (e: MessageEvent) => {
  const data = e.data as { type: 'import'; task: ImportTask };
  if (!data || data.type !== 'import') return;

  const { task } = data;
  try {
    const text = await extractText(task.ext || 'txt', task.arrayBuffer);
    const clean = (text || '').trim();
    const chunkSize = Math.max(200, Math.min(4000, Number(task.chunkSize || 800)));
    const overlap = Math.max(0, Math.min(Math.floor(chunkSize / 2), Number(task.overlap || 100)));

    // create doc meta
    const meta: DocMeta = { id: task.docId, name: task.name || 'Untitled', createdAt: Date.now(), size: clean.length };
    await createDoc(meta);

    // chunk in streaming batches to report progress
    const chunks = chunkText(task.docId, clean, chunkSize, overlap);
    const total = chunks.length;
    const batch = 200;
    for (let i = 0; i < total; i += batch) {
      const slice = chunks.slice(i, i + batch);
      await appendChunks(slice, slice.length);
      (self as any).postMessage({ type: 'progress', done: Math.min(i + slice.length, total), total });
    }

    (self as any).postMessage({ type: 'done', ok: true, meta });
  } catch (error: any) {
    (self as any).postMessage({ type: 'error', message: String(error?.message || error) });
  }
};


