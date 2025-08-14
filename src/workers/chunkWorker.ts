import { chunkText } from '../services/rag/chunker';
import { putDoc, type DocMeta } from '../services/rag/store';

self.onmessage = async (e: MessageEvent) => {
  const { docId, name, text } = e.data as { docId: string; name: string; text: string };
  const chunks = chunkText(docId, text);
  const meta: DocMeta = { id: docId, name, createdAt: Date.now(), size: text.length };
  await putDoc(meta, chunks);
  (self as any).postMessage({ ok: true, count: chunks.length });
};


