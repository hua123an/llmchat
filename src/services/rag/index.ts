import { chunkText, type Chunk } from './chunker';
import { putDoc, listDocs, getChunksByDoc, clearAll, type DocMeta, appendChunks, createDoc } from './store';
import { retrieveFromDoc } from './retriever';

export type { DocMeta, Chunk };

export async function importText(name: string, text: string): Promise<DocMeta> {
  const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const clean = (text || '').trim();
  if (!clean) throw new Error('EMPTY_TEXT');
  const chunks = chunkText(docId, clean);
  const meta: DocMeta = { id: docId, name: name || 'Untitled', createdAt: Date.now(), size: clean.length };
  await putDoc(meta, chunks);
  return meta;
}

export async function importChunksIncremental(name: string, iterable: AsyncIterable<string> | Iterable<string>): Promise<DocMeta> {
  const docId = `doc-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const meta: DocMeta = { id: docId, name: name || 'Untitled', createdAt: Date.now(), size: 0 };
  await createDoc(meta);
  let total = 0, idx = 0;
  for await (const piece of iterable as any) {
    const text = String(piece || '');
    total += text.length;
    const chunks = chunkText(docId, text);
    // 修正 index 递增避免重复
    const normalized = chunks.map((c, i) => ({ ...c, id: `${docId}:${idx + i}`, index: idx + i }));
    idx += chunks.length;
    await appendChunks(normalized, 200);
  }
  return { ...meta, size: total };
}

export async function searchInDoc(docId: string, query: string, topK = 5) {
  return retrieveFromDoc(docId, query, topK);
}

export async function listAllDocs() {
  return listDocs();
}

export async function getDocChunks(docId: string) {
  return getChunksByDoc(docId);
}

export async function clearKnowledgeBase() {
  return clearAll();
}


