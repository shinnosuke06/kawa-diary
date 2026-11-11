// 画面に出す集計（設計書 2.3）
import { formatUsagePeriod } from './dates';
import type { CareRecord, Category, DiaryData, Item, Photo } from './types';

export function wearCount(item: Item): number {
  return item.wearDates.length;
}

export function costPerWear(item: Item): number | null {
  const count = wearCount(item);
  if (item.price === null || count === 0) return null;
  return Math.round(item.price / count);
}

// 撮影日の昇順。同日は配列順（安定ソート）
export function photosByDate(item: Item): Photo[] {
  return item.photos.slice().sort((a, b) => a.takenAt.localeCompare(b.takenAt));
}

export function oldestPhoto(item: Item): Photo | null {
  return photosByDate(item)[0] ?? null;
}

export function latestPhoto(item: Item): Photo | null {
  let best: Photo | null = null;
  for (const p of item.photos) if (!best || p.takenAt >= best.takenAt) best = p;
  return best;
}

export function usageStart(item: Item): string | null {
  return item.purchaseDate ?? oldestPhoto(item)?.takenAt ?? null;
}

export function usagePeriod(item: Item, today: string): string | null {
  const start = usageStart(item);
  return start ? formatUsagePeriod(start, today) : null;
}

export function lastCareDate(item: Item): string | null {
  let best: string | null = null;
  for (const c of item.care) if (!best || c.date > best) best = c.date;
  return best;
}

export type TimelineEntry =
  | { kind: 'photo'; date: string; photo: Photo }
  | { kind: 'care'; date: string; care: CareRecord; photo: Photo | null };

// 新しい順。同日は手入れ → 写真、それぞれ配列の後ろから。手入れの写真は手入れ側にだけ出す
export function timeline(item: Item): TimelineEntry[] {
  const photoById = new Map(item.photos.map((p) => [p.id, p]));
  const linked = new Set(item.care.map((c) => c.photoId).filter((id): id is string => id !== null));
  const cares: TimelineEntry[] = item.care
    .map((care) => ({ kind: 'care' as const, date: care.date, care, photo: care.photoId ? (photoById.get(care.photoId) ?? null) : null }))
    .reverse();
  const photos: TimelineEntry[] = item.photos
    .filter((p) => !linked.has(p.id))
    .map((photo) => ({ kind: 'photo' as const, date: photo.takenAt, photo }))
    .reverse();
  return [...cares, ...photos].sort((a, b) => b.date.localeCompare(a.date));
}

export function itemsForHome(data: DiaryData, filter: Category | 'all'): Item[] {
  return data.items
    .filter((i) => filter === 'all' || i.category === filter)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}
