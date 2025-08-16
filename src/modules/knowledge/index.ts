// 聚合导出：知识库(RAG)对外统一入口
// 内部仍使用现有 src/services/rag/*，对外避免直接耦合路径

export type { DocMeta, Chunk } from '../../services/rag';

export async function listDocs() {
  const mod = await import('../../services/rag');
  return mod.listAllDocs();
}

export async function getDocChunks(docId: string) {
  const mod = await import('../../services/rag');
  return mod.getDocChunks(docId);
}

export async function searchDoc(docId: string, query: string, topK = 5) {
  const mod = await import('../../services/rag');
  return mod.searchInDoc(docId, query, topK);
}

export async function importPlainText(name: string, text: string) {
  const mod = await import('../../services/rag');
  return mod.importText(name, text);
}

export async function embedAndSave(docId: string, provider: 'aliyun' | 'openai', apiKey: string) {
  const mod = await import('../../services/rag');
  const chunks = await mod.getDocChunks(docId);
  const embeds = await mod.embedChunksRemotely(chunks, provider, apiKey);
  await mod.saveVectors(docId, chunks, embeds);
  return embeds.length;
}

export async function vectorTopK(docId: string, queryVector: number[], topK = 5) {
  const mod = await import('../../services/rag');
  return mod.vectorSearch(docId, queryVector, topK);
}


