// データ変更はすべてここの純粋関数で行う（設計書 3.4）。引数は書き換えない
import { MissingRecordError } from '../errors';
import type { CareInput, CareRecord, DiaryData, Item, ItemInput, Photo, PhotoMeta } from './types';

function updateItemById(data: DiaryData, itemId: string, fn: (item: Item) => Item, now: string): DiaryData {
  const index = data.items.findIndex((i) => i.id === itemId);
  if (index < 0) throw new MissingRecordError(`item not found: ${itemId}`);
  const items = data.items.slice();
  items[index] = { ...fn(data.items[index]), updatedAt: now };
  return { ...data, items };
}

function hasItem(data: DiaryData, itemId: string): Item | undefined {
  return data.items.find((i) => i.id === itemId);
}

export function createItem(input: ItemInput, id: string, now: string): Item {
  return {
    id,
    name: input.name.trim(),
    brand: input.brand.trim(),
    category: input.category,
    purchaseDate: input.purchaseDate,
    price: input.price,
    memo: input.memo,
    photos: [],
    care: [],
    wearDates: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function addItem(data: DiaryData, item: Item): DiaryData {
  return { ...data, items: [...data.items, item] };
}

export function updateItem(data: DiaryData, itemId: string, input: ItemInput, now: string): DiaryData {
  return updateItemById(
    data,
    itemId,
    (item) => ({
      ...item,
      name: input.name.trim(),
      brand: input.brand.trim(),
      category: input.category,
      purchaseDate: input.purchaseDate,
      price: input.price,
      memo: input.memo,
    }),
    now,
  );
}

export function deleteItem(data: DiaryData, itemId: string): DiaryData {
  if (!hasItem(data, itemId)) return data;
  return { ...data, items: data.items.filter((i) => i.id !== itemId) };
}

export function addPhoto(data: DiaryData, itemId: string, photo: Photo, now: string): DiaryData {
  return updateItemById(data, itemId, (item) => ({ ...item, photos: [...item.photos, photo] }), now);
}

export function updatePhoto(data: DiaryData, itemId: string, photoId: string, meta: PhotoMeta, now: string): DiaryData {
  return updateItemById(
    data,
    itemId,
    (item) => {
      if (!item.photos.some((p) => p.id === photoId)) throw new MissingRecordError(`photo not found: ${photoId}`);
      return {
        ...item,
        photos: item.photos.map((p) => (p.id === photoId ? { ...p, takenAt: meta.takenAt, memo: meta.memo } : p)),
      };
    },
    now,
  );
}

export function deletePhoto(data: DiaryData, itemId: string, photoId: string, now: string): DiaryData {
  const item = hasItem(data, itemId);
  if (!item || !item.photos.some((p) => p.id === photoId)) return data;
  return updateItemById(
    data,
    itemId,
    (it) => ({
      ...it,
      photos: it.photos.filter((p) => p.id !== photoId),
      care: it.care.map((c) => (c.photoId === photoId ? { ...c, photoId: null } : c)),
    }),
    now,
  );
}

export function addCare(data: DiaryData, itemId: string, care: CareRecord, now: string): DiaryData {
  return updateItemById(data, itemId, (item) => ({ ...item, care: [...item.care, care] }), now);
}

export function updateCare(data: DiaryData, itemId: string, careId: string, input: CareInput, now: string): DiaryData {
  return updateItemById(
    data,
    itemId,
    (item) => {
      if (!item.care.some((c) => c.id === careId)) throw new MissingRecordError(`care not found: ${careId}`);
      return {
        ...item,
        care: item.care.map((c) => (c.id === careId ? { ...c, date: input.date, type: input.type, memo: input.memo } : c)),
      };
    },
    now,
  );
}

export function deleteCare(data: DiaryData, itemId: string, careId: string, now: string): DiaryData {
  const item = hasItem(data, itemId);
  if (!item || !item.care.some((c) => c.id === careId)) return data;
  return updateItemById(data, itemId, (it) => ({ ...it, care: it.care.filter((c) => c.id !== careId) }), now);
}

export function addWearDate(data: DiaryData, itemId: string, date: string, now: string): DiaryData {
  return updateItemById(
    data,
    itemId,
    (item) => ({ ...item, wearDates: [...new Set([...item.wearDates, date])].sort() }),
    now,
  );
}

export function removeWearDate(data: DiaryData, itemId: string, date: string, now: string): DiaryData {
  return updateItemById(data, itemId, (item) => ({ ...item, wearDates: item.wearDates.filter((d) => d !== date) }), now);
}

export function toggleWearDate(data: DiaryData, itemId: string, date: string, now: string): DiaryData {
  const item = hasItem(data, itemId);
  if (item?.wearDates.includes(date)) return removeWearDate(data, itemId, date, now);
  return addWearDate(data, itemId, date, now);
}
