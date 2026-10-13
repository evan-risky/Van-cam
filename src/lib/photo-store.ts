"use client";

export type LocalPhotoStatus = "pending" | "uploading" | "uploaded" | "error";

export type LocalPhoto = {
  id: string;
  idempotencyKey: string;
  blob: Blob;
  mimeType: string;
  size: number;
  capturedAt: number;
  status: LocalPhotoStatus;
  remoteId?: string;
  error?: string;
};

const DB_NAME = "vanry-cam";
const DB_VERSION = 1;
const STORE = "photos";

function isSupported(): boolean {
  return typeof indexedDB !== "undefined";
}

export function isPhotoStoreSupported(): boolean {
  return isSupported();
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE)) {
        const store = db.createObjectStore(STORE, { keyPath: "id" });
        store.createIndex("capturedAt", "capturedAt");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function withStore<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const request = run(tx.objectStore(STORE));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    tx.oncomplete = () => db.close();
    tx.onerror = () => reject(tx.error);
  });
}

export async function addPhoto(
  photo: Omit<LocalPhoto, "status"> & { status?: LocalPhotoStatus },
): Promise<void> {
  if (!isSupported()) return;
  const record: LocalPhoto = { ...photo, status: photo.status ?? "pending" };
  await withStore("readwrite", (store) => store.put(record));
}

export async function updatePhoto(
  id: string,
  patch: Partial<LocalPhoto>,
): Promise<void> {
  if (!isSupported()) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    const get = store.get(id);
    get.onsuccess = () => {
      const existing = get.result as LocalPhoto | undefined;
      if (existing) store.put({ ...existing, ...patch });
    };
    get.onerror = () => reject(get.error);
    tx.oncomplete = () => {
      db.close();
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

export async function listPhotos(): Promise<LocalPhoto[]> {
  if (!isSupported()) return [];
  const result = await withStore<LocalPhoto[]>("readonly", (store) =>
    store.getAll(),
  );
  return result.sort((a, b) => a.capturedAt - b.capturedAt);
}

export async function removePhoto(id: string): Promise<void> {
  if (!isSupported()) return;
  await withStore("readwrite", (store) => store.delete(id));
}

export async function clearPhotos(): Promise<void> {
  if (!isSupported()) return;
  await withStore("readwrite", (store) => store.clear());
}

export function newIdempotencyKey(): string {
  const random =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : Math.random().toString(36).slice(2);
  return `p_${Date.now()}_${random}`;
}