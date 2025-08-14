import type { Chunk } from './chunker';
import { getChunksByDoc } from './store';

function tokenize(text: string): string[] {
  return (text || '')
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s]/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
}

// 保留接口以兼容旧代码（未使用）
// 移除未使用的 tf，BM25 已取代

// BM25 实现（简化）
function bm25Score(queryTokens: string[], docTokens: string[], avgdl: number, dfMap: Map<string, number>, N: number, k1 = 1.5, b = 0.75): number {
  const freq: Record<string, number> = {};
  for (const t of docTokens) freq[t] = (freq[t] || 0) + 1;
  const dl = docTokens.length || 1;
  let score = 0;
  for (const q of queryTokens) {
    const f = freq[q] || 0;
    const n_q = dfMap.get(q) || 0.5; // 平滑
    const idf = Math.log(1 + (N - n_q + 0.5) / (n_q + 0.5));
    const denom = f + k1 * (1 - b + b * dl / (avgdl || 1));
    score += idf * (f * (k1 + 1)) / (denom || 1);
  }
  return score;
}

export async function retrieveFromDoc(docId: string, query: string, topK = 5): Promise<Array<{ chunk: Chunk; score: number }>> {
  const chunks = await getChunksByDoc(docId);
  if (chunks.length === 0 || !query.trim()) return [];
  const docsTokens = chunks.map(c => tokenize(c.text));
  const qTokens = tokenize(query);
  const N = chunks.length || 1;
  const avgdl = docsTokens.reduce((s, tks) => s + tks.length, 0) / N;
  const dfMap = new Map<string, number>();
  for (const tks of docsTokens) {
    const uniq = new Set(tks);
    for (const t of uniq) dfMap.set(t, (dfMap.get(t) || 0) + 1);
  }
  const scored = chunks.map((c, idx) => ({ chunk: c, score: bm25Score(qTokens, docsTokens[idx], avgdl, dfMap, N) }));
  return scored.sort((a, b) => b.score - a.score).slice(0, topK);
}


