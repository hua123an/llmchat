import type { Chunk } from './chunker';

const DB_NAME = 'chatllm_rag';
const DB_VERSION = 2;

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
      if (!db.objectStoreNames.contains('vectors')) {
        const vstore = db.createObjectStore('vectors', { keyPath: 'id' });
        vstore.createIndex('docId', 'docId', { unique: false });
        vstore.createIndex('chunkId', 'chunkId', { unique: false });
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
  const tx = db.transaction(['docs', 'chunks', 'vectors'], 'readwrite');
  tx.objectStore('docs').clear();
  tx.objectStore('chunks').clear();
  try { tx.objectStore('vectors').clear(); } catch {}
  await new Promise((res, rej) => { tx.oncomplete = () => res(null); tx.onerror = () => rej(tx.error); });
}

export async function deleteDoc(docId: string): Promise<void> {
  const db = await openDB();
  // 删除 meta
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(['docs'], 'readwrite');
    tx.objectStore('docs').delete(docId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  // 删除 chunks（按索引扫描再按主键删除）
  const chunkIds: string[] = await new Promise((resolve) => {
    const tx = db.transaction(['chunks']);
    const idx = tx.objectStore('chunks').index('docId').getAll(docId);
    idx.onsuccess = () => {
      const list = (idx.result as any[]) || [];
      resolve(list.map((c: any) => c.id));
    };
    idx.onerror = () => resolve([]);
  });
  for (let i = 0; i < chunkIds.length; i += 200) {
    const slice = chunkIds.slice(i, i + 200);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['chunks'], 'readwrite');
      const store = tx.objectStore('chunks');
      for (const id of slice) store.delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  // 删除对应的向量
  try {
    const vtx = db.transaction(['vectors']);
    const vidx = vtx.objectStore('vectors').index('docId').getAll(docId);
    const vids: string[] = await new Promise((resolve) => {
      vidx.onsuccess = () => resolve(((vidx.result as any[]) || []).map((v: any) => v.id));
      vidx.onerror = () => resolve([]);
    });
    for (let i = 0; i < vids.length; i += 200) {
      const slice = vids.slice(i, i + 200);
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(['vectors'], 'readwrite');
        const store = tx.objectStore('vectors');
        for (const id of slice) store.delete(id);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    }
  } catch {}
}


// ===== Vectors API =====
export interface VectorRow { id: string; docId: string; chunkId: string; vector: number[] }

export async function putVectors(rows: VectorRow[], batchSize = 200): Promise<void> {
  if (!rows || rows.length === 0) return;
  const db = await openDB();
  for (let i = 0; i < rows.length; i += batchSize) {
    const slice = rows.slice(i, i + batchSize);
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(['vectors'], 'readwrite');
      const store = tx.objectStore('vectors');
      for (const r of slice) store.put(r as any);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}

export async function getVectorsByDoc(docId: string): Promise<VectorRow[]> {
  const db = await openDB();
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(['vectors']);
      const idx = tx.objectStore('vectors').index('docId').getAll(docId);
      idx.onsuccess = () => resolve(((idx.result as any[]) || []) as VectorRow[]);
      idx.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
}

