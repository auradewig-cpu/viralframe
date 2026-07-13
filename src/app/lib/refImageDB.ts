// Wrapper IndexedDB mentah (TANPA dependency baru) untuk PERSISTENSI foto referensi lintas
// reload/sesi — pelengkap store.referenceFiles (Zustand, non-persist, hanya hidup selama tab
// terbuka). localStorage TIDAK pernah dipakai untuk blob (anti-QuotaExceeded); ini murni IndexedDB.
//
// Graceful degradation WAJIB: di private mode/browser lama/error apapun, SEMUA fungsi di sini
// resolve dengan nilai aman (null/false/kosong) dan TIDAK PERNAH reject/throw — supaya app tetap
// berperilaku seperti sebelum ada file ini (sesi-only) kalau IndexedDB tidak bisa dipakai.

const DB_NAME = 'viralframe-ref-images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

export interface StoredRefImage {
  blob: Blob;
  savedAt: number;
}

function openDB(): Promise<IDBDatabase | null> {
  return new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') { resolve(null); return; }
    try {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
      req.onblocked = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

export async function putImage(sourceName: string, blob: Blob): Promise<void> {
  const db = await openDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ blob, savedAt: Date.now() } as StoredRefImage, sourceName);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}

export async function getImage(sourceName: string): Promise<StoredRefImage | null> {
  const db = await openDB();
  if (!db) return null;
  const result = await new Promise<StoredRefImage | null>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).get(sourceName);
      req.onsuccess = () => resolve((req.result as StoredRefImage) ?? null);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
  db.close();
  return result;
}

export async function deleteImage(sourceName: string): Promise<void> {
  const db = await openDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).delete(sourceName);
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}

export async function getAllKeys(): Promise<string[]> {
  const db = await openDB();
  if (!db) return [];
  const result = await new Promise<string[]>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAllKeys();
      req.onsuccess = () => resolve((req.result as string[]) || []);
      req.onerror = () => resolve([]);
    } catch {
      resolve([]);
    }
  });
  db.close();
  return result;
}

export interface RefImageUsage {
  count: number;
  totalBytes: number;
}

export async function estimateUsage(): Promise<RefImageUsage> {
  const db = await openDB();
  if (!db) return { count: 0, totalBytes: 0 };
  const result = await new Promise<RefImageUsage>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const req = tx.objectStore(STORE_NAME).getAll();
      req.onsuccess = () => {
        const rows = (req.result as StoredRefImage[]) || [];
        resolve({ count: rows.length, totalBytes: rows.reduce((sum, r) => sum + (r.blob?.size || 0), 0) });
      };
      req.onerror = () => resolve({ count: 0, totalBytes: 0 });
    } catch {
      resolve({ count: 0, totalBytes: 0 });
    }
  });
  db.close();
  return result;
}

export async function clearAll(): Promise<void> {
  const db = await openDB();
  if (!db) return;
  await new Promise<void>((resolve) => {
    try {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).clear();
      tx.oncomplete = () => resolve();
      tx.onerror = () => resolve();
      tx.onabort = () => resolve();
    } catch {
      resolve();
    }
  });
  db.close();
}
