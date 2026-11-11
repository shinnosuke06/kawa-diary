// 端末内キャッシュ（設計書 3.5）。IndexedDB が使えない環境では何もしない
import { createStore, del, delMany, get, set, type UseStore } from 'idb-keyval';
import type { DiaryData } from '../domain/types';

export interface LocalCache {
  getData(): Promise<DiaryData | null>;
  setData(d: DiaryData): Promise<void>;
  getThumb(fileId: string): Promise<Blob | null>;
  setThumb(fileId: string, blob: Blob): Promise<void>;
  deleteThumbs(fileIds: string[]): Promise<void>;
}

interface StoredBlob {
  type: string;
  bytes: ArrayBuffer;
}

const thumbKey = (fileId: string) => `thumb:${fileId}`;

export function createIdbCache(): LocalCache {
  let store: UseStore | null = null;
  const db = (): UseStore => (store ??= createStore('kawa-diary', 'cache'));

  return {
    async getData() {
      try {
        return (await get<DiaryData>('data', db())) ?? null;
      } catch {
        return null;
      }
    },
    async setData(d) {
      try {
        await set('data', d, db());
      } catch {
        // 保存できなくても動作は続ける
      }
    },
    async getThumb(fileId) {
      try {
        const v = await get<StoredBlob>(thumbKey(fileId), db());
        return v ? new Blob([v.bytes], { type: v.type }) : null;
      } catch {
        return null;
      }
    },
    async setThumb(fileId, blob) {
      try {
        // Blob をそのまま入れると Safari などで壊れることがあるため ArrayBuffer で保存
        const value: StoredBlob = { type: blob.type, bytes: await blob.arrayBuffer() };
        await set(thumbKey(fileId), value, db());
      } catch {
        // 無視
      }
    },
    async deleteThumbs(fileIds) {
      try {
        if (fileIds.length === 1) await del(thumbKey(fileIds[0]), db());
        else if (fileIds.length > 1) await delMany(fileIds.map(thumbKey), db());
      } catch {
        // 無視
      }
    },
  };
}

export function createMemoryCache(): LocalCache {
  let data: DiaryData | null = null;
  const thumbs = new Map<string, Blob>();
  return {
    getData: async () => (data ? structuredClone(data) : null),
    setData: async (d) => {
      data = structuredClone(d);
    },
    getThumb: async (fileId) => thumbs.get(fileId) ?? null,
    setThumb: async (fileId, blob) => {
      thumbs.set(fileId, blob);
    },
    deleteThumbs: async (fileIds) => {
      for (const id of fileIds) thumbs.delete(id);
    },
  };
}
