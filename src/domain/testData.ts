// テスト用のデータ作成ヘルパー
import type { CareRecord, DiaryData, Item, Photo } from './types';

export function makePhoto(o: Partial<Photo> = {}): Photo {
  const id = o.id ?? 'p1';
  return {
    id,
    takenAt: '2026-01-01',
    memo: '',
    fileId: `f-${id}`,
    thumbFileId: `t-${id}`,
    width: 2048,
    height: 1536,
    ...o,
  };
}

export function makeCare(o: Partial<CareRecord> = {}): CareRecord {
  return { id: 'c1', date: '2026-01-01', type: 'oil', memo: '', photoId: null, ...o };
}

export function makeItem(o: Partial<Item> = {}): Item {
  return {
    id: 'i1',
    name: 'ブーツ',
    brand: '',
    category: 'shoes',
    purchaseDate: null,
    price: null,
    memo: '',
    photos: [],
    care: [],
    wearDates: [],
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    ...o,
  };
}

export function makeData(items: Item[] = []): DiaryData {
  return { version: 1, items };
}
