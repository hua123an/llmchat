import { chunkText, type Chunk } from './chunker';
import { putDoc, listDocs, getChunksByDoc, clearAll, type DocMeta, appendChunks, createDoc, putVectors, getVectorsByDoc, type VectorRow } from './store';
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

// --- Vector embedding (remote) minimal API ---
export type EmbedProvider = 'openai' | 'aliyun';

export async function embedChunksRemotely(chunks: Chunk[], provider: EmbedProvider, apiKey: string): Promise<Array<{ id: string; vector: number[] }>> {
  if (!Array.isArray(chunks) || chunks.length === 0) return [];
  const texts = chunks.map(c => c.text);
  if (provider === 'openai') {
    const url = 'https://api.openai.com/v1/embeddings';
    const body = { model: 'text-embedding-3-small', input: texts } as any;
    const resp = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) throw new Error(`OpenAI embeddings HTTP ${resp.status}`);
    const json: any = await resp.json();
    const data = Array.isArray(json.data) ? json.data : [];
    return data.map((d: any, i: number) => ({ id: chunks[i].id, vector: d?.embedding || [] }));
  }
  if (provider === 'aliyun') {
    const url = 'https://dashscope.aliyuncs.com/compatible-mode/v1/embeddings';
    const body = { model: 'text-embedding-v1', input: texts } as any;
    const resp = await fetch(url, { method: 'POST', headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (!resp.ok) throw new Error(`Aliyun embeddings HTTP ${resp.status}`);
    const json: any = await resp.json();
    const data = Array.isArray(json.data) ? json.data : [];
    return data.map((d: any, i: number) => ({ id: chunks[i].id, vector: d?.embedding || [] }));
  }
  throw new Error('Unsupported embed provider');
}

export async function saveVectors(docId: string, chunks: Chunk[], embeds: Array<{ id: string; vector: number[] }>): Promise<void> {
  const rows: VectorRow[] = embeds.map((e) => {
    const chunk = chunks.find(c => c.id === e.id)!;
    return { id: `v_${e.id}`, docId: chunk.docId, chunkId: chunk.id, vector: e.vector };
  });
  await putVectors(rows);
}

// cosine similarity
function cosSim(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  const n = Math.min(a.length, b.length);
  for (let i = 0; i < n; i++) { const x = a[i]; const y = b[i]; dot += x*y; na += x*x; nb += y*y; }
  const denom = Math.sqrt(na) * Math.sqrt(nb) || 1;
  return dot / denom;
}

export async function vectorSearch(docId: string, queryVector: number[], topK = 5): Promise<Array<{ chunk: Chunk; score: number }>> {
  const vectors = await getVectorsByDoc(docId);
  if (!vectors.length) return [];
  const chunks = await getChunksByDoc(docId);
  const scored = vectors.map(v => ({ v, s: cosSim(queryVector, v.vector || []) }));
  scored.sort((a,b)=>b.s-a.s);
  const top = scored.slice(0, topK);
  return top.map(t => ({ chunk: chunks.find(c => c.id === t.v.chunkId)!, score: t.s })).filter(x => !!x.chunk);
}


