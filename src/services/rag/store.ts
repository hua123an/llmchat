import type { Chunk } from './chunker';

const DB_NAME = 'chatllm_rag';
const DB_VERSION = 1;

export interface DocMeta { id: string; name: string; createdAt: number; size: number }

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains('docs')) db.createObjectStore('docs', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('chunks')) {
        const store = db.createObjectStore('chunks', { keyPath: 'id' });
        store.createIndex('docId', 'docId', { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function putDoc(meta: DocMeta, chunks: Chunk[]): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(['docs', 'chunks'], 'readwrite');
  tx.objectStore('docs').put(meta);
  const chunkStore = tx.objectStore('chunks');
  for (const c of chunks) chunkStore.put(c);
  await new Promise((res, rej) => { tx.oncomplete = () => res(null); tx.onerror = () => rej(tx.error); });
}

// Create doc meta only (for incremental chunk appends)
export async function createDoc(meta: DocMeta): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(['docs'], 'readwrite');
  tx.objectStore('docs').put(meta);
  await new Promise((res, rej) => { tx.oncomplete = () => res(null); tx.onerror = () => rej(tx.error); });
}

// Append chunks in one transaction (faster than one-by-one)
export async function appendChunks(chunks: Chunk[], batchSize = 100): Promise<void> {
  if (!chunks || chunks.length === 0) return;
  const db = await openDB();
  for (let i = 0; i < chunks.length; i += batchSize) {
    const slice = chunks.slice(i, i + batchSize);
    const tx = db.transaction(['chunks'], 'readwrite');
    const chunkStore = tx.objectStore('chunks');
    for (const c of slice) chunkStore.put(c);
    await new Promise((res, rej) => { tx.oncomplete = () => res(null); tx.onerror = () => rej(tx.error); });
  }
}

export async function getDoc(id: string): Promise<DocMeta | undefined> {
  const db = await openDB();
  return new Promise((resolve) => {
    const req = db.transaction('docs').objectStore('docs').get(id);
    req.onsuccess = () => resolve(req.result as any);
    req.onerror = () => resolve(undefined);
  });
}

export async function listDocs(): Promise<DocMeta[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const req = db.transaction('docs').objectStore('docs').getAll();
    req.onsuccess = () => resolve((req.result as any[]) || []);
    req.onerror = () => resolve([]);
  });
}

export async function getChunksByDoc(docId: string): Promise<Chunk[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    const tx = db.transaction('chunks');
    const idx = tx.objectStore('chunks').index('docId').getAll(docId);
    idx.onsuccess = () => resolve((idx.result as any[]) || []);
    idx.onerror = () => resolve([]);
  });
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  const tx = db.transaction(['docs', 'chunks'], 'readwrite');
  tx.objectStore('docs').clear();
  tx.objectStore('chunks').clear();
  await new Promise((res, rej) => { tx.oncomplete = () => res(null); tx.onerror = () => rej(tx.error); });
}


